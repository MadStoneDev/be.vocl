# Email Setup for be.vocl

This guide covers setting up email for be.vocl with self-hosted Supabase on Coolify.

## Email Templates

Custom email templates are located in `/public/email-templates/`:

| Template | File | Purpose |
|----------|------|---------|
| Magic Link | `magic-link.html` | Passwordless sign-in |
| Confirm Signup | `confirm-signup.html` | Email verification + welcome |
| Reset Password | `reset-password.html` | Password recovery |
| Invite | `invite.html` | User invitations |
| Change Email | `change-email.html` | Email change confirmation |

### Template Variables

Supabase's GoTrue service uses Go templates. Available variables:

- `{{ .SiteURL }}` - Your app URL (e.g., `https://be.vocl.app`)
- `{{ .ConfirmationURL }}` - The action URL with token
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - Raw token (if needed)
- `{{ .TokenHash }}` - Hashed token
- `{{ .Data }}` - Additional data passed during signup

## Coolify / Self-Hosted Supabase Configuration

### Option 1: Environment Variables (Recommended)

Add these environment variables to your Supabase Auth (GoTrue) service in Coolify:

```bash
# SMTP Configuration
GOTRUE_SMTP_HOST=smtp.resend.com
GOTRUE_SMTP_PORT=465
GOTRUE_SMTP_USER=resend
GOTRUE_SMTP_PASS=re_xxxxxxxxxxxx
GOTRUE_SMTP_ADMIN_EMAIL=noreply@be.vocl.app
GOTRUE_SMTP_SENDER_NAME=be.vocl

# Email Template URLs
# Replace YOUR_DOMAIN with your actual domain
GOTRUE_MAILER_URLPATHS_CONFIRMATION=/auth/callback
GOTRUE_MAILER_URLPATHS_RECOVERY=/auth/callback
GOTRUE_MAILER_URLPATHS_INVITE=/auth/callback
GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE=/auth/callback

# Template URLs (point to your deployed app)
GOTRUE_MAILER_TEMPLATES_CONFIRMATION=https://YOUR_DOMAIN/email-templates/confirm-signup.html
GOTRUE_MAILER_TEMPLATES_RECOVERY=https://YOUR_DOMAIN/email-templates/reset-password.html
GOTRUE_MAILER_TEMPLATES_MAGIC_LINK=https://YOUR_DOMAIN/email-templates/magic-link.html
GOTRUE_MAILER_TEMPLATES_INVITE=https://YOUR_DOMAIN/email-templates/invite.html
GOTRUE_MAILER_TEMPLATES_EMAIL_CHANGE=https://YOUR_DOMAIN/email-templates/change-email.html

# Email subjects
GOTRUE_MAILER_SUBJECTS_CONFIRMATION=Confirm your email - be.vocl
GOTRUE_MAILER_SUBJECTS_RECOVERY=Reset your password - be.vocl
GOTRUE_MAILER_SUBJECTS_MAGIC_LINK=Sign in to be.vocl
GOTRUE_MAILER_SUBJECTS_INVITE=You're invited to be.vocl
GOTRUE_MAILER_SUBJECTS_EMAIL_CHANGE=Confirm your new email - be.vocl

# Site URL (your app URL)
GOTRUE_SITE_URL=https://YOUR_DOMAIN
GOTRUE_URI_ALLOW_LIST=https://YOUR_DOMAIN/**

# Optional: Rate limiting
GOTRUE_RATE_LIMIT_EMAIL_SENT=5
```

### Option 2: Docker Compose Override

If using docker-compose, add to your `docker-compose.override.yml`:

```yaml
services:
  auth:
    environment:
      GOTRUE_SMTP_HOST: smtp.resend.com
      GOTRUE_SMTP_PORT: 465
      GOTRUE_SMTP_USER: resend
      GOTRUE_SMTP_PASS: ${RESEND_API_KEY}
      GOTRUE_SMTP_ADMIN_EMAIL: noreply@be.vocl.app
      GOTRUE_SMTP_SENDER_NAME: be.vocl
      GOTRUE_MAILER_TEMPLATES_CONFIRMATION: https://be.vocl.app/email-templates/confirm-signup.html
      GOTRUE_MAILER_TEMPLATES_RECOVERY: https://be.vocl.app/email-templates/reset-password.html
      GOTRUE_MAILER_TEMPLATES_MAGIC_LINK: https://be.vocl.app/email-templates/magic-link.html
      GOTRUE_MAILER_TEMPLATES_INVITE: https://be.vocl.app/email-templates/invite.html
      GOTRUE_MAILER_TEMPLATES_EMAIL_CHANGE: https://be.vocl.app/email-templates/change-email.html
```

## Resend SMTP Settings

Sign up at [resend.com](https://resend.com) and get your API key.

| Setting | Value |
|---------|-------|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) or `587` (TLS) |
| Username | `resend` |
| Password | Your API key (`re_xxxxxxxxxxxx`) |

### Domain Verification

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add your domain (e.g., `be.vocl.app`)
3. Add the DNS records they provide:
   - SPF record
   - DKIM records
   - (Optional) DMARC record
4. Wait for verification (usually < 5 minutes)

## Testing

### Test Magic Link

```bash
curl -X POST 'https://YOUR_SUPABASE_URL/auth/v1/magiclink' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@example.com"}'
```

### Test Password Reset

```bash
curl -X POST 'https://YOUR_SUPABASE_URL/auth/v1/recover' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@example.com"}'
```

## Notification Emails (via Resend API)

For notification emails (likes, comments, follows, etc.), these are sent directly via Resend API from your Next.js app:

1. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   ```

2. Emails are automatically sent when:
   - Someone follows a user
   - Someone likes a post
   - Someone comments on a post
   - Someone reblogs a post
   - Someone sends a message

### Email Preferences (Future)

Add these columns to `profiles` table to let users control notifications:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications JSONB DEFAULT '{
  "follows": true,
  "likes": true,
  "comments": true,
  "reblogs": true,
  "messages": true
}'::jsonb;
```

## Troubleshooting

### Emails not sending

1. Check Resend dashboard for failed deliveries
2. Verify domain is verified in Resend
3. Check GoTrue logs: `docker logs supabase-auth`
4. Ensure templates are accessible (try opening URL in browser)

### Templates not loading

1. Templates must be publicly accessible
2. Check for CORS issues
3. Verify URLs are correct in environment variables

### Wrong redirect URLs

1. Check `GOTRUE_SITE_URL` is set correctly
2. Check `GOTRUE_URI_ALLOW_LIST` includes your domain
3. Verify `GOTRUE_MAILER_URLPATHS_*` settings

## Template Customization

To customize templates:

1. Edit files in `/public/email-templates/`
2. Test locally by opening in browser
3. Deploy changes
4. Supabase will fetch fresh templates on each email send

### Available Styling

Templates use inline CSS for email client compatibility. Key brand values:

```css
/* Colors */
background: #1a1a1a
surface: #2a2a2a
accent: #5B9A8B
foreground: #ededed
muted: #888888
danger: #E27D60

/* Typography */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
logo-font: Georgia, serif
```
