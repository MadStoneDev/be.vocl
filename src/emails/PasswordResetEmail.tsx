import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./components/EmailLayout";

interface PasswordResetEmailProps {
  resetLink: string;
  email: string;
}

export function PasswordResetEmail({ resetLink, email }: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Reset your be.vocl password">
      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={iconStyle}>🔐</Text>
      </Section>

      <Heading style={emailStyles.heading}>Reset your password</Heading>

      <Text style={emailStyles.paragraph}>
        We received a request to reset the password for your be.vocl account.
        Click the button below to choose a new password.
      </Text>

      <Section style={emailStyles.buttonContainer}>
        <Button href={resetLink} style={emailStyles.button}>
          Reset Password
        </Button>
      </Section>

      <Text style={emailStyles.mutedText}>
        Or copy and paste this URL into your browser:
      </Text>
      <Text
        style={{
          ...emailStyles.mutedText,
          wordBreak: "break-all",
          fontSize: "12px",
        }}
      >
        <Link href={resetLink} style={emailStyles.link}>
          {resetLink}
        </Link>
      </Text>

      <Hr style={emailStyles.divider} />

      <Section style={warningBox}>
        <Text style={warningText}>
          ⚠️ This link expires in 1 hour for security reasons.
        </Text>
      </Section>

      <Text style={emailStyles.mutedText}>
        This password reset was requested for{" "}
        <span style={{ color: emailStyles.colors.foreground }}>{email}</span>.
      </Text>

      <Text style={{ ...emailStyles.mutedText, fontSize: "12px" }}>
        If you didn&apos;t request a password reset, please ignore this email or
        contact support if you&apos;re concerned about your account security.
      </Text>
    </EmailLayout>
  );
}

// Additional styles
const iconStyle = {
  fontSize: "48px",
  margin: "0",
};

const warningBox = {
  backgroundColor: "rgba(226, 125, 96, 0.1)",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "20px",
};

const warningText = {
  color: "#E27D60",
  fontSize: "14px",
  margin: "0",
  textAlign: "center" as const,
};

export default PasswordResetEmail;
