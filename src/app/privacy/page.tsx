import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Radl",
  description: "Privacy Policy for Radl rowing team management platform.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[var(--surface-1)] rounded-lg p-8 shadow-sm border border-[var(--border)]">
          <h1 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">
            Privacy Policy
          </h1>
          <p className="text-[var(--text-muted)] mb-6">
            Effective Date: January 30, 2026
          </p>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              1. Information We Collect
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              We collect information you provide directly to us when using Radl:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2 ml-4">
              <li>
                <strong>Account information:</strong> Your email address and
                name when you create an account.
              </li>
              <li>
                <strong>Team data:</strong> Team name, roster information,
                practice schedules, and lineups that you create and manage.
              </li>
              <li>
                <strong>Equipment data:</strong> Boats, oars, and other
                equipment you track, including damage reports.
              </li>
              <li>
                <strong>Usage data:</strong> Information about how you interact
                with the app, including features used and actions taken.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              2. How We Use Your Information
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2 ml-4">
              <li>Provide, maintain, and improve the Service.</li>
              <li>
                Send you notifications about practices, lineups, and team
                updates.
              </li>
              <li>
                Communicate with you about your account and important service
                updates.
              </li>
              <li>
                Analyze usage patterns to improve the platform and user
                experience.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              3. Data Sharing
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              <strong>We do not sell your personal data.</strong> We may share
              your information in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2 ml-4">
              <li>
                <strong>With team members:</strong> Information you add to a
                team is visible to other members you invite to that team.
              </li>
              <li>
                <strong>Service providers:</strong> We may share data with
                third-party services that help us operate (e.g., hosting,
                email).
              </li>
              <li>
                <strong>Legal compliance:</strong> We may disclose information
                if required by law or legal process.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              4. Data Security
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              We implement appropriate security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2 ml-4">
              <li>
                <strong>Encryption in transit:</strong> All data is transmitted
                over HTTPS.
              </li>
              <li>
                <strong>Secure authentication:</strong> We use industry-standard
                authentication via Supabase.
              </li>
              <li>
                <strong>Tenant isolation:</strong> Row-level security ensures
                your team&apos;s data is isolated from other teams.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              5. Data Retention
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              We retain your data for as long as your account is active. If you
              wish to delete your account and associated data, please contact us
              at{" "}
              <a
                href="mailto:support@radl.app"
                className="text-teal-600 hover:underline"
              >
                support@radl.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              6. Your Rights
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] mb-4 space-y-2 ml-4">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and data.</li>
              <li>
                Export your data by contacting{" "}
                <a
                  href="mailto:support@radl.app"
                  className="text-teal-600 hover:underline"
                >
                  support@radl.app
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              7. Cookies
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              We use essential cookies for authentication and maintaining your
              session. We do not use third-party tracking cookies for
              advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              8. Children&apos;s Privacy
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              The Service is not intended for children under 13 years of age. If
              you are under 13, please do not use the Service or provide any
              personal information. For users between 13 and 18, we recommend
              parental or guardian consent before using the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              9. Changes to This Policy
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              We may update this Privacy Policy from time to time. We will
              notify you of significant changes by posting the new policy on
              this page and updating the effective date. Your continued use of
              the Service after changes constitutes acceptance of the updated
              policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              10. Contact Us
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              If you have any questions about this Privacy Policy, please
              contact us:
            </p>
            <p className="text-[var(--text-secondary)] mb-4">
              <strong>Radl, Inc.</strong>
              <br />
              Email:{" "}
              <a
                href="mailto:support@radl.app"
                className="text-teal-600 hover:underline"
              >
                support@radl.app
              </a>
            </p>
          </section>

          <div className="mt-12 pt-6 border-t border-[var(--border)]">
            <Link
              href="/"
              className="text-teal-600 hover:underline font-medium"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
