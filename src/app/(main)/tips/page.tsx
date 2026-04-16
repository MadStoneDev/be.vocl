"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { IconCoin, IconLoader2, IconArrowDownLeft, IconArrowUpRight } from "@tabler/icons-react";
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
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <IconCoin size={26} className="text-amber-400" />
          Tips
        </h1>
        <p className="text-sm text-foreground/60 mt-1">
          Support — and be supported.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-vocl-surface-dark border border-white/5">
          <div className="flex items-center gap-2 text-xs text-foreground/50 mb-1">
            <IconArrowDownLeft size={14} className="text-emerald-400" /> Received
          </div>
          <p className="text-xl font-bold text-foreground">
            ${(receivedTotal / 100).toFixed(2)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-vocl-surface-dark border border-white/5">
          <div className="flex items-center gap-2 text-xs text-foreground/50 mb-1">
            <IconArrowUpRight size={14} className="text-rose-400" /> Sent
          </div>
          <p className="text-xl font-bold text-foreground">
            ${(sentTotal / 100).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(["received", "sent"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "bg-vocl-accent text-white"
                : "bg-white/5 text-foreground/70 hover:bg-white/10"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <IconLoader2 size={28} className="animate-spin text-vocl-accent" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl bg-white/5 border border-white/5 p-10 text-center">
          <p className="text-foreground/50">
            {tab === "received"
              ? "No tips received yet."
              : "You haven't sent any tips yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
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
                className="flex items-center gap-3 p-3 rounded-xl bg-vocl-surface-dark border border-white/5"
              >
                <Link
                  href={`/profile/${username}`}
                  className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                >
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt={username} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center text-white font-bold">
                      {username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-foreground/50">
                      {tab === "received" ? "From" : "To"}
                    </span>
                    <Link
                      href={`/profile/${username}`}
                      className="font-medium text-foreground hover:text-vocl-accent truncate"
                    >
                      @{username}
                    </Link>
                  </div>
                  {tip.message && (
                    <p className="text-xs text-foreground/70 mt-0.5 line-clamp-2">
                      {tip.message}
                    </p>
                  )}
                  <p className="text-xs text-foreground/40 mt-0.5">{tip.createdAt}</p>
                </div>
                <p
                  className={`text-sm font-bold ${
                    tab === "received" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {tab === "received" ? "+" : "-"}${(tip.amount / 100).toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
