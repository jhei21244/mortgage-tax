import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
const VALID_LENDERS = [
  "Commonwealth Bank", "Westpac", "ANZ", "NAB",
  "Macquarie Bank", "ING", "Bendigo Bank", "Other lender",
];
const VALID_LOAN_TYPES = ["variable_pi", "variable_io", "fixed"];
const VALID_LVR_BANDS = ["lt60", "60_70", "70_80", "gt80"];
const VALID_BALANCE_BANDS = ["lt300", "300_500", "500_750", "750_1000", "gt1000"];

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { lender, loan_type, lvr_band, balance_band, current_rate, email_hash, source } = body;

  // Validate
  if (!VALID_LENDERS.includes(lender))
    return NextResponse.json({ error: "Invalid lender" }, { status: 400 });
  if (!VALID_LOAN_TYPES.includes(loan_type))
    return NextResponse.json({ error: "Invalid loan_type" }, { status: 400 });
  if (!VALID_LVR_BANDS.includes(lvr_band))
    return NextResponse.json({ error: "Invalid lvr_band" }, { status: 400 });
  if (!VALID_BALANCE_BANDS.includes(balance_band))
    return NextResponse.json({ error: "Invalid balance_band" }, { status: 400 });
  if (typeof current_rate !== "number" || current_rate < 3 || current_rate > 12)
    return NextResponse.json({ error: "Invalid current_rate (must be 3–12)" }, { status: 400 });
  if (!email_hash || typeof email_hash !== "string" || email_hash.length !== 64)
    return NextResponse.json({ error: "Invalid email_hash" }, { status: 400 });

  const supabase = createServiceClient();

  // Check for duplicate submission (same email_hash + lender within 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("submissions")
    .select("id, outcome_token")
    .eq("email_hash", email_hash)
    .eq("lender", lender)
    .gte("created_at", since)
    .single();

  if (existing) {
    // Return existing outcome_token so they still get insights
    const benchmark = await getBenchmark(supabase, lender, loan_type, lvr_band);
    return NextResponse.json({ outcome_token: existing.outcome_token, benchmark, duplicate: true });
  }

  // Insert submission
  const { data: submission, error } = await supabase
    .from("submissions")
    .insert({ lender, loan_type, lvr_band, balance_band, current_rate, email_hash, source: source || null })
    .select("id, outcome_token")
    .single();

  if (error || !submission) {
    console.error("Submission insert error:", error);
    return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
  }

  // Fetch benchmark to return
  const benchmark = await getBenchmark(supabase, lender, loan_type, lvr_band);

  // Send confirmation email (fire and forget — we don't have raw email, just hash)
  // Email is triggered via a separate flow when the user opts in with their actual address
  // For MVP: no confirmation email (we only have the hash, not the address)

  return NextResponse.json({ outcome_token: submission.outcome_token, benchmark });
}

async function getBenchmark(supabase: any, lender: string, loan_type: string, lvr_band: string) {
  const { data } = await supabase
    .from("lender_benchmarks")
    .select("*")
    .eq("lender", lender)
    .eq("loan_type", loan_type)
    .eq("lvr_band", lvr_band)
    .single();

  if (!data) {
    // Fallback to variable_pi / 60_70
    const { data: fallback } = await supabase
      .from("lender_benchmarks")
      .select("*")
      .eq("lender", lender)
      .eq("loan_type", "variable_pi")
      .eq("lvr_band", "60_70")
      .single();
    return fallback;
  }
  return data;
}
