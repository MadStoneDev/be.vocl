"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  IconX,
  IconPlus,
  IconLogout,
  IconLoader2,
  IconCheck,
  IconUsers,
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
  collapsed,
  username,
}: {
  collapsed: boolean;
  username: string;
}) {
  const router = useRouter();
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
      setOpen(false);
      router.refresh();
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
    setAddBusy(false);
    if (res.success) {
      setOpen(false);
      router.refresh();
    } else {
      setError(res.error || "Couldn't add that account.");
    }
  };

  const handleLogout = async () => {
    setBusyId("__logout__");
    const res = await logoutCurrentAccount();
    if (res.success && res.switched) {
      setOpen(false);
      router.refresh();
    } else {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <>
      {/* Sidebar trigger — replaces the old Logout button */}
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

      {open && (
        <Portal>
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="relative w-full max-w-sm bg-background border border-vocl-border rounded-sm elevate-lg overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-vocl-border">
                <div className="flex items-center gap-2">
                  <IconUsers size={20} className="text-vocl-primary" />
                  <h2 className="type-display text-xl text-foreground">Accounts</h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-full hover:bg-vocl-hover transition-colors"
                >
                  <IconX size={20} className="text-foreground/60" />
                </button>
              </div>

              {error && (
                <div className="px-4 pt-3">
                  <p className="type-body text-vocl-like">{error}</p>
                </div>
              )}

              {/* Account list */}
              {!adding && (
                <div className="max-h-72 overflow-y-auto p-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <IconLoader2 size={22} className="animate-spin text-vocl-primary" />
                    </div>
                  ) : (
                    accounts.map((a) => (
                      <div
                        key={a.id}
                        className={`flex items-center gap-3 p-2.5 rounded-sm ${
                          a.isActive ? "bg-vocl-primary/10" : "hover:bg-vocl-hover"
                        }`}
                      >
                        <button
                          type="button"
                          disabled={a.isActive || busyId !== null}
                          onClick={() => handleSwitch(a.id)}
                          className="flex flex-1 items-center gap-3 min-w-0 text-left disabled:cursor-default"
                        >
                          <Avatar src={a.avatarUrl} username={a.username || "?"} size="sm" />
                          <span className="type-body font-medium text-foreground truncate">
                            @{a.username}
                          </span>
                        </button>
                        {busyId === a.id ? (
                          <IconLoader2 size={18} className="animate-spin text-vocl-primary flex-shrink-0" />
                        ) : a.isActive ? (
                          <span className="flex items-center gap-1 type-meta font-semibold text-vocl-primary flex-shrink-0">
                            <IconCheck size={15} /> Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemove(a.id)}
                            title="Remove from this device"
                            className="p-1.5 rounded-full text-foreground/40 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors flex-shrink-0"
                          >
                            <IconX size={16} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Add form */}
              {adding && (
                <form onSubmit={handleAdd} className="p-4 space-y-3">
                  <p className="type-meta text-foreground/55">
                    Sign in to another account to add it. You&apos;ll stay signed in to
                    this one too.
                  </p>
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
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAdding(false)}
                      className="flex-1 py-2.5 rounded-sm type-meta font-semibold text-foreground/70 hover:bg-vocl-hover transition-colors"
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
                <div className="border-t border-vocl-border p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(true);
                      setError(null);
                    }}
                    className="flex w-full items-center gap-3 p-2.5 rounded-sm text-foreground/70 hover:text-foreground hover:bg-vocl-hover transition-colors"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-vocl-hover">
                      <IconPlus size={18} />
                    </span>
                    <span className="type-body font-medium">Add another account</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={busyId === "__logout__"}
                    className="flex w-full items-center gap-3 p-2.5 rounded-sm text-foreground/70 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors disabled:opacity-50"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-vocl-hover">
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
