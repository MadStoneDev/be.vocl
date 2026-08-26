# Group Chat — Implementation Plan

**Date:** 2026-08-26
**Status:** Phase 1 in progress
**Author:** Claude (with Richard)

Adds group conversations to the currently 1:1-only DM system. Grounded in the
existing code (`src/actions/messages.ts`, `src/hooks/useChat.ts`,
`src/components/chat/*`, messaging migrations).

---

## Architecture decision

**A group is a normal conversation with `is_group = true` + a `name`/`owner_id`.**
We do **not** introduce a separate `groups` table or a `conversation_type` enum
with parallel code paths.

Why: the system is already *membership-based* — a conversation is defined by its
`conversation_participants` rows, and the RLS foundation (`is_conversation_member`,
`00003_fix_conversation_rls.sql`), the realtime subscriptions, and the
`get_conversation_previews` RPC are **already N-participant-safe**. Groups reuse
~90% of the read/query/realtime plumbing. The real work is:

1. Breaking every "the other participant" `.single()` derivation, and
2. Generalizing the read-receipt notion.

A separate entity would duplicate all of that for no gain.

---

## The keystone prerequisite (must ship in Phase 1)

`sendMessage` and `getConversations` derive "the other participant" with
`.single()` — which **throws the moment a thread has ≥3 people**:

- `messages.ts:490-510` — `sendMessage` block check (`.neq(...).single()`)
- `messages.ts:540-554` — `sendMessage` notification insert (`.single()`)
- `messages.ts:131-152` / `219-232` — `getConversations` single-peer participant map (silent overwrite on a 2nd participant)

These must become **all-participants** fetches with **per-recipient** filtering:
one blocked pair must **not** nuke a whole group — skip notifications to blocked
members, still deliver to everyone else. (DMs keep the hard "Unable to send"
gate; groups never hard-fail on one block.)

---

## Schema changes (new migration, idempotent style)

`conversations`:
- `is_group boolean NOT NULL DEFAULT false`
- `name text` (nullable — group title)
- `avatar_url text` (nullable — group photo; Phase 3)
- `owner_id uuid REFERENCES profiles(id)` (creator/admin)

`conversation_participants`:
- `role text NOT NULL DEFAULT 'member'` (`'admin' | 'member'`) — Phase 2
- `joined_at timestamptz NOT NULL DEFAULT now()` — Phase 2
- `left_at timestamptz` (nullable — soft-leave / history) — Phase 2

RLS notes:
- `conversation_participants` INSERT currently allows only `profile_id = auth.uid()`
  (self-add). Group **creation** already uses the admin client (bypasses this) —
  fine. **Add-member-to-existing-group** (Phase 2) needs an admin-client action or
  a new "admins can add to their group" policy — reuse the `is_conversation_member`
  SECURITY DEFINER pattern to avoid RLS recursion.
- `get_conversation_previews` already returns last message + unread count N-safely;
  it also returns the last-message `sender_id`, so only a username join is needed
  for "Alice: message" prefixes.

---

## Phases

### Phase 1 — Schema + create/read groups (size M) — **CURRENT**
- Migration: `is_group`, `name`, `owner_id` on `conversations`.
- Fix `sendMessage` `.single()` → batched all-others fetch + per-recipient
  block/notify filter. **(keystone — required before any 3-person thread works)**
- `createGroup(name, participantIds[])` action; DMs keep `startConversation`.
  Groups never dedup; DM dedup constrained to `is_group = false`.
- Generalize `getConversations` / `getMessages` to return `participants[]` +
  `isGroup` / `name` (fix the silent participant-map overwrite at `messages.ts:147`).
- Minimal UI: NewChatModal multi-select + name; ConversationList shows group name;
  ActiveChat header shows name + member count and feeds a `Map<senderId, profile>`
  to `MessageBubble` (per-sender name/avatar — the bubble **already supports** this,
  `MessageBubble.tsx:215-245`).
- Read receipts stay DM-style for now (deferred to Phase 3).
- **Riskiest:** the `sendMessage` block-filter semantics; the `getConversations`
  participant-array refactor.

### Phase 2 — Membership management (size M/L)
- `addParticipant`, `removeParticipant`, `leaveGroup`, `renameGroup`.
- Admin RLS policies (or admin-client actions) for add/remove/rename; owner
  reassignment when the owner leaves.
- GroupInfoPanel UI (member list + roles + add/remove/leave/rename).
- Realtime: participant add/remove subscription; fix the new-member
  list-visibility gap (`useChat.ts:140-156` only refreshes on message INSERT, so a
  freshly-added member won't see the group until a new message arrives).

### Phase 3 — Polish / receipts / permissions (size L)
- Group read receipts ("seen by N" — replaces the single-`otherReadAt` tick at
  `getMessages:407-429` + `useChat.ts:338-361`).
- Multi-user typing text ("Alice and Bob are typing…").
- System/event messages ("X added Y", "Z left") — new `message_type` on `messages`.
- Group avatar upload; admin-only permission gating in the UI.

---

## Component change map (reference)

- **NewChatModal** — add multi-select chips + name input + "Create group" CTA;
  single tap = DM (`NewChatModal.tsx:71-90`).
- **ConversationList** — group name, stacked avatars, "Sender: preview" prefix,
  search matches group name (`ConversationList.tsx:88, 207-254`).
- **ActiveChat** — header name + member count + menu (Group info / Add / Leave);
  per-`senderId` bubble name/avatar instead of the single peer
  (`ActiveChat.tsx:257-376, 442-457`).
- **MessageBubble** — already supports per-sender name/avatar on runs; just needs
  the right data fed in.
- **ChatSidebar** — `participantIds`/online derivation, block/report member picker
  (`ChatSidebar.tsx:72-82, 365-396`).
- **useChat** — `Conversation.participants[]` + `isGroup`/`name`;
  `startNewGroup(name, ids[])`.
