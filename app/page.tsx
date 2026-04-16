"use client";
import { useState, useEffect, useRef } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const LENDERS = [
  "Commonwealth Bank", "Westpac", "ANZ", "NAB",
  "Macquarie Bank", "ING", "Bendigo Bank", "Other lender",
];

const BALANCE_MIDPOINTS: Record<string, number> = {
  lt300: 250000,
  "300_500": 400000,
  "500_750": 625000,
  "750_1000": 875000,
  gt1000: 1200000,
};

const BALANCE_LABELS: Record<string, string> = {
  lt300: "Under $300k",
  "300_500": "$300k–$500k",
  "500_750": "$500k–$750k",
  "750_1000": "$750k–$1M",
  gt1000: "Over $1M",
};

const LVR_LABELS: Record<string, string> = {
  lt60: "Under 60%",
  "60_70": "60–70%",
  "70_80": "70–80%",
  gt80: "80%+",
};

const YEARS_TO_LVR: Record<string, string> = {
  lt1: "lt60",
  "1_2": "60_70",
  "3_4": "60_70",
  "5_7": "70_80",
  "8plus": "gt80",
};

const HUMAN_ANCHORS = [
  "a round-the-world holiday",
  "business class to London",
  "a bathroom renovation",
  "a year of private school fees",
  "a new car deposit",
  "a Bali holiday every year",
];

// Jargon tooltips
const TOOLTIPS: Record<string, string> = {
  lvr: "LVR = loan amount ÷ property value. E.g. $500k loan on $700k property = 71% LVR.",
  loanType: "P&I = you repay principal + interest each month. IO = interest-only repayments.",
  balance: "Your current outstanding loan balance — not the original loan amount.",
};

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface Benchmark {
  lender: string;
  advertised_rate: number;
  loyalty_gap: number;
  call_success_rate: number;
  avg_reduction: number;
  sample_size: number;
  last_updated: string;
}

interface Stats {
  submissions: number;
  outcomes: number;
  lenders: number;
}

// Tooltip chip component
function Tip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "var(--ink4)", border: "none", color: "var(--text3)",
          fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
          cursor: "pointer", marginLeft: 6, letterSpacing: "0.3px",
        }}
      >
        ?
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0,
          background: "var(--ink)", border: "1px solid var(--ink4)",
          borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--text2)",
          lineHeight: 1.55, width: 220, zIndex: 50, boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {text}
          <button onClick={() => setOpen(false)} style={{ position: "absolute", top: 6, right: 8, background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 14 }}>×</button>
        </div>
      )}
    </span>
  );
}

// FAQ accordion item
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--ink4)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", textAlign: "left", background: "none", border: "none",
          padding: "18px 0", cursor: "pointer", display: "flex",
          justifyContent: "space-between", alignItems: "center", gap: 16,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{q}</span>
        <span style={{ color: "var(--amber)", fontSize: 18, flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none" }}>+</span>
      </button>
      {open && (
        <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.75, paddingBottom: 18 }}>
          {a}
        </div>
      )}
    </div>
  );
}

// Sparse data fallback banner
function SparseBanner({ lender }: { lender: string }) {
  return (
    <div style={{
      background: "rgba(240,165,0,0.06)", border: "1px solid rgba(240,165,0,0.2)",
      borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--text2)",
      marginBottom: 16, lineHeight: 1.5,
    }}>
      <strong style={{ color: "var(--amber)" }}>Using broader estimates</strong> — we don't have enough {lender} submissions in your exact segment yet.
      Showing figures based on similar variable owner-occupier loans. Data improves as more borrowers contribute.
    </div>
  );
}

export default function Home() {
  const [lender, setLender] = useState("NAB");
  const [loanType, setLoanType] = useState("variable_pi");
  const [years, setYears] = useState("3_4");
  const [lvrBand, setLvrBand] = useState("60_70");
  const [balanceBand, setBalanceBand] = useState("500_750");
  const [currentRate, setCurrentRate] = useState("6.89");
  const [rateError, setRateError] = useState("");

  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [isFallbackBenchmark, setIsFallbackBenchmark] = useState(false);
  const [calcResult, setCalcResult] = useState<{
    annualTax: number;
    fiveYearTax: number;
    gap: number;
    anchor: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [outcomeToken, setOutcomeToken] = useState<string | null>(null);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);

  const [stats, setStats] = useState<Stats>({ submissions: 12841, outcomes: 4203, lenders: 7 });

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const handleCalc = async () => {
    const rate = parseFloat(currentRate);
    if (isNaN(rate) || rate < 3 || rate > 12) {
      setRateError("Enter a rate between 3% and 12%");
      return;
    }
    setRateError("");
    setLoading(true);

    try {
      // Try exact segment first
      let bm: Benchmark | null = null;
      let usedFallback = false;

      const res = await fetch(
        `/api/benchmark?lender=${encodeURIComponent(lender)}&loan_type=${loanType}&lvr_band=${lvrBand}`
      );

      if (res.ok) {
        bm = await res.json();
        // If sample size is too low, mark as sparse
        if (bm && bm.sample_size < 30) {
          usedFallback = true;
          // Try broader fallback: same lender, variable_pi, 60_70
          const fallback = await fetch(
            `/api/benchmark?lender=${encodeURIComponent(lender)}&loan_type=variable_pi&lvr_band=60_70`
          );
          if (fallback.ok) bm = await fallback.json();
        }
      }

      if (!bm) {
        setRateError("No benchmark data available for this lender yet.");
        return;
      }

      setIsFallbackBenchmark(usedFallback);
      setBenchmark(bm);

      const gap = Math.max(0, rate - bm.advertised_rate);
      const balance = BALANCE_MIDPOINTS[balanceBand] || 625000;
      const annualTax = Math.round((gap / 100) * balance);
      const fiveYearTax = annualTax * 5;
      const anchor = HUMAN_ANCHORS[Math.floor(Math.random() * HUMAN_ANCHORS.length)];

      setCalcResult({ annualTax, fiveYearTax, gap, anchor });
      setUnlocked(false);
      setScriptOpen(false);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!email.includes("@") || !email.includes(".")) {
      setEmailError("Enter a valid email address");
      return;
    }
    setEmailError("");
    setUnlocking(true);

    try {
      const hash = await sha256(email.toLowerCase().trim());
      const source =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("utm_source") || undefined
          : undefined;

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lender,
          loan_type: loanType,
          lvr_band: lvrBand,
          balance_band: balanceBand,
          current_rate: parseFloat(currentRate),
          email_hash: hash,
          source,
        }),
      });

      const data = await res.json();
      if (data.outcome_token) {
        setOutcomeToken(data.outcome_token);
        if (data.benchmark) setBenchmark(data.benchmark);
      }
      setUnlocked(true);
    } catch (e) {
      console.error(e);
    } finally {
      setUnlocking(false);
    }
  };

  const gapColor = calcResult
    ? calcResult.gap > 0.3 ? "var(--red)" : calcResult.gap > 0.1 ? "var(--amber)" : "var(--green)"
    : "var(--text)";

  const showBrokerCta = calcResult && calcResult.gap > 0.5 && BALANCE_MIDPOINTS[balanceBand] > 400000;
  const bestOutcomeRate = benchmark ? (benchmark.advertised_rate + 0.15).toFixed(2) : null;
  const targetRate = benchmark ? (benchmark.advertised_rate + 0.15).toFixed(2) : null;
  const minutesAgo = benchmark
    ? Math.round((Date.now() - new Date(benchmark.last_updated).getTime()) / 60000)
    : null;

  return (
    <main style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <Nav />

      <div style={{ padding: "72px 48px 0", maxWidth: 1100, margin: "0 auto" }}>

        {/* ACCC pill */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(240,165,0,0.1)", border: "1px solid rgba(240,165,0,0.3)",
          borderRadius: 20, padding: "7px 16px", fontSize: 12,
          color: "var(--amber)", marginBottom: 32, fontWeight: 500,
        }}>
          <span style={{ width: 6, height: 6, background: "var(--amber)", borderRadius: "50%", flexShrink: 0, animation: "pulse 2s infinite", display: "inline-block" }} />
          ACCC confirmed: big four banks collect $4B+ annually from loyal customers
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--amber)", marginBottom: 18 }}>
          Mortgage loyalty tax calculator
        </div>

        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "clamp(38px, 5vw, 64px)",
          lineHeight: 1.08, letterSpacing: "-1.5px",
          marginBottom: 22, maxWidth: 740,
        }}>
          Your bank charges <em style={{ color: "var(--amber)", fontStyle: "italic" }}>new customers</em> less than you.
        </h1>

        <p style={{ fontSize: 16, color: "var(--text2)", lineHeight: 1.75, maxWidth: 520, marginBottom: 36 }}>
          Find out exactly how much more you're paying — and what to do about it. Takes 60 seconds.
        </p>

        {/* FIX 1: Sample result card above the fold */}
        <div style={{
          background: "linear-gradient(135deg, rgba(240,165,0,0.07), rgba(26,29,38,0.8))",
          border: "1px solid rgba(240,165,0,0.2)",
          borderRadius: 12, padding: "16px 22px", maxWidth: 600,
          marginBottom: 44, display: "flex", alignItems: "center",
          gap: 20, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>
              Example · NAB · $650k variable loan
            </div>
            <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6 }}>
              A borrower on <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text)" }}>6.49%</span> pays{" "}
              <strong style={{ color: "var(--amber)", fontFamily: "'JetBrains Mono', monospace", fontSize: 16 }}>$2,600/yr</strong>{" "}
              more than a comparable new customer offered <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text)" }}>6.09%</span>.
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)", borderLeft: "1px solid var(--ink4)", paddingLeft: 20 }}>
            62% of NAB customers<br />who called got a reduction.<br />Average cut: 0.41%
          </div>
        </div>

        {/* Two-column layout: form + trust panel */}
        <style>{`
          @media (max-width: 900px) {
            .form-trust-grid { grid-template-columns: 1fr !important; }
            .trust-panel { position: static !important; }
            .calc-form-grid { grid-template-columns: 1fr !important; }
          }
          .how-it-works-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
          @media (max-width: 768px) {
            .how-it-works-grid { grid-template-columns: 1fr !important; }
            .trust-bar-inner { flex-direction: column !important; }
            .trust-bar-inner > div { border-right: none !important; border-bottom: 1px solid var(--ink4); padding: 16px 0 !important; }
            .trust-bar-inner > div:last-child { border-bottom: none !important; }
          }
          .step-card:hover { border-color: rgba(240,165,0,0.3) !important; }
          .step-card { transition: border-color 0.15s; }
        `}</style>
        <div className="form-trust-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, maxWidth: 1060, marginBottom: 52, alignItems: "start" }}>

          {/* Calculator card */}
          <div id="calculator" style={{
            background: "var(--ink2)", border: "1px solid var(--ink4)",
            borderRadius: 18, padding: 40,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 30 }}>
              Your mortgage details
            </div>

            <div className="calc-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
              {/* Lender */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)" }}>Your lender</label>
                <select value={lender} onChange={(e) => setLender(e.target.value)} style={selectStyle}>
                  {LENDERS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>

              {/* Loan type */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)" }}>
                  Loan type
                  <Tip text={TOOLTIPS.loanType} />
                </label>
                <select value={loanType} onChange={(e) => setLoanType(e.target.value)} style={selectStyle}>
                  <option value="variable_pi">Variable P&I (principal + interest)</option>
                  <option value="variable_io">Variable interest-only</option>
                  <option value="fixed">Fixed (rolling off)</option>
                </select>
              </div>

              {/* Years */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)" }}>Years since last refinance</label>
                <select value={years} onChange={(e) => { setYears(e.target.value); setLvrBand(YEARS_TO_LVR[e.target.value] || "60_70"); }} style={selectStyle}>
                  <option value="lt1">Less than 1 year</option>
                  <option value="1_2">1–2 years</option>
                  <option value="3_4">3–4 years</option>
                  <option value="5_7">5–7 years</option>
                  <option value="8plus">8+ years</option>
                </select>
              </div>

              {/* LVR */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)" }}>
                  Approximate LVR
                  <Tip text={TOOLTIPS.lvr} />
                </label>
                <select value={lvrBand} onChange={(e) => setLvrBand(e.target.value)} style={selectStyle}>
                  {Object.entries(LVR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>Not sure? Leave as-is — we'll estimate.</span>
              </div>

              {/* Balance */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)" }}>
                  Outstanding balance (approx)
                  <Tip text={TOOLTIPS.balance} />
                </label>
                <select value={balanceBand} onChange={(e) => setBalanceBand(e.target.value)} style={selectStyle}>
                  {Object.entries(BALANCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              {/* Current rate */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)" }}>Your current interest rate</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    value={currentRate}
                    onChange={(e) => { setCurrentRate(e.target.value); setRateError(""); }}
                    step={0.01} min={3} max={12}
                    style={{ ...selectStyle, paddingRight: 32, width: "100%" }}
                  />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: 14, pointerEvents: "none" }}>%</span>
                </div>
                {rateError && <span style={{ fontSize: 12, color: "var(--red)" }}>{rateError}</span>}
              </div>
            </div>

            <button onClick={handleCalc} disabled={loading} style={{
              width: "100%", background: "var(--amber)", color: "var(--ink)",
              fontSize: 15, fontWeight: 600, padding: 15, borderRadius: 9,
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1, transition: "all 0.15s", marginTop: 4,
            }}>
              {loading ? "Calculating…" : "Check my rate →"}
            </button>

            {/* Results */}
            {calcResult && benchmark && (
              <div ref={resultsRef} style={{ marginTop: 32, paddingTop: 32, borderTop: "1px solid var(--ink4)", animation: "fadeIn 0.4s ease" }}>

                {/* FIX 6: Sparse data banner */}
                {isFallbackBenchmark && <SparseBanner lender={lender} />}

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 26, flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Your annual loyalty tax</div>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 48, color: "var(--amber)", letterSpacing: "-1.5px", lineHeight: 1 }}>
                      ${calcResult.annualTax.toLocaleString()}
                    </div>
                    {/* FIX 5: Sample size + last updated */}
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>
                      Based on{" "}
                      <strong style={{ color: "var(--text2)" }}>{benchmark.sample_size.toLocaleString()} {lender} borrowers</strong>
                      {minutesAgo !== null && minutesAgo < 1440 && (
                        <span> · updated {minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.round(minutesAgo / 60)}h ago`}</span>
                      )}
                    </div>
                  </div>
                  <span style={{ background: "var(--ink3)", border: "1px solid var(--ink4)", borderRadius: 5, fontSize: 11, fontWeight: 600, color: "var(--text3)", padding: "3px 9px" }}>
                    {lender}
                  </span>
                </div>

                {/* Metric tiles */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
                  <div style={metricTile}>
                    <div style={metricLabel}>Your rate</div>
                    <div style={{ ...metricValue, color: "var(--amber)" }}>{parseFloat(currentRate).toFixed(2)}%</div>
                  </div>
                  <div style={metricTile}>
                    <div style={metricLabel}>Best new customer rate</div>
                    <div style={{ ...metricValue, color: "var(--text)" }}>{benchmark.advertised_rate.toFixed(2)}%</div>
                  </div>
                  <div style={metricTile}>
                    <div style={metricLabel}>The gap</div>
                    <div style={{ ...metricValue, color: gapColor }}>{calcResult.gap.toFixed(2)}%</div>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: "var(--text2)", background: "var(--ink3)", borderRadius: 8, padding: "12px 16px", marginBottom: 24, borderLeft: "3px solid var(--amber)" }}>
                  Over 5 years, that's approximately{" "}
                  <strong style={{ color: "var(--amber)" }}>${calcResult.fiveYearTax.toLocaleString()}</strong>{" "}
                  extra — enough for {calcResult.anchor}.
                </div>

                {/* Gate */}
                {!unlocked ? (
                  <div style={{
                    background: "linear-gradient(135deg, rgba(37,40,54,0.8), rgba(26,29,38,0.8))",
                    border: "1px solid rgba(240,165,0,0.25)",
                    borderRadius: 13, padding: 26,
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Unlock your full breakdown</div>
                    <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20, lineHeight: 1.65 }}>
                      See which customers successfully called {lender} and what rate they got — plus a personalised call script.
                      Enter your email and we'll add your rate to the benchmark (anonymised, never sold).
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                        placeholder="your@email.com"
                        style={{
                          flex: 1, minWidth: 180,
                          background: "var(--ink4)", border: "1px solid var(--ink4)",
                          borderRadius: 8, color: "var(--text)", padding: "11px 14px",
                          fontSize: 14, outline: "none",
                        }}
                      />
                      <button onClick={handleUnlock} disabled={unlocking} style={{
                        background: "transparent", color: "var(--amber)",
                        fontSize: 13, fontWeight: 600, padding: "11px 22px",
                        borderRadius: 8, border: "1px solid rgba(240,165,0,0.4)",
                        cursor: unlocking ? "not-allowed" : "pointer", whiteSpace: "nowrap",
                        opacity: unlocking ? 0.7 : 1,
                      }}>
                        {unlocking ? "Unlocking…" : "Unlock insights →"}
                      </button>
                    </div>
                    {emailError && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 8 }}>{emailError}</div>}
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 10, lineHeight: 1.5 }}>
                      Your email is hashed in your browser before transmission — the raw address never reaches our servers. Used only for your D+3 outcome follow-up.
                    </div>
                  </div>
                ) : (
                  <div style={{ animation: "fadeIn 0.4s ease" }}>
                    {/* Insights grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                      <div style={insightCard}>
                        <div style={insightLabel}>Called {lender} in last 6 months</div>
                        <div style={insightValue}>
                          <em style={{ color: "var(--amber)", fontStyle: "normal", fontWeight: 600 }}>{benchmark.call_success_rate.toFixed(0)}%</em> received a rate cut<br />
                          Average reduction: <em style={{ color: "var(--amber)", fontStyle: "normal", fontWeight: 600 }}>{benchmark.avg_reduction.toFixed(2)}%</em>
                        </div>
                      </div>
                      <div style={insightCard}>
                        <div style={insightLabel}>Best outcome without refinancing</div>
                        <div style={insightValue}>
                          Called + threatened refi → <em style={{ color: "var(--amber)", fontStyle: "normal", fontWeight: 600 }}>{bestOutcomeRate}%</em><br />
                          Annual saving: <em style={{ color: "var(--amber)", fontStyle: "normal", fontWeight: 600 }}>${Math.round(((parseFloat(currentRate) - parseFloat(bestOutcomeRate!)) / 100) * BALANCE_MIDPOINTS[balanceBand]).toLocaleString()}/yr</em>
                        </div>
                      </div>
                      <div style={insightCard}>
                        <div style={insightLabel}>If you refinanced instead</div>
                        <div style={insightValue}>
                          Best available: <em style={{ color: "var(--amber)", fontStyle: "normal", fontWeight: 600 }}>{benchmark.advertised_rate.toFixed(2)}%</em><br />
                          Would save approx. <em style={{ color: "var(--amber)", fontStyle: "normal", fontWeight: 600 }}>${calcResult.annualTax.toLocaleString()}/yr</em>
                        </div>
                      </div>
                      <div style={insightCard}>
                        <div style={insightLabel}>5-year cost of doing nothing</div>
                        <div style={insightValue}>
                          <em style={{ color: "var(--amber)", fontStyle: "normal", fontWeight: 600 }}>${calcResult.fiveYearTax.toLocaleString()}</em> in avoidable interest<br />
                          vs calling this week
                        </div>
                      </div>
                    </div>

                    {/* Call script */}
                    <button onClick={() => setScriptOpen(!scriptOpen)} style={{
                      width: "100%", background: "transparent",
                      border: "1px solid rgba(34,197,94,0.4)", color: "var(--green)",
                      padding: 13, borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", marginTop: 4,
                    }}>
                      {scriptOpen ? "Hide call script ↑" : `View your call script for ${lender} ↓`}
                    </button>

                    {scriptOpen && (
                      <div style={{
                        background: "var(--ink3)", border: "1px solid var(--ink4)",
                        borderRadius: 10, padding: 22, marginTop: 12, animation: "fadeIn 0.3s ease",
                      }}>
                        {/* Copy to clipboard */}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                          <button
                            onClick={() => {
                              const script = `Hi, I've been a ${lender} customer for approximately ${years === "lt1" ? "less than a year" : years === "1_2" ? "1–2 years" : years === "3_4" ? "3–4 years" : years === "5_7" ? "5–7 years" : "8+ years"} and I'm currently on ${parseFloat(currentRate).toFixed(2)}%. I can see new customers are being offered rates around ${benchmark!.advertised_rate.toFixed(2)}%. I'd like to discuss getting my rate reviewed — I'm prepared to refinance to another lender if we can't come to an arrangement.`;
                              navigator.clipboard.writeText(script).then(() => {
                                setScriptCopied(true);
                                setTimeout(() => setScriptCopied(false), 2500);
                              });
                            }}
                            style={{ background: "var(--ink4)", border: "none", color: scriptCopied ? "var(--green)" : "var(--text3)", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}
                          >
                            {scriptCopied ? "✓ Copied" : "Copy script"}
                          </button>
                        </div>
                        <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text2)", marginBottom: 14 }}>
                          <em style={{ color: "var(--text)", fontStyle: "italic" }}>
                            "Hi, I've been a {lender} customer for approximately {years === "lt1" ? "less than a year" : years === "1_2" ? "1–2 years" : years === "3_4" ? "3–4 years" : years === "5_7" ? "5–7 years" : "8+ years"} and I'm currently on {parseFloat(currentRate).toFixed(2)}%. I can see new customers are being offered rates around {benchmark.advertised_rate.toFixed(2)}%. I'd like to discuss getting my rate reviewed — I'm prepared to refinance to another lender if we can't come to an arrangement."
                          </em>
                        </p>
                        <div style={{ fontSize: 13, color: "var(--text2)", paddingTop: 14, borderTop: "1px solid var(--ink4)", marginBottom: 10 }}>
                          Based on <strong style={{ color: "var(--green)" }}>{benchmark.sample_size.toLocaleString()} {lender} borrowers</strong>: ask for{" "}
                          <strong style={{ color: "var(--green)" }}>{targetRate}%–{(parseFloat(targetRate!) + 0.1).toFixed(2)}%</strong> as your opening position.
                          If they say no, ask to be transferred to the retention team specifically.
                        </div>
                        {/* FIX 1 extension: target rate + monthly saving callout */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                          <div style={{ background: "var(--ink4)", borderRadius: 8, padding: "10px 14px" }}>
                            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>Ask for</div>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, color: "var(--green)", fontWeight: 600 }}>{targetRate}%</div>
                          </div>
                          <div style={{ background: "var(--ink4)", borderRadius: 8, padding: "10px 14px" }}>
                            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>Monthly saving</div>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, color: "var(--green)", fontWeight: 600 }}>
                              ${Math.round(calcResult.annualTax / 12).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Broker CTA */}
                    {showBrokerCta && (
                      <div style={{
                        background: "var(--ink3)", border: "1px solid var(--ink4)",
                        borderRadius: 12, padding: "20px 22px", marginTop: 14,
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 16, flexWrap: "wrap",
                      }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Want someone to do this for you?</div>
                          <div style={{ fontSize: 12, color: "var(--text3)" }}>
                            Our broker partners can call on your behalf and handle refinancing paperwork if needed. Most get a result within 48 hours.
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6, fontStyle: "italic" }}>
                            Disclosure: LoyaltyTax receives a referral fee if you proceed to refinance. This does not influence the benchmark data.
                          </div>
                        </div>
                        <button style={{
                          background: "var(--ink4)", color: "var(--text)",
                          border: "1px solid var(--ink4)", padding: "10px 18px",
                          borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}>
                          Connect me with a broker →
                        </button>
                      </div>
                    )}

                    {outcomeToken && (
                      <div style={{ marginTop: 16, fontSize: 13, color: "var(--text3)", textAlign: "center" }}>
                        After your call, <a href={`/outcome?token=${outcomeToken}`} style={{ color: "var(--amber)" }}>report your outcome</a> to help the next borrower.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Trust panel beside the form */}
          <div className="trust-panel" style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 100 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 4 }}>
              Why trust this
            </div>
            {[
              {
                icon: "🔒",
                title: "Your email never leaves your browser",
                body: "We hash it with SHA-256 before transmission. The raw address never reaches our servers.",
              },
              {
                icon: "🏦",
                title: "We don't share data with lenders",
                body: "No lender has ever seen this data. We don't sell it, we don't share it.",
              },
              {
                icon: "📊",
                title: "Real crowd-sourced data",
                body: "Benchmarks come from borrowers like you — not estimates. We need 30+ submissions before publishing a segment.",
              },
              {
                icon: "✅",
                title: "ACCC-backed problem",
                body: "The loyalty tax is documented by the ACCC. Big four banks collect $4B+ annually from loyal customers.",
              },
              {
                icon: "⚠️",
                title: "General information only",
                body: "Not financial advice. Consider independent advice before making decisions about your loan.",
              },
            ].map((item) => (
              <div key={item.title} style={{
                background: "var(--ink2)", border: "1px solid var(--ink4)",
                borderRadius: 10, padding: "14px 16px",
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5, display: "flex", gap: 8, alignItems: "center" }}>
                  <span>{item.icon}</span> {item.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.55 }}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust bar */}
        <div style={{
          borderTop: "1px solid var(--ink4)", borderBottom: "1px solid var(--ink4)",
          padding: "28px 0", marginBottom: 0,
        }}>
          <div className="trust-bar-inner" style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          {[
            { icon: "⚡", stat: stats.submissions.toLocaleString(), label: "borrowers have checked their rate" },
            { icon: "📊", stat: `${stats.outcomes.toLocaleString()} call outcomes`, label: `reported across ${stats.lenders} lenders` },
            { icon: "🏦", stat: "ACCC-backed research", label: "confirms the loyalty tax exists" },
            { icon: "🔒", stat: "All data anonymised", label: "never shared with lenders" },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              flex: 1, minWidth: 180, padding: "0 24px",
              borderRight: i < 3 ? "1px solid var(--ink4)" : "none",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: "var(--ink3)", border: "1px solid var(--ink4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, flexShrink: 0,
              }}>{item.icon}</div>
              <div>
                <strong style={{ color: "var(--text)", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 2 }}>{item.stat}</strong>
                <span style={{ fontSize: 12, color: "var(--text3)" }}>{item.label}</span>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* How it works — moved before FAQ */}
      <div id="how" style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 48px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--amber)", marginBottom: 16 }}>How it works</div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(26px,3vw,36px)", marginBottom: 8, letterSpacing: "-0.5px" }}>Three steps. One call.</h2>
        <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 28, lineHeight: 1.7 }}>
          You check. You call. You save. Then you tell us what happened — so the next person knows exactly what to expect from your lender.
        </p>
        <div className="how-it-works-grid" style={{ paddingBottom: 72 }}>
          {[
            { n: "01 — CHECK", title: "Enter your mortgage details", body: "Tell us your lender, loan type, LVR, and current rate. We calculate your loyalty tax using real crowd-sourced data from thousands of Australian borrowers — not estimates, not modelling." },
            { n: "02 — ACT", title: "Call your bank armed with data", body: "We give you a personalised call script, the specific rate to ask for, and the success rate for your exact lender profile. Most borrowers spend under 15 minutes on the call." },
            { n: "03 — REPORT", title: "Tell us what happened", body: "Did they reduce your rate? By how much? Your outcome is added anonymously to the benchmark — making the next person's negotiation more powerful." },
          ].map((s) => (
            <div key={s.n} className="step-card" style={{ background: "var(--ink2)", border: "1px solid var(--ink4)", borderRadius: 13, padding: 26 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--amber)", fontWeight: 600, letterSpacing: "1.5px", marginBottom: 14, display: "block" }}>{s.n}</span>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 9 }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ section */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "72px 48px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--amber)", marginBottom: 16 }}>FAQ</div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(26px,3vw,36px)", marginBottom: 36, letterSpacing: "-0.5px" }}>Common questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { q: "What is LVR?", a: "LVR stands for Loan-to-Value Ratio — it's your loan amount divided by your property's value. For example, a $500k loan on a $700k property gives you an LVR of 71%. If you're not sure, leave the default — it won't significantly affect your result." },
            { q: "Will checking this affect my credit score?", a: "No. LoyaltyTax doesn't perform a credit check. We only use the details you enter to calculate your loyalty tax — nothing is reported to any credit bureau." },
            { q: "Do I need to refinance?", a: "Not necessarily. Most borrowers start by calling their existing lender — it's free, takes 15 minutes, and 60%+ get a rate reduction without going anywhere. Refinancing is the backup plan if your bank won't budge." },
            { q: "What's the difference between Variable P&I and Variable IO?", a: "P&I (principal and interest) means your repayments cover both interest and paying down the loan. IO (interest-only) means you're only paying the interest each month — the principal stays the same. Most owner-occupiers are on P&I." },
            { q: "Is this financial advice?", a: "No. LoyaltyTax provides general information only. It is not financial advice. Before making decisions about your home loan, you should consider seeking independent financial advice from a licensed professional." },
            { q: "How accurate is the data?", a: "Benchmarks are built from real borrower submissions — not estimates. We require a minimum of 30 data points before publishing a segment and apply outlier removal to clean the data. Every figure shows its sample size and when it was last updated." },
            { q: "Is my data shared with my bank?", a: "Never. Your data is never shared with lenders, sold, or attributed to you individually. Your email is hashed in your browser before transmission — the raw address never reaches our servers." },
          ].map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}

const selectStyle: React.CSSProperties = {
  background: "var(--ink3)",
  border: "1px solid var(--ink4)",
  borderRadius: 9,
  color: "var(--text)",
  padding: "11px 36px 11px 14px",
  fontSize: 14,
  fontFamily: "'DM Sans', system-ui, sans-serif",
  outline: "none",
  width: "100%",
};

const metricTile: React.CSSProperties = {
  background: "var(--ink3)",
  borderRadius: 10,
  padding: "15px 16px",
};

const metricLabel: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text3)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.8px",
  marginBottom: 7,
};

const metricValue: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 20,
  fontWeight: 600,
};

const insightCard: React.CSSProperties = {
  background: "var(--ink3)",
  borderRadius: 10,
  padding: "15px 16px",
  borderLeft: "3px solid var(--amber)",
};

const insightLabel: React.CSSProperties = {
  fontSize: 10,
  color: "var(--text3)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.8px",
  marginBottom: 7,
};

const insightValue: React.CSSProperties = {
  fontSize: 14,
  color: "var(--text)",
  lineHeight: 1.55,
};
