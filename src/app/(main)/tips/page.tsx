"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { IconLoader2, IconArrowDownLeft, IconArrowUpRight } from "@tabler/icons-react";
import { getTipsReceived, getTipsSent } from "@/actions/payments";

type Tab = "received" | "sent";

interface TipBase {
  id: string;
  amount: number;
  message?: string;
  createdAt: string;
}

interface ReceivedTip extends TipBase {
  senderUsername: string;
  senderAvatarUrl?: string;
}

interface SentTip extends TipBase {
  recipientUsername: string;
  recipientAvatarUrl?: string;
}

export default function TipsPage() {
  const [tab, setTab] = useState<Tab>("received");
  const [received, setReceived] = useState<ReceivedTip[]>([]);
  const [sent, setSent] = useState<SentTip[]>([]);
  const [receivedTotal, setReceivedTotal] = useState(0);
  const [sentTotal, setSentTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [r, s] = await Promise.all([getTipsReceived(50), getTipsSent(50)]);
      if (r.success) {
        setReceived((r.tips as ReceivedTip[]) || []);
        setReceivedTotal(r.totalAmount || 0);
      }
      if (s.success) {
        setSent((s.tips as SentTip[]) || []);
        setSentTotal(s.totalAmount || 0);
      }
      setLoading(false);
    };
    load();
  }, []);

  const items = tab === "received" ? received : sent;

  return (
    <div className="py-6 px-4 max-w-2xl mx-auto">
      <title>Tips | be.vocl</title>
      <header className="mb-6 border-b border-rule pb-5">
        <p className="kicker kicker-accent">The ledger</p>
        <h1 className="type-display text-ink mt-2">Tips</h1>
        <p className="editorial-deck text-meta mt-2">Support — and be supported.</p>
      </header>

      <div className="grid grid-cols-2 border-t border-rule rule-double-b mb-6">
        <div className="py-4 px-4">
          <div className="byline text-meta mb-2 flex items-center gap-1.5">
            <IconArrowDownLeft size={13} aria-hidden="true" /> Received
          </div>
          <p className="font-display text-3xl leading-none text-ink tabular-nums">
            ${(receivedTotal / 100).toFixed(2)}
          </p>
        </div>
        <div className="py-4 px-4 border-l border-rule">
          <div className="byline text-meta mb-2 flex items-center gap-1.5">
            <IconArrowUpRight size={13} aria-hidden="true" /> Sent
          </div>
          <p className="font-display text-3xl leading-none text-ink tabular-nums">
            ${(sentTotal / 100).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="flex gap-6 mb-5 border-b border-rule">
        {(["received", "sent"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            data-active={tab === t}
            className="section-tab capitalize hover:text-ink transition-colors"
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <IconLoader2 size={28} className="animate-spin text-accent" />
        </div>
      ) : items.length === 0 ? (
        <div className="border-y border-rule py-12 text-center">
          <p className="editorial-body text-meta">
            {tab === "received"
              ? "No tips received yet."
              : "You haven't sent any tips yet."}
          </p>
        </div>
      ) : (
        <div className="border-t border-rule">
          {items.map((tip) => {
            const username =
              tab === "received"
                ? (tip as ReceivedTip).senderUsername
                : (tip as SentTip).recipientUsername;
            const avatarUrl =
              tab === "received"
                ? (tip as ReceivedTip).senderAvatarUrl
                : (tip as SentTip).recipientAvatarUrl;
            return (
              <div
                key={tip.id}
                className="flex items-center gap-3 py-3.5 border-b border-rule"
              >
                <Link
                  href={`/profile/${username}`}
                  className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                >
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt={username} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-panel flex items-center justify-center font-display text-ink">
                      {username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="byline text-meta">
                      {tab === "received" ? "From" : "To"}
                    </span>
                    <Link
                      href={`/profile/${username}`}
                      className="text-ink hover:text-accent truncate transition-colors"
                    >
                      @{username}
                    </Link>
                  </div>
                  {tip.message && (
                    <p className="editorial-caption not-italic text-meta mt-0.5 line-clamp-2">
                      {tip.message}
                    </p>
                  )}
                  <p className="slug text-meta-dim mt-1">{tip.createdAt}</p>
                </div>
                <p className="font-display text-lg text-ink tabular-nums">
                  {tab === "received" ? "+" : "−"}${(tip.amount / 100).toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
