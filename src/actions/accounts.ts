"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createClient as createIsolatedClient } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";

/**
 * Multi-account switching.
 *
 * The ACTIVE session stays in Supabase's own cookies (unchanged). The other
 * accounts a user has added live in a separate httpOnly, secure cookie that only
 * these server actions read/write — so the extra refresh tokens are never exposed
 * to client JS. We store only each account's refresh token (+ username/avatar for
 * the switcher UI); switching restores a session from that token via
 * refreshSession(), which rotates the token — so we always re-persist the latest.
 */

const ACCOUNTS_COOKIE = "bevocl.accounts";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

interface StoredAccount {
  id: string;
  username: string;
  avatarUrl: string | null;
  refreshToken: string;
}

export interface AccountSummary {
  id: string;
  username: string;
  avatarUrl: string | null;
  isActive: boolean;
}

async function readStore(): Promise<StoredAccount[]> {
  const store = await cookies();
  const raw = store.get(ACCOUNTS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

async function writeStore(accounts: StoredAccount[]): Promise<void> {
  const store = await cookies();
  if (accounts.length === 0) {
    store.delete(ACCOUNTS_COOKIE);
    return;
  }
  store.set(ACCOUNTS_COOKIE, JSON.stringify(accounts), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

/** Upsert the given session's account (fetches its profile as the active user). */
async function upsertFromSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accounts: StoredAccount[],
  session: Session
): Promise<StoredAccount[]> {
  const id = session.user.id;
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", id)
    .single();
  const entry: StoredAccount = {
    id,
    username: profile?.username ?? "",
    avatarUrl: profile?.avatar_url ?? null,
    refreshToken: session.refresh_token,
  };
  const rest = accounts.filter((a) => a.id !== id);
  return [entry, ...rest];
}

/**
 * The accounts to show in the switcher (no tokens leave the server). The active
 * account is always included, even if the user logged in normally without ever
 * "adding" a second account.
 */
export async function getSavedAccounts(): Promise<{
  accounts: AccountSummary[];
  activeId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const store = await readStore();
  const accounts: AccountSummary[] = store.map((a) => ({
    id: a.id,
    username: a.username,
    avatarUrl: a.avatarUrl,
    isActive: a.id === user?.id,
  }));

  if (user && !store.some((a) => a.id === user.id)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single();
    accounts.unshift({
      id: user.id,
      username: profile?.username ?? "",
      avatarUrl: profile?.avatar_url ?? null,
      isActive: true,
    });
  }

  return { accounts, activeId: user?.id ?? null };
}

/**
 * Add another account by its credentials and switch to it. Saves the current
 * account first so you can switch back. If MFA is enrolled on the new account,
 * the middleware step-up flow (/auth/mfa) takes over after the redirect.
 */
export async function addAccount(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Persist the currently-active account before we replace its session.
    const {
      data: { session: current },
    } = await supabase.auth.getSession();
    let store = await readStore();
    if (current) {
      store = await upsertFromSession(supabase, store, current);
    }

    const { data: signIn, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !signIn.session) {
      // Restore state (current is still active — signIn failure doesn't change it).
      await writeStore(store);
      return { success: false, error: "Incorrect email or password." };
    }

    if (current && signIn.session.user.id === current.user.id) {
      // Added the account you're already on — nothing to do.
      await writeStore(store);
      return { success: true };
    }

    store = await upsertFromSession(supabase, store, signIn.session);
    await writeStore(store);
    return { success: true };
  } catch (err) {
    console.error("Add account error:", err);
    return { success: false, error: "Something went wrong adding that account." };
  }
}

/** Switch the active session to a previously-added account. */
export async function switchAccount(
  targetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    let store = await readStore();
    const target = store.find((a) => a.id === targetId);
    if (!target) {
      return { success: false, error: "That account isn't saved on this device." };
    }

    // Save the account we're leaving (its token may have rotated while active).
    const {
      data: { session: current },
    } = await supabase.auth.getSession();
    if (current && current.user.id !== targetId) {
      store = await upsertFromSession(supabase, store, current);
    } else if (current && current.user.id === targetId) {
      return { success: true }; // already active
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: target.refreshToken,
    });
    if (error || !data.session) {
      // Stored token is dead — forget this account rather than loop.
      await writeStore(store.filter((a) => a.id !== targetId));
      return {
        success: false,
        error: "That account's session expired — please add it again.",
      };
    }

    store = await upsertFromSession(supabase, store, data.session);
    await writeStore(store);
    return { success: true };
  } catch (err) {
    console.error("Switch account error:", err);
    return { success: false, error: "Couldn't switch accounts." };
  }
}

/**
 * Remove a saved account from the switcher AND log it out. We revoke the
 * account's session server-side using an isolated client (its own in-memory
 * storage — never the active user's cookies), restoring the stored token just
 * long enough to sign it out with scope "local" (this session only; the user's
 * other devices stay signed in). The active account can't be removed here —
 * that's what the footer "Log out" is for.
 */
export async function removeAccount(
  targetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id === targetId) {
      return { success: false, error: "Log out of this account to remove it." };
    }

    const store = await readStore();
    const target = store.find((a) => a.id === targetId);

    // Best-effort revoke: restore the session in an isolated client, then sign
    // it out. If the stored token is already dead, there's nothing to revoke —
    // we still drop it from the store below.
    if (target) {
      try {
        const isolated = createIsolatedClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } }
        );
        const { data, error } = await isolated.auth.refreshSession({
          refresh_token: target.refreshToken,
        });
        if (!error && data.session) {
          await isolated.auth.signOut({ scope: "local" });
        }
      } catch (revokeErr) {
        console.error("Remove account revoke error:", revokeErr);
      }
    }

    await writeStore(store.filter((a) => a.id !== targetId));
    return { success: true };
  } catch (err) {
    console.error("Remove account error:", err);
    return { success: false, error: "Couldn't remove that account." };
  }
}

/**
 * Log out of the CURRENT account. If other accounts are saved, switch to one of
 * them; otherwise sign out fully. Returns whether it switched (vs full logout).
 */
export async function logoutCurrentAccount(): Promise<{
  success: boolean;
  switched: boolean;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let store = (await readStore()).filter((a) => a.id !== user?.id);

    if (store.length > 0) {
      const next = store[0];
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: next.refreshToken,
      });
      if (!error && data.session) {
        store = await upsertFromSession(supabase, store, data.session);
        await writeStore(store);
        return { success: true, switched: true };
      }
      // Next account's token is dead — drop it and fall through to full logout.
      store = store.filter((a) => a.id !== next.id);
    }

    await supabase.auth.signOut();
    await writeStore(store);
    return { success: true, switched: false };
  } catch (err) {
    console.error("Logout current account error:", err);
    return { success: false, switched: false };
  }
}
