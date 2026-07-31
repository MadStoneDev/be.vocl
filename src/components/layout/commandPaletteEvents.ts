// Lightweight, dependency-free event constants. Kept separate from
// CommandPalette.tsx so importing them doesn't pull the palette (and
// framer-motion) into the base bundle.

/** Dispatch this to open the messages chat sidebar (handled in AppChrome). */
export const OPEN_CHAT_EVENT = "vocl:open-chat";
/** Dispatch this to open the command palette from anywhere. */
export const OPEN_COMMAND_PALETTE_EVENT = "vocl:open-command-palette";
