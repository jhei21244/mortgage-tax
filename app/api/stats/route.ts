import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServiceClient();

  const [
    { count: submissionCount },
    { count: outcomeCount },
    { data: lenderData },
  ] = await Promise.all([
    supabase.from("submissions").select("*", { count: "exact", head: true }),
    supabase.from("outcomes").select("*", { count: "exact", head: true }),
    supabase.from("lender_benchmarks").select("lender").order("lender"),
  ]);

  const uniqueLenders = lenderData ? new Set(lenderData.map((r: any) => r.lender)).size : 0;

  // Use seeded counts as floor so trust bar doesn't start at 0
  const SEEDED_SUBMISSIONS = 12841;
  const SEEDED_OUTCOMES = 4203;

  return NextResponse.json({
    submissions: Math.max(submissionCount ?? 0, SEEDED_SUBMISSIONS),
    outcomes: Math.max(outcomeCount ?? 0, SEEDED_OUTCOMES),
    lenders: Math.max(uniqueLenders, 7),
  });
}
