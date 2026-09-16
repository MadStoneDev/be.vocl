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
      <title>Admin — Invites | be.vocl</title>
      <div className="flex items-end justify-between gap-4 pt-8 pb-4.5">
        <div>
          <div className="kicker kicker-accent mb-2.5">Records</div>
          <h1 className="type-display text-ink">Invite Codes</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGrantModal(true)}
            className="flex items-center gap-2 border border-foreground text-ink font-sans font-medium uppercase tracking-[0.16em] text-[11.5px] px-[19px] py-2.5 hover:bg-vocl-hover transition-colors"
          >
            <IconGift size={18} />
            <span className="hidden sm:inline">Grant Codes</span>
          </button>
          <button
            onClick={() => {
              setShowGenerateModal(true);
              setGeneratedCodes([]);
            }}
            className="flex items-center gap-2 bg-accent text-white font-sans font-medium uppercase tracking-[0.16em] text-[11.5px] px-5 py-2.5 hover:opacity-[0.88] transition-opacity"
          >
            <IconPlus size={18} />
            <span className="hidden sm:inline">Generate</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="border border-rule p-4">
            <div className="font-display text-3xl leading-none text-ink">{stats.totalCodes}</div>
            <div className="slug text-meta-dim mt-2.5">Total Codes</div>
          </div>
          <div className="border border-rule p-4">
            <div className="font-display text-3xl leading-none text-ink">{stats.activeCodes}</div>
            <div className="slug text-meta-dim mt-2.5">Active Codes</div>
          </div>
          <div className="border border-rule p-4">
            <div className="font-display text-3xl leading-none text-accent">{stats.totalUses}</div>
            <div className="slug text-meta-dim mt-2.5">Total Redemptions</div>
          </div>
          <div className="border border-rule p-4">
            <div className="font-display text-3xl leading-none text-ink">{stats.usersWithCodes}</div>
            <div className="slug text-meta-dim mt-2.5">Users with Codes</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 border-b border-rule pb-3">
        <div className="relative flex-1 max-w-sm">
          <IconSearch
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-meta-dim"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH CODES…"
            className="w-full pl-10 pr-4 pb-1.5 border-b border-rule bg-transparent font-mono text-[11px] tracking-[0.12em] uppercase text-ink placeholder:text-meta-dim focus:outline-none focus:border-foreground"
          />
        </div>
        <label className="flex items-center gap-2 slug text-meta-dim">
          <input
            type="checkbox"
            checked={showRevoked}
            onChange={(e) => setShowRevoked(e.target.checked)}
            className="rounded-none border-rule bg-transparent"
          />
          Show revoked
        </label>
        <button
          onClick={loadData}
          className="p-2 text-meta-dim hover:text-ink transition-colors"
          title="Refresh"
        >
          <IconRefresh size={18} />
        </button>
      </div>

      {/* Codes Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <IconLoader2 size={32} className="animate-spin text-accent" />
        </div>
      ) : filteredCodes.length === 0 ? (
        <div className="text-center py-20">
          <IconTicket size={48} className="mx-auto mb-4 text-meta-dim" />
          <p className="editorial-body text-meta">No invite codes found</p>
        </div>
      ) : (
        <div className="border border-rule overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left px-4 py-3 slug text-meta-dim">
                    Code
                  </th>
                  <th className="text-left px-4 py-3 slug text-meta-dim">
                    Creator
                  </th>
                  <th className="text-left px-4 py-3 slug text-meta-dim">
                    Uses
                  </th>
                  <th className="text-left px-4 py-3 slug text-meta-dim">
                    Expires
                  </th>
                  <th className="text-left px-4 py-3 slug text-meta-dim">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 slug text-meta-dim">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map((code) => {
                  const isExpired = code.expiresAt && new Date(code.expiresAt) < new Date();
                  const isExhausted = code.maxUses !== null && code.uses >= code.maxUses;

                  return (
                    <tr key={code.id} className="border-b border-rule last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono type-body text-accent">
                            {code.code}
                          </code>
                          <button
                            onClick={() => copyToClipboard(code.code)}
                            className="p-1 rounded-none text-meta-dim hover:text-ink transition-colors"
                            title="Copy code"
                          >
                            {copiedCode === code.code ? (
                              <IconCheck size={14} className="text-accent" />
                            ) : (
                              <IconCopy size={14} />
                            )}
                          </button>
                        </div>
                        {code.note && (
                          <div className="editorial-caption text-meta not-italic mt-1">{code.note}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 type-body text-ink-secondary">
                        {code.creatorUsername ? `@${code.creatorUsername}` : "System"}
                      </td>
                      <td className="px-4 py-3 type-body">
                        <span className="text-ink">{code.uses}</span>
                        <span className="text-meta-dim">
                          {" / "}
                          {code.maxUses ?? "∞"}
                        </span>
                      </td>
                      <td className="px-4 py-3 type-body text-meta">
                        {formatDate(code.expiresAt)}
                      </td>
                      <td className="px-4 py-3">
                        {code.isRevoked ? (
                          <span className="inline-flex items-center gap-1 slug text-vocl-like">
                            <IconX size={12} />
                            Revoked
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 slug text-amber-500">
                            Expired
                          </span>
                        ) : isExhausted ? (
                          <span className="inline-flex items-center gap-1 slug text-purple-500">
                            Exhausted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 slug text-accent">
                            <IconCheck size={12} />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!code.isRevoked && (
                          <button
                            onClick={() => handleRevoke(code.id)}
                            className="byline text-ink hover:text-vocl-like transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowGenerateModal(false)}
          />
          <div className="relative w-full max-w-md bg-background border border-rule">
            <div className="p-6">
              <div className="kicker kicker-accent mb-2.5">New codes</div>
              <h2 className="type-heading text-ink mb-4">
                Generate Invite Codes
              </h2>

              {generatedCodes.length > 0 ? (
                // Show generated codes
                <div>
                  <p className="editorial-body text-meta mb-4">
                    Generated {generatedCodes.length} code(s):
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {generatedCodes.map((code) => (
                      <div
                        key={code}
                        className="flex items-center justify-between gap-2 p-3 border border-rule"
                      >
                        <code className="font-mono text-accent">{code}</code>
                        <button
                          onClick={() => copyToClipboard(code)}
                          className="p-2 rounded-none text-meta-dim hover:text-ink transition-colors"
                        >
                          {copiedCode === code ? (
                            <IconCheck size={18} className="text-accent" />
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
                    className="w-full mt-4 px-4 py-2.5 bg-accent text-white font-sans font-medium uppercase tracking-[0.16em] text-xs hover:opacity-[0.88] transition-opacity"
                  >
                    Copy All Codes
                  </button>
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="w-full mt-2 px-4 py-2.5 border border-rule text-ink font-sans font-medium uppercase tracking-[0.16em] text-xs hover:bg-vocl-hover transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                // Show generation form
                <div className="space-y-4">
                  <div>
                    <label className="slug text-meta-dim block mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={generateQuantity}
                      onChange={(e) => setGenerateQuantity(Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-rule bg-transparent text-ink focus:outline-none focus:border-foreground"
                    />
                  </div>

                  <div>
                    <label className="slug text-meta-dim block mb-2">
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
                      className="w-full px-4 py-2.5 border border-rule bg-transparent text-ink placeholder:text-meta-dim focus:outline-none focus:border-foreground"
                    />
                  </div>

                  <div>
                    <label className="slug text-meta-dim block mb-2">
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
                      className="w-full px-4 py-2.5 border border-rule bg-transparent text-ink placeholder:text-meta-dim focus:outline-none focus:border-foreground"
                    />
                  </div>

                  <div>
                    <label className="slug text-meta-dim block mb-2">
                      Note (optional)
                    </label>
                    <input
                      type="text"
                      value={generateNote}
                      onChange={(e) => setGenerateNote(e.target.value)}
                      placeholder="e.g., Beta testers batch 1"
                      className="w-full px-4 py-2.5 border border-rule bg-transparent text-ink placeholder:text-meta-dim focus:outline-none focus:border-foreground"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowGenerateModal(false)}
                      className="flex-1 px-4 py-2.5 border border-rule text-ink font-sans font-medium uppercase tracking-[0.16em] text-xs hover:bg-vocl-hover transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="flex-1 px-4 py-2.5 bg-accent text-white font-sans font-medium uppercase tracking-[0.16em] text-xs hover:opacity-[0.88] transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowGrantModal(false)}
          />
          <div className="relative w-full max-w-md bg-background border border-rule">
            <div className="p-6">
              <div className="kicker kicker-accent mb-2.5">Grant</div>
              <h2 className="type-heading text-ink mb-4">
                Grant Invite Codes to User
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="slug text-meta-dim block mb-2">
                    Search User
                  </label>
                  <div className="relative">
                    <IconSearch
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-meta-dim"
                    />
                    <input
                      type="text"
                      value={grantSearch}
                      onChange={(e) => setGrantSearch(e.target.value)}
                      placeholder="Search by username..."
                      className="w-full pl-10 pr-4 py-2.5 border border-rule bg-transparent text-ink placeholder:text-meta-dim focus:outline-none focus:border-foreground"
                    />
                  </div>

                  {/* Search Results */}
                  {(searchingUsers || grantSearchResults.length > 0) && (
                    <div className="mt-2 bg-background border border-rule overflow-hidden">
                      {searchingUsers ? (
                        <div className="p-4 text-center">
                          <IconLoader2
                            size={20}
                            className="animate-spin mx-auto text-meta-dim"
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
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-vocl-hover transition-colors text-left"
                          >
                            <Avatar
                              src={user.avatarUrl}
                              username={user.username}
                              size="sm"
                            />
                            <div>
                              <div className="font-sans text-sm font-medium text-ink">
                                @{user.username}
                              </div>
                              {user.displayName && (
                                <div className="editorial-caption text-meta not-italic">
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
                  <label className="slug text-meta-dim block mb-2">
                    Number of Codes to Grant
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-rule bg-transparent text-ink focus:outline-none focus:border-foreground"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowGrantModal(false)}
                    className="flex-1 px-4 py-2.5 border border-rule text-ink font-sans font-medium uppercase tracking-[0.16em] text-xs hover:bg-vocl-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGrantCodes}
                    disabled={granting || !grantUserId}
                    className="flex-1 px-4 py-2.5 bg-accent text-white font-sans font-medium uppercase tracking-[0.16em] text-xs hover:opacity-[0.88] transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
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
