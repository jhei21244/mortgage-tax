import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface SubmissionRow {
  lender: string;
  loan_type: string;
  lvr_band: string;
  current_rate: number;
}

interface OutcomeRow {
  submission_id: string;
  called: boolean;
  rate_reduced: boolean;
  new_rate: number | null;
  submissions: { lender: string; loan_type: string; lvr_band: string; current_rate: number }[] | null;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[], avg: number): number {
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function removeOutliers(values: number[]): number[] {
  if (values.length < 4) return values;
  const avg = mean(values);
  const sd = stddev(values, avg);
  return values.filter((v) => Math.abs(v - avg) <= 3 * sd);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const updated: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  // 1. Fetch all submissions
  const { data: submissions, error: subErr } = await supabase
    .from("submissions")
    .select("lender, loan_type, lvr_band, current_rate");

  if (subErr || !submissions) {
    return NextResponse.json({ error: "Failed to fetch submissions", detail: subErr?.message }, { status: 500 });
  }

  // 2. Group submissions by (lender, loan_type, lvr_band)
  const groups: Record<string, SubmissionRow[]> = {};
  for (const row of submissions as SubmissionRow[]) {
    const key = `${row.lender}|${row.loan_type}|${row.lvr_band}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  // 3. Fetch latest advertised rates from scraper
  const { data: advertisedRates } = await supabase
    .from("lender_advertised_rates")
    .select("lender, loan_type, advertised_rate, scraped_at")
    .order("scraped_at", { ascending: false });

  const latestAdvertised: Record<string, number> = {};
  for (const row of advertisedRates ?? []) {
    const key = `${row.lender}|${row.loan_type}`;
    if (!latestAdvertised[key]) latestAdvertised[key] = row.advertised_rate;
  }

  // 4. Fetch outcomes with submission join for call stats
  const { data: outcomes } = await supabase
    .from("outcomes")
    .select("submission_id, called, rate_reduced, new_rate, submissions(lender, loan_type, lvr_band, current_rate)");

  // Build outcome stats per segment
  const outcomeStats: Record<string, { total: number; reduced: number; reductions: number[] }> = {};
  for (const outcome of (outcomes ?? []) as unknown as OutcomeRow[]) {
    const subArr = outcome.submissions;
    const sub = Array.isArray(subArr) ? subArr[0] : subArr;
    if (!sub) continue;
    const key = `${sub.lender}|${sub.loan_type}|${sub.lvr_band}`;
    if (!outcomeStats[key]) outcomeStats[key] = { total: 0, reduced: 0, reductions: [] };
    if (outcome.called) {
      outcomeStats[key].total++;
      if (outcome.rate_reduced && outcome.new_rate != null) {
        outcomeStats[key].reduced++;
        outcomeStats[key].reductions.push(sub.current_rate - outcome.new_rate);
      }
    }
  }

  // 5. Fetch existing benchmarks (for fallback advertised rates)
  const { data: existingBenchmarks } = await supabase
    .from("lender_benchmarks")
    .select("lender, loan_type, lvr_band, advertised_rate, sample_size");

  const existingMap: Record<string, { advertised_rate: number; sample_size: number }> = {};
  for (const row of existingBenchmarks ?? []) {
    const key = `${row.lender}|${row.loan_type}|${row.lvr_band}`;
    existingMap[key] = { advertised_rate: row.advertised_rate, sample_size: row.sample_size };
  }

  // 6. Process each segment
  for (const [key, rows] of Object.entries(groups)) {
    const [lender, loan_type, lvr_band] = key.split("|");

    try {
      // Only update if real submission count >= 30
      if (rows.length < 30) {
        skipped.push(`${lender}/${loan_type}/${lvr_band} (${rows.length} submissions, need 30)`);
        continue;
      }

      // Outlier removal
      const rates = rows.map((r) => r.current_rate);
      const cleanRates = removeOutliers(rates);
      const avg_existing_rate = parseFloat(mean(cleanRates).toFixed(2));

      // Get advertised rate
      const advertisedKey = `${lender}|${loan_type}`;
      const advertised_rate =
        latestAdvertised[advertisedKey] ??
        existingMap[key]?.advertised_rate ??
        null;

      if (!advertised_rate) {
        errors.push(`${lender}: no advertised rate available`);
        continue;
      }

      const loyalty_gap = parseFloat((avg_existing_rate - advertised_rate).toFixed(2));

      // Call stats
      const stats = outcomeStats[key];
      const call_success_rate = stats && stats.total > 0
        ? parseFloat(((stats.reduced / stats.total) * 100).toFixed(1))
        : existingMap[key] ? undefined : null;
      const avg_reduction = stats && stats.reductions.length > 0
        ? parseFloat(mean(stats.reductions).toFixed(2))
        : existingMap[key] ? undefined : null;

      const upsertData: Record<string, unknown> = {
        lender,
        loan_type,
        lvr_band,
        avg_existing_rate,
        advertised_rate,
        loyalty_gap,
        sample_size: cleanRates.length,
        last_updated: new Date().toISOString(),
      };

      if (call_success_rate !== undefined && call_success_rate !== null) {
        upsertData.call_success_rate = call_success_rate;
      }
      if (avg_reduction !== undefined && avg_reduction !== null) {
        upsertData.avg_reduction = avg_reduction;
      }

      const { error: upsertErr } = await supabase
        .from("lender_benchmarks")
        .upsert(upsertData, { onConflict: "lender,loan_type,lvr_band" });

      if (upsertErr) {
        errors.push(`${lender}: ${upsertErr.message}`);
      } else {
        updated.push(`${lender}/${loan_type}/${lvr_band} (${cleanRates.length} submissions, gap: ${loyalty_gap}%)`);
      }
    } catch (err) {
      errors.push(`${lender}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    updated: updated.length,
    skipped: skipped.length,
    errors: errors.length,
    detail: { updated, skipped, errors },
    timestamp: new Date().toISOString(),
  });
}
