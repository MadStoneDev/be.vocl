# Content Moderation & Data Rights Implementation Plan

## Database Schema Changes

### 1. Update `profiles` table
```sql
ALTER TABLE profiles ADD COLUMN role INTEGER DEFAULT 0;
-- 0 = user, 5 = moderator, 10 = admin

ALTER TABLE profiles ADD COLUMN lock_status TEXT DEFAULT 'unlocked';
-- 'unlocked', 'restricted', 'banned'

ALTER TABLE profiles ADD COLUMN promise_accepted_at TIMESTAMPTZ;
-- null = not accepted yet

ALTER TABLE profiles ADD COLUMN banned_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN ban_reason TEXT;
```

### 2. New `reports` table
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,

  subject TEXT NOT NULL,
  -- 'minor_safety', 'non_consensual', 'harassment', 'spam', 'illegal', 'other'

  comments TEXT,

  source TEXT DEFAULT 'user_report',
  -- 'user_report', 'auto_moderation', 'promise_declined'

  status TEXT DEFAULT 'pending',
  -- 'pending', 'reviewing', 'resolved_ban', 'resolved_restrict', 'resolved_dismissed'

  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

### 3. New `appeals` table
```sql
CREATE TABLE appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,

  reason TEXT NOT NULL,

  status TEXT DEFAULT 'pending',
  -- 'pending', 'approved', 'denied', 'blocked'

  appeals_blocked BOOLEAN DEFAULT false,

  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
```

### 4. New `banned_ips` table
```sql
CREATE TABLE banned_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_banned_ips_address ON banned_ips(ip_address);
```

### 5. New `data_export_requests` table
```sql
CREATE TABLE data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  -- 'pending', 'processing', 'completed', 'failed', 'expired'

  file_url TEXT,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### 6. Update `posts` table
```sql
ALTER TABLE posts ADD COLUMN moderation_status TEXT DEFAULT 'approved';
-- 'pending', 'approved', 'flagged', 'removed'

ALTER TABLE posts ADD COLUMN moderation_reason TEXT;
ALTER TABLE posts ADD COLUMN moderated_at TIMESTAMPTZ;
```

---

## Implementation Phases

### Phase 1: Database Migration
- Create migration file with all schema changes
- Run migration

### Phase 2: Data Export & Deletion
- POST /api/account/export - Request data export
- Background processing to compile data
- Email with secure download link
- POST /api/account/delete - Anonymize account

### Phase 3: SightEngine Integration
- lib/sightengine/client.ts - API wrapper
- Scan images on upload
- Scan videos on upload
- Auto-flag and create report if issues detected

### Phase 4: Promise Banner
- Component: PromiseBanner.tsx
- Show in feed until accepted
- POST /api/account/accept-promise
- Store promise_accepted_at

### Phase 5: Lock System
- Middleware to check lock_status
- 'restricted': Can browse, cannot post/comment
- 'banned': Force logout, cannot login
- Check IP against banned_ips on login

### Phase 6: Reporting System
- Component: ReportModal.tsx
- POST /api/reports - Create report
- Pre-set subjects + other
- Anonymous to reported user

### Phase 7: User Warning Banner
- Show to users with flagged posts
- "A post you shared may have broken our terms..."

### Phase 8: Admin Dashboard
- /admin - Dashboard overview
- /admin/reports - Report queue
- /admin/users - User management
- Staff actions: ban, restrict, assign, resolve

### Phase 9: Appeal System
- Banned users can submit appeal
- Staff can approve/deny/block appeals
- Email notifications for decisions

---

## API Endpoints

### Account
- POST /api/account/export
- POST /api/account/delete
- POST /api/account/accept-promise

### Reports
- POST /api/reports
- GET /api/admin/reports
- PATCH /api/admin/reports/[id]
- POST /api/admin/reports/[id]/assign

### Users (Admin)
- GET /api/admin/users
- PATCH /api/admin/users/[id]
- POST /api/admin/users/[id]/ban
- POST /api/admin/users/[id]/restrict
- POST /api/admin/users/[id]/unlock

### Appeals
- POST /api/appeals
- GET /api/admin/appeals
- PATCH /api/admin/appeals/[id]

---

## Email Templates Needed
1. Data export ready
2. Account deleted confirmation
3. Post flagged notification
4. Account restricted notification
5. Account banned notification
6. Appeal approved
7. Appeal denied
8. Appeal blocked
