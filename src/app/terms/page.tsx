import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Radl",
  description: "Terms of Service for Radl rowing team management platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[var(--surface-1)] rounded-lg p-8 shadow-sm border border-[var(--border)]">
          <h1 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">
            Terms of Service
          </h1>
          <p className="text-[var(--text-muted)] mb-6">
            Effective Date: January 30, 2026
          </p>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              1. Acceptance of Terms
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              By accessing or using Radl ("the Service"), you agree to be bound
              by these Terms of Service. If you do not agree to these terms,
              please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              2. Description of Service
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              Radl is a rowing team management platform that helps coaches and
              athletes organize practices, manage lineups, and track equipment.
              The Service includes web and mobile applications for team
              coordination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              3. User Accounts
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account. You agree to notify us immediately of any unauthorized
              use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              4. Acceptable Use
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              You agree not to misuse the Service or help anyone else do so.
              This includes not attempting to access the Service through
              unauthorized means, not interfering with other users&apos;
              access, and not using the Service for any illegal purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              5. Intellectual Property
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              Radl and its original content, features, and functionality are
              owned by Radl, Inc. and are protected by international copyright,
              trademark, and other intellectual property laws. You retain
              ownership of all data you upload to the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              6. Disclaimer of Warranties
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              The Service is provided "as is" and "as available" without
              warranties of any kind, either express or implied, including but
              not limited to implied warranties of merchantability, fitness for
              a particular purpose, or non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              7. Limitation of Liability
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              To the maximum extent permitted by law, Radl, Inc. shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages, or any loss of profits or revenues, whether
              incurred directly or indirectly, or any loss of data, use,
              goodwill, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              8. Changes to Terms
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              We reserve the right to modify these terms at any time. We will
              provide notice of significant changes by posting the new Terms of
              Service on this page and updating the effective date. Your
              continued use of the Service after changes constitutes acceptance
              of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">
              9. Contact Information
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              If you have any questions about these Terms of Service, please
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
