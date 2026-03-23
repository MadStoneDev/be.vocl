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

interface DataExportReadyEmailProps {
  username: string;
  downloadUrl: string;
  expiresAt: string;
}

export function DataExportReadyEmail({
  username,
  downloadUrl,
  expiresAt,
}: DataExportReadyEmailProps) {
  return (
    <EmailLayout preview="Your be.vocl data export is ready to download">
      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={iconStyle}>📦</Text>
      </Section>

      <Heading style={emailStyles.heading}>
        Your data export is ready
      </Heading>

      <Text style={emailStyles.paragraph}>
        Hello @{username}, the data export you requested from be.vocl is now
        ready to download. Your export contains a copy of your profile
        information, posts, comments, and other account data.
      </Text>

      <Section style={emailStyles.buttonContainer}>
        <Button href={downloadUrl} style={emailStyles.button}>
          Download Your Data
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
        <Link href={downloadUrl} style={emailStyles.link}>
          {downloadUrl}
        </Link>
      </Text>

      <Hr style={emailStyles.divider} />

      <Section style={expiryBox}>
        <Text style={expiryText}>
          This download link will expire on{" "}
          <span style={{ color: emailStyles.colors.foreground, fontWeight: "600" }}>
            {expiresAt}
          </span>
          . Please download your data before then.
        </Text>
      </Section>

      <Text style={emailStyles.mutedText}>
        Your export is in JSON format. If you need help understanding the data
        or have questions, visit our help center or contact support@be.vocl.app.
      </Text>
    </EmailLayout>
  );
}

// Additional styles
const iconStyle = {
  fontSize: "48px",
  margin: "0",
};

const expiryBox = {
  backgroundColor: emailStyles.colors.background,
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "20px",
};

const expiryText = {
  color: emailStyles.colors.muted,
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
  textAlign: "center" as const,
};

export default DataExportReadyEmail;
