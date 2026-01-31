import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./components/EmailLayout";

interface AnnouncementEmailProps {
  recipientUsername: string;
  title: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
}

export function AnnouncementEmail({
  recipientUsername,
  title,
  content,
  ctaText,
  ctaUrl,
}: AnnouncementEmailProps) {
  // Split content by newlines for paragraphs
  const paragraphs = content.split('\n').filter(p => p.trim());

  return (
    <EmailLayout preview={title}>
      <Section style={headerSection}>
        <Text style={announcementBadge}>ANNOUNCEMENT</Text>
      </Section>

      <Heading style={emailStyles.heading}>{title}</Heading>

      <Text style={greeting}>Hey @{recipientUsername},</Text>

      {paragraphs.map((paragraph, index) => (
        <Text key={index} style={emailStyles.paragraph}>
          {paragraph}
        </Text>
      ))}

      {ctaText && ctaUrl && (
        <Section style={emailStyles.buttonContainer}>
          <Button href={ctaUrl} style={emailStyles.button}>
            {ctaText}
          </Button>
        </Section>
      )}

      <Hr style={emailStyles.divider} />

      <Text style={signoff}>
        Thanks for being part of be.vocl!
      </Text>
      <Text style={signature}>
        — The be.vocl Team
      </Text>
    </EmailLayout>
  );
}

// Styles
const headerSection = {
  textAlign: "center" as const,
  marginBottom: "20px",
};

const announcementBadge = {
  display: "inline-block",
  backgroundColor: emailStyles.colors.accent,
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "1px",
  padding: "6px 12px",
  borderRadius: "20px",
  margin: "0",
};

const greeting = {
  color: emailStyles.colors.foreground,
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 20px",
};

const signoff = {
  color: emailStyles.colors.muted,
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const signature = {
  color: emailStyles.colors.muted,
  fontSize: "14px",
  fontStyle: "italic",
  margin: "8px 0 0",
};

export default AnnouncementEmail;
