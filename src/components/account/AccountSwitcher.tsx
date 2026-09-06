"use client";

import { useState, useCallback } from "react";
import {
  IconX,
  IconPlus,
  IconLogout,
  IconLoader2,
  IconCheck,
  IconArrowsExchange,
} from "@tabler/icons-react";
import { Avatar, Portal } from "@/components/ui";
import {
  getSavedAccounts,
  switchAccount,
  addAccount,
  removeAccount,
  logoutCurrentAccount,
  type AccountSummary,
} from "@/actions/accounts";

export function AccountSwitcher({
  collapsed = false,
  username,
  variant = "sidebar",
}: {
  collapsed?: boolean;
  username: string;
  variant?: "sidebar" | "menu-item";
}) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add form
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { accounts } = await getSavedAccounts();
    setAccounts(accounts);
    setLoading(false);
  }, []);

  const openModal = () => {
    setOpen(true);
    setError(null);
    setAdding(false);
    setEmail("");
    setPassword("");
    load();
  };

  const handleSwitch = async (id: string) => {
    setBusyId(id);
    setError(null);
    const res = await switchAccount(id);
    if (res.success) {
      // Hard reload: the browser Supabase client caches the session in memory,
      // so a soft router.refresh() would keep showing the previous account.
      window.location.reload();
    } else {
      setError(res.error || "Couldn't switch accounts.");
      setBusyId(null);
      load();
    }
  };

  const handleRemove = async (id: string) => {
    setBusyId(id);
    const res = await removeAccount(id);
    if (res.success) {
      await load();
    } else {
      setError(res.error || "Couldn't remove that account.");
    }
    setBusyId(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddBusy(true);
    setError(null);
    const res = await addAccount(email, password);
    if (res.success) {
      // Hard reload so the new session (cookies) is picked up everywhere.
      window.location.reload();
      return; // keep the busy spinner while the page reloads
    }
    setAddBusy(false);
    setError(res.error || "Couldn't add that account.");
  };

  const handleLogout = async () => {
    setBusyId("__logout__");
    const res = await logoutCurrentAccount();
    if (res.success && res.switched) {
      window.location.reload();
    } else {
      window.location.href = "/login";
    }
  };

  return (
    <>
      {/* Trigger */}
      {variant === "menu-item" ? (
        <button
          type="button"
          onClick={openModal}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-vocl-hover transition-colors"
        >
          <IconArrowsExchange size={18} className="text-foreground/55" />
          Accounts
        </button>
      ) : (
        <button
          type="button"
          onClick={openModal}
          title={collapsed ? "Accounts" : undefined}
          aria-label="Switch or add account"
          className={`flex items-center mt-1 w-full rounded-sm text-foreground/60 hover:text-foreground hover:bg-vocl-hover transition-all duration-300 ${
            collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
          }`}
        >
          <IconArrowsExchange size={22} aria-hidden="true" className="flex-shrink-0" />
          <span
            className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
              collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
            }`}
          >
            Accounts
          </span>
        </button>
      )}

      {open && (
        <Portal>
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="relative w-full max-w-sm bg-background border border-vocl-border rounded-sm elevate-lg overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
                <div className="min-w-0">
                  <h2 className="type-display text-xl text-foreground leading-none">
                    {adding ? "Add account" : "Accounts"}
                  </h2>
                  <p className="mt-1.5 type-meta text-foreground/50">
                    {adding
                      ? "Sign in — you'll stay signed in here too."
                      : `Signed in as @${username}`}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="-mr-1 -mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm text-foreground/50 hover:text-foreground hover:bg-vocl-hover transition-colors"
                >
                  <IconX size={18} />
                </button>
              </div>

              {error && (
                <div className="mx-5 mb-3 rounded-sm border border-vocl-like/30 bg-vocl-like/10 px-3 py-2">
                  <p className="type-meta text-vocl-like">{error}</p>
                </div>
              )}

              {/* Account list */}
              {!adding && (
                <div className="max-h-72 overflow-y-auto px-3 pb-1">
                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <IconLoader2 size={22} className="animate-spin text-vocl-primary" />
                    </div>
                  ) : (
                    accounts.map((a) => (
                      <div
                        key={a.id}
                        className={`group flex items-center gap-3 px-2.5 py-2.5 rounded-sm transition-colors ${
                          a.isActive
                            ? "bg-vocl-primary/10 ring-1 ring-inset ring-vocl-primary/25"
                            : "hover:bg-vocl-hover"
                        }`}
                      >
                        <button
                          type="button"
                          disabled={a.isActive || busyId !== null}
                          onClick={() => handleSwitch(a.id)}
                          className="flex flex-1 items-center gap-3 min-w-0 text-left disabled:cursor-default"
                        >
                          <Avatar src={a.avatarUrl} username={a.username || "?"} size="md" />
                          <span className="flex flex-col min-w-0">
                            <span className="type-body font-semibold text-foreground truncate">
                              @{a.username}
                            </span>
                            <span className="type-meta text-foreground/45">
                              {a.isActive ? "Current session" : "Tap to switch"}
                            </span>
                          </span>
                        </button>
                        {busyId === a.id ? (
                          <IconLoader2 size={18} className="animate-spin text-vocl-primary flex-shrink-0" />
                        ) : a.isActive ? (
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-vocl-primary text-white">
                            <IconCheck size={14} stroke={3} />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemove(a.id)}
                            title="Remove from this device"
                            aria-label={`Remove @${a.username} from this device`}
                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm text-foreground/35 opacity-0 group-hover:opacity-100 hover:text-vocl-like hover:bg-vocl-like/10 transition-all"
                          >
                            <IconX size={15} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Add form */}
              {adding && (
                <form onSubmit={handleAdd} className="px-5 pb-5 space-y-3">
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-sm bg-vocl-hover text-foreground type-body border border-vocl-border placeholder:text-foreground/40 focus:outline-none focus:border-vocl-primary transition-colors"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-sm bg-vocl-hover text-foreground type-body border border-vocl-border placeholder:text-foreground/40 focus:outline-none focus:border-vocl-primary transition-colors"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAdding(false)}
                      className="flex-1 py-2.5 rounded-sm type-meta font-semibold text-foreground/70 border border-vocl-border hover:bg-vocl-hover transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={addBusy}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-sm bg-vocl-primary type-meta font-semibold text-white hover:bg-vocl-primary-hover transition-colors disabled:opacity-50"
                    >
                      {addBusy ? <IconLoader2 size={16} className="animate-spin" /> : null}
                      Add account
                    </button>
                  </div>
                </form>
              )}

              {/* Footer actions */}
              {!adding && (
                <div className="border-t border-vocl-border p-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(true);
                      setError(null);
                    }}
                    className="flex w-full items-center gap-3 px-2.5 py-2.5 rounded-sm text-foreground/80 hover:bg-vocl-hover transition-colors"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-vocl-hover text-foreground/70">
                      <IconPlus size={18} />
                    </span>
                    <span className="type-body font-medium">Add another account</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={busyId === "__logout__"}
                    className="flex w-full items-center gap-3 px-2.5 py-2.5 rounded-sm text-foreground/80 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors disabled:opacity-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-vocl-hover">
                      {busyId === "__logout__" ? (
                        <IconLoader2 size={18} className="animate-spin" />
                      ) : (
                        <IconLogout size={18} />
                      )}
                    </span>
                    <span className="type-body font-medium">Log out @{username}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
