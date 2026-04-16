"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

function OutcomeForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [called, setCalled] = useState<"yes" | "no" | "refi" | null>(null);
  const [rateReduced, setRateReduced] = useState<boolean | null>(null);
  const [newRate, setNewRate] = useState("");
  const [oldRate, setOldRate] = useState("");
  const [duration, setDuration] = useState("");
  const [whichTeam, setWhichTeam] = useState("");
  const [firstOffer, setFirstOffer] = useState("");
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div style={{ padding: "60px 48px", maxWidth: 600, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, marginBottom: 12 }}>No token found</h2>
        <p style={{ color: "var(--text2)", marginBottom: 24, lineHeight: 1.7 }}>
          This link requires a token. Check your email for the outcome follow-up link, or return to the calculator to unlock your insights.
        </p>
        <a href="/" style={{ background: "var(--amber)", color: "var(--ink)", fontSize: 13, fontWeight: 600, padding: "10px 20px", borderRadius: 8, textDecoration: "none" }}>
          Back to calculator →
        </a>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!called) { setError("Please tell us what you did."); return; }
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome_token: token,
          called: called === "yes" || called === "refi",
          rate_reduced: called === "yes" ? rateReduced ?? false : false,
          new_rate: newRate ? parseFloat(newRate) : undefined,
          call_duration_mins: duration ? parseInt(duration) : undefined,
          satisfaction: satisfaction ?? undefined,
          free_text: [
            whichTeam ? `Team: ${whichTeam}` : null,
            firstOffer ? `First offer: ${firstOffer}%` : null,
            freeText || null,
          ].filter(Boolean).join(" | ") || undefined,
          refinanced: called === "refi",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setResult({ ...data, oldRate: oldRate || data.original_rate });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const origRate = parseFloat(result.oldRate) || result.original_rate;
    const newRateNum = result.updated_rate;
    const annualSaving = result.rate_changed
      ? Math.round(((origRate - newRateNum) / 100) * 625000)
      : 0;
    const monthlySaving = Math.round(annualSaving / 12);

    return (
      <div style={{ padding: "60px 48px", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--amber)", marginBottom: 16 }}>Outcome recorded</div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(32px,5vw,56px)", marginBottom: 20, letterSpacing: "-1.5px", lineHeight: 1.1 }}>
          {result.rate_changed ? "Nice work." : "Thanks for reporting."}
        </h1>

        {result.rate_changed && (
          <>
            {/* Saving callout */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
              <div style={{ background: "var(--ink2)", border: "1px solid var(--ink4)", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Old rate</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, color: "var(--text2)" }}>{origRate.toFixed(2)}%</div>
              </div>
              <div style={{ background: "var(--ink2)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>New rate</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, color: "var(--green)" }}>{newRateNum.toFixed(2)}%</div>
              </div>
              <div style={{ background: "rgba(240,165,0,0.08)", border: "1px solid rgba(240,165,0,0.3)", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Annual saving</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, color: "var(--amber)" }}>${annualSaving.toLocaleString()}</div>
              </div>
            </div>
            <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, marginBottom: 24 }}>
              That's <strong style={{ color: "var(--amber)" }}>${monthlySaving.toLocaleString()}/month</strong> back in your pocket. Over 5 years: <strong style={{ color: "var(--amber)" }}>${(annualSaving * 5).toLocaleString()}</strong>.
            </p>
          </>
        )}

        {!result.rate_changed && (
          <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, marginBottom: 24 }}>
            Your outcome has been added to the benchmark. Even a "no" is useful data — it helps the next borrower know what to expect and when to escalate.
          </p>
        )}

        <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 32, lineHeight: 1.6 }}>
          Every outcome reported makes the next {result.lender} borrower's negotiation better. Thank you for contributing.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/" style={{ background: "var(--amber)", color: "var(--ink)", fontSize: 13, fontWeight: 600, padding: "11px 22px", borderRadius: 8, textDecoration: "none" }}>
            Check again →
          </a>
          {result.rate_changed && (
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just called my bank and got my rate cut from ${origRate}% to ${newRateNum}% — saving $${annualSaving.toLocaleString()}/yr. Find your mortgage loyalty tax at loyaltytax.com.au`)}`}
              target="_blank" rel="noopener"
              style={{ background: "var(--ink3)", color: "var(--text)", fontSize: 13, fontWeight: 600, padding: "11px 22px", borderRadius: 8, textDecoration: "none", border: "1px solid var(--ink4)" }}
            >
              Share your win →
            </a>
          )}
          {!result.rate_changed && (
            <a href="/lenders" style={{ background: "var(--ink3)", color: "var(--text)", fontSize: 13, fontWeight: 600, padding: "11px 22px", borderRadius: 8, textDecoration: "none", border: "1px solid var(--ink4)" }}>
              View lender rankings →
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "60px 48px", maxWidth: 680, margin: "0 auto" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--amber)", marginBottom: 16 }}>Report your outcome</div>
      <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px,4vw,48px)", marginBottom: 8, letterSpacing: "-1px" }}>Did you call your bank?</h1>
      <p style={{ fontSize: 15, color: "var(--text2)", marginBottom: 36, lineHeight: 1.7 }}>
        Your outcome — win or loss — makes the data more accurate for the next borrower.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        {/* What did you do? */}
        <div>
          <label style={fieldLabel}>What did you do?</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { v: "yes", label: "Called my bank" },
              { v: "no", label: "Not yet" },
              { v: "refi", label: "Refinanced instead" },
            ].map((opt) => (
              <button key={opt.v} onClick={() => setCalled(opt.v as any)} style={{
                padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: "pointer", border: "1px solid",
                borderColor: called === opt.v ? "var(--amber)" : "var(--ink4)",
                background: called === opt.v ? "rgba(240,165,0,0.1)" : "var(--ink3)",
                color: called === opt.v ? "var(--amber)" : "var(--text2)",
              }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Called path */}
        {called === "yes" && (
          <>
            <div>
              <label style={fieldLabel}>Did they reduce your rate?</label>
              <div style={{ display: "flex", gap: 10 }}>
                {[{ v: true, label: "Yes" }, { v: false, label: "No" }].map((opt) => (
                  <button key={String(opt.v)} onClick={() => setRateReduced(opt.v)} style={{
                    padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", border: "1px solid",
                    borderColor: rateReduced === opt.v ? "var(--amber)" : "var(--ink4)",
                    background: rateReduced === opt.v ? "rgba(240,165,0,0.1)" : "var(--ink3)",
                    color: rateReduced === opt.v ? "var(--amber)" : "var(--text2)",
                  }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {rateReduced && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={fieldLabel}>Your old rate</label>
                  <div style={{ position: "relative" }}>
                    <input type="number" value={oldRate} onChange={(e) => setOldRate(e.target.value)}
                      placeholder="6.89" step={0.01} min={3} max={12}
                      style={{ ...inputStyle, paddingRight: 32 }} />
                    <span style={pctSuffix}>%</span>
                  </div>
                </div>
                <div>
                  <label style={fieldLabel}>New rate achieved</label>
                  <div style={{ position: "relative" }}>
                    <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)}
                      placeholder="6.24" step={0.01} min={3} max={12}
                      style={{ ...inputStyle, paddingRight: 32 }} />
                    <span style={pctSuffix}>%</span>
                  </div>
                </div>
              </div>
            )}

            {rateReduced === false && (
              <div style={{ background: "rgba(240,165,0,0.06)", border: "1px solid rgba(240,165,0,0.2)", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--amber)" }}>Didn't get a result?</strong> Ask to be transferred to the retention team specifically — that's often where decisions get made. Or consider refinancing: you can check current offers on our <a href="/lenders" style={{ color: "var(--amber)" }}>lender rankings page</a>.
              </div>
            )}

            {rateReduced && (
              <div>
                <label style={fieldLabel}>What was their first offer? (optional)</label>
                <div style={{ position: "relative", maxWidth: 200 }}>
                  <input type="number" value={firstOffer} onChange={(e) => setFirstOffer(e.target.value)}
                    placeholder="6.49" step={0.01} min={3} max={12}
                    style={{ ...inputStyle, paddingRight: 32 }} />
                  <span style={pctSuffix}>%</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>Helps others understand the negotiation range</div>
              </div>
            )}

            <div>
              <label style={fieldLabel}>Which team handled it?</label>
              <select value={whichTeam} onChange={(e) => setWhichTeam(e.target.value)} style={{ ...inputStyle, maxWidth: 260 }}>
                <option value="">Not sure</option>
                <option value="general">General customer service</option>
                <option value="retention">Retention team (escalated)</option>
                <option value="home_loans">Home loans specialist</option>
              </select>
            </div>

            <div>
              <label style={fieldLabel}>How long was the call?</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }}>
                <option value="">Select…</option>
                <option value="5">Under 5 minutes</option>
                <option value="10">5–10 minutes</option>
                <option value="20">10–20 minutes</option>
                <option value="30">20–30 minutes</option>
                <option value="45">30+ minutes</option>
              </select>
            </div>
          </>
        )}

        {/* Refi path */}
        {called === "refi" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={fieldLabel}>Old rate</label>
              <div style={{ position: "relative" }}>
                <input type="number" value={oldRate} onChange={(e) => setOldRate(e.target.value)}
                  placeholder="6.89" step={0.01} min={3} max={12}
                  style={{ ...inputStyle, paddingRight: 32 }} />
                <span style={pctSuffix}>%</span>
              </div>
            </div>
            <div>
              <label style={fieldLabel}>New rate (with new lender)</label>
              <div style={{ position: "relative" }}>
                <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)}
                  placeholder="5.89" step={0.01} min={3} max={12}
                  style={{ ...inputStyle, paddingRight: 32 }} />
                <span style={pctSuffix}>%</span>
              </div>
            </div>
          </div>
        )}

        {/* Satisfaction + freetext — shown for called/refi */}
        {called && called !== "no" && (
          <>
            <div>
              <label style={fieldLabel}>Overall satisfaction with the process</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setSatisfaction(n)} style={{
                    width: 40, height: 40, borderRadius: 8, fontSize: 18,
                    cursor: "pointer", border: "1px solid",
                    borderColor: satisfaction !== null && n <= satisfaction ? "var(--amber)" : "var(--ink4)",
                    background: satisfaction !== null && n <= satisfaction ? "rgba(240,165,0,0.1)" : "var(--ink3)",
                    color: satisfaction !== null && n <= satisfaction ? "var(--amber)" : "var(--text3)",
                  }}>
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={fieldLabel}>Any tips for other borrowers? (optional)</label>
              <textarea
                value={freeText} onChange={(e) => setFreeText(e.target.value)}
                placeholder="What worked? What did they say? Anything that surprised you?"
                rows={3}
                style={{ ...inputStyle, width: "100%", resize: "vertical" }}
              />
            </div>
          </>
        )}

        {called === "no" && (
          <div style={{ background: "var(--ink2)", border: "1px solid var(--ink4)", borderRadius: 10, padding: "16px 18px", fontSize: 13, color: "var(--text2)", lineHeight: 1.65 }}>
            No problem. When you're ready, your call script is waiting. Most calls take under 15 minutes and{" "}
            <strong style={{ color: "var(--text)" }}>62% of borrowers who call get a rate reduction.</strong>
          </div>
        )}

        {error && <div style={{ fontSize: 13, color: "var(--red)" }}>{error}</div>}

        <button onClick={handleSubmit} disabled={submitting || called === null} style={{
          background: "var(--amber)", color: "var(--ink)", fontSize: 15, fontWeight: 600,
          padding: 15, borderRadius: 9, border: "none",
          cursor: submitting || called === null ? "not-allowed" : "pointer",
          opacity: submitting || called === null ? 0.6 : 1,
        }}>
          {submitting ? "Submitting…" : "Submit outcome →"}
        </button>
      </div>
    </div>
  );
}

export default function OutcomePage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <Nav />
      <Suspense fallback={<div style={{ padding: 48, color: "var(--text3)" }}>Loading…</div>}>
        <OutcomeForm />
      </Suspense>
      <Footer />
    </main>
  );
}

const fieldLabel: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 500, color: "var(--text2)", marginBottom: 10,
};

const inputStyle: React.CSSProperties = {
  background: "var(--ink3)", border: "1px solid var(--ink4)", borderRadius: 9,
  color: "var(--text)", padding: "11px 14px", fontSize: 14,
  fontFamily: "'DM Sans', system-ui, sans-serif", outline: "none", width: "100%",
};

const pctSuffix: React.CSSProperties = {
  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
  color: "var(--text3)", fontSize: 14, pointerEvents: "none",
};
