"use client";

import { useEffect, useState } from "react";
import {
  IconLoader2,
  IconTicket,
  IconCopy,
  IconCheck,
  IconX,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconGift,
} from "@tabler/icons-react";
import { Avatar } from "@/components/ui";
import {
  adminGenerateInviteCode,
  adminGetAllInviteCodes,
  adminGetInviteStats,
  revokeInviteCode,
  adminGrantInviteCodes,
} from "@/actions/invites";
import { getUsers, type UserWithDetails } from "@/actions/admin";

interface InviteCode {
  id: string;
  code: string;
  creatorId: string | null;
  creatorUsername: string | null;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  isRevoked: boolean;
  note: string | null;
  createdAt: string;
}

interface Stats {
  totalCodes: number;
  activeCodes: number;
  totalUses: number;
  usersWithCodes: number;
}

export default function AdminInvitesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRevoked, setShowRevoked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Generate modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateQuantity, setGenerateQuantity] = useState(1);
  const [generateMaxUses, setGenerateMaxUses] = useState<number | "">(1);
  const [generateExpiresInDays, setGenerateExpiresInDays] = useState<number | "">("");
  const [generateNote, setGenerateNote] = useState("");
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  // Grant codes modal state
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [granting, setGranting] = useState(false);
  const [grantAmount, setGrantAmount] = useState(3);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantSearch, setGrantSearch] = useState("");
  const [grantSearchResults, setGrantSearchResults] = useState<UserWithDetails[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Copy state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [codesResult, statsResult] = await Promise.all([
      adminGetAllInviteCodes({ showRevoked }),
      adminGetInviteStats(),
    ]);

    if (codesResult.success && codesResult.codes) {
      setCodes(codesResult.codes);
    }
    if (statsResult.success && statsResult.stats) {
      setStats(statsResult.stats);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [showRevoked]);

  // Search users for grant modal
  useEffect(() => {
    if (!grantSearch.trim()) {
      setGrantSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      const result = await getUsers({ search: grantSearch, limit: 5 });
      if (result.success && result.users) {
        setGrantSearchResults(result.users);
      }
      setSearchingUsers(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [grantSearch]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedCodes([]);

    const result = await adminGenerateInviteCode({
      quantity: generateQuantity,
      maxUses: generateMaxUses === "" ? undefined : generateMaxUses,
      expiresInDays: generateExpiresInDays === "" ? undefined : generateExpiresInDays,
      note: generateNote || undefined,
    });

    if (result.success && result.codes) {
      setGeneratedCodes(result.codes);
      loadData();
    }

    setGenerating(false);
  };

  const handleRevoke = async (codeId: string) => {
    await revokeInviteCode(codeId);
    loadData();
  };

  const handleGrantCodes = async () => {
    if (!grantUserId) return;

    setGranting(true);
    await adminGrantInviteCodes(grantUserId, grantAmount);
    setShowGrantModal(false);
    setGrantUserId("");
    setGrantSearch("");
    setGrantAmount(3);
    loadData();
    setGranting(false);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredCodes = codes.filter((code) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      code.code.toLowerCase().includes(query) ||
      code.creatorUsername?.toLowerCase().includes(query) ||
      code.note?.toLowerCase().includes(query)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Invite Codes</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrantModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground hover:bg-white/5 transition-colors"
          >
            <IconGift size={18} />
            <span className="hidden sm:inline">Grant Codes</span>
          </button>
          <button
            onClick={() => {
              setShowGenerateModal(true);
              setGeneratedCodes([]);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover transition-colors"
          >
            <IconPlus size={18} />
            <span className="hidden sm:inline">Generate</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-vocl-surface-dark rounded-xl p-4 border border-white/5">
            <div className="text-2xl font-bold text-foreground">{stats.totalCodes}</div>
            <div className="text-sm text-foreground/50">Total Codes</div>
          </div>
          <div className="bg-vocl-surface-dark rounded-xl p-4 border border-white/5">
            <div className="text-2xl font-bold text-green-500">{stats.activeCodes}</div>
            <div className="text-sm text-foreground/50">Active Codes</div>
          </div>
          <div className="bg-vocl-surface-dark rounded-xl p-4 border border-white/5">
            <div className="text-2xl font-bold text-vocl-accent">{stats.totalUses}</div>
            <div className="text-sm text-foreground/50">Total Redemptions</div>
          </div>
          <div className="bg-vocl-surface-dark rounded-xl p-4 border border-white/5">
            <div className="text-2xl font-bold text-foreground">{stats.usersWithCodes}</div>
            <div className="text-sm text-foreground/50">Users with Codes</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <IconSearch
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search codes..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground/60">
          <input
            type="checkbox"
            checked={showRevoked}
            onChange={(e) => setShowRevoked(e.target.checked)}
            className="rounded border-white/10 bg-vocl-surface-dark"
          />
          Show revoked
        </label>
        <button
          onClick={loadData}
          className="p-2 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
          title="Refresh"
        >
          <IconRefresh size={18} />
        </button>
      </div>

      {/* Codes Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
        </div>
      ) : filteredCodes.length === 0 ? (
        <div className="text-center py-20">
          <IconTicket size={48} className="mx-auto mb-4 text-foreground/20" />
          <p className="text-foreground/50">No invite codes found</p>
        </div>
      ) : (
        <div className="bg-vocl-surface-dark rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-sm font-medium text-foreground/50">
                    Code
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-foreground/50">
                    Creator
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-foreground/50">
                    Uses
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-foreground/50">
                    Expires
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-foreground/50">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-foreground/50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map((code) => {
                  const isExpired = code.expiresAt && new Date(code.expiresAt) < new Date();
                  const isExhausted = code.maxUses !== null && code.uses >= code.maxUses;

                  return (
                    <tr key={code.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm text-vocl-accent bg-vocl-accent/10 px-2 py-1 rounded">
                            {code.code}
                          </code>
                          <button
                            onClick={() => copyToClipboard(code.code)}
                            className="p-1 rounded hover:bg-white/5 text-foreground/40 hover:text-foreground transition-colors"
                            title="Copy code"
                          >
                            {copiedCode === code.code ? (
                              <IconCheck size={14} className="text-green-500" />
                            ) : (
                              <IconCopy size={14} />
                            )}
                          </button>
                        </div>
                        {code.note && (
                          <div className="text-xs text-foreground/40 mt-1">{code.note}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground/70">
                        {code.creatorUsername ? `@${code.creatorUsername}` : "System"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-foreground">{code.uses}</span>
                        <span className="text-foreground/40">
                          {" / "}
                          {code.maxUses ?? "∞"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground/50">
                        {formatDate(code.expiresAt)}
                      </td>
                      <td className="px-4 py-3">
                        {code.isRevoked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-vocl-like/20 text-vocl-like">
                            <IconX size={12} />
                            Revoked
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-500">
                            Expired
                          </span>
                        ) : isExhausted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-500">
                            Exhausted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
                            <IconCheck size={12} />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!code.isRevoked && (
                          <button
                            onClick={() => handleRevoke(code.id)}
                            className="px-3 py-1.5 text-xs font-medium text-vocl-like bg-vocl-like/10 rounded-lg hover:bg-vocl-like/20"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowGenerateModal(false)}
          />
          <div className="relative w-full max-w-md mx-4 bg-background border border-white/10 rounded-2xl shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">
                Generate Invite Codes
              </h2>

              {generatedCodes.length > 0 ? (
                // Show generated codes
                <div>
                  <p className="text-sm text-foreground/60 mb-4">
                    Generated {generatedCodes.length} code(s):
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {generatedCodes.map((code) => (
                      <div
                        key={code}
                        className="flex items-center justify-between gap-2 p-3 rounded-xl bg-vocl-surface-dark border border-white/5"
                      >
                        <code className="font-mono text-vocl-accent">{code}</code>
                        <button
                          onClick={() => copyToClipboard(code)}
                          className="p-2 rounded-lg hover:bg-white/5 text-foreground/40 hover:text-foreground transition-colors"
                        >
                          {copiedCode === code ? (
                            <IconCheck size={18} className="text-green-500" />
                          ) : (
                            <IconCopy size={18} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const allCodes = generatedCodes.join("\n");
                      copyToClipboard(allCodes);
                    }}
                    className="w-full mt-4 px-4 py-2.5 rounded-xl bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover"
                  >
                    Copy All Codes
                  </button>
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="w-full mt-2 px-4 py-2.5 rounded-xl border border-white/10 text-foreground hover:bg-white/5"
                  >
                    Done
                  </button>
                </div>
              ) : (
                // Show generation form
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-foreground/50 block mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={generateQuantity}
                      onChange={(e) => setGenerateQuantity(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground focus:outline-none focus:border-vocl-accent"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-foreground/50 block mb-2">
                      Max Uses (empty = unlimited)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={generateMaxUses}
                      onChange={(e) =>
                        setGenerateMaxUses(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="Unlimited"
                      className="w-full px-4 py-2.5 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-foreground/50 block mb-2">
                      Expires In (days, empty = never)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={generateExpiresInDays}
                      onChange={(e) =>
                        setGenerateExpiresInDays(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      placeholder="Never"
                      className="w-full px-4 py-2.5 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-foreground/50 block mb-2">
                      Note (optional)
                    </label>
                    <input
                      type="text"
                      value={generateNote}
                      onChange={(e) => setGenerateNote(e.target.value)}
                      placeholder="e.g., Beta testers batch 1"
                      className="w-full px-4 py-2.5 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowGenerateModal(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-foreground hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {generating ? (
                        <>
                          <IconLoader2 size={18} className="animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <IconPlus size={18} />
                          Generate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grant Codes Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowGrantModal(false)}
          />
          <div className="relative w-full max-w-md mx-4 bg-background border border-white/10 rounded-2xl shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">
                Grant Invite Codes to User
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-foreground/50 block mb-2">
                    Search User
                  </label>
                  <div className="relative">
                    <IconSearch
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
                    />
                    <input
                      type="text"
                      value={grantSearch}
                      onChange={(e) => setGrantSearch(e.target.value)}
                      placeholder="Search by username..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent"
                    />
                  </div>

                  {/* Search Results */}
                  {(searchingUsers || grantSearchResults.length > 0) && (
                    <div className="mt-2 bg-vocl-surface-dark border border-white/10 rounded-xl overflow-hidden">
                      {searchingUsers ? (
                        <div className="p-4 text-center">
                          <IconLoader2
                            size={20}
                            className="animate-spin mx-auto text-foreground/40"
                          />
                        </div>
                      ) : (
                        grantSearchResults.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => {
                              setGrantUserId(user.id);
                              setGrantSearch(`@${user.username}`);
                              setGrantSearchResults([]);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                          >
                            <Avatar
                              src={user.avatarUrl}
                              username={user.username}
                              size="sm"
                            />
                            <div>
                              <div className="font-medium text-foreground">
                                @{user.username}
                              </div>
                              {user.displayName && (
                                <div className="text-xs text-foreground/50">
                                  {user.displayName}
                                </div>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm text-foreground/50 block mb-2">
                    Number of Codes to Grant
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground focus:outline-none focus:border-vocl-accent"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowGrantModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-foreground hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGrantCodes}
                    disabled={granting || !grantUserId}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {granting ? (
                      <>
                        <IconLoader2 size={18} className="animate-spin" />
                        Granting...
                      </>
                    ) : (
                      <>
                        <IconGift size={18} />
                        Grant Codes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
