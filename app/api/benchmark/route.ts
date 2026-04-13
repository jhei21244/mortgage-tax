import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lender = searchParams.get("lender");
  const loan_type = searchParams.get("loan_type") || "variable_pi";
  const lvr_band = searchParams.get("lvr_band") || "60_70";
  const all = searchParams.get("all") === "true";

  const supabase = createServiceClient();

  // Return all lenders for the rankings table
  if (all) {
    let query = supabase
      .from("lender_benchmarks")
      .select("*")
      .eq("loan_type", loan_type)
      .order("loyalty_gap", { ascending: false });
    if (lvr_band && lvr_band !== "all") query = query.eq("lvr_band", lvr_band);
    else query = query.eq("lvr_band", "60_70"); // default to 60_70 for rankings
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    return NextResponse.json(data || []);
  }

  if (!lender) {
    return NextResponse.json({ error: "lender is required" }, { status: 400 });
  }

  // Try exact match first
  let { data, error } = await supabase
    .from("lender_benchmarks")
    .select("*")
    .eq("lender", lender)
    .eq("loan_type", loan_type)
    .eq("lvr_band", lvr_band)
    .single();

  // Fall back to variable_pi / 60_70 if no exact match
  if (error || !data) {
    const fallback = await supabase
      .from("lender_benchmarks")
      .select("*")
      .eq("lender", lender)
      .eq("loan_type", "variable_pi")
      .eq("lvr_band", "60_70")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    return NextResponse.json({ error: "Benchmark not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
