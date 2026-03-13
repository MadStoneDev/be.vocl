# be.vocl Feature Plan & Audit

## A. Features to Implement (User-Approved)

### 1. What's Trending Tab + Improved "For You" Algorithm
**Priority:** HIGH
**Current State:** Two tabs exist: "Latest" (chronological) and "For You" (engagement-based). The "For You" algorithm works but falls back too heavily to "what's out there" when it should prioritize semantic tag alignment.

**Changes Needed:**

#### "For You" Improvements:
- **Semantic tag matching**: Don't just match exact tags. If a user uses "I love books", they should see posts tagged "books are awesome", "reading is life", etc. Approach: extract meaningful keywords from tags and match on shared keywords/stems.
- **Stronger interest signals**: Weight tags the user posts with (not just follows/likes) much higher.
- **Behavioral signals**: Track what posts users spend time on (scroll pause, expand, click-through) — future enhancement.
- **Fallback chain**: 1) Posts matching user's tag interests (semantic), 2) Posts from followed users, 3) Posts similar to liked content, 4) Popular/trending as last resort.

#### New "Trending" Tab:
- Third tab alongside "Latest" and "For You"
- Algorithm: Time-windowed engagement velocity (likes + comments*2.5 + reblogs*4 in last 24-48h)
- Loosely weighted toward user interests (mild boost, not strict filter)
- Surface what the whole platform is buzzing about
- Include trending tags section at top of tab

---

### 2. Explore Page with Topics
**Priority:** HIGH
**Current State:** No dedicated explore page. Search exists but requires intent.

**Implementation:**
- New route: `/explore`
- Sections: "Trending Topics" (auto-generated from tag clusters), "Popular Tags" (by post volume), "Rising Creators" (new users with growing engagement), "Staff Picks" (curated, optional)
- Topic cards linking to tag pages or curated feeds
- Categories could be auto-derived from tag clustering or manually curated

---

### 3. Post Threads
**Priority:** HIGH
**Current State:** Posts are standalone. No threading/series support.

**Implementation:**
- Add `thread_id` and `thread_position` columns to posts table
- "Continue Thread" button when composing (links new post to previous)
- Thread view: vertical timeline showing all posts in order
- Single posts still display standalone in feeds with a "Show Thread" indicator
- Thread navigation: prev/next arrows within thread view
- UX: In feed, show thread indicator badge ("Thread 3/7") with tap to expand

---

### 4. Activity/Analytics Dashboard
**Priority:** MEDIUM
**Current State:** None exists.

**Implementation:**
- New route: `/dashboard` or `/activity`
- Metrics: Profile views, post impressions, engagement rate, follower growth
- Time period selector (7d, 30d, 90d)
- Top performing posts
- Follower demographics (interests based on their tags)
- Best posting times (when your posts get most engagement)

---

### 5. Draft Management UI
**Priority:** MEDIUM
**Current State:** Drafts exist (flagged content goes to draft) but no user-facing draft management.

**Implementation:**
- New route: `/drafts`
- List all draft posts with preview
- Edit, delete, publish actions per draft
- Search/filter within drafts
- Show why a draft is held (if flagged by moderation)

---

### 6. Proper Alt Text Management
**Priority:** MEDIUM
**Current State:** Alt text field exists but is optional and easy to skip.

**Implementation:**
- User setting: "Remind me to add alt text" (default on)
- Soft prompt when posting image without alt text: "You haven't added alt text. Would you like to add some?"
- NOT enforced (user's choice), but encouraged
- Alt text character counter
- Preview how screen readers will read the alt text

---

### 7. Reblog/Conversation Thread View
**Priority:** MEDIUM
**Current State:** Reblogs track `reblogged_from_id` and `original_post_id` but no chain visualization.

**Implementation:**
- When viewing a reblogged post, show the full chain: Original → Reblog 1 (with comment) → Reblog 2 → etc.
- Collapsible chain view (show first + last by default, expand middle)
- Each entry shows author avatar, username, and their added commentary
- "View full conversation" link on reblogged posts in feed

---

### 8. Visual Queue Calendar
**Priority:** MEDIUM
**Current State:** Queue shows list view with reorder. No calendar visualization.

**Implementation:**
- Calendar view showing scheduled/queued posts on their publish dates
- Drag posts between days to reschedule
- Time slots visible based on queue window settings
- Color coding: queued (blue), scheduled (green), published (gray)
- Day/week/month views
- Click empty slot to create new post for that time

---

### 9. Creator Analytics
**Priority:** MEDIUM
**Current State:** None.

**Implementation:**
- Extend activity dashboard with creator-specific metrics
- Per-post analytics (views, engagement breakdown)
- Content type performance comparison
- Tag performance (which tags drive engagement)
- Audience growth trends
- Best content format for your audience

---

### 10. Mutuals Indicator
**Priority:** HIGH (quick win, big social impact)
**Current State:** Follow/follower data exists. No mutual detection.

**Implementation:**
- Query: user follows X AND X follows user = mutual
- Badge/icon on profile and in follower/following lists
- "Mutuals" filter on following page
- Optional: "Mutuals only" messaging setting

---

### 11. Post-Level Notification Muting
**Priority:** LOW
**Current State:** Not implemented.

**Implementation:**
- Add to post three-dot menu: "Mute notifications for this post"
- New table: `muted_post_notifications` (user_id, post_id)
- Check this table before creating notifications for likes/comments/reblogs on that post
- Visual indicator on muted posts

---

### 12. Unsplash Integration
**Priority:** HIGH
**Current State:** Image posts support "Upload" and "Link" modes. No Unsplash.

**Requirements (from Unsplash API guidelines):**
- MUST hotlink images (use Unsplash URLs directly, NOT download to R2)
- MUST attribute photographer with link to their Unsplash profile
- MUST trigger download endpoint when user selects image for post
- MUST use utm parameters: `?utm_source=bevocl&utm_medium=referral`

**Implementation:**
- Add third image mode tab: "Unsplash" (alongside Upload and Link)
- Search interface (debounced, like Spotify pattern)
- Grid display of results with photographer attribution
- On selection: store Unsplash URL directly (no R2 rehost)
- Post display: show "Photo by [Photographer] on Unsplash" attribution
- New API route: `/api/unsplash/search`
- Store in post content: `{ urls: [unsplash_url], unsplash_attribution: { photographer, profile_url, photo_id } }`

### 13. OAuth Social Login (Google/Apple)
**Priority:** HIGH
**Current State:** Email/password only with invite codes.

**Implementation:**
- Supabase has built-in OAuth providers — enable Google and Apple
- Add OAuth buttons to login/signup pages
- Still require invite code on first OAuth signup
- Link OAuth accounts to existing email accounts if email matches
- Handle edge case: user signs up with email, later tries OAuth with same email

---

### 14. Two-Factor Authentication (2FA)
**Priority:** HIGH
**Current State:** No 2FA.

**Implementation:**
- Supabase supports TOTP (Time-based One-Time Password)
- Settings page: enable/disable 2FA with QR code setup
- Recovery codes (one-time use) for lost authenticator
- Require 2FA verification on login when enabled
- Optional: enforce 2FA for staff/admin accounts

---

### 15. RSS Feeds
**Priority:** MEDIUM
**Current State:** No RSS support. All data queries already exist.

**Implementation:**
- Route: `/api/rss/users/[username]` — user's published posts as RSS/Atom
- Route: `/api/rss/tags/[name]` — posts for a tag
- Route: `/api/rss/feed` — global public feed
- XML generation (lightweight, no library needed)
- Cache RSS output (5-10 min TTL)
- RSS autodiscovery `<link>` tags on profile and tag pages
- Respect sensitive content filtering

---

### 16. Content Warning / Spoiler System
**Priority:** HIGH
**Current State:** Only binary "sensitive" toggle. No custom content warnings.

**Implementation:**
- Add `content_warning` text field to posts (optional, max 200 chars)
- When set, post content hidden behind click-to-reveal overlay showing the CW text
- Different from "sensitive" — CW is user-labeled ("spoilers for X", "food mention", etc.)
- Sensitive = platform-level NSFW flag. CW = creator-level contextual warning
- Users can set preference: "Always show posts with content warnings" (skip the overlay)
- CW label shown in feed without hiding the post metadata (author, timestamp, tags visible)

---

### 17. Share Button
**Priority:** HIGH (currently missing entirely)
**Current State:** No way to share posts off-platform.

**Implementation:**
- Share button in post action bar
- Options: Copy link, Native share API (mobile), Copy embed code (future)
- Post URL format: `https://be.vocl/post/[id]`
- Toast confirmation on copy

---

### 18. Public Profile Pages
**Priority:** HIGH
**Current State:** Profile pages require authentication.

**Implementation:**
- Public route: `/@[username]` or `/profile/[username]` accessible without login
- Show: avatar, header, display name, bio, links, public posts
- Respect privacy settings (hide followers/following if set)
- SEO metadata (og:title, og:image, og:description)
- "Join be.vocl" CTA for non-logged-in visitors
- RSS autodiscovery link

---

### 19. Bookmark Folders/Collections
**Priority:** MEDIUM
**Current State:** Flat bookmark list, no organization.

**Implementation:**
- New table: `bookmark_collections` (id, user_id, name, description, created_at)
- Update bookmarks table: add optional `collection_id` foreign key
- Default "All Bookmarks" view (current behavior)
- Create/rename/delete collections
- Move bookmarks between collections
- Collection selector when bookmarking (quick-add to default, or pick collection)
- `/bookmarks` page with collection sidebar/tabs

---

## B. Features Still Under Consideration

### Keyboard Shortcuts
**Why it matters:** Power users (your early adopters) navigate with keyboards. J/K to scroll posts, L to like, R to reblog, N for new post. It's a "feels premium" feature that costs little.
**Effort:** Low
**Recommendation:** LOW priority but easy win

### Embeddable Posts
**Why it matters:** When users can embed posts on other sites, content spreads virally. Every embed is free advertising with a "View on be.vocl" link.
**Effort:** Low (iframe embed endpoint + copy-embed button)
**Recommendation:** MEDIUM priority

### Advanced Search Filters
**Why it matters:** "Show me image posts from the last week tagged art" — your users will need this as content grows. Without it, search becomes useless at scale.
**Effort:** Medium (add filter params to existing search)
**Recommendation:** MEDIUM priority, grows in importance

---

## C. Complete User Action Audit

### AUTHENTICATION
| Action | Status | Issues |
|--------|--------|--------|
| Sign up with email | ✅ Works | No password strength indicator shown to user |
| Sign up with invite code | ✅ Works | No real-time format validation feedback |
| Log in | ✅ Works | No "remember me" option |
| Log out | ✅ Works | No confirmation dialog (privacy risk on shared devices) |
| Password reset | ⚠️ Partial | UI links to it but flow may be incomplete |
| Onboarding wizard | ✅ Works | Good — timezone auto-detect, interests, avatar |

### POST CREATION
| Action | Status | Issues |
|--------|--------|--------|
| Create text post | ✅ Works | No unsaved changes warning when closing modal |
| Create image post (upload) | ✅ Works | Good multi-file support |
| Create image post (link) | ✅ Works | Re-hosts to R2, good validation |
| Create video post (embed) | ✅ Works | Supports YouTube, Vimeo, TikTok, Rumble, Dailymotion |
| Create video post (upload) | ✅ Works | No duration display |
| Create audio post (Spotify) | ✅ Works | Good search UX |
| Create audio post (upload) | ✅ Works | Working |
| Create poll | ✅ Works | Cannot edit poll after creation |
| Create gallery | ✅ Works | Auto-switches when >1 image |
| Add tags | ✅ Works | Good UX with tag input component |
| Mark sensitive | ✅ Works | Clear toggle |
| Publish now | ✅ Works | Good |
| Queue post | ✅ Works | Good |
| Schedule post | ✅ Works | Basic date/time picker — no calendar view |
| Link preview in text | ✅ Works (fixed) | Now persists after posting |

### POST INTERACTION
| Action | Status | Issues |
|--------|--------|--------|
| Like post | ✅ Works | Optimistic update, good |
| Unlike post | ✅ Works | Good |
| Comment on post | ✅ Works | No character limit warning (2000 limit is server-side only) |
| Delete comment | ✅ Works | Has confirmation |
| Reblog instantly | ✅ Works | Good |
| Reblog with comment | ✅ Works | Opens dialog |
| Reblog to queue | ✅ Works | Good |
| Reblog to schedule | ✅ Works | Good |
| Bookmark post | ✅ Works | Toggle in post menu |
| Pin post | ✅ Works | Only 1 pin allowed |
| Edit post | ✅ Works | Updates content, tags, sensitivity inline |
| Delete post | ✅ Works | Has confirmation dialog |
| Share post | ❌ Missing | No share button (copy link, share to social) |
| View who liked | ✅ Works | Expandable panel |
| View who reblogged | ✅ Works | Expandable panel |

### PROFILE
| Action | Status | Issues |
|--------|--------|--------|
| Edit display name | ✅ Works | Good |
| Edit bio | ✅ Works | Good |
| Upload avatar | ✅ Works | Good with crop/preview |
| Upload header | ✅ Works | Good |
| Add profile links | ✅ Works | URL validation, reorder |
| Change username | ⚠️ Unclear | May not be implemented |
| Set timezone | ✅ Works | Auto-detect on onboarding |
| View own profile | ✅ Works | Shows posts, pinned post |
| View other profile | ✅ Works | Respect privacy settings |

### SOCIAL
| Action | Status | Issues |
|--------|--------|--------|
| Follow user | ✅ Works | Good |
| Unfollow user | ✅ Works | No confirmation from post menu (easy misclick) |
| Block user | ✅ Works | Bidirectional permission checks |
| Unblock user | ✅ Works | Good |
| Mute user | ⚠️ Partial | DB/action exists but muted posts still appear in feed |
| View followers | ✅ Works | Respects privacy settings |
| View following | ✅ Works | Respects privacy settings |

### MESSAGING
| Action | Status | Issues |
|--------|--------|--------|
| Start conversation | ✅ Works | Good |
| Send message | ✅ Works | Rate limited |
| Send media in message | ✅ Works | Good |
| Edit message | ❌ Missing | No edit action implemented |
| Delete message | ⚠️ Partial | Logic exists but may not be exposed |
| View conversations | ✅ Works | Good with unread badges |
| Mark as read | ✅ Works | Auto on open |
| Message blocked user | 🐛 Bug | Should be prevented but isn't |

### NOTIFICATIONS
| Action | Status | Issues |
|--------|--------|--------|
| View notifications | ✅ Works | Good list with grouping by date |
| Mark as read | ✅ Works | Individual click-through |
| Mark all as read | ✅ Works | Good |
| Clear all | ✅ Works | Good |
| Click notification to navigate | ✅ Works | Good |
| Real-time updates | ✅ Works | Supabase realtime subscriptions |

### SEARCH
| Action | Status | Issues |
|--------|--------|--------|
| Search users | ✅ Works | By username and display name |
| Search posts | ✅ Works | Full-text |
| Search tags | ✅ Works | With post counts |
| Follow tag | ✅ Works | Good |
| Unfollow tag | ✅ Works | Good |
| Filter by type | ❌ Missing | No post type filter |
| Filter by date | ❌ Missing | No date range |
| Paginate results | ❌ Missing | Limited results shown |

### SETTINGS
| Action | Status | Issues |
|--------|--------|--------|
| Change profile settings | ✅ Works | Good |
| Change privacy settings | ✅ Works | Good toggles |
| Change notification prefs | ✅ Works | Per-type + frequency |
| Change appearance | ⚠️ Limited | Dark mode only, no theme options |
| Change password | ⚠️ Unclear | Settings page links to it |
| Manage invite codes | ✅ Works | Generate, view usage |
| Request data export | ⚠️ Partial | Request works, processing incomplete |
| Delete account | ⚠️ Partial | Anonymize works, needs better UX |

### QUEUE MANAGEMENT
| Action | Status | Issues |
|--------|--------|--------|
| View queued posts | ✅ Works | List view |
| Reorder queue | ✅ Works | Drag-and-drop |
| Publish now from queue | ✅ Works | Good |
| Remove from queue | ✅ Works | Good |
| Pause/resume queue | ⚠️ Partial | DB field exists, UI button missing |
| Queue settings | ✅ Works | Posts/day, time window |

### MODERATION (User-facing)
| Action | Status | Issues |
|--------|--------|--------|
| Report user | ✅ Works | Subject categories |
| Flag post | ✅ Works | Subject categories |
| View account status | ✅ Works | Lock status page |
| Submit appeal | ⚠️ Partial | Action exists, UI may be missing |
| View report status | ❌ Missing | Users can't track their reports |

### ASKS
| Action | Status | Issues |
|--------|--------|--------|
| Send ask | ✅ Works | With anonymous option |
| View received asks | ⚠️ Partial | Action exists, UI needs check |
| Answer ask | ✅ Works | Creates public post |
| Delete ask | ❌ Missing | Can't delete received asks |
| Toggle asks on/off | ✅ Works | In privacy settings |
| Toggle anonymous asks | ✅ Works | In privacy settings |

### TIPS
| Action | Status | Issues |
|--------|--------|--------|
| Send tip | ✅ Works | Paddle integration |
| View received tips | ✅ Works | Good |
| View sent tips | ❌ Missing | No sent tip history |

---

## D. Critical Issues to Fix (by priority)

### 🔴 BUGS
1. **Muted users still appear in feed** — `getFeedPosts` doesn't filter muted users
2. **Can message blocked users** — Block check missing in message send
3. **No share button** — Basic social feature completely missing

### 🟠 UX GAPS
4. **No unsaved changes warning** — Closing post creation modal loses content
5. **No comment character limit warning** — 2000 limit is server-side only
6. **No unfollow confirmation** — Easy misclick from post menu
7. **Queue pause/resume button missing** — Setting exists but no UI control
8. **No password strength indicator** — Signup flow
9. **No logout confirmation** — Privacy risk on shared devices

### 🟡 MISSING FEATURES (Low-hanging fruit)
10. **Share button** — Copy link, native share API
11. **Search pagination** — Currently limited results
12. **Search filters** — Post type, date range
13. **Delete received asks** — Spam prevention
14. **Sent tip history** — Users want to see what they've sent

---

## E. Implementation Order

### Phase 1: Fixes & Quick Wins
1. Fix mute filtering in feed
2. Fix blocked user messaging
3. Add share button to posts
4. Add mutuals indicator
5. Post-level notification muting
6. Unsaved changes warning on post modal
7. Comment character limit warning
8. Queue pause/resume button
9. Content warning / spoiler system

### Phase 2: Major Features
10. What's Trending tab + For You improvements (semantic tags)
11. Explore page with topics
12. Unsplash integration
13. Post threads
14. Visual queue calendar
15. Bookmark folders/collections

### Phase 3: Auth & Security
16. OAuth social login (Google/Apple)
17. Two-factor authentication (2FA)
18. Public profile pages (SEO, growth)

### Phase 4: Creator Tools
19. Activity/analytics dashboard
20. Creator analytics
21. Draft management UI
22. Alt text management improvements
23. RSS feeds

### Phase 5: Conversation & Social
24. Reblog/conversation thread view
25. Advanced search filters
