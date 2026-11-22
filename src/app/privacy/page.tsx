import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  title: `Privacy Policy - ${APP_CONFIG.appName}`,
  description: `How ${APP_CONFIG.appName} handles uploaded portraits, protects your privacy, and manages account data.`,
};

export default function PrivacyPage() {
  const appName = APP_CONFIG.appName;
  const lastUpdated = 'November 22, 2026';

  return (
    <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-10 pb-6 border-b border-[#f0e6e8]">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e05670] mb-2">
          Legal
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#1f1d1e] tracking-tight mb-3">
          Privacy Policy
        </h1>
        <p className="text-sm text-[#8a8486]">Last Updated: {lastUpdated}</p>
      </div>

      <div className="space-y-8 text-sm sm:text-[15px] leading-relaxed text-[#575254]">
        <section>
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            1. Our Commitment to Your Privacy
          </h2>
          <p>
            Your privacy is fundamental to {appName}. This Privacy Policy explains what information we
            collect, how uploaded photographs are processed, and the rights you have over your personal
            data when using our portrait feedback tools.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            2. Transient Portrait Photo Processing
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>No Permanent Public Storage:</strong> Photographs you upload are processed
              temporarily in memory solely to generate your requested portrait feedback and report.
            </li>
            <li>
              <strong>No Resale or Model Training:</strong> We do not sell, rent, publish, or use
              your uploaded personal portraits to train advertising or third-party datasets.
            </li>
            <li>
              <strong>Strict Consent Requirement:</strong> You should only upload photos of yourself
              or individuals who have expressly consented to the evaluation.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            3. Information We Collect
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Account Information:</strong> If you create an account or sign in via an OAuth
              provider, we collect your email address and display name to manage your account and
              credit balance.
            </li>
            <li>
              <strong>Purchase &amp; Credit Records:</strong> When you purchase credits, we record
              order references, pack selections, credit balances, and transaction history. Payment card
              details are collected and handled directly by our authorized payment processor; we never
              store raw credit card numbers.
            </li>
            <li>
              <strong>Essential Cookies:</strong> We use strictly necessary HTTP cookies to maintain
              your login session and preserve purchased credit balances on your browser.
            </li>
            <li>
              <strong>Technical &amp; Security Logs:</strong> Basic request metadata (such as error
              logs and rate-limiting signals) may be recorded to maintain service reliability and
              prevent abuse.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            4. How We Use Information
          </h2>
          <p className="mb-3">We use collected information solely to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Deliver the portrait analysis and visual reports you explicitly request.</li>
            <li>Maintain accurate credit balances, order fulfillment, and automatic failure refunds.</li>
            <li>Protect the platform against fraud, spam, prohibited content, and unauthorized access.</li>
            <li>Comply with applicable legal and accounting obligations.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            5. Data Sharing &amp; Service Providers
          </h2>
          <p>
            We do not sell your personal information. We share data only with vetted infrastructure
            partners strictly as needed to operate the Service—specifically cloud hosting, payment
            processing, and automated visual analysis providers—each bound by confidentiality and
            security obligations. We may also disclose information if required by applicable law or a
            valid legal order.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            6. Data Retention &amp; Security
          </h2>
          <p>
            Account and billing records are retained only as long as your account remains active or as
            required for tax, accounting, and fraud-prevention compliance. We apply industry-standard
            transport encryption (HTTPS/TLS), access controls, and isolated database storage to protect
            your data, though no online system can guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            7. Children&rsquo;s Privacy
          </h2>
          <p>
            The Service is strictly intended for adults aged 18 and older. We do not knowingly collect
            personal data or process photographs of minors. If you believe a minor&rsquo;s information
            has been submitted to us, please contact us immediately so we can remove it.
          </p>
        </section>

        <section id="contact">
          <h2 className="font-serif text-xl font-bold text-[#1f1d1e] mb-3">
            8. Your Rights &amp; Contact
          </h2>
          <p>
            Depending on your jurisdiction (including GDPR and CCPA regions), you may request access
            to, correction of, or deletion of your account information. To submit a privacy request or
            question, please contact our support team using the support contact provided on your order
            receipt. We may update this Privacy Policy periodically and revise the &ldquo;Last
            Updated&rdquo; date above.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-[#f0e6e8] flex items-center justify-between text-xs sm:text-sm">
        <Link href="/" className="text-[#e05670] hover:underline font-medium">
          &larr; Back to Home
        </Link>
        <Link href="/terms" className="text-[#575254] hover:text-[#e05670] font-medium">
          Terms of Service &rarr;
        </Link>
      </div>
    </div>
  );
}
