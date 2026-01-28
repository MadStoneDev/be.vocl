import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

// Brand colors
const colors = {
  background: "#1a1a1a",
  surface: "#2a2a2a",
  accent: "#5B9A8B",
  accentHover: "#4A8578",
  foreground: "#ededed",
  muted: "#888888",
};

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with logo */}
          <Section style={header}>
            <Link href="https://be.vocl.app" style={logoLink}>
              <Text style={logo}>be.vocl</Text>
            </Link>
          </Section>

          {/* Main content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You&apos;re receiving this email because you have an account on be.vocl.
            </Text>
            <Text style={footerLinks}>
              <Link href="https://be.vocl.app/settings" style={footerLink}>
                Email Settings
              </Link>
              {" • "}
              <Link href="https://be.vocl.app/help" style={footerLink}>
                Help Center
              </Link>
              {" • "}
              <Link href="https://be.vocl.app" style={footerLink}>
                Visit be.vocl
              </Link>
            </Text>
            <Text style={copyright}>
              © {new Date().getFullYear()} be.vocl. Share your voice freely.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: colors.background,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: colors.background,
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
};

const header = {
  padding: "20px 0 30px",
  textAlign: "center" as const,
};

const logoLink = {
  textDecoration: "none",
};

const logo = {
  color: colors.accent,
  fontSize: "32px",
  fontWeight: "700",
  margin: "0",
  fontFamily: "Georgia, serif",
};

const content = {
  backgroundColor: colors.surface,
  borderRadius: "16px",
  padding: "40px",
};

const footer = {
  padding: "30px 0",
  textAlign: "center" as const,
};

const footerText = {
  color: colors.muted,
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0 0 10px",
};

const footerLinks = {
  color: colors.muted,
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0 0 10px",
};

const footerLink = {
  color: colors.accent,
  textDecoration: "none",
};

const copyright = {
  color: "#666666",
  fontSize: "11px",
  margin: "20px 0 0",
};

// Export common styles for use in other templates
export const emailStyles = {
  colors,
  heading: {
    color: colors.foreground,
    fontSize: "24px",
    fontWeight: "600",
    lineHeight: "32px",
    margin: "0 0 20px",
    textAlign: "center" as const,
  },
  paragraph: {
    color: colors.foreground,
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 20px",
  },
  mutedText: {
    color: colors.muted,
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0 0 20px",
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: "12px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: "600",
    padding: "14px 28px",
    textDecoration: "none",
    textAlign: "center" as const,
  },
  buttonContainer: {
    textAlign: "center" as const,
    margin: "30px 0",
  },
  divider: {
    borderTop: `1px solid ${colors.surface}`,
    margin: "30px 0",
  },
  avatar: {
    borderRadius: "50%",
    width: "48px",
    height: "48px",
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: "12px",
    padding: "16px",
    margin: "20px 0",
  },
  link: {
    color: colors.accent,
    textDecoration: "none",
  },
  code: {
    backgroundColor: colors.background,
    borderRadius: "8px",
    color: colors.foreground,
    display: "inline-block",
    fontSize: "24px",
    fontWeight: "700",
    letterSpacing: "4px",
    padding: "12px 20px",
    margin: "20px 0",
  },
};
