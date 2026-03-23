import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./components/EmailLayout";

interface AccountRestrictedEmailProps {
  username: string;
}

export function AccountRestrictedEmail({ username }: AccountRestrictedEmailProps) {
  return (
    <EmailLayout preview="Your be.vocl account has been restricted">
      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={iconStyle}>⚠️</Text>
      </Section>

      <Heading style={emailStyles.heading}>
        Your account has been restricted
      </Heading>

      <Text style={emailStyles.paragraph}>
        Hello @{username}, after a review of your account activity, your be.vocl
        account has been placed under a temporary restriction.
      </Text>

      <Section style={infoBox}>
        <Text style={infoTitle}>What does this mean?</Text>
        <Text style={infoItem}>You can still browse and view content on be.vocl.</Text>
        <Text style={infoItem}>You cannot create new posts, comments, or messages.</Text>
        <Text style={infoItem}>You cannot like, echo, or interact with other posts.</Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        This restriction was applied because your account activity was flagged for
        not meeting our community guidelines. We encourage you to review our
        guidelines and reach out if you have questions.
      </Text>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.paragraph}>
        You can view more details about your account status and take steps toward
        having the restriction lifted.
      </Text>

      <Section style={emailStyles.buttonContainer}>
        <Button href="https://be.vocl.app/account-status" style={emailStyles.button}>
          View Account Status
        </Button>
      </Section>

      <Text style={emailStyles.mutedText}>
        If you believe this restriction was applied in error, you can submit an
        appeal from your account status page. Our team will review your case
        promptly.
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

const infoBox = {
  backgroundColor: "rgba(91, 154, 139, 0.1)",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "20px",
};

const infoTitle = {
  color: emailStyles.colors.accent,
  fontSize: "14px",
  fontWeight: "600" as const,
  margin: "0 0 12px",
};

const infoItem = {
  color: emailStyles.colors.foreground,
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 6px",
  paddingLeft: "12px",
};

export default AccountRestrictedEmail;
