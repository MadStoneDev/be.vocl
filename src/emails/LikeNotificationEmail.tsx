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

interface LikeNotificationEmailProps {
  likerUsername: string;
  likerAvatarUrl?: string;
  postPreview: string;
  postId: string;
  totalLikes: number;
}

export function LikeNotificationEmail({
  likerUsername,
  likerAvatarUrl,
  postPreview,
  postId,
  totalLikes,
}: LikeNotificationEmailProps) {
  return (
    <EmailLayout preview={`@${likerUsername} liked your post on be.vocl`}>
      <Section style={headerSection}>
        <Text style={heartIcon}>❤️</Text>
      </Section>

      <Heading style={emailStyles.heading}>
        {totalLikes > 1
          ? `@${likerUsername} and ${totalLikes - 1} others liked your post`
          : `@${likerUsername} liked your post`}
      </Heading>

      {/* Post preview */}
      <Section style={postCard}>
        <Text style={postLabel}>Your post</Text>
        <Text style={postPreviewStyle}>&quot;{postPreview}&quot;</Text>
      </Section>

      {/* Liker info */}
      <Section style={likerSection}>
        {likerAvatarUrl ? (
          <Img
            src={likerAvatarUrl}
            alt={likerUsername}
            width="40"
            height="40"
            style={emailStyles.avatar}
          />
        ) : (
          <div style={avatarSmall}>{likerUsername.charAt(0).toUpperCase()}</div>
        )}
        <Text style={likerText}>
          <span style={{ fontWeight: "600" }}>@{likerUsername}</span>
          <span style={{ color: emailStyles.colors.muted }}> liked this</span>
        </Text>
      </Section>

      <Section style={emailStyles.buttonContainer}>
        <Button
          href={`https://be.vocl.app/post/${postId}`}
          style={emailStyles.button}
        >
          View Post
        </Button>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={{ ...emailStyles.mutedText, textAlign: "center" }}>
        Your content is resonating with people. Keep it up! 🌟
      </Text>
    </EmailLayout>
  );
}

// Additional styles
const headerSection = {
  textAlign: "center" as const,
  marginBottom: "20px",
};

const heartIcon = {
  fontSize: "48px",
  margin: "0",
};

const postCard = {
  backgroundColor: emailStyles.colors.background,
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "20px",
  borderLeft: `3px solid ${emailStyles.colors.accent}`,
};

const postLabel = {
  color: emailStyles.colors.muted,
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
};

const postPreviewStyle = {
  color: emailStyles.colors.foreground,
  fontSize: "15px",
  fontStyle: "italic",
  lineHeight: "22px",
  margin: "0",
};

const likerSection = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "20px",
};

const avatarSmall = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  backgroundColor: emailStyles.colors.accent,
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "700",
  lineHeight: "40px",
  textAlign: "center" as const,
  flexShrink: 0,
};

const likerText = {
  color: emailStyles.colors.foreground,
  fontSize: "14px",
  margin: "0",
};

export default LikeNotificationEmail;
