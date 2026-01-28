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

interface FollowNotificationEmailProps {
  followerUsername: string;
  followerAvatarUrl?: string;
  followerBio?: string;
  recipientUsername: string;
}

export function FollowNotificationEmail({
  followerUsername,
  followerAvatarUrl,
  followerBio,
  recipientUsername,
}: FollowNotificationEmailProps) {
  return (
    <EmailLayout preview={`@${followerUsername} started following you on be.vocl`}>
      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        {followerAvatarUrl ? (
          <Img
            src={followerAvatarUrl}
            alt={followerUsername}
            width="80"
            height="80"
            style={avatarLarge}
          />
        ) : (
          <div style={avatarPlaceholder}>
            {followerUsername.charAt(0).toUpperCase()}
          </div>
        )}
      </Section>

      <Heading style={emailStyles.heading}>You have a new follower!</Heading>

      <Section style={userCard}>
        <Text style={usernameStyle}>@{followerUsername}</Text>
        {followerBio && <Text style={bioStyle}>{followerBio}</Text>}
      </Section>

      <Text style={{ ...emailStyles.paragraph, textAlign: "center" }}>
        <span style={{ color: emailStyles.colors.accent, fontWeight: "600" }}>
          @{followerUsername}
        </span>{" "}
        is now following you. Check out their profile and consider following
        them back!
      </Text>

      <Section style={emailStyles.buttonContainer}>
        <Button
          href={`https://be.vocl.app/profile/${followerUsername}`}
          style={emailStyles.button}
        >
          View Profile
        </Button>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={{ ...emailStyles.mutedText, textAlign: "center" }}>
        Keep creating great content, @{recipientUsername}!
      </Text>
    </EmailLayout>
  );
}

// Additional styles
const avatarLarge = {
  borderRadius: "50%",
  margin: "0 auto",
};

const avatarPlaceholder = {
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  backgroundColor: emailStyles.colors.accent,
  color: "#ffffff",
  fontSize: "32px",
  fontWeight: "700",
  lineHeight: "80px",
  textAlign: "center" as const,
  margin: "0 auto",
};

const userCard = {
  backgroundColor: emailStyles.colors.background,
  borderRadius: "12px",
  padding: "20px",
  textAlign: "center" as const,
  marginBottom: "20px",
};

const usernameStyle = {
  color: emailStyles.colors.foreground,
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 8px",
};

const bioStyle = {
  color: emailStyles.colors.muted,
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
};

export default FollowNotificationEmail;
