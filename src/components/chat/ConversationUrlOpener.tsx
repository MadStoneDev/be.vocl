"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Reads ?conversation=<id> from the URL once and dispatches the
// vocl:open-conversation event so the chat sidebar opens to that
// conversation. Used for external deep-links (e.g. email notifications).
// Wrapped in <Suspense> by the parent so its useSearchParams() doesn't
// force the whole layout to bail out of static rendering.
export function ConversationUrlOpener() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    if (!conversationId) return;
    window.dispatchEvent(
      new CustomEvent("vocl:open-conversation", {
        detail: { conversationId },
      }),
    );
    const url = new URL(window.location.href);
    url.searchParams.delete("conversation");
    router.replace(url.pathname + url.search, { scroll: false });
  }, [router, searchParams]);

  return null;
}
