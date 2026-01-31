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

interface FounderMessageEmailProps {
  recipientUsername: string;
  subject: string;
  content: string;
  founderName: string;
  founderTitle: string;
  founderAvatarUrl?: string;
  signature?: string;
  ctaText?: string;
  ctaUrl?: string;
}

export function FounderMessageEmail({
  recipientUsername,
  subject,
  content,
  founderName,
  founderTitle,
  founderAvatarUrl,
  signature,
  ctaText,
  ctaUrl,
}: FounderMessageEmailProps) {
  // Split content by newlines for paragraphs
  const paragraphs = content.split('\n').filter(p => p.trim());

  return (
    <EmailLayout preview={`${founderName}: ${subject}`}>
      <Section style={headerSection}>
        <Text style={personalBadge}>A MESSAGE FROM {founderName.toUpperCase()}</Text>
      </Section>

      <Heading style={emailStyles.heading}>{subject}</Heading>

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

      {/* Founder signature */}
      <Section style={founderSection}>
        {founderAvatarUrl ? (
          <Img
            src={founderAvatarUrl}
            alt={founderName}
            width="60"
            height="60"
            style={founderAvatar}
          />
        ) : (
          <div style={founderAvatarPlaceholder}>
            {founderName.charAt(0).toUpperCase()}
          </div>
        )}
        <Section style={founderInfo}>
          {signature ? (
            <Text style={signatureText}>{signature}</Text>
          ) : (
            <>
              <Text style={founderNameStyle}>{founderName}</Text>
              <Text style={founderTitleStyle}>{founderTitle}</Text>
            </>
          )}
        </Section>
      </Section>
    </EmailLayout>
  );
}

// Styles
const headerSection = {
  textAlign: "center" as const,
  marginBottom: "20px",
};

const personalBadge = {
  display: "inline-block",
  backgroundColor: "#F59E0B",
  color: "#1a1a1a",
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

const founderSection = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  marginTop: "20px",
};

const founderAvatar = {
  borderRadius: "50%",
  flexShrink: 0,
};

const founderAvatarPlaceholder = {
  width: "60px",
  height: "60px",
  borderRadius: "50%",
  backgroundColor: emailStyles.colors.accent,
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "700",
  lineHeight: "60px",
  textAlign: "center" as const,
  flexShrink: 0,
};

const founderInfo = {
  flex: 1,
};

const founderNameStyle = {
  color: emailStyles.colors.foreground,
  fontSize: "16px",
  fontWeight: "600",
  margin: "0",
};

const founderTitleStyle = {
  color: emailStyles.colors.muted,
  fontSize: "14px",
  margin: "4px 0 0",
};

const signatureText = {
  color: emailStyles.colors.foreground,
  fontSize: "15px",
  fontStyle: "italic",
  lineHeight: "22px",
  margin: "0",
  whiteSpace: "pre-line" as const,
};

export default FounderMessageEmail;
