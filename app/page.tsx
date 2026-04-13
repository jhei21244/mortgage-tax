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
  "lt1": "lt60",
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

export default function Home() {
  const [lender, setLender] = useState("NAB");
  const [loanType, setLoanType] = useState("variable_pi");
  const [years, setYears] = useState("3_4");
  const [lvrBand, setLvrBand] = useState("60_70");
  const [balanceBand, setBalanceBand] = useState("500_750");
  const [currentRate, setCurrentRate] = useState("6.89");
  const [rateError, setRateError] = useState("");

  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
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
      const res = await fetch(
        `/api/benchmark?lender=${encodeURIComponent(lender)}&loan_type=${loanType}&lvr_band=${lvrBand}`
      );
      const bm: Benchmark = await res.json();
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
    ? calcResult.gap > 0.3
      ? "var(--red)"
      : calcResult.gap > 0.1
      ? "var(--amber)"
      : "var(--green)"
    : "var(--text)";

  const showBrokerCta =
    calcResult &&
    calcResult.gap > 0.5 &&
    BALANCE_MIDPOINTS[balanceBand] > 400000;

  const bestOutcomeRate = benchmark
    ? (benchmark.advertised_rate + 0.15).toFixed(2)
    : null;

  const targetRate = benchmark
    ? (benchmark.advertised_rate + 0.15).toFixed(2)
    : null;

  return (
    <main style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <Nav />

      {/* Hero */}
      <div style={{ padding: "72px 48px 0", maxWidth: 1100, margin: "0 auto" }}>
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
          lineHeight: 1.08,
          letterSpacing: "-1.5px",
          marginBottom: 22,
          maxWidth: 740,
        }}>
          Your bank charges <em style={{ color: "var(--amber)", fontStyle: "italic" }}>new customers</em> less than you.
        </h1>

        <p style={{ fontSize: 16, color: "var(--text2)", lineHeight: 1.75, maxWidth: 520, marginBottom: 52 }}>
          Find out exactly how much more you're paying — and what to do about it. Takes 60 seconds.
        </p>

        {/* Calculator card */}
        <div id="calculator" style={{
          background: "var(--ink2)", border: "1px solid var(--ink4)",
          borderRadius: 18, padding: 40, maxWidth: 760, marginBottom: 52,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 30 }}>
            Your mortgage details
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
            {/* Lender */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)" }}>Your lender</label>
              <select value={lender} onChange={(e) => setLender(e.target.value)} style={selectStyle}>
                {LENDERS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            {/* Loan type */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)" }}>Loan type</label>
              <select value={loanType} onChange={(e) => setLoanType(e.target.value)} style={selectStyle}>
                <option value="variable_pi">Variable P&I</option>
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
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)" }}>Approximate LVR</label>
              <select value={lvrBand} onChange={(e) => setLvrBand(e.target.value)} style={selectStyle}>
                {Object.entries(LVR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {/* Balance */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)" }}>Outstanding balance (approx)</label>
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
            {loading ? "Calculating…" : "Calculate my loyalty tax →"}
          </button>

          {/* Results */}
          {calcResult && benchmark && (
            <div ref={resultsRef} style={{ marginTop: 32, paddingTop: 32, borderTop: "1px solid var(--ink4)", animation: "fadeIn 0.4s ease" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 26, flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Your annual loyalty tax</div>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 48, color: "var(--amber)", letterSpacing: "-1.5px", lineHeight: 1 }}>
                    ${calcResult.annualTax.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 6 }}>
                    Based on {benchmark.sample_size.toLocaleString()} {lender} {loanType === "variable_pi" ? "variable P&I" : loanType} customers in your LVR bracket
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
                    See which customers successfully called {lender} and what rate they got — plus a personalised script for your call.
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
                    Your email is hashed client-side before transmission. Used only for your D+3 outcome follow-up. Never sold to lenders.
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
                        Best available: <em style={{ color: "var(--amber)", fontStyle: "normal", fontWeight: 600 }}>{benchmark.advertised_rate.toFixed(2)}% ({lender === "Macquarie Bank" ? "Macquarie" : "Macquarie Bank"})</em><br />
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
                      <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text2)" }}>
                        <em style={{ color: "var(--text)", fontStyle: "italic" }}>
                          "Hi, I've been a {lender} customer for approximately {years === "lt1" ? "less than a year" : years === "1_2" ? "1–2 years" : years === "3_4" ? "3–4 years" : years === "5_7" ? "5–7 years" : "8+ years"} and I'm currently on {parseFloat(currentRate).toFixed(2)}%. I can see new customers are being offered rates around {benchmark.advertised_rate.toFixed(2)}%. I'd like to discuss getting my rate reviewed — I'm prepared to refinance to another lender if we can't come to an arrangement."
                        </em>
                      </p>
                      <div style={{ marginTop: 14, fontSize: 13, color: "var(--text2)", paddingTop: 14, borderTop: "1px solid var(--ink4)" }}>
                        Based on <strong style={{ color: "var(--green)" }}>{benchmark.sample_size.toLocaleString()} {lender} borrowers</strong> who called in the last 6 months: ask for{" "}
                        <strong style={{ color: "var(--green)" }}>{targetRate}%–{(parseFloat(targetRate!) + 0.1).toFixed(2)}%</strong> as your opening position.
                        Most customers who got a cut received it in the same call. If they say they can't move, ask to be transferred to the retention team specifically.
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
                          LoyaltyTax receives a referral fee from broker partners if you proceed to refinance. This does not affect the benchmarking data.
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

                  {/* Outcome link */}
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

        {/* Trust bar */}
        <div style={{
          borderTop: "1px solid var(--ink4)", borderBottom: "1px solid var(--ink4)",
          padding: "28px 0", display: "flex", alignItems: "center", flexWrap: "wrap",
          marginBottom: 0,
        }}>
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

      {/* How it works */}
      <div id="how" style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 48px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--amber)", marginBottom: 16 }}>How it works</div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(26px,3vw,36px)", marginBottom: 8, letterSpacing: "-0.5px" }}>Three steps. One call.</h2>
        <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 28, lineHeight: 1.7 }}>
          You check. You call. You save. Then you tell us what happened — so the next person knows exactly what to expect from your lender.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, paddingBottom: 72 }}>
          {[
            { n: "01 — CHECK", title: "Enter your mortgage details", body: "Tell us your lender, loan type, LVR, and current rate. We calculate your loyalty tax using real crowd-sourced data from thousands of Australian borrowers — not estimates, not modelling." },
            { n: "02 — ACT", title: "Call your bank armed with data", body: "We give you a personalised call script, the specific rate to ask for, and the success rate for your exact lender profile. Most borrowers spend under 15 minutes on the call." },
            { n: "03 — REPORT", title: "Tell us what happened", body: "Did they reduce your rate? By how much? Your outcome is added anonymously to the benchmark — making the next person's negotiation more powerful." },
          ].map((s) => (
            <div key={s.n} style={{ background: "var(--ink2)", border: "1px solid var(--ink4)", borderRadius: 13, padding: 26 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--amber)", fontWeight: 600, letterSpacing: "1.5px", marginBottom: 14, display: "block" }}>{s.n}</span>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 9 }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}

// Styles
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
  textTransform: "uppercase",
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
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  marginBottom: 7,
};

const insightValue: React.CSSProperties = {
  fontSize: 14,
  color: "var(--text)",
  lineHeight: 1.55,
};
