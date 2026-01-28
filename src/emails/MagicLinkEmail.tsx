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

interface MagicLinkEmailProps {
  magicLink: string;
  email: string;
}

export function MagicLinkEmail({ magicLink, email }: MagicLinkEmailProps) {
  return (
    <EmailLayout preview="Sign in to be.vocl with this magic link">
      <Heading style={emailStyles.heading}>Sign in to be.vocl</Heading>

      <Text style={emailStyles.paragraph}>
        Hi there! Click the button below to securely sign in to your be.vocl
        account. This link will expire in 1 hour.
      </Text>

      <Section style={emailStyles.buttonContainer}>
        <Button href={magicLink} style={emailStyles.button}>
          Sign in to be.vocl
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
        <Link href={magicLink} style={emailStyles.link}>
          {magicLink}
        </Link>
      </Text>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.mutedText}>
        This sign in link was requested for{" "}
        <span style={{ color: emailStyles.colors.foreground }}>{email}</span>.
        If you didn&apos;t request this, you can safely ignore this email.
      </Text>

      <Text style={{ ...emailStyles.mutedText, fontSize: "12px" }}>
        For security, this link can only be used once and expires in 1 hour.
      </Text>
    </EmailLayout>
  );
}

export default MagicLinkEmail;
