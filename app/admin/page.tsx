"use client";
import { useState, useEffect } from "react";

const LENDERS = [
  "Commonwealth Bank", "Westpac", "ANZ", "NAB",
  "Macquarie Bank", "ING", "Bendigo Bank",
];

interface BenchmarkRow {
  lender: string;
  loan_type: string;
  lvr_band: string;
  advertised_rate: number;
  loyalty_gap: number;
  sample_size: number;
  last_updated: string;
}

interface ScrapedRate {
  rate: number;
  scraped_at: string;
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");

  const [benchmarks, setBenchmarks] = useState<BenchmarkRow[]>([]);
  const [scrapedRates, setScrapedRates] = useState<Record<string, ScrapedRate>>({});
  const [loading, setLoading] = useState(false);

  const [overrideLender, setOverrideLender] = useState("NAB");
  const [overrideLoanType, setOverrideLoanType] = useState("variable_pi");
  const [overrideRate, setOverrideRate] = useState("");
  const [overrideMsg, setOverrideMsg] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);

  const [triggerMsg, setTriggerMsg] = useState("");

  const fetchData = async (adminSecret: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rates", {
        headers: { Authorization: `Bearer ${adminSecret}` },
      });
      if (res.status === 401) { setAuthError("Invalid secret."); return; }
      const data = await res.json();
      setBenchmarks(data.benchmarks ?? []);
      setScrapedRates(data.scraped_rates ?? {});
      setAuthed(true);
      setAuthError("");
    } catch {
      setAuthError("Failed to connect.");
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async () => {
    const rate = parseFloat(overrideRate);
    if (isNaN(rate) || rate < 3 || rate > 12) { setOverrideMsg("Rate must be 3–12%"); return; }
    setOverrideLoading(true);
    setOverrideMsg("");
    try {
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ lender: overrideLender, loan_type: overrideLoanType, advertised_rate: rate }),
      });
      const data = await res.json();
      if (data.success) {
        setOverrideMsg(`✅ Updated ${overrideLender} to ${rate}% — ${data.benchmarks_updated.length} benchmark rows updated`);
        fetchData(secret);
      } else {
        setOverrideMsg(`❌ ${data.error}`);
      }
    } catch {
      setOverrideMsg("❌ Request failed");
    } finally {
      setOverrideLoading(false);
    }
  };

  const triggerCron = async (path: string, label: string) => {
    setTriggerMsg(`Running ${label}…`);
    try {
      const res = await fetch(path, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await res.json();
      setTriggerMsg(`✅ ${label}: ${JSON.stringify(data, null, 0).slice(0, 200)}`);
      if (path.includes("aggregate")) fetchData(secret);
    } catch {
      setTriggerMsg(`❌ ${label} failed`);
    }
  };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "var(--ink2)", border: "1px solid var(--ink4)", borderRadius: 16, padding: 40, width: 380 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, marginBottom: 8 }}>
            Loyalty<span style={{ color: "var(--amber)" }}>Tax</span> Admin
          </div>
          <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24 }}>Enter your admin secret to continue.</p>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData(secret)}
            placeholder="Admin secret"
            style={{ width: "100%", background: "var(--ink3)", border: "1px solid var(--ink4)", borderRadius: 8, color: "var(--text)", padding: "11px 14px", fontSize: 14, outline: "none", marginBottom: 12 }}
          />
          {authError && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 10 }}>{authError}</div>}
          <button
            onClick={() => fetchData(secret)}
            disabled={loading}
            style={{ width: "100%", background: "var(--amber)", color: "var(--ink)", fontWeight: 600, padding: 12, borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14 }}
          >
            {loading ? "Connecting…" : "Sign in"}
          </button>
        </div>
      </div>
    );
  }

  const varPiBenchmarks = benchmarks.filter((b) => b.loan_type === "variable_pi" && b.lvr_band === "60_70");

  return (
    <div style={{ minHeight: "100vh", background: "var(--ink)", padding: "40px 48px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28 }}>
            Loyalty<span style={{ color: "var(--amber)" }}>Tax</span> Admin
          </div>
          <a href="/" style={{ fontSize: 13, color: "var(--text3)" }}>← Back to site</a>
        </div>

        {/* Current benchmark state */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 20 }}>
            Live Benchmarks (Variable P&I · 60–70% LVR)
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Lender", "Advertised rate", "Last scraped", "Loyalty gap", "Sample size", "Last updated"].map((h) => (
                    <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.8px", padding: "10px 14px", borderBottom: "1px solid var(--ink4)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {varPiBenchmarks.map((row) => {
                  const scraped = scrapedRates[`${row.lender}|${row.loan_type}`];
                  const gapColor = row.loyalty_gap > 0.5 ? "#f87171" : row.loyalty_gap > 0.2 ? "var(--amber)" : "var(--green)";
                  return (
                    <tr key={row.lender}>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--ink3)", fontSize: 14, fontWeight: 600 }}>{row.lender}</td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--ink3)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--amber)" }}>
                        {row.advertised_rate?.toFixed(2)}%
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--ink3)", fontSize: 12, color: "var(--text3)" }}>
                        {scraped ? new Date(scraped.scraped_at).toLocaleString("en-AU") : <span style={{ color: "var(--red)" }}>No scrape yet</span>}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--ink3)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: gapColor }}>
                        {row.loyalty_gap?.toFixed(2)}%
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--ink3)", fontSize: 13, color: "var(--text2)" }}>
                        {row.sample_size?.toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--ink3)", fontSize: 12, color: "var(--text3)" }}>
                        {new Date(row.last_updated).toLocaleString("en-AU")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Manual rate override */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 20 }}>
            Manual Rate Override
          </h2>
          <div style={{ background: "var(--ink2)", border: "1px solid var(--ink4)", borderRadius: 12, padding: 28 }}>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20, lineHeight: 1.6 }}>
              Use this when the rate scraper fails or returns stale data. This updates both <code style={{ color: "var(--amber)" }}>lender_advertised_rates</code> and the live benchmark loyalty gap immediately.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: "var(--text2)" }}>Lender</label>
                <select value={overrideLender} onChange={(e) => setOverrideLender(e.target.value)} style={selectStyle}>
                  {LENDERS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: "var(--text2)" }}>Loan type</label>
                <select value={overrideLoanType} onChange={(e) => setOverrideLoanType(e.target.value)} style={selectStyle}>
                  <option value="variable_pi">Variable P&I</option>
                  <option value="variable_io">Variable IO</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: "var(--text2)" }}>New advertised rate (%)</label>
                <input
                  type="number" value={overrideRate} onChange={(e) => setOverrideRate(e.target.value)}
                  placeholder="e.g. 6.09" step={0.01} min={3} max={12}
                  style={{ ...selectStyle, width: 130 }}
                />
              </div>
              <button onClick={handleOverride} disabled={overrideLoading} style={{
                background: "var(--amber)", color: "var(--ink)", fontWeight: 600,
                padding: "10px 22px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
                opacity: overrideLoading ? 0.7 : 1,
              }}>
                {overrideLoading ? "Saving…" : "Update rate"}
              </button>
            </div>
            {overrideMsg && (
              <div style={{ marginTop: 14, fontSize: 13, color: overrideMsg.startsWith("✅") ? "var(--green)" : "var(--red)", background: "var(--ink3)", borderRadius: 8, padding: "10px 14px" }}>
                {overrideMsg}
              </div>
            )}
          </div>
        </section>

        {/* Cron triggers */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 20 }}>
            Manual Cron Triggers
          </h2>
          <div style={{ background: "var(--ink2)", border: "1px solid var(--ink4)", borderRadius: 12, padding: 28 }}>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>
              Trigger jobs manually without waiting for the schedule.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => triggerCron("/api/cron/scrape-rates", "Rate scraper")} style={cronBtn}>
                Run rate scraper
              </button>
              <button onClick={() => triggerCron("/api/cron/aggregate-benchmarks", "Benchmark aggregation")} style={cronBtn}>
                Run benchmark aggregation
              </button>
            </div>
            {triggerMsg && (
              <div style={{ marginTop: 14, fontSize: 12, color: "var(--text2)", background: "var(--ink3)", borderRadius: 8, padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6, wordBreak: "break-all" }}>
                {triggerMsg}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: "var(--ink3)", border: "1px solid var(--ink4)",
  borderRadius: 8, color: "var(--text)", padding: "10px 32px 10px 12px",
  fontSize: 13, fontFamily: "'DM Sans', system-ui, sans-serif", outline: "none",
};

const cronBtn: React.CSSProperties = {
  background: "var(--ink3)", color: "var(--text)", border: "1px solid var(--ink4)",
  padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
  cursor: "pointer",
};
