import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Known fallback rates — updated periodically as a safety net
const FALLBACK_RATES: Record<string, number> = {
  "Commonwealth Bank": 6.19,
  Westpac: 6.29,
  ANZ: 6.14,
  NAB: 6.09,
  "Macquarie Bank": 5.89,
  ING: 5.84,
  "Bendigo Bank": 6.24,
};

const LENDER_URLS: Record<string, string> = {
  "Commonwealth Bank": "https://www.commbank.com.au/home-loans/variable-rate.html",
  Westpac: "https://www.westpac.com.au/personal-banking/home-loans/variable/",
  ANZ: "https://www.anz.com.au/personal/home-loans/variable-rate/",
  NAB: "https://www.nab.com.au/personal/home-loans/variable-rate-home-loan",
  "Macquarie Bank": "https://www.macquarie.com.au/home-loans/variable-rate.html",
  ING: "https://www.ing.com.au/home-loans/orange-advantage.html",
  "Bendigo Bank": "https://www.bendigobank.com.au/personal/home-loans/express-home-loan/",
};

// Regex patterns to find rates on lender pages
const RATE_PATTERNS = [
  /(\d+\.\d{2})\s*%\s*p\.a/gi,
  /(\d+\.\d{2})\s*%\s*per\s+annum/gi,
  /interest\s+rate[^\d]*(\d+\.\d{2})\s*%/gi,
  /variable\s+rate[^\d]*(\d+\.\d{2})\s*%/gi,
  /(\d+\.\d{2})\s*%\s*(?:variable|interest)/gi,
];

async function fetchRBA(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.rba.gov.au/statistics/key-statistics/",
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return 4.35;
    const data = await res.json();
    // RBA API returns cash rate target
    const cashRate = data?.data?.[0]?.cashRateTarget ?? data?.cashRateTarget;
    if (cashRate && cashRate > 0 && cashRate < 20) return parseFloat(cashRate);
    return 4.35;
  } catch {
    return 4.35;
  }
}

async function scrapeLenderRate(lender: string, url: string): Promise<{ rate: number; scraped: boolean }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LoyaltyTax/1.0; +https://loyaltytax.com.au)",
        Accept: "text/html",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const candidates: number[] = [];
    for (const pattern of RATE_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const rate = parseFloat(match[1]);
        if (rate >= 4.5 && rate <= 10) {
          candidates.push(rate);
        }
      }
    }

    if (candidates.length === 0) throw new Error("No rates found in page");

    // Take the minimum plausible rate (best advertised new-customer rate)
    const rate = Math.min(...candidates);
    return { rate, scraped: true };
  } catch (err) {
    console.warn(`[scrape-rates] ${lender} scrape failed: ${err}`);
    return { rate: FALLBACK_RATES[lender] ?? 6.0, scraped: false };
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const cashRate = await fetchRBA();

  const results: Array<{
    lender: string;
    rate: number;
    scraped: boolean;
    changed: boolean;
  }> = [];

  // Fetch previous rates for change detection
  const { data: prevRates } = await supabase
    .from("lender_advertised_rates")
    .select("lender, advertised_rate")
    .order("scraped_at", { ascending: false });

  const prevByLender: Record<string, number> = {};
  for (const row of prevRates ?? []) {
    if (!prevByLender[row.lender]) prevByLender[row.lender] = row.advertised_rate;
  }

  let anyChanged = false;

  for (const [lender, url] of Object.entries(LENDER_URLS)) {
    const { rate, scraped } = await scrapeLenderRate(lender, url);
    const prev = prevByLender[lender];
    const changed = prev !== undefined && Math.abs(rate - prev) > 0.05;
    if (changed) anyChanged = true;

    // Upsert into lender_advertised_rates
    await supabase.from("lender_advertised_rates").insert({
      lender,
      loan_type: "variable_pi",
      advertised_rate: rate,
    });

    results.push({ lender, rate, scraped, changed });
    console.log(`[scrape-rates] ${lender}: ${rate}% (${scraped ? "scraped" : "fallback"})${changed ? " ← CHANGED" : ""}`);
  }

  // Trigger benchmark aggregation if any rate changed
  if (anyChanged) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mortgage-tax.vercel.app";
    fetch(`${siteUrl}/api/cron/aggregate-benchmarks`, {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    }).catch(console.error);
    console.log("[scrape-rates] Rate change detected — triggered benchmark aggregation");
  }

  return NextResponse.json({
    scraped: results.filter((r) => r.scraped).length,
    fallback: results.filter((r) => !r.scraped).length,
    changed: results.filter((r) => r.changed).length,
    cashRateUsed: cashRate,
    results,
  });
}
