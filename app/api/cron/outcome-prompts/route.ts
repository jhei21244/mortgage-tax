import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { Resend } from "resend";

// Vercel cron: runs daily, finds submissions from 3 days ago with no outcome
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Find submissions from exactly 3 days ago (within a 1-hour window)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const windowStart = new Date(threeDaysAgo.getTime() - 30 * 60 * 1000).toISOString();
  const windowEnd = new Date(threeDaysAgo.getTime() + 30 * 60 * 1000).toISOString();

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, lender, outcome_token, current_rate")
    .gte("created_at", windowStart)
    .lte("created_at", windowEnd);

  if (!submissions || submissions.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Filter: only those without an outcome
  const { data: existingOutcomes } = await supabase
    .from("outcomes")
    .select("submission_id")
    .in("submission_id", submissions.map((s: any) => s.id));

  const outcomeSubIds = new Set((existingOutcomes || []).map((o: any) => o.submission_id));
  const pending = submissions.filter((s: any) => !outcomeSubIds.has(s.id));

  // We can't email without the raw address — this cron is a placeholder
  // In production: store a separate email_address field (encrypted) or use a token-based approach
  // For MVP: log the pending tokens for manual follow-up
  console.log(`[outcome-prompts] ${pending.length} pending outcome prompts:`, pending.map((s: any) => s.outcome_token));

  return NextResponse.json({ pending: pending.length, tokens: pending.map((s: any) => s.outcome_token) });
}
