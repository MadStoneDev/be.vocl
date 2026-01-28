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

interface CommentNotificationEmailProps {
  commenterUsername: string;
  commenterAvatarUrl?: string;
  commentContent: string;
  postPreview: string;
  postId: string;
}

export function CommentNotificationEmail({
  commenterUsername,
  commenterAvatarUrl,
  commentContent,
  postPreview,
  postId,
}: CommentNotificationEmailProps) {
  return (
    <EmailLayout preview={`@${commenterUsername} commented on your post`}>
      <Section style={headerSection}>
        <Text style={commentIcon}>💬</Text>
      </Section>

      <Heading style={emailStyles.heading}>New comment on your post</Heading>

      {/* Original post */}
      <Section style={postCard}>
        <Text style={postLabel}>Your post</Text>
        <Text style={postPreviewStyle}>&quot;{postPreview}&quot;</Text>
      </Section>

      {/* Comment */}
      <Section style={commentCard}>
        <Section style={commenterHeader}>
          {commenterAvatarUrl ? (
            <Img
              src={commenterAvatarUrl}
              alt={commenterUsername}
              width="40"
              height="40"
              style={emailStyles.avatar}
            />
          ) : (
            <div style={avatarSmall}>
              {commenterUsername.charAt(0).toUpperCase()}
            </div>
          )}
          <Text style={commenterName}>@{commenterUsername}</Text>
        </Section>
        <Text style={commentText}>{commentContent}</Text>
      </Section>

      <Section style={emailStyles.buttonContainer}>
        <Button
          href={`https://be.vocl.app/post/${postId}`}
          style={emailStyles.button}
        >
          Reply to Comment
        </Button>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={{ ...emailStyles.mutedText, textAlign: "center" }}>
        Join the conversation and keep the engagement going! 🗣️
      </Text>
    </EmailLayout>
  );
}

// Additional styles
const headerSection = {
  textAlign: "center" as const,
  marginBottom: "20px",
};

const commentIcon = {
  fontSize: "48px",
  margin: "0",
};

const postCard = {
  backgroundColor: emailStyles.colors.background,
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "16px",
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

const commentCard = {
  backgroundColor: emailStyles.colors.background,
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "20px",
  borderLeft: `3px solid #E8A87C`,
};

const commenterHeader = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "12px",
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

const commenterName = {
  color: emailStyles.colors.foreground,
  fontSize: "14px",
  fontWeight: "600",
  margin: "0",
};

const commentText = {
  color: emailStyles.colors.foreground,
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0",
};

export default CommentNotificationEmail;
