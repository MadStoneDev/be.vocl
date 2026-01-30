import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | vocl",
  description: "Terms of Service for vocl - Share your voice freely",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-8">
          Terms of Service
        </h1>

        <div className="prose prose-invert prose-sm max-w-none">
          <p className="text-foreground/60 mb-8">
            Last updated: January 30, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-foreground/80 mb-4">
              By accessing or using vocl (&quot;the Service&quot;), you agree to be bound
              by these Terms of Service. If you do not agree to these terms, please
              do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              2. Description of Service
            </h2>
            <p className="text-foreground/80 mb-4">
              vocl is a social media platform that allows users to create, share,
              and interact with content. The Service includes features such as
              posting text, images, videos, and audio content, following other users,
              liking and commenting on posts, and direct messaging.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              3. User Accounts
            </h2>
            <p className="text-foreground/80 mb-4">
              To use certain features of the Service, you must create an account.
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-foreground/80 mb-4 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and complete information during registration</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
            </ul>
            <p className="text-foreground/80 mb-4">
              You must be at least 13 years old to create an account. If you are
              under 18, you represent that you have your parent or guardian&apos;s
              permission to use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              4. User Content
            </h2>
            <p className="text-foreground/80 mb-4">
              You retain ownership of content you post on vocl. By posting content,
              you grant us a non-exclusive, worldwide, royalty-free license to use,
              display, and distribute your content in connection with the Service.
            </p>
            <p className="text-foreground/80 mb-4">
              You are solely responsible for your content and must ensure it does not:
            </p>
            <ul className="list-disc pl-6 text-foreground/80 mb-4 space-y-2">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Contain harmful, threatening, or harassing material</li>
              <li>Contain malware or malicious code</li>
              <li>Impersonate another person or entity</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              5. Sensitive Content
            </h2>
            <p className="text-foreground/80 mb-4">
              vocl allows certain adult or sensitive content where permitted by law.
              Such content must be appropriately marked as sensitive. Users can
              control their preferences for viewing sensitive content in their
              account settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              6. Prohibited Conduct
            </h2>
            <p className="text-foreground/80 mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-foreground/80 mb-4 space-y-2">
              <li>Use the Service for any illegal purpose</li>
              <li>Harass, bully, or intimidate other users</li>
              <li>Post spam or engage in deceptive practices</li>
              <li>Attempt to gain unauthorized access to the Service or other accounts</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Collect user data without consent</li>
              <li>Use automated systems to access the Service without permission</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              7. Intellectual Property
            </h2>
            <p className="text-foreground/80 mb-4">
              The Service and its original content (excluding user content) are
              protected by copyright, trademark, and other intellectual property
              laws. You may not copy, modify, or distribute any part of the Service
              without our express written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              8. Termination
            </h2>
            <p className="text-foreground/80 mb-4">
              We may terminate or suspend your account at any time, with or without
              cause, with or without notice. Upon termination, your right to use
              the Service will immediately cease.
            </p>
            <p className="text-foreground/80 mb-4">
              You may delete your account at any time through your account settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              9. Disclaimers
            </h2>
            <p className="text-foreground/80 mb-4">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE
              UNINTERRUPTED, SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              10. Limitation of Liability
            </h2>
            <p className="text-foreground/80 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES
              ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              11. Changes to Terms
            </h2>
            <p className="text-foreground/80 mb-4">
              We reserve the right to modify these terms at any time. We will notify
              users of significant changes through the Service or via email. Your
              continued use of the Service after changes constitutes acceptance of
              the modified terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              12. Contact Us
            </h2>
            <p className="text-foreground/80 mb-4">
              If you have any questions about these Terms of Service, please contact
              us at legal@vocl.app.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <a
            href="/privacy"
            className="text-vocl-accent hover:text-vocl-accent-hover transition-colors"
          >
            View Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}
