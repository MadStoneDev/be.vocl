import {
  Button,
  Heading,
  Hr,
  Img,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./components/EmailLayout";

interface ReblogNotificationEmailProps {
  rebloggerUsername: string;
  rebloggerAvatarUrl?: string;
  reblogComment?: string;
  postPreview: string;
  postId: string;
  reblogPostId: string;
}

export function ReblogNotificationEmail({
  rebloggerUsername,
  rebloggerAvatarUrl,
  reblogComment,
  postPreview,
  reblogPostId,
}: ReblogNotificationEmailProps) {
  return (
    <EmailLayout preview={`@${rebloggerUsername} reblogged your post`}>
      <Section style={headerSection}>
        <Text style={reblogIcon}>🔄</Text>
      </Section>

      <Heading style={emailStyles.heading}>Your post was reblogged!</Heading>

      <Text style={{ ...emailStyles.paragraph, textAlign: "center" }}>
        <span style={{ color: emailStyles.colors.accent, fontWeight: "600" }}>
          @{rebloggerUsername}
        </span>{" "}
        shared your post with their followers.
      </Text>

      {/* Reblogger info */}
      <Section style={rebloggerCard}>
        {rebloggerAvatarUrl ? (
          <Img
            src={rebloggerAvatarUrl}
            alt={rebloggerUsername}
            width="48"
            height="48"
            style={emailStyles.avatar}
          />
        ) : (
          <div style={avatarMedium}>
            {rebloggerUsername.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <Text style={rebloggerName}>@{rebloggerUsername}</Text>
          <Text style={reblogAction}>reblogged your post</Text>
        </div>
      </Section>

      {/* Reblog comment if any */}
      {reblogComment && (
        <Section style={commentSection}>
          <Text style={commentLabel}>Added comment:</Text>
          <Text style={commentContent}>&quot;{reblogComment}&quot;</Text>
        </Section>
      )}

      {/* Original post */}
      <Section style={originalPostCard}>
        <Text style={postLabel}>Your original post</Text>
        <Text style={postPreviewStyle}>&quot;{postPreview}&quot;</Text>
      </Section>

      <Section style={emailStyles.buttonContainer}>
        <Button
          href={`https://be.vocl.app/post/${reblogPostId}`}
          style={emailStyles.button}
        >
          View Reblog
        </Button>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={{ ...emailStyles.mutedText, textAlign: "center" }}>
        Your content is spreading! This is how communities grow. 🚀
      </Text>
    </EmailLayout>
  );
}

// Additional styles
const headerSection = {
  textAlign: "center" as const,
  marginBottom: "20px",
};

const reblogIcon = {
  fontSize: "48px",
  margin: "0",
};

const rebloggerCard = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  backgroundColor: emailStyles.colors.background,
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "20px",
};

const avatarMedium = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  backgroundColor: emailStyles.colors.accent,
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "700",
  lineHeight: "48px",
  textAlign: "center" as const,
  flexShrink: 0,
};

const rebloggerName = {
  color: emailStyles.colors.foreground,
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 2px",
};

const reblogAction = {
  color: emailStyles.colors.muted,
  fontSize: "13px",
  margin: "0",
};

const commentSection = {
  backgroundColor: emailStyles.colors.background,
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "16px",
  borderLeft: `3px solid #85C88A`,
};

const commentLabel = {
  color: emailStyles.colors.muted,
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
};

const commentContent = {
  color: emailStyles.colors.foreground,
  fontSize: "14px",
  fontStyle: "italic",
  lineHeight: "20px",
  margin: "0",
};

const originalPostCard = {
  backgroundColor: emailStyles.colors.background,
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "20px",
  opacity: 0.7,
};

const postLabel = {
  color: emailStyles.colors.muted,
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 6px",
};

const postPreviewStyle = {
  color: emailStyles.colors.muted,
  fontSize: "13px",
  fontStyle: "italic",
  lineHeight: "20px",
  margin: "0",
};

export default ReblogNotificationEmail;
