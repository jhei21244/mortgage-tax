import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Data & Methodology — LoyaltyTax",
};

export default function DataPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <Nav />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 48px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--amber)", marginBottom: 16 }}>Methodology</div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(32px,5vw,48px)", marginBottom: 24, letterSpacing: "-1.5px", lineHeight: 1.1 }}>
          Data transparency
        </h1>

        {[
          {
            title: "Where the data comes from",
            body: "LoyaltyTax benchmarks are built from two sources: (1) crowd-sourced submissions from borrowers who contribute their current rate, lender, and loan details; and (2) daily scrapes of advertised new-customer rates from lender websites. The loyalty gap is the difference between these two figures, averaged across submissions in each lender/loan-type/LVR segment.",
          },
          {
            title: "What we collect",
            body: "When you submit your details, we store: your lender, loan type, LVR band, balance band, current interest rate, and a SHA-256 hash of your email address. Your email is hashed client-side — the raw address never reaches our servers. We do not store your name, address, or any identifying information.",
          },
          {
            title: "How benchmarks are calculated",
            body: "Benchmarks are refreshed hourly. For each lender/loan-type/LVR combination, we calculate: average existing customer rate (from submissions), best advertised new-customer rate (from daily scrapes), loyalty gap (the difference), call success rate (% of outcome reporters who received a reduction), and average reduction (when a cut was achieved). A minimum of 30 submissions is required before a segment is published.",
          },
          {
            title: "Outlier removal",
            body: "Submissions where the reported rate is more than 3 standard deviations from the segment mean are excluded from benchmark calculations. This removes data entry errors and unusual fixed-rate rollovers that would skew the averages.",
          },
          {
            title: "Advertised rates",
            body: "Advertised new-customer rates are sourced daily from lender websites at 06:00 AEST. We use the lowest published variable P&I rate for each lender as the comparison benchmark. Rates for other loan types (IO, fixed) are sourced separately. If a lender's website cannot be scraped reliably, we note this on the relevant benchmark entry.",
          },
          {
            title: "Limitations",
            body: "This data represents a self-selected sample — borrowers who found LoyaltyTax are likely more aware of their rate than average. Call success rates may therefore overstate what a typical borrower would achieve. Benchmarks should be treated as indicative, not guaranteed. Always check the last-updated timestamp and sample size.",
          },
          {
            title: "Privacy",
            body: "All benchmark data is published in aggregate — no individual submission is ever exposed. Email hashes are used only to deduplicate submissions and link outcome follow-ups. We do not sell, share, or licence any individual-level data. We do not share data with lenders under any circumstances.",
          },
        ].map((section) => (
          <div key={section.title} style={{ marginBottom: 40, paddingBottom: 40, borderBottom: "1px solid var(--ink4)" }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 12, letterSpacing: "-0.3px" }}>{section.title}</h2>
            <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.8 }}>{section.body}</p>
          </div>
        ))}

        <div style={{ background: "var(--ink2)", border: "1px solid var(--ink4)", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Research basis</h3>
          <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7 }}>
            The existence and scale of the mortgage loyalty tax is supported by the ACCC's 2020 Home Loan Price Inquiry, which found that borrowers who had held their loan for more than 3 years paid significantly higher rates than new customers at the same lender, with the four major banks collectively earning billions in additional revenue from loyal customers annually.
          </p>
          <a href="https://www.accc.gov.au/focus-areas/inquiries-finalised/home-loan-price-inquiry" target="_blank" rel="noopener" style={{ display: "inline-block", marginTop: 12, fontSize: 13, color: "var(--amber)" }}>
            ACCC Home Loan Price Inquiry →
          </a>
        </div>
      </div>
      <Footer />
    </main>
  );
}
