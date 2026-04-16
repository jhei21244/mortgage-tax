import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function isAuthed(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${process.env.ADMIN_SECRET}`;
}

// GET — fetch current advertised rates for all lenders
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  // Get latest scraped rate per lender
  const { data: scraped } = await supabase
    .from("lender_advertised_rates")
    .select("lender, loan_type, advertised_rate, scraped_at")
    .order("scraped_at", { ascending: false });

  const latestByLender: Record<string, { rate: number; scraped_at: string }> = {};
  for (const row of scraped ?? []) {
    const key = `${row.lender}|${row.loan_type}`;
    if (!latestByLender[key]) {
      latestByLender[key] = { rate: row.advertised_rate, scraped_at: row.scraped_at };
    }
  }

  // Get current benchmarks
  const { data: benchmarks } = await supabase
    .from("lender_benchmarks")
    .select("lender, loan_type, lvr_band, advertised_rate, loyalty_gap, sample_size, last_updated")
    .order("loyalty_gap", { ascending: false });

  return NextResponse.json({
    scraped_rates: latestByLender,
    benchmarks: benchmarks ?? [],
  });
}

// POST — manually override advertised rate for a lender
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { lender, loan_type = "variable_pi", advertised_rate } = body;

  if (!lender) return NextResponse.json({ error: "lender required" }, { status: 400 });
  if (typeof advertised_rate !== "number" || advertised_rate < 3 || advertised_rate > 12)
    return NextResponse.json({ error: "advertised_rate must be 3–12" }, { status: 400 });

  const supabase = createServiceClient();

  // Insert into lender_advertised_rates (as a manual scrape)
  await supabase.from("lender_advertised_rates").insert({
    lender,
    loan_type,
    advertised_rate,
    scraped_at: new Date().toISOString(),
  });

  // Directly update lender_benchmarks advertised_rate + loyalty_gap for all lvr_bands
  const { data: benchmarks } = await supabase
    .from("lender_benchmarks")
    .select("lender, loan_type, lvr_band, avg_existing_rate")
    .eq("lender", lender)
    .eq("loan_type", loan_type);

  const updates = [];
  for (const bm of benchmarks ?? []) {
    const loyalty_gap = parseFloat(((bm.avg_existing_rate ?? 0) - advertised_rate).toFixed(2));
    const { error } = await supabase
      .from("lender_benchmarks")
      .update({ advertised_rate, loyalty_gap, last_updated: new Date().toISOString() })
      .eq("lender", lender)
      .eq("loan_type", loan_type)
      .eq("lvr_band", bm.lvr_band);
    if (!error) updates.push(bm.lvr_band);
  }

  return NextResponse.json({
    success: true,
    lender,
    loan_type,
    advertised_rate,
    benchmarks_updated: updates,
  });
}
