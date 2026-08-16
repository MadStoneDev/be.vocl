"use client";

import { IconRefresh } from "@tabler/icons-react";

/**
 * Shown by the error boundaries when a deployment-skew error is detected. A full
 * reload (not the boundary's reset(), which re-renders the same stale bundle)
 * pulls the current build.
 */
export function DeploymentSkewNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="text-center max-w-md">
        <span className="type-meta uppercase tracking-[0.25em] text-vocl-primary font-semibold">
          be.vocl · New edition
        </span>
        <h1 className="type-display text-3xl font-bold text-foreground mt-2 leading-tight">
          A fresh edition just dropped
        </h1>
        <div className="my-5 border-t-4 border-double border-vocl-border" />
        <p className="type-body text-foreground/55 mb-6">
          be.vocl was updated while this page was open, so that last action
          didn&apos;t go through. Reload to pick up the latest — you&apos;ll stay
          signed in and can try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-vocl-primary hover:bg-vocl-primary-hover text-white rounded-sm type-meta uppercase tracking-widest font-semibold transition-colors"
        >
          <IconRefresh className="w-5 h-5" />
          Reload
        </button>
      </div>
    </div>
  );
}
