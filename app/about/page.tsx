import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "About — LoyaltyTax",
};

export default function AboutPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <Nav />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 48px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--amber)", marginBottom: 16 }}>About</div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(32px,5vw,56px)", marginBottom: 24, letterSpacing: "-1.5px", lineHeight: 1.1 }}>
          Why we built this
        </h1>

        <p style={{ fontSize: 17, color: "var(--text2)", lineHeight: 1.8, marginBottom: 32 }}>
          Australian banks have been charging loyal customers more than new customers for decades. The ACCC confirmed it. The data is unambiguous. And yet most borrowers don't know their rate is uncompetitive — because their bank doesn't tell them.
        </p>

        <p style={{ fontSize: 17, color: "var(--text2)", lineHeight: 1.8, marginBottom: 32 }}>
          LoyaltyTax puts a dollar figure on this. Not a vague warning — a specific number, based on real data from real borrowers at your specific lender. Then it tells you exactly what to say to do something about it.
        </p>

        <p style={{ fontSize: 17, color: "var(--text2)", lineHeight: 1.8, marginBottom: 48 }}>
          The benchmark improves every time someone contributes their rate or reports their call outcome. The more people use it, the more accurate the data gets, and the better positioned the next borrower is when they pick up the phone.
        </p>

        <div style={{ background: "var(--ink2)", border: "1px solid var(--ink4)", borderRadius: 12, padding: 28, marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 16 }}>Legal</h2>
          <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.8, marginBottom: 12 }}>
            LoyaltyTax provides general information only. It is not financial advice. You should consider seeking independent financial advice before making any decisions about your home loan.
          </p>
          <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.8, marginBottom: 12 }}>
            LoyaltyTax does not hold an Australian Financial Services Licence (AFSL). The platform does not make specific loan recommendations. Where broker referrals are offered, these are facilitated through AFSL-licensed partners, and LoyaltyTax receives a referral fee. This is disclosed at the point of referral.
          </p>
          <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.8 }}>
            Benchmark data is crowd-sourced and anonymised. It is not guaranteed to be current or accurate. All rates include a last-updated timestamp. LoyaltyTax does not receive payment from any lender, and no lender has any access to the data.
          </p>
        </div>

        <div style={{ background: "var(--ink2)", border: "1px solid var(--ink4)", borderRadius: 12, padding: 28, marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 16 }}>Privacy</h2>
          <ul style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Your email address is hashed (SHA-256) client-side before any data is transmitted. The raw address never reaches our servers.</li>
            <li>Submissions are stored in aggregate segments. No individual submission is ever published or attributed.</li>
            <li>We use email hashes only for deduplication and linking outcome follow-ups.</li>
            <li>We do not sell data. We do not share data with lenders. We do not use data for advertising.</li>
            <li>We are compliant with the Australian Privacy Act 1988.</li>
          </ul>
        </div>

        <div style={{ textAlign: "center" }}>
          <Link href="/" style={{ display: "inline-block", background: "var(--amber)", color: "var(--ink)", fontSize: 15, fontWeight: 600, padding: "14px 32px", borderRadius: 9, textDecoration: "none" }}>
            Check my loyalty tax →
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
