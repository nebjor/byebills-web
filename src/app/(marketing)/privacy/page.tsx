import Link from "next/link";

export default function Privacy() {
  return (
    <div style={{ backgroundColor: "#FBF4E6", color: "#15181D", fontFamily: "var(--font-nunito)" }} className="min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <Link href="/" className="text-[14px] font-bold text-brand">
          ← byeBills
        </Link>
        <h1 className="mt-6 text-[34px] font-extrabold tracking-[-1px]">Privacy Policy</h1>
        <p className="mt-2 text-[14px]" style={{ color: "#5C6570" }}>
          Last updated: 8 July 2026
        </p>

        <p className="mt-6 rounded-xl border p-4 text-[13px] italic" style={{ borderColor: "#EFE6D2", color: "#5C6570" }}>
          This policy is written to reflect the Swiss FADP (nFADP) and the EU GDPR, but it is a template and not legal
          advice. Have it reviewed by a qualified data-protection lawyer, and fill in the bracketed details, before you
          publish or submit to the App Store.
        </p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed" style={{ color: "#3A424C" }}>
          <p>
            byeBills (&quot;byeBills&quot;, &quot;we&quot;) provides a mobile app and website that let you scan receipts
            and invoices and keep track of your income and expenses. This policy explains what personal data we process,
            why, and your rights. It applies to the app, the website, and the waitlist.
          </p>

          <Section title="1. Controller & contact">
            The data controller is <strong>[Your legal entity, Switzerland — name & address]</strong>. You can
            reach us about data protection through the account or subscription page in the app. If you are in the EU/EEA, our representative under Art. 27 GDPR is{" "}
            <strong>[EU representative — to appoint]</strong>.
          </Section>

          <Section title="2. What we collect">
            <List
              items={[
                "Account data: your name and email address, provided when you sign in with Apple or Google.",
                "Financial data you add: transactions, amounts, dates, categories, vendors, notes, and the receipt/invoice images you scan or upload.",
                "Waitlist data: your email (and optional first name) if you join the pre-launch waitlist.",
                "Usage & device data: basic diagnostics needed to run and secure the service (e.g. app version, error logs).",
              ]}
            />
          </Section>

          <Section title="3. Why we process it & legal bases">
            We process your data to provide the service (performance of our contract with you), to run receipt
            extraction, and to keep the app secure (our legitimate interest). For the waitlist and any launch/marketing
            emails, we rely on your <strong>consent</strong>, which you can withdraw at any time. Under the Swiss FADP we
            process data in good faith and proportionately; under the GDPR our bases are Art. 6(1)(b), (f) and (a).
          </Section>

          <Section title="4. AI processing (Google / Gemini)">
            When you scan a receipt, the image is sent to <strong>Google</strong> (Gemini API) to extract fields such as
            amount, date and vendor. Google acts as our processor under a data-processing agreement; where data reaches
            the US, Google is certified under the EU–US and Swiss–US Data Privacy Framework. We use the API on terms
            under which your content is <strong>not used to train models</strong>. AI output can be inaccurate — you
            review and edit every extraction before it is saved.
          </Section>

          <Section title="5. Hosting, storage & sub-processors">
            Your data is stored with <strong>Supabase</strong>, hosted in <strong>Switzerland (Zurich, eu-central-2)</strong>,
            under a signed Data Processing Addendum — your primary data stays on Swiss servers. Supabase uses
            sub-processors that may be US-based (e.g. AWS, Cloudflare, GitHub, Vercel); Standard Contractual Clauses cover
            any such transfers. Note that a US-headquartered provider may in principle be subject to US legal access
            (e.g. the CLOUD Act).
          </Section>

          <Section title="6. International transfers">
            Your primary data stays in Switzerland. Where personal data is transferred abroad (e.g. to the US for certain
            sub-processors or for the AI extraction), we rely on an adequacy decision (incl. the Swiss–US / EU–US Data
            Privacy Framework for certified recipients) or on Standard Contractual Clauses with appropriate safeguards,
            as required by the FADP and GDPR.
          </Section>

          <Section title="7. Waitlist & marketing emails">
            If you join the waitlist, we use your email to send launch updates and related news. Every email includes an
            unsubscribe link, and you can opt out at any time. We do not sell your data or use it for third-party
            advertising.
          </Section>

          <Section title="8. Retention">
            We keep your data while your account (or waitlist entry) is active. When you delete your account or data, or
            unsubscribe, we delete the corresponding data, subject to any retention required by law.
          </Section>

          <Section title="9. Your rights">
            You can request access to, correction, deletion, restriction, or a copy (portability) of your data, and
            object to or withdraw consent for certain processing. Exercise these in the app or by contacting us through the account or subscription page. You may
            also complain to the Swiss Federal Data Protection and Information Commissioner (FDPIC) or, in the EU/EEA,
            your local data-protection authority.
          </Section>

          <Section title="10. Account deletion">
            You can delete your account and all associated data from within the app at any time (Profile → Delete
            account), or by contacting us.
          </Section>

          <Section title="11. Security & children">
            We use appropriate technical and organizational measures to protect your data. byeBills is intended for
            users aged 16+ and is not directed to children.
          </Section>

          <Section title="12. Changes & contact">
            We may update this policy; material changes are reflected by the date above. Questions or requests: please contact us through the account or subscription page in the app.
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

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </ul>
  );
}
