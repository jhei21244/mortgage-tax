import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Hardcoded fallback rates — update these manually when rates change significantly
// These are used when scraping fails, as a last resort
const FALLBACK_RATES: Record<string, number> = {
  "Commonwealth Bank": 6.19,
  Westpac: 6.29,
  ANZ: 6.14,
  NAB: 6.09,
  "Macquarie Bank": 5.89,
  ING: 5.84,
  "Bendigo Bank": 6.24,
};

// Multiple URL targets per lender — try each in order
const LENDER_TARGETS: Record<string, string[]> = {
  "Commonwealth Bank": [
    "https://www.commbank.com.au/home-loans/variable-rate.html",
    "https://www.commbank.com.au/home-loans.html",
  ],
  Westpac: [
    "https://www.westpac.com.au/personal-banking/home-loans/variable/rocket-repay-home-loan/",
    "https://www.westpac.com.au/personal-banking/home-loans/",
  ],
  ANZ: [
    "https://www.anz.com.au/personal/home-loans/variable-rate/simplicity-plus/",
    "https://www.anz.com.au/personal/home-loans/",
  ],
  NAB: [
    "https://www.nab.com.au/personal/home-loans/variable-rate-home-loan",
    "https://www.nab.com.au/personal/home-loans",
  ],
  "Macquarie Bank": [
    "https://www.macquarie.com.au/home-loans/offset-home-loan.html",
    "https://www.macquarie.com.au/home-loans.html",
  ],
  ING: [
    "https://www.ing.com.au/home-loans/orange-advantage.html",
    "https://www.ing.com.au/home-loans.html",
  ],
  "Bendigo Bank": [
    "https://www.bendigobank.com.au/personal/home-loans/express-home-loan/",
    "https://www.bendigobank.com.au/personal/home-loans/",
  ],
};

// Regex patterns — ordered by specificity
const RATE_PATTERNS = [
  // "5.89% p.a." style
  /(\d+\.\d{2})\s*%\s*p\.a/gi,
  // "5.89% per annum"
  /(\d+\.\d{2})\s*%\s*per\s+annum/gi,
  // "interest rate ... 5.89%"
  /interest\s+rate[^0-9]{1,40}(\d+\.\d{2})\s*%/gi,
  // "variable ... 5.89%"
  /variable[^0-9]{1,30}(\d+\.\d{2})\s*%/gi,
  // "from 5.89%"
  /from\s+(\d+\.\d{2})\s*%/gi,
  // bare "5.89%" — least specific
  /\b(\d+\.\d{2})\s*%/g,
];

function extractRates(html: string): number[] {
  const candidates = new Set<number>();
  for (const pattern of RATE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const rate = parseFloat(match[1]);
      // Valid mortgage rate range: 4.5% to 10%
      if (rate >= 4.5 && rate <= 10) {
        candidates.add(rate);
      }
    }
  }
  return Array.from(candidates);
}

async function scrapeLenderRate(
  lender: string,
  urls: string[]
): Promise<{ rate: number; scraped: boolean; source: string }> {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-AU,en;q=0.9",
        },
      });

      if (!res.ok) continue;
      const html = await res.text();
      const rates = extractRates(html);

      if (rates.length > 0) {
        // Take the minimum — best advertised new-customer rate
        const rate = Math.min(...rates);
        return { rate, scraped: true, source: url };
      }
    } catch {
      // Try next URL
    }
  }

  // All URLs failed — use fallback
  const fallback = FALLBACK_RATES[lender] ?? 6.0;
  return { rate: fallback, scraped: false, source: "fallback" };
}

async function getLatestScrapedRates(
  supabase: ReturnType<typeof createServiceClient>
): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("lender_advertised_rates")
    .select("lender, advertised_rate, scraped_at")
    .eq("loan_type", "variable_pi")
    .order("scraped_at", { ascending: false });

  const latest: Record<string, number> = {};
  for (const row of data ?? []) {
    if (!latest[row.lender]) latest[row.lender] = row.advertised_rate;
  }
  return latest;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const prevRates = await getLatestScrapedRates(supabase);

  const results: Array<{
    lender: string;
    rate: number;
    scraped: boolean;
    source: string;
    prev: number | null;
    changed: boolean;
  }> = [];

  let anyChanged = false;

  for (const [lender, urls] of Object.entries(LENDER_TARGETS)) {
    const { rate, scraped, source } = await scrapeLenderRate(lender, urls);
    const prev = prevRates[lender] ?? null;
    const changed = prev !== null && Math.abs(rate - prev) > 0.05;
    if (changed) anyChanged = true;

    await supabase.from("lender_advertised_rates").insert({
      lender,
      loan_type: "variable_pi",
      advertised_rate: rate,
      scraped_at: new Date().toISOString(),
    });

    results.push({ lender, rate, scraped, source, prev, changed });
    console.log(
      `[scrape-rates] ${lender}: ${rate}% (${scraped ? "scraped" : "fallback"} via ${source})${changed ? ` ← CHANGED from ${prev}%` : ""}`
    );
  }

  // Trigger aggregation if any rate changed
  if (anyChanged) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mortgage-tax.vercel.app";
    fetch(`${siteUrl}/api/cron/aggregate-benchmarks`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    }).catch(console.error);
    console.log("[scrape-rates] Rate change detected — triggered benchmark aggregation");
  }

  const scraped = results.filter((r) => r.scraped).length;
  const fallback = results.filter((r) => !r.scraped).length;

  return NextResponse.json({
    scraped,
    fallback,
    changed: results.filter((r) => r.changed).length,
    aggregation_triggered: anyChanged,
    results,
  });
}
