"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

function OutcomeForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [called, setCalled] = useState<"yes" | "no" | "refi" | null>(null);
  const [rateReduced, setRateReduced] = useState<boolean | null>(null);
  const [newRate, setNewRate] = useState("");
  const [duration, setDuration] = useState("");
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div style={{ padding: "60px 48px", maxWidth: 600, margin: "0 auto", color: "var(--text2)" }}>
        <p>Invalid or missing token. Check your email for the outcome link.</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!called) { setError("Please indicate whether you called your bank."); return; }
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
          free_text: freeText || undefined,
          refinanced: called === "refi",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const saved = result.rate_changed
      ? ((result.original_rate - result.updated_rate) / 100) * 625000
      : 0;

    return (
      <div style={{ padding: "60px 48px", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--amber)", marginBottom: 16 }}>Outcome recorded</div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px,4vw,48px)", marginBottom: 16, letterSpacing: "-1px" }}>
          {result.rate_changed ? "Nice work." : "Thanks for reporting."}
        </h1>
        {result.rate_changed && (
          <p style={{ fontSize: 16, color: "var(--text2)", lineHeight: 1.7, marginBottom: 24 }}>
            You moved from <strong style={{ color: "var(--amber)", fontFamily: "'JetBrains Mono', monospace" }}>{result.original_rate}%</strong> to{" "}
            <strong style={{ color: "var(--green)", fontFamily: "'JetBrains Mono', monospace" }}>{result.updated_rate}%</strong>.
            {saved > 0 && <> That's approximately <strong style={{ color: "var(--amber)" }}>${Math.round(saved).toLocaleString()}/yr</strong> back in your pocket.</>}
          </p>
        )}
        <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 32 }}>
          Your outcome has been added to the benchmark. The next {result.lender} customer who checks their loyalty tax will benefit from your data.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/" style={{ background: "var(--amber)", color: "var(--ink)", fontSize: 13, fontWeight: 600, padding: "10px 20px", borderRadius: 8, textDecoration: "none" }}>
            Check again ↗
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just called my bank and saved $${Math.round(saved).toLocaleString()}/yr. Find your mortgage loyalty tax at loyaltytax.com.au`)}`}
            target="_blank" rel="noopener"
            style={{ background: "var(--ink3)", color: "var(--text)", fontSize: 13, fontWeight: 600, padding: "10px 20px", borderRadius: 8, textDecoration: "none", border: "1px solid var(--ink4)" }}
          >
            Share your win →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "60px 48px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--amber)", marginBottom: 16 }}>Report your outcome</div>
      <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px,4vw,48px)", marginBottom: 8, letterSpacing: "-1px" }}>Did you call your bank?</h1>
      <p style={{ fontSize: 15, color: "var(--text2)", marginBottom: 36, lineHeight: 1.7 }}>
        Your outcome — whatever it was — makes the benchmark more accurate for the next borrower.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {/* Called? */}
        <div>
          <label style={fieldLabel}>What did you do?</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { v: "yes", label: "Called — got a result" },
              { v: "no", label: "Not yet" },
              { v: "refi", label: "Decided to refinance instead" },
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

        {/* Rate reduced? */}
        {called === "yes" && (
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
        )}

        {/* New rate */}
        {called === "yes" && rateReduced && (
          <div>
            <label style={fieldLabel}>New rate achieved</label>
            <div style={{ position: "relative", maxWidth: 200 }}>
              <input
                type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)}
                placeholder="6.24" step={0.01} min={3} max={12}
                style={{ ...inputStyle, paddingRight: 32 }}
              />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: 14 }}>%</span>
            </div>
          </div>
        )}

        {/* Duration */}
        {called === "yes" && (
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
        )}

        {/* Satisfaction */}
        <div>
          <label style={fieldLabel}>Overall satisfaction</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setSatisfaction(n)} style={{
                width: 40, height: 40, borderRadius: 8, fontSize: 18,
                cursor: "pointer", border: "1px solid",
                borderColor: satisfaction && n <= satisfaction ? "var(--amber)" : "var(--ink4)",
                background: satisfaction && n <= satisfaction ? "rgba(240,165,0,0.1)" : "var(--ink3)",
              }}>
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Free text */}
        <div>
          <label style={fieldLabel}>Anything else? (optional)</label>
          <textarea
            value={freeText} onChange={(e) => setFreeText(e.target.value)}
            placeholder="What did they say? Any tips for other borrowers?"
            rows={3}
            style={{ ...inputStyle, width: "100%", resize: "vertical" }}
          />
        </div>

        {error && <div style={{ fontSize: 13, color: "var(--red)" }}>{error}</div>}

        <button onClick={handleSubmit} disabled={submitting} style={{
          background: "var(--amber)", color: "var(--ink)", fontSize: 15, fontWeight: 600,
          padding: 15, borderRadius: 9, border: "none", cursor: submitting ? "not-allowed" : "pointer",
          opacity: submitting ? 0.7 : 1,
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
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--text2)",
  marginBottom: 10,
};

const inputStyle: React.CSSProperties = {
  background: "var(--ink3)",
  border: "1px solid var(--ink4)",
  borderRadius: 9,
  color: "var(--text)",
  padding: "11px 14px",
  fontSize: 14,
  fontFamily: "'DM Sans', system-ui, sans-serif",
  outline: "none",
  width: "100%",
};
