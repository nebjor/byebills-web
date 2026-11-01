import Link from "next/link";

export default function Terms() {
  return (
    <div style={{ backgroundColor: "#FBF4E6", color: "#15181D", fontFamily: "var(--font-nunito)" }} className="min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <Link href="/" className="text-[14px] font-bold text-brand">
          ← byeBills
        </Link>
        <h1 className="mt-6 text-[34px] font-extrabold tracking-[-1px]">Terms of Use</h1>
        <p className="mt-2 text-[14px]" style={{ color: "#5C6570" }}>
          Last updated: 7 July 2026
        </p>

        <p className="mt-6 rounded-xl border p-4 text-[13px] italic" style={{ borderColor: "#EFE6D2", color: "#5C6570" }}>
          These terms are provided as a starting template and are not legal advice. Have them reviewed by a qualified
          lawyer before you publish or submit to the App Store.
        </p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed" style={{ color: "#3A424C" }}>
          <Section title="1. Acceptance">
            By downloading or using byeBills, you agree to these Terms of Use. If you do not agree, do not use the app.
          </Section>

          <Section title="2. What byeBills does">
            byeBills helps you scan receipts and invoices, record income and expenses across your side businesses, and
            export that data. It is a bookkeeping aid — not an accounting, tax, or financial-advisory service.
          </Section>

          <Section title="3. AI extraction — accuracy & your review">
            byeBills uses artificial intelligence to read your receipts and suggest fields such as amount, date and
            vendor. <strong>AI output can be wrong or incomplete.</strong> Every result is shown to you to review and
            correct before it is saved, and <strong>you are responsible for verifying it</strong>. To the fullest extent
            permitted by law, byeBills is not liable for errors, omissions, or misclassifications produced by the AI or
            for any decision you make based on them.
          </Section>

          <Section title="4. Not professional advice">
            byeBills does not provide accounting, tax, legal, or financial advice and does not replace a qualified
            professional. You are solely responsible for the correctness of your books and for meeting your own tax,
            accounting and legal obligations.
          </Section>

          <Section title="5. Your responsibilities">
            You agree to provide accurate information, to use byeBills only for lawful purposes, and to keep your account
            secure. You are responsible for the data you enter and for retaining your own records as required by law.
          </Section>

          <Section title="6. Accounts">
            You sign in with Apple or Google. You are responsible for activity under your account. We may suspend or
            terminate accounts that violate these terms or misuse the service.
          </Section>

          <Section title="7. Subscriptions & billing">
            byeBills offers a free tier with a monthly scan limit and paid subscriptions for higher limits. Paid plans
            are sold and billed through the Apple App Store (and, where applicable, Google Play). Subscriptions renew
            automatically until cancelled; you manage or cancel them in your store account settings. Prices and included
            limits may change with notice.
          </Section>

          <Section title="8. Your data & content">
            You own the data and images you add. You grant byeBills the permissions needed to store, process, and
            display that data — including sending receipt images to our AI provider — so the app can function. See our{" "}
            <Link href="/privacy" className="font-semibold text-brand">
              Privacy Policy
            </Link>
            .
          </Section>

          <Section title="9. Acceptable use">
            You may not misuse the service, attempt to disrupt or reverse-engineer it, upload unlawful content, or use it
            to violate anyone&apos;s rights.
          </Section>

          <Section title="10. Service &quot;as is&quot;">
            byeBills is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind. We do
            not guarantee that extraction will be accurate or that the service will be uninterrupted or error-free.
          </Section>

          <Section title="11. Limitation of liability">
            To the fullest extent permitted by law, byeBills is not liable for indirect, incidental, or consequential
            damages, or for any loss arising from inaccurate AI output, lost data, or reliance on the app. Nothing in
            these terms limits liability that cannot be excluded by law.
          </Section>

          <Section title="12. Termination">
            You may stop using byeBills and delete your account at any time. We may suspend or end access if you breach
            these terms.
          </Section>

          <Section title="13. Governing law">
            These terms are governed by the laws of Switzerland, subject to any mandatory consumer-protection rules of
            your country of residence.
          </Section>

          <Section title="14. Changes & contact">
            We may update these terms; material changes are reflected by the date above. Questions: please contact us through the account or subscription page in the app.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 text-[18px] font-bold" style={{ color: "#15181D" }}>
        {title}
      </h2>
      <div>{children}</div>
    </div>
  );
}
