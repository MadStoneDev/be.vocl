import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./components/EmailLayout";

interface DigestItem {
  type: "like" | "comment" | "reblog" | "follow" | "mention" | "message";
  count: number;
  actorUsernames: string[];
  postId?: string;
}

interface DailyDigestEmailProps {
  recipientUsername: string;
  items: DigestItem[];
  totalNotifications: number;
}

const typeLabels: Record<DigestItem["type"], { singular: string; plural: string; icon: string }> = {
  like: { singular: "like", plural: "likes", icon: "❤️" },
  comment: { singular: "comment", plural: "comments", icon: "💬" },
  reblog: { singular: "reblog", plural: "reblogs", icon: "🔄" },
  follow: { singular: "new follower", plural: "new followers", icon: "👤" },
  mention: { singular: "mention", plural: "mentions", icon: "@" },
  message: { singular: "message", plural: "messages", icon: "✉️" },
};

export function DailyDigestEmail({
  recipientUsername,
  items,
  totalNotifications,
}: DailyDigestEmailProps) {
  return (
    <EmailLayout preview={`Your daily digest: ${totalNotifications} notifications`}>
      <Section style={headerSection}>
        <Text style={digestIcon}>📬</Text>
      </Section>

      <Heading style={emailStyles.heading}>Your Daily Digest</Heading>

      <Text style={emailStyles.paragraph}>
        Hey @{recipientUsername}! Here&apos;s what you missed today.
      </Text>

      {/* Summary stats */}
      <Section style={summaryCard}>
        <Text style={summaryTitle}>Activity Summary</Text>
        <Text style={summaryCount}>{totalNotifications}</Text>
        <Text style={summaryLabel}>notifications today</Text>
      </Section>

      {/* Individual items */}
      {items.map((item, index) => {
        const label = typeLabels[item.type];
        const countLabel = item.count === 1 ? label.singular : label.plural;
        const actorsText = formatActors(item.actorUsernames);

        return (
          <Section key={index} style={itemCard}>
            <Text style={itemIcon}>{label.icon}</Text>
            <Section style={itemContent}>
              <Text style={itemTitle}>
                {item.count} {countLabel}
              </Text>
              <Text style={itemActors}>from {actorsText}</Text>
            </Section>
          </Section>
        );
      })}

      <Section style={emailStyles.buttonContainer}>
        <Button
          href="https://be.vocl.app/notifications"
          style={emailStyles.button}
        >
          View All Notifications
        </Button>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={{ ...emailStyles.mutedText, textAlign: "center" }}>
        Want to change how often you receive these? Update your{" "}
        <a href="https://be.vocl.app/settings/notifications" style={linkStyle}>
          notification settings
        </a>
        .
      </Text>
    </EmailLayout>
  );
}

function formatActors(usernames: string[]): string {
  if (usernames.length === 0) return "someone";
  if (usernames.length === 1) return `@${usernames[0]}`;
  if (usernames.length === 2) return `@${usernames[0]} and @${usernames[1]}`;
  return `@${usernames[0]}, @${usernames[1]}, and ${usernames.length - 2} others`;
}

// Additional styles
const headerSection = {
  textAlign: "center" as const,
  marginBottom: "20px",
};

const digestIcon = {
  fontSize: "48px",
  margin: "0",
};

const summaryCard = {
  backgroundColor: emailStyles.colors.accent,
  borderRadius: "16px",
  padding: "24px",
  marginBottom: "24px",
  textAlign: "center" as const,
};

const summaryTitle = {
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 8px",
  opacity: 0.8,
};

const summaryCount = {
  color: "#ffffff",
  fontSize: "48px",
  fontWeight: "700",
  margin: "0",
  lineHeight: "1",
};

const summaryLabel = {
  color: "#ffffff",
  fontSize: "14px",
  margin: "8px 0 0",
  opacity: 0.9,
};

const itemCard = {
  display: "flex",
  alignItems: "flex-start",
  gap: "16px",
  backgroundColor: emailStyles.colors.background,
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "12px",
};

const itemIcon = {
  fontSize: "24px",
  margin: "0",
  flexShrink: 0,
};

const itemContent = {
  flex: 1,
};

const itemTitle = {
  color: emailStyles.colors.foreground,
  fontSize: "15px",
  fontWeight: "600",
  margin: "0 0 4px",
};

const itemActors = {
  color: emailStyles.colors.muted,
  fontSize: "13px",
  margin: "0",
};

const linkStyle = {
  color: emailStyles.colors.accent,
  textDecoration: "underline",
};

export default DailyDigestEmail;
