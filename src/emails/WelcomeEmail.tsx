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

interface WelcomeEmailProps {
  username: string;
}

export function WelcomeEmail({ username }: WelcomeEmailProps) {
  return (
    <EmailLayout preview={`Welcome to be.vocl, @${username}! Start sharing your voice.`}>
      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={welcomeEmoji}>🎉</Text>
      </Section>

      <Heading style={emailStyles.heading}>
        Welcome to be.vocl, @{username}!
      </Heading>

      <Text style={emailStyles.paragraph}>
        We&apos;re thrilled to have you join our community. be.vocl is your space to
        share your voice freely, connect with like-minded creators, and express
        yourself without limits.
      </Text>

      <Section style={emailStyles.buttonContainer}>
        <Button href="https://be.vocl.app/feed" style={emailStyles.button}>
          Start Exploring
        </Button>
      </Section>

      <Hr style={emailStyles.divider} />

      <Heading style={{ ...emailStyles.heading, fontSize: "18px" }}>
        Here&apos;s how to get started:
      </Heading>

      <Section style={tipCard}>
        <Text style={tipNumber}>1</Text>
        <div>
          <Text style={tipTitle}>Complete your profile</Text>
          <Text style={tipDescription}>
            Add a photo, bio, and links to let others know who you are.
          </Text>
        </div>
      </Section>

      <Section style={tipCard}>
        <Text style={tipNumber}>2</Text>
        <div>
          <Text style={tipTitle}>Create your first post</Text>
          <Text style={tipDescription}>
            Share text, images, videos, or audio. Express yourself your way.
          </Text>
        </div>
      </Section>

      <Section style={tipCard}>
        <Text style={tipNumber}>3</Text>
        <div>
          <Text style={tipTitle}>Find your people</Text>
          <Text style={tipDescription}>
            Follow creators you love and discover new content in your feed.
          </Text>
        </div>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.mutedText}>
        Have questions? Reply to this email or visit our help center. We&apos;re
        here to help you make the most of be.vocl.
      </Text>

      <Text style={{ ...emailStyles.paragraph, textAlign: "center" }}>
        Happy creating! ✨
        <br />
        <span style={{ color: emailStyles.colors.muted }}>The be.vocl Team</span>
      </Text>
    </EmailLayout>
  );
}

// Additional styles
const welcomeEmoji = {
  fontSize: "48px",
  margin: "0",
};

const tipCard = {
  backgroundColor: emailStyles.colors.background,
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "12px",
  display: "flex",
  alignItems: "flex-start",
  gap: "16px",
};

const tipNumber = {
  backgroundColor: emailStyles.colors.accent,
  borderRadius: "50%",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  width: "28px",
  height: "28px",
  lineHeight: "28px",
  textAlign: "center" as const,
  margin: "0",
  flexShrink: 0,
};

const tipTitle = {
  color: emailStyles.colors.foreground,
  fontSize: "15px",
  fontWeight: "600",
  margin: "0 0 4px",
};

const tipDescription = {
  color: emailStyles.colors.muted,
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0",
};

export default WelcomeEmail;
