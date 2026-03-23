import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./components/EmailLayout";

interface AccountBannedEmailProps {
  username: string;
  reason: string;
}

export function AccountBannedEmail({ username, reason }: AccountBannedEmailProps) {
  return (
    <EmailLayout preview="Your be.vocl account has been banned">
      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={iconStyle}>🚫</Text>
      </Section>

      <Heading style={emailStyles.heading}>
        Your account has been banned
      </Heading>

      <Text style={emailStyles.paragraph}>
        Hello @{username}, after a review of your account activity, we have
        determined that your account has violated our community guidelines. As a
        result, your be.vocl account has been banned.
      </Text>

      <Section style={reasonBox}>
        <Text style={reasonLabel}>Reason</Text>
        <Text style={reasonText}>{reason}</Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        While your account is banned, you will not be able to sign in, create
        posts, or interact with other users on be.vocl.
      </Text>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.paragraph}>
        If you believe this action was taken in error, you may submit an appeal
        to have your account reviewed.
      </Text>

      <Section style={emailStyles.buttonContainer}>
        <Button href="https://be.vocl.app/account-status" style={emailStyles.button}>
          View Account Status
        </Button>
      </Section>

      <Text style={emailStyles.mutedText}>
        Please review our community guidelines before submitting an appeal. Our
        moderation team will review your case and respond as soon as possible.
      </Text>

      <Text style={{ ...emailStyles.mutedText, fontSize: "12px" }}>
        If you have questions, you can reach our support team at
        support@be.vocl.app.
      </Text>
    </EmailLayout>
  );
}

// Additional styles
const iconStyle = {
  fontSize: "48px",
  margin: "0",
};

const reasonBox = {
  backgroundColor: "rgba(226, 125, 96, 0.1)",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "20px",
};

const reasonLabel = {
  color: "#E27D60",
  fontSize: "12px",
  fontWeight: "600" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 8px",
};

const reasonText = {
  color: emailStyles.colors.foreground,
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0",
};

export default AccountBannedEmail;
