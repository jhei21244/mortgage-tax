import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "How it works — LoyaltyTax",
};

export default function HowItWorks() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <Nav />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 48px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--amber)", marginBottom: 16 }}>How it works</div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(32px,5vw,56px)", marginBottom: 24, letterSpacing: "-1.5px", lineHeight: 1.1 }}>
          Three steps. One call.
        </h1>

        {[
          {
            n: "01",
            title: "Enter your mortgage details",
            body: "Tell us your lender, loan type, LVR, and current rate. We calculate your loyalty tax using real crowd-sourced data from thousands of Australian borrowers — not estimates, not modelling. Every data point in the benchmark was contributed by someone in your position.",
          },
          {
            n: "02",
            title: "See exactly how much you're overpaying",
            body: "We show you the gap between your rate and what new customers at your lender are being offered — and convert it into a dollar figure based on your loan balance. We also show the 5-year cost, because banks are betting you won't do the maths.",
          },
          {
            n: "03",
            title: "Unlock your call script",
            body: "Enter your email to unlock lender-specific call outcomes: what percentage of borrowers got a cut, the average reduction, and a personalised script with the exact rate to ask for. The script is based on the 75th percentile of outcomes reported for your lender — not wishful thinking.",
          },
          {
            n: "04",
            title: "Call your bank",
            body: "One call. Most borrowers spend under 15 minutes on the phone. You have data. They have a retention budget. This is a negotiation you can win, and every dollar they give back is a dollar they were hoping you'd leave on the table.",
          },
          {
            n: "05",
            title: "Report what happened",
            body: "Three days after you unlock your insights, we follow up. Did you call? Did they budge? Your outcome — whatever it was — is added anonymously to the benchmark. The next person who checks your lender will have better data because you reported.",
          },
        ].map((step) => (
          <div key={step.n} style={{ marginBottom: 48, paddingBottom: 48, borderBottom: "1px solid var(--ink4)" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--amber)", fontWeight: 600, letterSpacing: "2px", marginBottom: 12 }}>
              STEP {step.n}
            </div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, marginBottom: 12, letterSpacing: "-0.5px" }}>{step.title}</h2>
            <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.8 }}>{step.body}</p>
          </div>
        ))}

        <div style={{ textAlign: "center", paddingTop: 12 }}>
          <Link href="/" style={{ display: "inline-block", background: "var(--amber)", color: "var(--ink)", fontSize: 15, fontWeight: 600, padding: "14px 32px", borderRadius: 9, textDecoration: "none" }}>
            Calculate my loyalty tax →
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
