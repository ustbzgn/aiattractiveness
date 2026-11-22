import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  title: `Terms of Service - ${APP_CONFIG.appName}`,
  description: `Terms of Service, Acceptable Use Policy, and disclaimers for ${APP_CONFIG.appName}.`,
};

export default function TermsPage() {
  const appName = APP_CONFIG.appName;
  const lastUpdated = 'November 22, 2026';

  return (
    <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-10 pb-6 border-b border-[#f0e6e8]">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e05670] mb-2">
          Legal
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#1f1d1e] tracking-tight mb-3">
          Terms of Service
        </h1>
        <p className="text-sm text-[#8a8486]">Last Updated: {lastUpdated}</p>
      </div>

      <div className="space-y-8 text-sm sm:text-[15px] leading-relaxed text-[#575254]">
        <section>
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using {appName} (the &ldquo;Service&rdquo;), you agree to be bound by these
            Terms of Service (&ldquo;Terms&rdquo;) and our{' '}
            <Link href="/privacy" className="text-[#e05670] hover:underline font-medium">
              Privacy Policy
            </Link>
            . If you do not agree to these Terms, you must not access or use the Service. You represent
            that you are at least 18 years old (or the age of legal majority in your jurisdiction) and
            have the legal capacity to enter into this agreement.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            2. Description of Service
          </h2>
          <p>
            {appName} provides automated portrait evaluation tools focused on photography lighting,
            framing, composition, expression, and visual presentation, along with downloadable visual
            summary reports. Results are intended solely for personal reference, photography guidance,
            and entertainment.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            3. Legal Compliance &amp; Strictly Prohibited Content (Zero NSFW Policy)
          </h2>
          <p className="mb-3">
            You agree to comply with all applicable local, national, and international laws and
            regulations while using the Service. You are strictly prohibited from uploading,
            submitting, or attempting to generate any content that:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>NSFW &amp; Sexually Explicit Material:</strong> Contains nudity, pornography,
              sexually explicit acts, suggestive adult material, or obscene imagery of any kind.
            </li>
            <li>
              <strong>Minors &amp; Exploitation:</strong> Depicts anyone under 18 years of age or
              involves any form of child sexual abuse material (CSAM) or exploitation.
            </li>
            <li>
              <strong>Non-Consensual &amp; Private Imagery:</strong> Uses photographs of third parties
              without their clear consent, or violates any person&rsquo;s privacy, publicity, or
              portrait rights.
            </li>
            <li>
              <strong>Hate, Harassment &amp; Violence:</strong> Promotes hate speech, discrimination,
              bullying, self-harm, graphic violence, or illegal activities.
            </li>
            <li>
              <strong>System Abuse:</strong> Attempts to bypass credit limits, reverse-engineer,
              scrape, overload, or exploit automated endpoints of the Service.
            </li>
          </ul>
          <p className="mt-3">
            We reserve the right to block prohibited uploads, refuse service, and permanently suspend
            or terminate accounts that violate this policy without notice or refund.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            4. User Content &amp; Privacy
          </h2>
          <p>
            You retain full ownership of the photographs you upload. By submitting an image, you grant
            us a limited, temporary license solely to process the image and generate your requested
            portrait report. Uploaded photos are processed transiently and are not published to public
            galleries or sold to third parties. Please review our{' '}
            <Link href="/privacy" className="text-[#e05670] hover:underline font-medium">
              Privacy Policy
            </Link>{' '}
            for complete details on how we protect your information.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            5. Credits, Payments &amp; Refunds
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Certain evaluation modes require credits purchased through our checkout options. Credits
              do not expire and are deducted only when an evaluation is initiated.
            </li>
            <li>
              If an evaluation fails due to a technical error or an image cannot be analyzed, the
              deducted credits are automatically returned to your balance.
            </li>
            <li>
              Payments are processed securely through authorized third-party payment providers. Because
              digital credits are fulfilled immediately upon payment confirmation, completed purchases
              are generally non-refundable except where required by applicable law or in the case of
              verified billing errors.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            6. Disclaimers
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Informational &amp; Creative Purpose Only:</strong> Scores and suggestions are
              subjective visual assessments of photography elements such as lighting, angle, framing,
              and expression. They are not objective measures of personal worth or beauty.
            </li>
            <li>
              <strong>Not Medical or Professional Advice:</strong> The Service does not provide
              medical, dermatological, cosmetic, surgical, or psychological advice. Never make health
              or cosmetic decisions based on automated visual feedback.
            </li>
            <li>
              <strong>&ldquo;As Is&rdquo; Basis:</strong> The Service is provided on an &ldquo;as
              is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, whether
              express or implied, including uninterrupted availability or specific outcomes.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            7. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by law, {appName} and its operators shall not be liable
            for any indirect, incidental, special, consequential, or punitive damages arising from your
            use of or inability to use the Service. In no event shall our aggregate liability exceed
            the total amount you paid to us in the twelve (12) months preceding the claim.
          </p>
        </section>

        <section id="contact">
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            8. Changes to Terms &amp; Contact
          </h2>
          <p>
            We may update these Terms from time to time. Continued use of the Service after updates
            take effect constitutes acceptance of the revised Terms. If you have questions regarding
            these Terms, billing inquiries, or content compliance reports, please contact our support
            team through the email listed on your order receipt.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-[#f0e6e8] flex items-center justify-between text-xs sm:text-sm">
        <Link href="/" className="text-[#e05670] hover:underline font-medium">
          &larr; Back to Home
        </Link>
        <Link href="/privacy" className="text-[#575254] hover:text-[#e05670] font-medium">
          Privacy Policy &rarr;
        </Link>
      </div>
    </div>
  );
}
