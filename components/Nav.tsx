"use client";
import { useState } from "react";
import Link from "next/link";

export default function Nav() {
  const [open, setOpen] = useState(false);

  const scrollToCalc = () => {
    document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 48px",
        borderBottom: "1px solid var(--ink4)",
        position: "sticky",
        top: 0,
        background: "var(--ink)",
        zIndex: 100,
      }}
    >
      <Link href="/" style={{ fontFamily: "var(--serif, 'DM Serif Display')", fontSize: 22, color: "var(--text)", textDecoration: "none" }}>
        Loyalty<span style={{ color: "var(--amber)" }}>Tax</span>
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex" style={{ gap: 28, fontSize: 13 }}>
        <Link href="/how-it-works" style={{ color: "var(--text2)", textDecoration: "none" }}>How it works</Link>
        <Link href="/lenders" style={{ color: "var(--text2)", textDecoration: "none" }}>Lender rankings</Link>
        <Link href="/data" style={{ color: "var(--text2)", textDecoration: "none" }}>Data</Link>
        <Link href="/about" style={{ color: "var(--text2)", textDecoration: "none" }}>About</Link>
      </div>

      <button
        onClick={scrollToCalc}
        className="hidden md:block"
        style={{
          background: "var(--amber)",
          color: "var(--ink)",
          fontSize: 13,
          fontWeight: 600,
          padding: "9px 20px",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
        }}
      >
        Check my rate →
      </button>

      {/* Mobile hamburger */}
      <button
        className="md:hidden"
        onClick={() => setOpen(!open)}
        style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", fontSize: 22 }}
        aria-label="Menu"
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--ink2)",
            borderBottom: "1px solid var(--ink4)",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <Link href="/how-it-works" onClick={() => setOpen(false)} style={{ color: "var(--text2)", textDecoration: "none", fontSize: 15 }}>How it works</Link>
          <Link href="/lenders" onClick={() => setOpen(false)} style={{ color: "var(--text2)", textDecoration: "none", fontSize: 15 }}>Lender rankings</Link>
          <Link href="/data" onClick={() => setOpen(false)} style={{ color: "var(--text2)", textDecoration: "none", fontSize: 15 }}>Data</Link>
          <Link href="/about" onClick={() => setOpen(false)} style={{ color: "var(--text2)", textDecoration: "none", fontSize: 15 }}>About</Link>
          <button onClick={scrollToCalc} style={{ background: "var(--amber)", color: "var(--ink)", fontWeight: 600, padding: "10px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 14 }}>
            Check my rate →
          </button>
        </div>
      )}
    </nav>
  );
}
