# be.vocl Roadmap

> **Current Version**: 0.7.0
> **Last Updated**: 2026-02-04

## Versioning Strategy

We use **Semantic Versioning** adapted for pre-release development:

```
MAJOR.MINOR.PATCH
  0   . 7  . 0
```

### Version Rules (While in Major 0)

| Component | When to Increment | Example |
|-----------|------------------|---------|
| **MAJOR (0)** | Stay at 0 until public launch | 0.x.x |
| **MINOR** | New feature set or milestone | 0.7.0 → 0.8.0 |
| **PATCH** | Bug fixes, small improvements | 0.7.0 → 0.7.1 |

### Version Milestones

- **0.7.x** - Beta preparation + Security hardening (current)
- **0.8.x** - Beta testing with users
- **0.9.x** - Pre-release polish
- **1.0.0** - Public launch

---

## Version 0.7.x - Beta Preparation

### 0.7.0 (Current)
- [x] Core posting system (text, image, video, audio, gallery)
- [x] Social features (follows, likes, comments, reblogs)
- [x] Direct messaging
- [x] Queue and scheduled posting
- [x] Admin dashboard (reports, flags, users, appeals)
- [x] Content moderation (SightEngine AI)
- [x] Role-based permissions (6 tiers)
- [x] Email system (transactional, digests)
- [x] R2 storage integration
- [x] Staff badges
- [x] NSFW controls and overlays
- [x] IP banning
- [x] Next.js 16 + Turbopack migration
- [x] Comment loading fix

### 0.7.1 - Security Hardening (CRITICAL - Before Beta)

#### Critical Security Fixes
- [x] **XSS Prevention**: Install DOMPurify and sanitize all dangerouslySetInnerHTML
  - [x] `src/components/Post/Post.tsx` - text content
  - [x] `src/components/Post/content/VideoContent.tsx` - captions
  - [x] `src/components/Post/content/AudioContent.tsx` - captions
  - [x] `src/components/Post/content/GalleryContent.tsx` - captions
  - [x] `src/app/(main)/search/page.tsx` - search results
- [x] **Open Redirect Fix**: Validate `next` parameter in `auth/callback/route.ts`
- [x] **SSRF Protection**: Block private IPs in OpenGraph endpoint
- [x] **Webhook Security**: Fix Paddle webhook to verify in ALL environments
- [x] **Auth Webhook**: Add proper signature verification with timing-safe comparison
- [x] **Auto-moderation**: Block flagged content before publishing (not after)
- [x] **URL Validation**: Validate URLs in RichTextEditor link input

#### High Priority Security Fixes
- [x] **Rate Limiting**: Add rate limits to critical endpoints
  - [x] File uploads (presign endpoint) - 50/hour per user
  - [x] Report creation - 10/hour per user
  - [x] Message sending - 100/minute per user
  - [x] Auth email webhook - 5/15min per email
- [x] **Profile Links**: Validate URL protocols (block javascript:, data:)
- [x] **Cron Security**: Use timing-safe comparison for cron secrets (in auth webhook)
- [x] **Security Headers**: Add CSP, HSTS, X-Frame-Options to next.config.ts
- [x] **Audit Logging**: Log admin actions (bans, role changes, etc.)

#### Medium Priority Security Fixes
- [x] **CSRF Protection**: Add origin validation to API routes
- [x] **Comment Sanitization**: Sanitize HTML in comments
- [x] **Timezone Validation**: Validate timezone values
- [x] **Error Messages**: Don't expose internals in production errors
- [x] **Race Conditions**: Add UNIQUE constraint on follows table (already existed)

### 0.7.2 - New Features
- [x] Poll posts (backend + display component)
- [x] Ask box feature (backend + display component)
- [x] Poll creation UI in post composer
- [x] Ask inbox page (/asks)
- [x] Ask button on profile pages
- [x] Ask settings in privacy settings

### 0.7.3 - Polish & Testing
- [ ] Performance audit and optimization
- [ ] Mobile responsiveness check
- [ ] Error message UX improvements
- [ ] Loading state improvements
- [ ] Add basic test coverage for critical paths
- [ ] Test authentication flows
- [ ] Test moderation workflows

---

## Version 0.8.x - Beta Testing

### 0.8.0 - Beta Launch
- [x] Invite system for beta testers (invite codes)
  - [x] Database schema with invite_codes and invite_code_uses tables
  - [x] Server actions for code generation, validation, redemption
  - [x] Signup gate requiring valid invite code
  - [x] Admin invite code management UI (/admin/invites)
  - [x] User invite codes settings page (/settings/invites)
  - [x] Regular users start with 0 codes (admin distributes initially)
  - [x] Trusted Users (role 1) get 3 codes when promoted
  - [x] Staff get unlimited codes
- [ ] Feedback collection mechanism (in-app feedback button)
- [ ] Bug reporting from within app
- [ ] Analytics/usage tracking (privacy-respecting, self-hosted)
- [ ] Terms of Service finalization
- [ ] Privacy Policy finalization
- [ ] Onboarding flow for new users

### 0.8.1 - Beta Feedback Round 1
- [ ] Address critical feedback
- [ ] UX improvements based on user testing
- [ ] Performance fixes from real-world usage

### 0.8.2 - Beta Feedback Round 2
- [ ] Additional fixes and improvements
- [ ] Feature refinements

---

## Version 0.9.x - Pre-Release

### 0.9.0 - Feature Complete
- [ ] GDPR data export processing (background job)
- [ ] Video moderation completion (polling/webhooks)
- [ ] All email templates finalized
- [ ] User documentation / Help center
- [ ] Admin documentation

### 0.9.1 - Security Audit (External)
- [ ] External security review / penetration testing
- [ ] Auth flow hardening review
- [ ] Rate limiting stress testing
- [ ] RLS policy audit

### 0.9.2 - Launch Prep
- [ ] Landing page (marketing site)
- [ ] Marketing materials
- [ ] Social media presence
- [ ] Support documentation
- [ ] Monitoring and alerting setup
- [ ] Backup and recovery testing

---

## Version 1.0.0 - Public Launch

- [ ] Public registration opens
- [ ] Full feature set available
- [ ] Support system in place (email, knowledge base)
- [ ] Monitoring and alerting active
- [ ] Incident response plan documented

---

## Future Features (Post 1.0)

### Monetization Opportunities

#### Creator Economy
- [ ] **Tips/Donations** - Let users tip creators (Paddle/Stripe)
- [ ] **Premium Subscriptions** - Monthly supporter tiers per creator
- [ ] **Exclusive Content** - Subscriber-only posts
- [ ] **Commission System** - Built-in commission requests for artists

#### Platform Revenue
- [ ] **be.vocl Premium** - Platform-wide subscription
  - Ad-free experience (if ads added)
  - Extended upload limits
  - Custom themes
  - Analytics dashboard
  - Priority support
- [ ] **Verification Badges** - Paid verification (already partially built)
- [ ] **Promoted Posts** - Optional content promotion (non-intrusive)
- [ ] **API Access** - Paid API tier for developers

### Engagement Features
- [ ] Notifications improvements (granular controls)
- [ ] Activity feed enhancements
- [ ] Trending posts/tags algorithm
- [ ] Search improvements (full-text, filters)
- [ ] Bookmarks / Collections
- [ ] Post series / Threads

### Content Features
- [ ] Post scheduling improvements (calendar view)
- [ ] Draft collaboration (shared drafts)
- [ ] Import from Tumblr / Twitter / other platforms
- [ ] Better media editing tools (crop, filters)
- [ ] GIF creation from video
- [ ] Poll posts
- [ ] Ask box / Anonymous questions

### Social Features
- [ ] Communities / Groups (topic-based)
- [ ] Shared blogs (multi-author)
- [ ] Custom themes per blog
- [ ] Enhanced profile customization
- [ ] User lists (like Twitter lists)
- [ ] Mutual followers highlight

### Platform / Technical
- [ ] Mobile app (React Native or PWA)
- [ ] Public API for third-party apps
- [ ] Webhooks for integrations
- [ ] ActivityPub / Fediverse integration
- [ ] Custom domain support
- [ ] Plugin/extension system

### Moderation Improvements
- [ ] Auto-mod rules (keyword filters, spam detection)
- [ ] Moderator notes on users
- [ ] Bulk moderation actions
- [ ] Report analytics dashboard
- [ ] Appeals improvement (communication thread)

---

## Backlog / Ideas

_Add ideas here as they come up:_

- [ ] Dark mode improvements (true black option)
- [ ] Keyboard shortcuts throughout app
- [ ] Accessibility audit (screen reader support)
- [ ] Right-to-left language support
- [ ] Post templates for creators
- [ ] Scheduled queue analytics
- [ ] Content warnings system (beyond NSFW)
- [ ] Muted words/phrases
- [ ] Block/mute import/export
- [ ] Account switching (multiple blogs)
- [ ] Reblog chains view
- [ ] Post analytics for creators
- [ ] Email newsletter from blog
- [ ] RSS feeds per blog
- [ ] Embed posts on external sites
- [ ] Story/ephemeral posts (24hr)

---

## Completed Versions

### Pre-0.7.0 Development
- Initial project setup
- Database schema design
- Core authentication
- Basic posting
- Moderation system foundation
- Email system foundation
- Storage integration

---

## How to Use This Roadmap

1. **Before starting work**: Check what's next in the current version
2. **When completing a task**: Mark it with [x]
3. **When finding bugs**: Add to current version's bug fix list
4. **When having ideas**: Add to Backlog section
5. **When releasing**: Update "Current Version" at top
6. **Increment versions**:
   - Small fix → increment PATCH (0.7.0 → 0.7.1)
   - Feature milestone → increment MINOR (0.7.x → 0.8.0)

---

## Security Audit Summary (2026-02-04)

### Critical Issues Found
| Issue | Status | Priority |
|-------|--------|----------|
| XSS via dangerouslySetInnerHTML (5 locations) | **FIXED** | CRITICAL |
| Open redirect in auth callback | **FIXED** | CRITICAL |
| SSRF in OpenGraph endpoint | **FIXED** | CRITICAL |
| Webhook verification bypasses | **FIXED** | CRITICAL |
| Auto-mod publishes before flagging | **FIXED** | CRITICAL |

### High Priority Issues
| Issue | Status | Priority |
|-------|--------|----------|
| No rate limiting on uploads/reports | **FIXED** | HIGH |
| Profile link URL validation missing | **FIXED** | HIGH |
| Race conditions in follows | **FIXED** (already had constraint) | HIGH |
| Missing security headers | **FIXED** | HIGH |
| Missing audit logging | **FIXED** | HIGH |

### Medium Priority Issues
| Issue | Status | Priority |
|-------|--------|----------|
| CSRF Protection | **FIXED** | MEDIUM |
| Comment Sanitization | **FIXED** | MEDIUM |
| Timezone Validation | **FIXED** | MEDIUM |
| Error Messages | **FIXED** | MEDIUM |

_All security issues from 2026-02-04 audit have been resolved._

---

## Notes for Beta Testing

When ready for beta:
1. Select 5-10 trusted testers
2. Provide clear feedback channels (Discord, in-app, email)
3. Monitor error logs closely
4. Have quick response time for critical issues
5. Document all feedback for prioritization
6. Weekly check-ins with testers
7. Prepare a "known issues" list
