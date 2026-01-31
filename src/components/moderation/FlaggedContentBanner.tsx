"use client";

import { IconAlertTriangle } from "@tabler/icons-react";

export function FlaggedContentBanner() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
          <IconAlertTriangle size={20} className="text-amber-500" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Content Under Review
          </h3>
          <p className="text-sm text-foreground/60">
            A post you recently shared may have broken our terms and conditions.
            We are reviewing this and will update you on our decision.
          </p>
        </div>
      </div>
    </div>
  );
}
