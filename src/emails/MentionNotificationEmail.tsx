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

interface MentionNotificationEmailProps {
  mentionerUsername: string;
  mentionerAvatarUrl?: string;
  context: string;
  postId: string;
}

export function MentionNotificationEmail({
  mentionerUsername,
  mentionerAvatarUrl,
  context,
  postId,
}: MentionNotificationEmailProps) {
  return (
    <EmailLayout preview={`@${mentionerUsername} mentioned you`}>
      <Section style={headerSection}>
        <Text style={mentionIcon}>@</Text>
      </Section>

      <Heading style={emailStyles.heading}>You were mentioned!</Heading>

      <Text style={emailStyles.paragraph}>
        <strong>@{mentionerUsername}</strong> mentioned you in a post.
      </Text>

      {/* Mention context */}
      <Section style={mentionCard}>
        <Section style={mentionerHeader}>
          {mentionerAvatarUrl ? (
            <Img
              src={mentionerAvatarUrl}
              alt={mentionerUsername}
              width="40"
              height="40"
              style={emailStyles.avatar}
            />
          ) : (
            <div style={avatarSmall}>
              {mentionerUsername.charAt(0).toUpperCase()}
            </div>
          )}
          <Text style={mentionerName}>@{mentionerUsername}</Text>
        </Section>
        <Text style={contextText}>{context}</Text>
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
        Someone&apos;s talking about you! Join the conversation.
      </Text>
    </EmailLayout>
  );
}

// Additional styles
const headerSection = {
  textAlign: "center" as const,
  marginBottom: "20px",
};

const mentionIcon = {
  fontSize: "48px",
  fontWeight: "700",
  color: emailStyles.colors.accent,
  margin: "0",
};

const mentionCard = {
  backgroundColor: emailStyles.colors.background,
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "20px",
  borderLeft: `3px solid ${emailStyles.colors.accent}`,
};

const mentionerHeader = {
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

const mentionerName = {
  color: emailStyles.colors.foreground,
  fontSize: "14px",
  fontWeight: "600",
  margin: "0",
};

const contextText = {
  color: emailStyles.colors.foreground,
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0",
};

export default MentionNotificationEmail;
