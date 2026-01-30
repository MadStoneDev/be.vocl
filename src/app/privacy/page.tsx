import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | vocl",
  description: "Privacy Policy for vocl - Share your voice freely",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-invert prose-sm max-w-none">
          <p className="text-foreground/60 mb-8">
            Last updated: January 30, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              1. Introduction
            </h2>
            <p className="text-foreground/80 mb-4">
              Welcome to vocl. We respect your privacy and are committed to
              protecting your personal data. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you use
              our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              2. Information We Collect
            </h2>

            <h3 className="text-lg font-medium text-foreground mb-3">
              2.1 Information You Provide
            </h3>
            <ul className="list-disc pl-6 text-foreground/80 mb-4 space-y-2">
              <li>
                <strong>Account Information:</strong> Username, email address,
                password, display name, bio, and profile pictures
              </li>
              <li>
                <strong>Content:</strong> Posts, comments, messages, and other
                content you create on the platform
              </li>
              <li>
                <strong>Communications:</strong> Messages you send to other users
                and communications with our support team
              </li>
              <li>
                <strong>Payment Information:</strong> If you make purchases,
                payment information is processed by our payment providers
              </li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mb-3">
              2.2 Information Collected Automatically
            </h3>
            <ul className="list-disc pl-6 text-foreground/80 mb-4 space-y-2">
              <li>
                <strong>Usage Data:</strong> How you interact with the Service,
                including posts viewed, features used, and time spent
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, operating
                system, device identifiers, and IP address
              </li>
              <li>
                <strong>Cookies and Similar Technologies:</strong> We use cookies
                to maintain your session and preferences
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-foreground/80 mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-foreground/80 mb-4 space-y-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Create and manage your account</li>
              <li>Enable you to communicate with other users</li>
              <li>Personalize your experience and content recommendations</li>
              <li>Send you updates, security alerts, and support messages</li>
              <li>Detect, prevent, and address fraud and security issues</li>
              <li>Comply with legal obligations</li>
              <li>Analyze usage patterns to improve the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              4. Information Sharing
            </h2>
            <p className="text-foreground/80 mb-4">
              We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-foreground/80 mb-4 space-y-2">
              <li>
                <strong>Public Content:</strong> Posts and profile information you
                make public are visible to all users
              </li>
              <li>
                <strong>With Your Consent:</strong> When you explicitly authorize
                sharing
              </li>
              <li>
                <strong>Service Providers:</strong> Third parties who help us
                operate the Service (hosting, analytics, etc.)
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or to
                protect our rights and safety
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with a merger,
                acquisition, or sale of assets
              </li>
            </ul>
            <p className="text-foreground/80 mb-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              5. Data Security
            </h2>
            <p className="text-foreground/80 mb-4">
              We implement appropriate technical and organizational measures to
              protect your personal data, including:
            </p>
            <ul className="list-disc pl-6 text-foreground/80 mb-4 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Employee training on data protection</li>
            </ul>
            <p className="text-foreground/80 mb-4">
              However, no method of transmission over the Internet is 100% secure,
              and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              6. Your Rights and Choices
            </h2>
            <p className="text-foreground/80 mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc pl-6 text-foreground/80 mb-4 space-y-2">
              <li>
                <strong>Access:</strong> Request a copy of your personal data
              </li>
              <li>
                <strong>Correction:</strong> Update or correct inaccurate data
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your personal data
              </li>
              <li>
                <strong>Portability:</strong> Receive your data in a portable format
              </li>
              <li>
                <strong>Objection:</strong> Object to certain processing activities
              </li>
              <li>
                <strong>Restriction:</strong> Request restriction of processing
              </li>
            </ul>
            <p className="text-foreground/80 mb-4">
              You can manage your privacy settings in your account settings. To
              exercise other rights, please contact us at privacy@vocl.app.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              7. Data Retention
            </h2>
            <p className="text-foreground/80 mb-4">
              We retain your personal data for as long as necessary to provide the
              Service and fulfill the purposes described in this policy. When you
              delete your account, we will delete or anonymize your personal data
              within 30 days, except where we are required to retain it for legal
              purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              8. International Data Transfers
            </h2>
            <p className="text-foreground/80 mb-4">
              Your information may be transferred to and processed in countries
              other than your own. We ensure appropriate safeguards are in place
              to protect your data in accordance with applicable laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              9. Children&apos;s Privacy
            </h2>
            <p className="text-foreground/80 mb-4">
              The Service is not intended for children under 13. We do not
              knowingly collect personal information from children under 13. If we
              become aware that we have collected such information, we will take
              steps to delete it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              10. Cookies and Tracking
            </h2>
            <p className="text-foreground/80 mb-4">
              We use essential cookies to provide the Service. These include:
            </p>
            <ul className="list-disc pl-6 text-foreground/80 mb-4 space-y-2">
              <li>
                <strong>Authentication Cookies:</strong> To keep you logged in
              </li>
              <li>
                <strong>Preference Cookies:</strong> To remember your settings
              </li>
              <li>
                <strong>Security Cookies:</strong> To detect and prevent fraud
              </li>
            </ul>
            <p className="text-foreground/80 mb-4">
              You can control cookies through your browser settings, but disabling
              them may affect the functionality of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              11. Changes to This Policy
            </h2>
            <p className="text-foreground/80 mb-4">
              We may update this Privacy Policy from time to time. We will notify
              you of significant changes by posting a notice on the Service or
              sending you an email. Your continued use of the Service after changes
              take effect constitutes acceptance of the revised policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              12. Contact Us
            </h2>
            <p className="text-foreground/80 mb-4">
              If you have questions about this Privacy Policy or our privacy
              practices, please contact us at:
            </p>
            <p className="text-foreground/80 mb-4">
              Email: privacy@vocl.app
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <a
            href="/terms"
            className="text-vocl-accent hover:text-vocl-accent-hover transition-colors"
          >
            View Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
}
