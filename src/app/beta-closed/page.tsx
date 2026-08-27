import type { Metadata } from "next";
import { BetaLogout } from "./BetaLogout";

export const metadata: Metadata = {
  title: "Private beta",
  robots: { index: false, follow: false },
};

export default function BetaClosedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="w-full max-w-md text-center">
        <span className="type-meta uppercase tracking-widest text-vocl-primary font-semibold">
          Private beta
        </span>
        <h1 className="type-display text-3xl sm:text-4xl mt-3 leading-tight">
          You&apos;re early — just not on the beta list yet.
        </h1>
        <p className="type-body text-foreground/65 mt-4">
          be.vocl is in a closed beta right now, and this account doesn&apos;t have
          beta access. Ask an admin to add you, or check back when we open the
          doors to everyone.
        </p>
        <div className="mt-8">
          <BetaLogout />
        </div>
      </div>
    </div>
  );
}
