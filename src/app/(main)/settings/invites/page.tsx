"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconLoader2,
  IconTicket,
  IconCopy,
  IconCheck,
  IconPlus,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconLock,
} from "@tabler/icons-react";
import { Avatar } from "@/components/ui";
import {
  generateInviteCode,
  getMyInviteCodes,
  getCodeUses,
  revokeInviteCode,
} from "@/actions/invites";

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

interface CodeUse {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  usedAt: string;
}

export default function InviteSettingsPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [codesRemaining, setCodesRemaining] = useState(0);
  const [canGenerateCodes, setCanGenerateCodes] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [codeUses, setCodeUses] = useState<Record<string, CodeUse[]>>({});
  const [loadingUses, setLoadingUses] = useState<string | null>(null);

  // Copy state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadCodes = async () => {
    setIsLoading(true);
    const result = await getMyInviteCodes();
    if (result.success) {
      setCodes(result.codes || []);
      setCodesRemaining(result.codesRemaining || 0);
      setCanGenerateCodes(result.canGenerateCodes || false);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await generateInviteCode({ maxUses: 1 });
    if (result.success) {
      loadCodes();
    }
    setGenerating(false);
  };

  const handleRevoke = async (codeId: string) => {
    await revokeInviteCode(codeId);
    loadCodes();
  };

  const toggleExpanded = async (codeId: string) => {
    if (expandedCode === codeId) {
      setExpandedCode(null);
      return;
    }

    setExpandedCode(codeId);

    // Load uses if not already loaded
    if (!codeUses[codeId]) {
      setLoadingUses(codeId);
      const result = await getCodeUses(codeId);
      if (result.success && result.uses) {
        setCodeUses((prev) => ({ ...prev, [codeId]: result.uses! }));
      }
      setLoadingUses(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  const isUnlimited = codesRemaining === -1;
  const canGenerate = canGenerateCodes && (isUnlimited || codesRemaining > 0);

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/settings"
          className="p-2 -ml-2 rounded-xl text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
        >
          <IconArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Invite Codes</h1>
      </div>

      {/* Info Card */}
      {!isLoading && !canGenerateCodes ? (
        // Not a Trusted User - show locked message
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <IconLock size={24} className="text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Invite Codes Locked
              </h3>
              <p className="text-sm text-foreground/60 mb-3">
                Invite codes are currently available only to <strong>Trusted Users</strong>.
                Keep engaging with the community and you may be promoted!
              </p>
              <p className="text-xs text-foreground/40">
                Trusted Users can generate up to 3 invite codes to share with friends.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-vocl-accent/10 border border-vocl-accent/20 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <IconTicket size={24} className="text-vocl-accent flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground mb-1">
                  Invite friends to be.vocl
                </h3>
                <p className="text-sm text-foreground/60">
                  be.vocl is currently in private beta. Share your invite codes with friends
                  to let them join! Each code can only be used once.
                </p>
              </div>
            </div>
          </div>

          {/* Generate Section */}
          <div className="bg-vocl-surface-dark rounded-2xl border border-white/5 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">
                  {isUnlimited ? (
                    "Unlimited codes available"
                  ) : (
                    <>
                      <span className="text-vocl-accent">{codesRemaining}</span> codes remaining
                    </>
                  )}
                </h3>
                <p className="text-sm text-foreground/50">
                  {isUnlimited
                    ? "As a staff member, you can generate unlimited invite codes"
                    : "Generate codes to invite your friends"}
                </p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating || !canGenerate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover disabled:opacity-50 transition-colors"
              >
                {generating ? (
                  <>
                    <IconLoader2 size={18} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <IconPlus size={18} />
                    Generate Code
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Codes List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-12">
          <IconTicket size={48} className="mx-auto mb-4 text-foreground/20" />
          <p className="text-foreground/50 mb-2">No invite codes yet</p>
          <p className="text-sm text-foreground/30">
            Generate a code to start inviting friends
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Your Codes</h2>

          {codes.map((code) => {
            const isExpired = code.expiresAt && new Date(code.expiresAt) < new Date();
            const isExhausted = code.maxUses !== null && code.uses >= code.maxUses;
            const isActive = !code.isRevoked && !isExpired && !isExhausted;
            const isExpanded = expandedCode === code.id;
            const uses = codeUses[code.id] || [];

            return (
              <div
                key={code.id}
                className="bg-vocl-surface-dark rounded-2xl border border-white/5 overflow-hidden"
              >
                {/* Code Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <code className="font-mono text-lg text-vocl-accent bg-vocl-accent/10 px-3 py-1.5 rounded-lg">
                        {code.code}
                      </code>
                      <button
                        onClick={() => copyToClipboard(code.code)}
                        className="p-2 rounded-lg hover:bg-white/5 text-foreground/40 hover:text-foreground transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === code.code ? (
                          <IconCheck size={18} className="text-green-500" />
                        ) : (
                          <IconCopy size={18} />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      {code.isRevoked ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-vocl-like/20 text-vocl-like">
                          Revoked
                        </span>
                      ) : isExpired ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-500">
                          Expired
                        </span>
                      ) : isExhausted ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-500">
                          Used
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Code Stats */}
                  <div className="flex items-center gap-4 mt-3 text-sm text-foreground/50">
                    <span>
                      Used: {code.uses}/{code.maxUses ?? "∞"}
                    </span>
                    <span className="flex items-center gap-1">
                      <IconClock size={14} />
                      {formatTimeAgo(code.createdAt)}
                    </span>
                    {code.expiresAt && (
                      <span>Expires: {formatDate(code.expiresAt)}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    {code.uses > 0 && (
                      <button
                        onClick={() => toggleExpanded(code.id)}
                        className="flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground transition-colors"
                      >
                        {isExpanded ? (
                          <IconChevronUp size={16} />
                        ) : (
                          <IconChevronDown size={16} />
                        )}
                        {code.uses} {code.uses === 1 ? "person" : "people"} invited
                      </button>
                    )}

                    {isActive && (
                      <button
                        onClick={() => handleRevoke(code.id)}
                        className="ml-auto text-sm text-vocl-like/70 hover:text-vocl-like transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Uses List */}
                {isExpanded && (
                  <div className="border-t border-white/5 p-4 bg-background/30">
                    {loadingUses === code.id ? (
                      <div className="flex items-center justify-center py-4">
                        <IconLoader2 size={20} className="animate-spin text-foreground/40" />
                      </div>
                    ) : uses.length === 0 ? (
                      <p className="text-sm text-foreground/40 text-center py-2">
                        No one has used this code yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground/60">
                          People you invited:
                        </h4>
                        {uses.map((use) => (
                          <Link
                            key={use.id}
                            href={`/@${use.username}`}
                            className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors"
                          >
                            <Avatar
                              src={use.avatarUrl}
                              username={use.username}
                              size="md"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground">
                                {use.displayName || `@${use.username}`}
                              </div>
                              <div className="text-sm text-foreground/50">
                                @{use.username}
                              </div>
                            </div>
                            <div className="text-xs text-foreground/40">
                              {formatTimeAgo(use.usedAt)}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
