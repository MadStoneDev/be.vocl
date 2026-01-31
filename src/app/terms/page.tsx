import { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Terms of Service | vocl",
  description: "Terms of Service for vocl - Share your voice freely",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors mb-6"
          >
            <IconArrowLeft size={18} />
            <span>Back</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
          <p className="text-foreground/60 mt-2">Last updated: January 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-sm max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-foreground/80">
              By accessing or using VOCL (&quot;the Service&quot;), you agree to be bound by these Terms of
              Service. If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Eligibility</h2>
            <p className="text-foreground/80">
              You must be at least 18 years old to use this Service. By using the Service, you
              represent and warrant that you are 18 years of age or older.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. User Accounts</h2>
            <div className="space-y-3 text-foreground/80">
              <p>
                You are responsible for maintaining the confidentiality of your account credentials
                and for all activities that occur under your account.
              </p>
              <p>You agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate and complete registration information</li>
                <li>Keep your login credentials secure</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
            </div>
          </section>

          <section className="bg-vocl-like/10 border border-vocl-like/30 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-vocl-like mb-4">
              4. Zero Tolerance Policy - Content Involving Minors
            </h2>
            <div className="space-y-4 text-foreground/90">
              <p className="font-medium">
                VOCL maintains a strict zero tolerance policy regarding any content that sexualizes,
                exploits, endangers, or otherwise harms minors (anyone under 18 years of age).
              </p>
              <p>The following content is absolutely prohibited:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Any sexual or suggestive content involving minors</li>
                <li>Nudity of minors in any context</li>
                <li>Content that promotes or depicts harm to minors</li>
                <li>Content that sexualizes minors in any way, including fictional depictions</li>
                <li>Any content that could be considered child sexual abuse material (CSAM)</li>
                <li>Solicitation or grooming behavior targeting minors</li>
              </ul>
              <p className="font-semibold text-vocl-like">
                Violation of this policy will result in immediate and permanent account termination,
                and we will report violations to the National Center for Missing &amp; Exploited
                Children (NCMEC) and relevant law enforcement authorities.
              </p>
              <p>
                We use automated content moderation systems to detect and flag potentially harmful
                content. All flagged content is reviewed by our safety team.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Prohibited Content</h2>
            <p className="text-foreground/80 mb-4">
              In addition to the zero tolerance policy above, the following content is prohibited:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Non-consensual intimate imagery</li>
              <li>Content that promotes violence or terrorism</li>
              <li>Harassment, bullying, or threatening behavior</li>
              <li>Hate speech targeting protected characteristics</li>
              <li>Spam, scams, or fraudulent content</li>
              <li>Copyright or trademark infringement</li>
              <li>Illegal activities or content</li>
              <li>Impersonation of individuals or organizations</li>
              <li>Malware or malicious code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Sensitive Content</h2>
            <div className="space-y-3 text-foreground/80">
              <p>
                VOCL allows certain adult content between consenting adults, provided it is properly
                marked as sensitive.
              </p>
              <p>If you post sensitive content, you must:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Mark all posts containing nudity or sexual content as &quot;sensitive&quot;</li>
                <li>Only post content featuring consenting adults</li>
                <li>Ensure you have rights to share any content you post</li>
              </ul>
              <p>
                Failure to properly mark sensitive content may result in account restrictions or
                termination.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Account Restrictions</h2>
            <div className="space-y-3 text-foreground/80">
              <p>
                We may restrict or terminate accounts that violate these terms. Account restrictions
                include:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Restricted:</strong> Temporary limitations on posting and messaging while
                  an issue is reviewed
                </li>
                <li>
                  <strong>Banned:</strong> Permanent suspension of account access
                </li>
              </ul>
              <p>
                You may appeal account restrictions through our appeals process. However, violations
                of our zero tolerance policy regarding minors are not subject to appeal.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Privacy and Data</h2>
            <div className="space-y-3 text-foreground/80">
              <p>
                Your use of the Service is also governed by our{" "}
                <Link href="/privacy" className="text-vocl-accent hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Request a copy of your personal data</li>
                <li>Request deletion of your account and associated data</li>
                <li>Control your privacy settings</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Intellectual Property</h2>
            <div className="space-y-3 text-foreground/80">
              <p>
                You retain ownership of content you post to VOCL. By posting content, you grant us
                a non-exclusive, worldwide, royalty-free license to display and distribute your
                content within the Service.
              </p>
              <p>
                You may not use VOCL&apos;s name, logo, or branding without our written permission.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              10. Disclaimers and Limitations
            </h2>
            <div className="space-y-3 text-foreground/80">
              <p>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE
                CONTINUOUS, UNINTERRUPTED ACCESS TO THE SERVICE.
              </p>
              <p>
                TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL LIABILITY FOR DAMAGES
                ARISING FROM YOUR USE OF THE SERVICE.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Changes to Terms</h2>
            <p className="text-foreground/80">
              We may update these Terms from time to time. Continued use of the Service after
              changes constitutes acceptance of the modified Terms. We will notify users of
              significant changes through the Service or email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">12. Contact</h2>
            <p className="text-foreground/80">
              For questions about these Terms, please contact us at{" "}
              <a href="mailto:legal@vocl.app" className="text-vocl-accent hover:underline">
                legal@vocl.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">13. Reporting Violations</h2>
            <p className="text-foreground/80">
              If you encounter content that violates these terms, please report it using the report
              function on the content or contact us at{" "}
              <a href="mailto:safety@vocl.app" className="text-vocl-accent hover:underline">
                safety@vocl.app
              </a>
              . We take all reports seriously and review them promptly.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-wrap gap-4 text-sm text-foreground/60">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
