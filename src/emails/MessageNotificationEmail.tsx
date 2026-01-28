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

interface MessageNotificationEmailProps {
  senderUsername: string;
  senderAvatarUrl?: string;
  messagePreview: string;
  conversationId: string;
  unreadCount: number;
}

export function MessageNotificationEmail({
  senderUsername,
  senderAvatarUrl,
  messagePreview,
  conversationId,
  unreadCount,
}: MessageNotificationEmailProps) {
  return (
    <EmailLayout preview={`New message from @${senderUsername}`}>
      <Section style={headerSection}>
        <Text style={messageIcon}>✉️</Text>
      </Section>

      <Heading style={emailStyles.heading}>
        {unreadCount > 1
          ? `${unreadCount} new messages from @${senderUsername}`
          : `New message from @${senderUsername}`}
      </Heading>

      {/* Message preview */}
      <Section style={messageCard}>
        <Section style={senderHeader}>
          {senderAvatarUrl ? (
            <Img
              src={senderAvatarUrl}
              alt={senderUsername}
              width="44"
              height="44"
              style={emailStyles.avatar}
            />
          ) : (
            <div style={avatarMedium}>
              {senderUsername.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <Text style={senderName}>@{senderUsername}</Text>
            <Text style={sentTime}>Just now</Text>
          </div>
        </Section>

        <Section style={messageBubble}>
          <Text style={messageText}>{messagePreview}</Text>
        </Section>
      </Section>

      <Section style={emailStyles.buttonContainer}>
        <Button
          href={`https://be.vocl.app/messages?conversation=${conversationId}`}
          style={emailStyles.button}
        >
          Reply to Message
        </Button>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={{ ...emailStyles.mutedText, textAlign: "center" }}>
        Don&apos;t leave them hanging - send a reply! 💬
      </Text>
    </EmailLayout>
  );
}

// Additional styles
const headerSection = {
  textAlign: "center" as const,
  marginBottom: "20px",
};

const messageIcon = {
  fontSize: "48px",
  margin: "0",
};

const messageCard = {
  backgroundColor: emailStyles.colors.background,
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "20px",
};

const senderHeader = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "16px",
};

const avatarMedium = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  backgroundColor: emailStyles.colors.accent,
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "700",
  lineHeight: "44px",
  textAlign: "center" as const,
  flexShrink: 0,
};

const senderName = {
  color: emailStyles.colors.foreground,
  fontSize: "15px",
  fontWeight: "600",
  margin: "0 0 2px",
};

const sentTime = {
  color: emailStyles.colors.muted,
  fontSize: "12px",
  margin: "0",
};

const messageBubble = {
  backgroundColor: emailStyles.colors.surface,
  borderRadius: "12px",
  padding: "14px 16px",
  marginLeft: "56px",
};

const messageText = {
  color: emailStyles.colors.foreground,
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
};

export default MessageNotificationEmail;
