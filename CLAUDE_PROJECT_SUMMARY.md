# be.vocl - Project Summary

> **Last Updated**: 2026-02-07
> **Current Version**: 0.7.1
> **Status**: Pre-release (preparing for beta testing)

## What is be.vocl?

be.vocl is a **Tumblr-like content sharing platform** built with Next.js 16 that allows NSFW content while maintaining **zero-tolerance policies for illegal content**, especially child exploitation material.

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | 16.1.1 |
| React | React & React DOM | 19.2.1 |
| Database | Supabase (PostgreSQL) | 2.93.3 |
| Auth | Supabase Auth + SSR | 0.8.0 |
| Storage | Cloudflare R2 (S3-compatible) | AWS SDK 3.975.0 |
| Bundler | Turbopack | Next.js 16 default |
| Styling | TailwindCSS | 4 |
| Email | Resend | 6.9.1 |
| Rich Text | TipTap | 3.17.1 |
| Content Moderation | SightEngine AI | - |
| Payments | Paddle | - |

## Project Structure

```
/src
  /actions        # Server actions (core business logic)
  /app            # Next.js App Router pages
  /components     # React components by feature
  /constants      # Role definitions, constants
  /types          # TypeScript types
  /lib            # External service clients
    /supabase     # Database
    /sightengine  # Content moderation
    /r2           # File storage
    /email        # Email utilities
    /paddle       # Payments
  /emails         # React email templates
  /hooks          # Custom React hooks
```

## Core Features

### Content System
- **Post Types**: Text, image, video, audio (Spotify), gallery
- **Publishing**: Draft, queue, schedule modes
- **Interactions**: Likes, comments, reblogs
- **Tags**: Auto-tagging, tag following, discovery

### Social Features
- Follow/unfollow users
- Block and mute
- Direct messaging with real-time typing indicators
- Notifications (in-app and email digests)

### NSFW Handling
- Auto-detection via SightEngine AI
- NSFW overlay with blur
- User preference controls (show_sensitive_posts, blur_sensitive_by_default)
- Content marked as sensitive but allowed

### Safety & Moderation (Critical)
- **SightEngine AI**: Scans uploads for illegal content
- **Zero Tolerance**: Child safety content = instant flag + block
- **User Reports**: Categories include minor_safety, illegal, harassment
- **Account States**: unlocked → restricted → banned
- **IP Banning**: Prevents ban circumvention
- **Appeals System**: Banned users can appeal; staff can block appeals
- **Escalation Tiers**: Junior Mod → Moderator → Senior Mod → Admin
- **Audit Trail**: All moderation actions logged

### User System
- 6-tier role system (User → Admin)
- Staff badges displayed throughout UI
- Profile customization (avatar, header, bio, links)
- Privacy controls
- Content promise acceptance required

### Admin Features
- Reports dashboard
- Flags review
- User management (ban, restrict, unlock)
- Appeals handling
- Email sending and templates
- Bulk email customization

## Database Tables (33 total)

**Core**: profiles, posts, comments, posts_tags, tags, followed_tags
**Social**: follows, likes, blocks, mutes, conversations, messages
**Moderation**: reports, flags, appeals, escalation_history, banned_ips
**Email**: email_sends, email_send_recipients, email_template_customizations
**Other**: notifications, tips, verifications, data_export_requests

## API Routes

- `/api/auth/email` - Magic link/password login
- `/api/upload/presign` - R2 signed URL generation
- `/api/moderate` - Content scanning
- `/api/queue/process` - Queued post processing (cron)
- `/api/cron/scheduled` - Scheduled post publishing
- `/api/cron/digest` - Digest email sending
- `/api/spotify/search` - Spotify integration
- `/api/webhooks/paddle` - Payment webhooks

## What's Complete

- Core posting and publishing
- Social features (follows, likes, comments, reblogs)
- Direct messaging with notifications
- Queue and scheduled posting
- Admin dashboard
- Content moderation (SightEngine)
- Role-based permissions
- Appeals system
- Email system (templates, digests)
- R2 storage integration
- Staff badges
- NSFW controls
- IP banning
- Edit post functionality (updates locally without page refresh)
- Tags overlay on post hover (different positioning for text/audio vs image/video/gallery)
- Onboarding wizard with interest tag selection and timezone auto-detection
- "For You" feed algorithm (weighted interests, freshness bonus, creator boost, author diversity)

## What's In Progress / Recent

- Mobile layout refinements (action bar spacing, avatar sizing)
- Video embeds (YouTube, Vimeo, etc.)
- Carousel gallery with lightbox
- Performance improvements (Turbopack)

## What's Not Yet Done

- PWA support (attempted but caused layout issues, reverted)
- Data export processing (GDPR)
- Video moderation polling completion
- Test coverage
- Some email template types

## Key Files Reference

| Purpose | File |
|---------|------|
| Content Moderation | `src/lib/sightengine/client.ts` |
| Admin Actions | `src/actions/admin.ts` |
| Post Creation | `src/actions/posts.ts` |
| Post Editing | `src/components/Post/create/EditPostModal.tsx` |
| Feed Algorithm | `src/actions/recommendations.ts` |
| Interactive Post | `src/components/Post/InteractivePost.tsx` |
| Database Schema | `database.types.ts` |
| Role System | `src/constants/roles.ts` |
| Moderation Plan | `MODERATION_PLAN.md` |
| Next.js Config | `next.config.ts` |

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev  # Runs on port 3111

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
CRON_SECRET
RESEND_API_KEY
NEXT_PUBLIC_APP_URL
SIGHTENGINE_API_USER (optional)
SIGHTENGINE_API_SECRET (optional)
```
