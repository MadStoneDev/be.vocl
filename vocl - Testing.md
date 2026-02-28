# vocl -- Testing Document

| Field          | Value                                                           |
| -------------- | --------------------------------------------------------------- |
| **Project**    | vocl                                                            |
| **Version**    | 1.0                                                             |
| **Stack**      | Next.js 16, React 19, Supabase, TailwindCSS 4, Cloudflare R2   |
| **Updated**    | 2026-02-27                                                      |
| **Maintainer** | vocl QA Team                                                    |

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Onboarding](#2-onboarding)
3. [User Profile](#3-user-profile)
4. [Post Creation](#4-post-creation)
5. [Social Feed & Interaction](#5-social-feed--interaction)
6. [Chat & Messaging](#6-chat--messaging)
7. [Search & Discovery](#7-search--discovery)
8. [Tag System](#8-tag-system)
9. [Notifications](#9-notifications)
10. [Queue System](#10-queue-system)
11. [Ask System](#11-ask-system)
12. [Reblog System](#12-reblog-system)
13. [Admin & Moderation](#13-admin--moderation)
14. [Content Moderation](#14-content-moderation)
15. [User Actions (Block / Mute)](#15-user-actions-block--mute)
16. [Media & Uploads](#16-media--uploads)
17. [Settings Pages](#17-settings-pages)
18. [Tips & Payments](#18-tips--payments)
19. [Invite System](#19-invite-system)
20. [Email System](#20-email-system)
21. [Navigation & Layout](#21-navigation--layout)
22. [Security](#22-security)
23. [Performance & Edge Cases](#23-performance--edge-cases)
24. [Responsive & Cross-Browser](#24-responsive--cross-browser)
25. [Known Gaps](#25-known-gaps)
26. [Sign-Off](#26-sign-off)

---

## 1. Authentication

### 1a. Signup

- [ ] **Email signup** -- Create a new account with a valid email and password; user receives a confirmation email and is redirected to onboarding after verification
- [ ] **Invite code required** -- Signup form requires a valid invite code in VOCL-XXXX-XXXX format before allowing registration
- [ ] **Invalid invite code** -- Submitting a revoked, expired, or max-used invite code shows an appropriate error message
- [ ] **Duplicate email** -- Attempting to sign up with an already-registered email shows a clear error
- [ ] **Weak password** -- Submitting a password that does not meet Supabase minimum requirements shows a validation error
- [ ] **Empty fields** -- Submitting the signup form with blank email or password shows field-level validation errors

### 1b. Login

- [ ] **Valid credentials** -- Logging in with correct email and password redirects to the feed
- [ ] **Invalid credentials** -- Logging in with incorrect email or password shows a descriptive error message
- [ ] **Rate-limited login** -- After 5 failed attempts within 15 minutes, the next attempt is blocked with a rate-limit error
- [ ] **Banned user login** -- A banned user logging in is redirected to the /account-status page with ban reason displayed
- [ ] **Restricted user login** -- A restricted user can log in but sees a warning banner about restricted posting

### 1c. Password Reset

- [ ] **Request reset** -- Entering a registered email sends a password reset email and shows a confirmation message
- [ ] **Complete reset** -- Clicking the reset link allows setting a new password; login works with the new password
- [ ] **Invalid reset link** -- Using an expired or already-used reset link shows an error

### 1d. Session & Routing

- [ ] **Protected route redirect** -- Visiting /feed, /queue, /settings, or /notifications while logged out redirects to the login page
- [ ] **Public routes accessible** -- /privacy, /terms, and /account-status are accessible without authentication
- [ ] **Session persistence** -- Refreshing the page while logged in maintains the authenticated session
- [ ] **Token refresh** -- After the session token expires, the middleware refreshes it transparently without logging the user out

---

## 2. Onboarding

- [ ] **Onboarding redirect** -- After first login, users without a display name are redirected to /onboarding
- [ ] **Display name required** -- The onboarding form requires a display name before submission
- [ ] **Optional fields** -- Bio, avatar upload, timezone, and sensitive-content preferences are optional and save correctly
- [ ] **Timezone auto-detect** -- The timezone field auto-detects the user's browser timezone
- [ ] **Completion redirect** -- Submitting the onboarding form redirects to the feed and sets onboarding_completed to true
- [ ] **Skip onboarding re-entry** -- A user who has completed onboarding is not redirected to /onboarding on future logins

---

## 3. User Profile

### 3a. Profile Display

- [ ] **Profile page loads** -- Visiting /profile/{username} displays the user's avatar, header image, display name, bio, and profile links
- [ ] **Profile stats** -- Post count, follower count, and following count display correctly
- [ ] **Profile tabs** -- Posts, likes, and comments tabs show the correct filtered content
- [ ] **Pinned post** -- A pinned post appears at the top of the user's post list with a pin indicator
- [ ] **Staff badge** -- Users with role >= 5 display a staff badge next to their name
- [ ] **Verification badge** -- Verified users display a verification badge next to their name
- [ ] **Follow button** -- Visiting another user's profile shows a follow/unfollow button
- [ ] **Ask button** -- If the user allows asks, an ask button is visible on their profile

### 3b. Profile Editing

- [ ] **Update display name** -- Changing the display name in settings persists and is reflected on the profile page
- [ ] **Update bio** -- Changing the bio text saves correctly and displays on the profile
- [ ] **Upload avatar** -- Uploading a new avatar image saves to R2 and displays on the profile
- [ ] **Upload header** -- Uploading a new header image saves to R2 and displays on the profile
- [ ] **Profile links** -- Adding a profile link with title and URL creates a clickable link on the profile page
- [ ] **Remove profile link** -- Deleting a profile link removes it from the profile
- [ ] **Invalid profile link URL** -- Submitting a javascript: or data: URL as a profile link shows an error about invalid URL
- [ ] **Username change** -- Updating the username with a valid, available username persists the change
- [ ] **Username taken** -- Attempting to set a username already in use shows a "Username is already taken" error
- [ ] **Username validation** -- Usernames that fail format validation (special characters, too short, too long) show a format error
- [ ] **Timezone selection** -- Selecting a timezone from the dropdown persists the choice

### 3c. Privacy Controls

- [ ] **Hide likes** -- Toggling "show likes" off hides the likes tab from other users viewing the profile
- [ ] **Hide comments** -- Toggling "show comments" off hides the comments tab from other users
- [ ] **Hide followers** -- Toggling "show followers" off hides the follower count and list from other users
- [ ] **Hide following** -- Toggling "show following" off hides the following count and list from other users
- [ ] **Sensitive content toggle** -- Enabling "show sensitive posts" allows sensitive posts to appear in the feed
- [ ] **Blur sensitive default** -- Enabling "blur sensitive by default" shows an NSFW overlay on sensitive posts requiring a click to reveal

---

## 4. Post Creation

### 4a. Text Posts

- [ ] **Create text post** -- Writing text in the TipTap editor and publishing creates a visible text post in the feed
- [ ] **Rich text formatting** -- Bold, italic, links, and lists in the TipTap editor render correctly in the published post
- [ ] **Mentions in text** -- Typing @username in the editor creates a clickable mention and triggers a notification for the mentioned user
- [ ] **Link previews** -- Pasting a URL in the text editor generates an OpenGraph link preview

### 4b. Image Posts

- [ ] **Single image upload** -- Uploading one image creates an image post with the image displayed
- [ ] **Gallery upload** -- Uploading multiple images creates a gallery post type with all images displayed
- [ ] **Alt text** -- Adding alt text to images persists and is used as the alt attribute in the rendered img tag
- [ ] **Image caption** -- Adding a caption to an image post displays below the image

### 4c. Video Posts

- [ ] **YouTube embed** -- Pasting a YouTube URL creates a video post with an embedded YouTube player
- [ ] **Vimeo embed** -- Pasting a Vimeo URL creates a video post with an embedded Vimeo player
- [ ] **TikTok embed** -- Pasting a TikTok URL creates a video post with an embedded TikTok player
- [ ] **Direct video upload** -- Uploading an MP4 or WebM file creates a video post with a native video player

### 4d. Audio Posts

- [ ] **Spotify search** -- Searching for a track in the Spotify search dialog returns results with track name, artist, and album art
- [ ] **Spotify embed** -- Selecting a Spotify track creates an audio post with an embedded Spotify player and album art thumbnail
- [ ] **Direct audio upload** -- Uploading an MP3, WAV, or M4A file creates an audio post with a native audio player

### 4e. Poll Posts

- [ ] **Create poll** -- Creating a poll with a question and 2+ options publishes a poll post
- [ ] **Poll expiration** -- Setting an expiration date/time prevents voting after the deadline
- [ ] **Show results toggle** -- When "show results" is off, results are hidden until the user votes or the poll expires
- [ ] **Multiple choice toggle** -- Enabling multiple choice allows selecting more than one option
- [ ] **Vote in poll** -- Clicking an option records the vote and displays updated percentages
- [ ] **Change vote** -- Clicking a different option updates the user's vote
- [ ] **Remove vote** -- Removing a vote decrements the vote count for that option
- [ ] **Expired poll** -- Attempting to vote on an expired poll shows a "This poll has expired" error

### 4f. Publishing & Tags

- [ ] **Publish now** -- Creating a post with "Now" mode immediately publishes it to the feed with a published_at timestamp
- [ ] **Queue post** -- Creating a post with "Queue" mode sets status to queued and assigns a queue position
- [ ] **Schedule post** -- Creating a post with "Schedule" mode and a future date/time sets status to scheduled
- [ ] **Add tags** -- Entering comma-separated or enter-delimited tags attaches them to the post
- [ ] **Tag normalization** -- Tags are lowercased, trimmed, and stripped of leading # characters
- [ ] **Sensitivity toggle** -- Marking a post as sensitive sets is_sensitive to true and triggers an NSFW overlay for viewers
- [ ] **Restricted user blocked** -- A user with lock_status of "restricted" or "banned" receives an error when attempting to create a post

---

## 5. Social Feed & Interaction

### 5a. Feed Display

- [ ] **Feed loads** -- The feed page displays published posts in reverse chronological order
- [ ] **SSR + React Query** -- The initial feed is server-rendered, and additional pages load via React Query infinite scroll
- [ ] **Followed users feed** -- When logged in with followed users, the feed shows posts only from followed users and the current user
- [ ] **Global feed fallback** -- When the user follows no one, the feed shows all public published posts
- [ ] **Pagination** -- Scrolling to the bottom loads the next page of 20 posts via cursor-based pagination
- [ ] **Empty feed** -- A user following no one with no public posts sees an empty state message

### 5b. Post Interactions

- [ ] **Like post** -- Clicking the like button increments the like count and fills the heart icon
- [ ] **Unlike post** -- Clicking the like button again decrements the like count and unfills the heart icon
- [ ] **Comment on post** -- Submitting a comment (up to 2000 characters) appends it to the post's comment list
- [ ] **Comment sanitization** -- HTML tags in comment text are sanitized to prevent XSS
- [ ] **Empty comment rejected** -- Submitting an empty comment shows a "Comment cannot be empty" error
- [ ] **Comment too long** -- Submitting a comment over 2000 characters shows a "Comment is too long" error
- [ ] **Delete own comment** -- Deleting your own comment removes it and its associated notification
- [ ] **Cannot delete others' comments** -- Attempting to delete another user's comment shows an error
- [ ] **Mention in comment** -- Typing @username in a comment triggers a mention notification for that user
- [ ] **View post detail** -- Clicking on a post opens the /post/{id} detail page with full content and all comments
- [ ] **Post not found** -- Visiting /post/{invalid-id} shows a "Post not found" error

### 5c. Follow System

- [ ] **Follow user** -- Clicking follow on a profile creates a follow relationship and sends a notification
- [ ] **Unfollow user** -- Clicking unfollow removes the follow relationship
- [ ] **Cannot follow self** -- Attempting to follow yourself shows an error
- [ ] **Blocked user cannot follow** -- A blocked user cannot follow the user who blocked them
- [ ] **Followers list** -- Viewing a user's followers modal shows a paginated list of followers
- [ ] **Following list** -- Viewing a user's following modal shows a paginated list of users they follow

---

## 6. Chat & Messaging

### 6a. Conversations

- [ ] **Start conversation** -- Opening a new chat with another user creates a conversation and shows the chat window
- [ ] **Cannot message self** -- Attempting to start a conversation with yourself shows an error
- [ ] **Existing conversation reuse** -- Starting a chat with someone you already have a conversation with opens the existing conversation
- [ ] **Conversation list** -- The chat sidebar shows all conversations sorted by most recent message
- [ ] **Last message preview** -- Each conversation in the list displays a preview of the last message and relative timestamp
- [ ] **Unread count** -- Conversations with unread messages show a count badge

### 6b. Messaging

- [ ] **Send message** -- Typing and sending a message appends it to the conversation and notifies the recipient
- [ ] **Media attachment** -- Attaching an image or file to a message sends it with the message
- [ ] **Edit message** -- Editing a sent message updates its content and marks it as edited
- [ ] **Delete message** -- Deleting a message soft-deletes it so it shows as "deleted" in the conversation
- [ ] **Only own messages editable** -- Attempting to edit/delete another user's message has no effect
- [ ] **Message rate limit** -- Sending more than 100 messages per minute shows a "sending too quickly" error
- [ ] **Mark as read** -- Opening a conversation marks all messages as read and clears the unread badge

### 6c. Real-time Features

- [ ] **Online status** -- Users with an active session show a green online indicator
- [ ] **Typing indicator** -- When the other user is typing, a typing indicator is displayed
- [ ] **Real-time delivery** -- Messages appear in the recipient's chat without needing a page refresh

---

## 7. Search & Discovery

- [ ] **Search users by username** -- Typing a username in the search bar returns matching user results with avatars and follower counts
- [ ] **Search users by display name** -- Searching by display name returns matching users
- [ ] **@ prefix shortcut** -- Typing @john in the search bar strips the @ and searches users
- [ ] **Search tags** -- Typing a tag name returns matching tags with post counts, sorted by popularity
- [ ] **# prefix shortcut** -- Typing #art in the search bar strips the # and searches tags
- [ ] **Search posts** -- Searching text content returns matching published posts (plain text and HTML content)
- [ ] **Sensitive content warning** -- Searching for NSFW keywords (e.g., "nsfw", "nude") shows a sensitive content warning modal if the user has not enabled sensitive content
- [ ] **Sensitive content filtered** -- Users who have not enabled "show sensitive posts" do not see sensitive posts in search results
- [ ] **Trending tags** -- The discovery page displays trending tags ordered by post count
- [ ] **Suggested users** -- The discovery page suggests users the current user is not following, sorted by follower count
- [ ] **Empty search results** -- Searching for a term with no matches shows an empty state

---

## 8. Tag System

- [ ] **Tag page** -- Visiting /tag/{tagname} displays all posts with that tag
- [ ] **Case-insensitive matching** -- Visiting /tag/Art and /tag/art show the same results
- [ ] **Follow tag** -- Clicking follow on a tag page subscribes the user to that tag
- [ ] **Unfollow tag** -- Clicking unfollow on a followed tag removes the subscription
- [ ] **Tag creation during post** -- Adding a new tag during post creation creates the tag in the database
- [ ] **Existing tag reuse** -- Adding a tag that already exists links to the existing tag rather than creating a duplicate
- [ ] **Tag not found** -- Visiting /tag/{nonexistent} shows a "Tag not found" error

---

## 9. Notifications

### 9a. Notification Types

- [ ] **Follow notification** -- Following a user generates a "follow" notification for the target
- [ ] **Like notification** -- Liking a post generates a "like" notification for the post author
- [ ] **Comment notification** -- Commenting on a post generates a "comment" notification for the post author (not self)
- [ ] **Reblog notification** -- Reblogging a post generates a "reblog" notification for the original author
- [ ] **Mention notification** -- Mentioning @username in a post or comment generates a "mention" notification
- [ ] **Message notification** -- Sending a chat message generates a "message" notification for the recipient
- [ ] **No self-notification** -- Actions on your own posts (liking, commenting) do not generate notifications

### 9b. Notification Management

- [ ] **Notification list** -- The /notifications page shows all notifications in reverse chronological order with actor avatar, type, and relative timestamp
- [ ] **Unread count badge** -- The notification bell icon shows the count of unread notifications
- [ ] **Mark as read** -- Clicking a notification marks it as read
- [ ] **Mark all as read** -- Clicking "mark all as read" sets all notifications to read
- [ ] **Clear all** -- Clicking "clear all" deletes all notifications for the user
- [ ] **Empty state** -- A user with no notifications sees an empty state message

---

## 10. Queue System

- [ ] **Add to queue** -- Creating a post with "Queue" publish mode adds it to the queue with an auto-assigned position
- [ ] **View queue** -- The /queue page displays all queued posts in position order
- [ ] **Reorder queue** -- Dragging a queued post to a new position updates queue_position values for all affected posts
- [ ] **Publish now override** -- Clicking "publish now" on a queued post immediately publishes it and removes it from the queue
- [ ] **Remove from queue** -- Clicking "remove" on a queued post soft-deletes it
- [ ] **Queue settings** -- The queue settings panel allows configuring posts per day and the publishing time window
- [ ] **Queue pause/resume** -- Pausing the queue prevents automatic publishing; resuming restores it
- [ ] **Cron processing** -- The /api/cron/queue endpoint publishes the next queued post within the configured time window
- [ ] **Empty queue** -- A user with no queued posts sees an empty state message

---

## 11. Ask System

- [ ] **Send ask** -- Submitting a question (up to 500 characters) to another user creates a pending ask
- [ ] **Anonymous ask** -- Sending an anonymous ask stores sender_id as null and shows "Anonymous" to the recipient
- [ ] **Named ask** -- Sending a non-anonymous ask includes the sender's identity
- [ ] **Empty ask rejected** -- Submitting an empty question shows a "Question cannot be empty" error
- [ ] **Ask too long** -- Submitting a question over 500 characters shows a "Question is too long" error
- [ ] **Cannot ask self** -- Attempting to send an ask to yourself shows an error
- [ ] **Asks disabled** -- Sending an ask to a user who has disabled asks shows "This user is not accepting asks"
- [ ] **Anonymous asks disabled** -- Sending an anonymous ask to a user who disallows anonymous asks shows an error
- [ ] **Blocked user cannot ask** -- A user blocked by the recipient cannot send asks
- [ ] **Rate limit** -- Sending more than 20 asks per hour shows a rate-limit error
- [ ] **View inbox** -- The /asks page displays all pending asks for the current user
- [ ] **Answer ask** -- Answering an ask creates an ask-type post with the question and answer, and marks the ask as answered
- [ ] **Delete/ignore ask** -- Deleting an ask marks it as deleted and removes it from the inbox
- [ ] **Ask settings** -- Toggling allow_asks and allow_anonymous_asks in privacy settings persists correctly

---

## 12. Reblog System

- [ ] **Instant reblog** -- Clicking reblog with instant mode immediately creates a reblog post in the feed
- [ ] **Standard reblog** -- Choosing standard reblog opens a dialog to add a comment before reblogging
- [ ] **Queue reblog** -- Choosing queue mode adds the reblog to the user's queue
- [ ] **Schedule reblog** -- Choosing schedule mode with a date/time schedules the reblog
- [ ] **Reblog comment** -- Adding a comment to a reblog stores it as reblog_comment_html
- [ ] **Reblog chain** -- Reblogging a reblog correctly sets original_post_id to the true original post
- [ ] **Reblog notification** -- Reblogging sends a notification to the original post author (not self)
- [ ] **Reblog count** -- The reblog count on a post increments after reblogging
- [ ] **View rebloggers** -- The "reblogged by" list shows users who have reblogged the post

---

## 13. Admin & Moderation

### 13a. Admin Dashboard

- [ ] **Access control** -- Users with role < 5 are denied access to /admin routes
- [ ] **Dashboard stats** -- The admin dashboard displays pending reports, pending flags, pending appeals, escalated items, banned users, and restricted users counts
- [ ] **Stats filtered by role** -- Staff members only see items at or below their role level

### 13b. Report Management

- [ ] **View reports** -- The /admin/reports page lists all reports with reporter, reported user, subject, status, and timestamp
- [ ] **Filter by status** -- Filtering reports by pending, reviewing, escalated, or resolved shows only matching reports
- [ ] **Claim report** -- A moderator can claim an unassigned report, setting status to "reviewing"
- [ ] **Resolve as ban** -- Resolving a report as "ban" bans the reported user and updates the report status
- [ ] **Resolve as restrict** -- Resolving as "restrict" restricts the reported user from posting
- [ ] **Resolve as dismiss** -- Resolving as "dismiss" closes the report without action
- [ ] **Escalate report** -- Escalating a report to a higher role level reassigns it and notifies higher-level staff
- [ ] **Cannot moderate equal/higher role** -- A moderator cannot resolve reports against users with equal or higher role

### 13c. Flag Management

- [ ] **View flags** -- The /admin/flags page lists all content flags with post preview, subject, and status
- [ ] **Flag resolution** -- Resolving a flag as "remove" changes the post's moderation_status to removed; "dismiss" restores it to approved; "sensitive" marks it as sensitive

### 13d. User Management

- [ ] **Search users** -- The admin user search finds users by username
- [ ] **Ban user** -- Banning a user sets their lock_status to "banned" with a ban reason and creates an audit log
- [ ] **Restrict user** -- Restricting a user sets their lock_status to "restricted" and creates an audit log
- [ ] **Unlock user** -- Unlocking a banned/restricted user restores their lock_status to "unlocked"
- [ ] **Set user role** -- An admin can change a user's role level (cannot change own role or modify equal/higher roles)
- [ ] **Role promotion grants invites** -- Promoting a user to Trusted User (role 1) grants them 3 invite codes

### 13e. Appeal Management

- [ ] **View appeals** -- The /admin/appeals page lists all ban appeals with user, reason, status, and timestamp
- [ ] **Approve appeal** -- Approving an appeal unlocks the user's account
- [ ] **Deny appeal** -- Denying an appeal keeps the user banned and updates the appeal status
- [ ] **Block future appeals** -- Blocking an appeal sets appeals_blocked on the user's profile, preventing new appeals

---

## 14. Content Moderation

- [ ] **Auto-scan images** -- Uploading images to a post triggers SightEngine moderation for nudity, gore, and child safety
- [ ] **Auto-scan videos** -- Uploading video content triggers SightEngine moderation on the video and thumbnail
- [ ] **Flagged content held** -- Content flagged by auto-moderation is set to "draft" status and not published
- [ ] **Auto-report created** -- Flagged content automatically creates a report with source "auto_moderation" and subject "minor_safety"
- [ ] **Admin notified** -- Admins (role >= 10) receive notifications when content is auto-flagged
- [ ] **Suggest sensitive** -- Content detected with nudity or moderate gore is auto-tagged as sensitive even if the user did not toggle it
- [ ] **Moderation fail-open** -- If the SightEngine API is unavailable, content is published without blocking (fail open)
- [ ] **Report user** -- Submitting a report against another user with a subject (harassment, spam, etc.) creates a pending report
- [ ] **Duplicate report blocked** -- Reporting the same user twice while the first report is still pending shows an error
- [ ] **Cannot report self** -- Attempting to report yourself shows an error
- [ ] **Report rate limit** -- Submitting more than 10 reports per hour shows a rate-limit error

---

## 15. User Actions (Block / Mute)

- [ ] **Block user** -- Blocking a user removes all follow relationships between both users and creates a block record
- [ ] **Blocked user hidden** -- A blocked user's posts do not appear in the blocker's feed
- [ ] **Blocked user cannot follow** -- A blocked user cannot follow the blocker
- [ ] **Blocked user cannot ask** -- A blocked user cannot send asks to the blocker
- [ ] **Unblock user** -- Unblocking a user removes the block record and restores the ability to interact
- [ ] **Mute user** -- Muting a user hides their posts from the muter's feed without removing follow relationships
- [ ] **Unmute user** -- Unmuting a user restores their posts in the feed

---

## 16. Media & Uploads

- [ ] **Presigned URL** -- Requesting an upload URL returns a valid presigned URL for Cloudflare R2
- [ ] **Image formats** -- JPG, PNG, WebP, and GIF images upload and display correctly
- [ ] **Video formats** -- MP4 and WebM videos upload and play correctly
- [ ] **Audio formats** -- MP3, WAV, and M4A audio files upload and play correctly
- [ ] **File size limit** -- Uploading a file exceeding the size limit shows an error
- [ ] **Upload rate limit** -- Uploading more than 50 files per hour shows a rate-limit error
- [ ] **NSFW overlay** -- Sensitive images display with a blur overlay that reveals on click
- [ ] **MIME type validation** -- Uploading a file with an unsupported MIME type is rejected

---

## 17. Settings Pages

### 17a. Profile Settings

- [ ] **Load profile settings** -- The /settings/profile page pre-fills display name, bio, avatar, header, links, and timezone
- [ ] **Save profile settings** -- Saving updated profile fields persists the changes and shows a success toast

### 17b. Password Settings

- [ ] **Change password** -- The /settings/password page allows changing the password; the new password works on next login

### 17c. Notification Settings

- [ ] **Load notification prefs** -- The /settings/notifications page shows per-type toggles and email frequency options
- [ ] **Update email frequency** -- Setting email notifications to immediate, daily digest, or off persists correctly
- [ ] **Per-type toggles** -- Toggling individual notification types (follow, like, comment, reblog, mention) on/off persists

### 17d. Privacy Settings

- [ ] **Load privacy settings** -- The /settings/privacy page shows current visibility toggles, sensitive content options, and ask settings
- [ ] **Save privacy settings** -- Updating visibility toggles and content settings persists the changes

### 17e. Appearance Settings

- [ ] **Theme toggle** -- The /settings/appearance page allows switching between dark and light themes; the choice persists across sessions

### 17f. Invite Settings

- [ ] **View invite codes** -- The invite settings page shows all generated invite codes with their status, uses, and expiration
- [ ] **Generate code** -- Trusted Users (role >= 1) can generate invite codes in VOCL-XXXX-XXXX format
- [ ] **Regular user cannot generate** -- Users with role 0 see a message that they need Trusted User status to generate codes
- [ ] **No codes remaining** -- A non-staff user with 0 remaining codes sees an error when attempting to generate

---

## 18. Tips & Payments

- [ ] **Tip modal opens** -- Clicking the tip button on a user's profile opens the TipModal with Small, Medium, and Large options
- [ ] **Initiate tip** -- Selecting a tip amount creates a pending tip record and initiates Paddle checkout
- [ ] **Optional message** -- Adding a message (up to 280 characters) with a tip saves the message
- [ ] **Cannot self-tip** -- Attempting to tip yourself shows a "You cannot tip yourself" error
- [ ] **Complete tip** -- After successful Paddle payment, the tip status updates to "completed" and the recipient is notified
- [ ] **View received tips** -- The tips page shows completed tips with sender, amount, message, and timestamp
- [ ] **Verification purchase** -- Clicking "Get Verified" initiates a Paddle purchase for the verification badge
- [ ] **Already verified** -- A verified user attempting to purchase verification again sees "You are already verified"

---

## 19. Invite System

- [ ] **Code format** -- Generated invite codes follow the VOCL-XXXX-XXXX format using only unambiguous characters
- [ ] **Single-use default** -- User-generated codes default to max_uses of 1
- [ ] **Max uses enforced** -- An invite code that has reached max_uses is rejected with "reached its maximum uses"
- [ ] **Expiration enforced** -- An expired invite code is rejected with "This invite code has expired"
- [ ] **Revocation** -- Revoking an invite code marks it as revoked; it is rejected on future use
- [ ] **Usage tracking** -- The code detail view shows which users redeemed the code and when
- [ ] **Staff unlimited codes** -- Staff (role >= 5) can generate unlimited codes without decrementing a remaining count
- [ ] **Trusted User codes** -- Trusted Users (role >= 1) have a limited number of invite codes that decrements on generation
- [ ] **Admin bulk generate** -- Admins can batch-generate up to 100 codes at once with custom max_uses and expiration
- [ ] **Admin grant codes** -- Admins can grant additional invite code allocations to specific users
- [ ] **Case-insensitive validation** -- Entering a code in lowercase normalizes to uppercase for validation

---

## 20. Email System

- [ ] **Welcome email** -- A new user receives a styled welcome email after signup
- [ ] **Password reset email** -- Requesting a password reset sends a styled email with a reset link
- [ ] **Follow notification email** -- Users with email notifications enabled receive an email when followed
- [ ] **Like notification email** -- Users with email notifications enabled receive an email when a post is liked
- [ ] **Comment notification email** -- Users with email notifications enabled receive an email when someone comments on their post
- [ ] **Reblog notification email** -- Users with email notifications enabled receive an email when a post is reblogged
- [ ] **Mention notification email** -- Users with email notifications enabled receive an email when mentioned
- [ ] **Daily digest email** -- Users set to daily digest receive a batched email of the day's notifications via the /api/cron/digest endpoint
- [ ] **Unsubscribe** -- Clicking the unsubscribe link in a notification email disables that notification type
- [ ] **Admin announcement** -- Admins can send announcement emails to all users via the /admin/email tool

---

## 21. Navigation & Layout

- [ ] **Left sidebar** -- The desktop sidebar displays navigation links for feed, notifications, queue, profile, search, settings, and admin (if authorized)
- [ ] **Bottom nav (mobile)** -- On mobile viewports, a bottom navigation bar replaces the sidebar
- [ ] **FAB button** -- The floating action button for creating posts is visible on all main pages
- [ ] **FAB hidden when chat open** -- The FAB is hidden when the chat sidebar is open
- [ ] **Chat sidebar toggle** -- Clicking the chat icon opens/closes the chat sidebar
- [ ] **Theme toggle** -- Switching between dark and light mode updates the UI theme immediately
- [ ] **404 page** -- Visiting a non-existent route displays a custom 404 page
- [ ] **Error boundary** -- A component crash displays a graceful error boundary with a retry option
- [ ] **Loading skeletons** -- Feed, notifications, queue, profile, and create pages show skeleton loaders while data loads

---

## 22. Security

- [ ] **Auth on protected endpoints** -- All server actions verify the user is authenticated before proceeding; unauthenticated requests return "Unauthorized"
- [ ] **Ownership verification** -- Updating or deleting a post verifies the current user is the author
- [ ] **XSS prevention** -- Comment and post content is sanitized via sanitizeHtml to prevent cross-site scripting
- [ ] **SQL injection prevention** -- All database queries use Supabase parameterized queries; no raw SQL interpolation exists
- [ ] **MIME type validation** -- Upload endpoints validate file MIME types against allowed lists (image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm, audio/mpeg, audio/wav, audio/mp4)
- [ ] **Rate limiting on uploads** -- Upload endpoint enforces 50 uploads per hour per user
- [ ] **Rate limiting on reports** -- Report endpoint enforces 10 reports per hour per user
- [ ] **Rate limiting on messages** -- Message endpoint enforces 100 messages per minute per user
- [ ] **Rate limiting on auth emails** -- Auth email endpoint enforces 5 emails per 15 minutes per email
- [ ] **Webhook signature validation** -- The Paddle webhook endpoint validates the request signature before processing
- [ ] **Profile link URL validation** -- Profile links reject javascript:, data:, and other non-http(s) protocols
- [ ] **Admin role enforcement** -- Admin endpoints require role >= 5 (Moderator) or role >= 10 (Admin) depending on the action

---

## 23. Performance & Edge Cases

- [ ] **Empty states** -- All list views (feed, notifications, queue, asks, conversations, search results) display appropriate empty state messages when no data exists
- [ ] **Large data pagination** -- Lists with 100+ items paginate correctly and do not load all data at once
- [ ] **Long text truncation** -- Post previews in notifications and conversation lists truncate at 100 characters
- [ ] **Rapid click prevention** -- Double-clicking the like, follow, or submit button does not create duplicate records
- [ ] **Browser back/forward** -- Using the browser back and forward buttons maintains the correct page state
- [ ] **Image loading states** -- Images show a placeholder or loading indicator before fully loaded
- [ ] **Stale data handling** -- Navigating back to the feed after creating a post shows the new post (via revalidatePath)
- [ ] **Soft delete integrity** -- Deleted posts (status: "deleted") do not appear in feeds, search results, or profile pages
- [ ] **Concurrent edits** -- Two users liking the same post simultaneously both succeed without data loss

---

## 24. Responsive & Cross-Browser

### 24a. Browsers

- [ ] **Chrome** -- All features work correctly in the latest version of Google Chrome
- [ ] **Firefox** -- All features work correctly in the latest version of Mozilla Firefox
- [ ] **Safari** -- All features work correctly in the latest version of Safari
- [ ] **Edge** -- All features work correctly in the latest version of Microsoft Edge

### 24b. Mobile Devices

- [ ] **iOS Safari** -- The app is fully functional on iOS Safari with proper touch interactions
- [ ] **Android Chrome** -- The app is fully functional on Android Chrome with proper touch interactions
- [ ] **Mobile keyboard** -- On-screen keyboards do not obscure input fields during typing in chat, comments, and post creation

### 24c. Breakpoints

- [ ] **320px (small mobile)** -- The layout adjusts to a single-column view with bottom navigation and no sidebar
- [ ] **768px (tablet)** -- The layout shows a collapsed sidebar or bottom navigation with content taking full width
- [ ] **1024px (laptop)** -- The layout shows the full sidebar and main content area
- [ ] **1440px+ (desktop)** -- The layout uses the full width with appropriate max-width constraints and centered content

---

## 25. Known Gaps

| Area                     | Gap Description                                                                                                  | Priority |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------- |
| TypeScript types         | Several hooks (useAuth, useChat, useOnlineStatus, useTypingPresence) have implicit `any` TypeScript errors       | Low      |
| Real-time subscriptions  | Real-time message delivery relies on Supabase Realtime subscriptions; no end-to-end test coverage exists          | Medium   |
| Cron job testing         | Queue and scheduled post cron endpoints (/api/cron/queue, /api/cron/scheduled, /api/cron/digest) need manual verification | Medium   |
| Paddle webhook testing   | Tip and verification payment completion depends on Paddle webhooks that require a live or sandbox Paddle environment | Medium   |
| SightEngine testing      | Content moderation auto-scan requires live SightEngine API keys; mock tests do not cover all edge cases           | Medium   |
| Multiple choice polls    | The "multiple choice" poll option is defined in the UI but the backend poll_votes table may not support multiple votes per user per poll | High     |
| Rate limiter persistence | The in-memory rate limiter resets on server restart; no Redis-backed alternative is configured                    | Low      |
| Email rendering          | Email templates use React Email components that can only be visually verified with the /api/test-email endpoint   | Low      |
| Accessibility            | No screen-reader or keyboard-navigation testing has been performed                                                | Medium   |

---

## 26. Sign-Off

| Role          | Name | Date | Signature |
| ------------- | ---- | ---- | --------- |
| QA Lead       |      |      |           |
| Developer     |      |      |           |
| Product Owner |      |      |           |
