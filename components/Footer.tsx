import Link from "next/link";

export default function Footer() {
  return (
    <>
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "16px 48px",
        borderTop: "1px solid var(--ink4)",
        marginTop: 48,
      }}>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text2)" }}>Important:</strong> LoyaltyTax provides general information only. It is not financial advice. You should consider seeking independent financial advice before making any decisions about your home loan.
        </p>
      </div>
      <footer style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "24px 48px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
      }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "var(--text)" }}>
          Loyalty<span style={{ color: "var(--amber)" }}>Tax</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text3)" }}>
          ACCC 2020 Home Loan Price Inquiry ·{" "}
          <Link href="/data" style={{ color: "var(--text3)" }}>Methodology</Link> ·{" "}
          <Link href="/about" style={{ color: "var(--text3)" }}>Privacy Policy</Link> ·{" "}
          <Link href="/about" style={{ color: "var(--text3)" }}>Terms</Link>
        </p>
        <p style={{ fontSize: 12, color: "var(--text3)" }}>© 2026 LoyaltyTax Pty Ltd</p>
      </footer>
    </>
  );
}
