"use client";
import { useState, useEffect } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Link from "next/link";

interface Benchmark {
  lender: string;
  loan_type: string;
  lvr_band: string;
  avg_existing_rate: number;
  advertised_rate: number;
  loyalty_gap: number;
  call_success_rate: number;
  avg_reduction: number;
  sample_size: number;
  last_updated: string;
}

type SortKey = keyof Benchmark;

export default function LendersClient({ initialData }: { initialData: Benchmark[] }) {
  const [data, setData] = useState<Benchmark[]>(initialData);
  const [sortKey, setSortKey] = useState<SortKey>("loyalty_gap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterLoanType, setFilterLoanType] = useState("variable_pi");
  const [filterLvr, setFilterLvr] = useState("60_70");
  const [refreshing, setRefreshing] = useState(false);

  // Refresh in background when filters change (after initial server render)
  useEffect(() => {
    setRefreshing(true);
    fetch(`/api/benchmark?all=true&loan_type=${filterLoanType}&lvr_band=${filterLvr}`)
      .then((r) => r.json())
      .then((d) => { setData(Array.isArray(d) ? d : []); })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, [filterLoanType, filterLvr]);

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const gapPill = (gap: number) => {
    const color = gap > 0.5 ? "#f87171" : gap > 0.2 ? "var(--amber)" : "var(--green)";
    const bg = gap > 0.5 ? "rgba(239,68,68,0.12)" : gap > 0.2 ? "rgba(240,165,0,0.12)" : "rgba(34,197,94,0.12)";
    return (
      <span style={{ background: bg, color, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, padding: "4px 9px", borderRadius: 5, display: "inline-block" }}>
        {gap.toFixed(2)}%
      </span>
    );
  };

  const progressBar = (pct: number) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{pct.toFixed(0)}%</span>
      <span style={{ display: "inline-block", width: 72, height: 5, background: "var(--ink4)", borderRadius: 3 }}>
        <span style={{ display: "block", height: "100%", width: `${Math.min(pct, 100)}%`, background: "var(--green)", borderRadius: 3 }} />
      </span>
    </span>
  );

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => handleSort(k)}
      style={{ textAlign: "left", fontSize: 11, fontWeight: 600, color: sortKey === k ? "var(--amber)" : "var(--text3)", textTransform: "uppercase", letterSpacing: "0.8px", padding: "12px 16px", borderBottom: "1px solid var(--ink4)", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}
    >
      {label} {sortKey === k ? (sortDir === "desc" ? "↓" : "↑") : ""}
    </th>
  );

  // Find most recently updated row
  const lastUpdated = data.length > 0
    ? new Date(Math.max(...data.map(d => new Date(d.last_updated).getTime())))
    : null;
  const minutesAgo = lastUpdated ? Math.round((Date.now() - lastUpdated.getTime()) / 60000) : null;

  return (
    <main style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <Nav />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 48px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--amber)", marginBottom: 16 }}>Lender rankings</div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(26px,3vw,36px)", marginBottom: 8, letterSpacing: "-0.5px" }}>Which banks are worst offenders?</h1>
        <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 8, lineHeight: 1.7 }}>
          Loyalty tax gap by lender — crowd-reported existing customer rates vs best advertised new-customer rates.
        </p>

        {/* FIX 5: Data freshness indicator */}
        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
          {refreshing
            ? <span style={{ color: "var(--amber)" }}>Refreshing…</span>
            : minutesAgo !== null
              ? <span>Updated {minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.round(minutesAgo / 60)}h ago`} · <Link href="/data" style={{ color: "var(--amber)" }}>See methodology</Link></span>
              : null
          }
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <select value={filterLoanType} onChange={(e) => setFilterLoanType(e.target.value)} style={filterSelect}>
            <option value="variable_pi">Variable P&I</option>
            <option value="variable_io">Variable IO</option>
            <option value="fixed">Fixed</option>
          </select>
          <select value={filterLvr} onChange={(e) => setFilterLvr(e.target.value)} style={filterSelect}>
            <option value="60_70">60–70% LVR</option>
            <option value="lt60">Under 60%</option>
            <option value="70_80">70–80%</option>
            <option value="gt80">80%+</option>
          </select>
        </div>

        {/* Server-rendered table — always shows data, no loading state */}
        {sorted.length === 0 ? (
          <div style={{ color: "var(--text3)", padding: "40px 0" }}>
            No data for this combination yet — try Variable P&I / 60–70% LVR.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.8px", padding: "12px 16px", borderBottom: "1px solid var(--ink4)" }}>Lender</th>
                  <SortBtn k="loyalty_gap" label="Avg loyalty gap" />
                  <SortBtn k="call_success_rate" label="Call success rate" />
                  <SortBtn k="avg_reduction" label="Avg cut when called" />
                  <SortBtn k="sample_size" label="Reports" />
                  <th style={{ textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.8px", padding: "12px 16px", borderBottom: "1px solid var(--ink4)" }}>Last updated</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={`${row.lender}-${row.loan_type}-${row.lvr_band}`} style={{ transition: "background 0.1s" }}>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--ink3)", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{row.lender}</td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--ink3)" }}>{gapPill(row.loyalty_gap)}</td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--ink3)" }}>{progressBar(row.call_success_rate)}</td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--ink3)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{row.avg_reduction.toFixed(2)}%</td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--ink3)" }}>
                      {/* FIX 5: Sample size with visual confidence indicator */}
                      <span style={{ fontSize: 13, color: "var(--text2)" }}>{row.sample_size.toLocaleString()}</span>
                      {row.sample_size < 100 && (
                        <span style={{ fontSize: 10, color: "var(--text3)", display: "block" }}>limited data</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--ink3)", fontSize: 12, color: "var(--text3)" }}>
                      {new Date(row.last_updated).toLocaleDateString("en-AU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 20, fontSize: 12, color: "var(--text3)", lineHeight: 1.6, padding: "16px 0", borderTop: "1px solid var(--ink4)" }}>
          Rates are crowd-reported and anonymised. Advertised new-customer rates sourced daily from lender websites. Segments require a minimum of 30 submissions before being published.{" "}
          <Link href="/data" style={{ color: "var(--amber)" }}>See full methodology →</Link><br />
          LoyaltyTax does not receive any payment from any lender.
        </div>
      </div>

      <Footer />
    </main>
  );
}

const filterSelect: React.CSSProperties = {
  background: "var(--ink3)",
  border: "1px solid var(--ink4)",
  borderRadius: 8,
  color: "var(--text)",
  padding: "9px 36px 9px 12px",
  fontSize: 13,
  fontFamily: "'DM Sans', system-ui, sans-serif",
  outline: "none",
  cursor: "pointer",
};
