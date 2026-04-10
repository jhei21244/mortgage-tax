# LoyaltyTax — MVP scope

---

## What this document is

A precise definition of what gets built for launch, what doesn't, and why. Every decision here is made in service of one goal: get to a working product that delivers genuine value and starts collecting real outcome data as fast as possible.

---

## The product in one sentence

Enter your mortgage rate and lender. See your loyalty tax in dollars. Optionally contribute your rate to see what happened when others called that bank.

---

## Pages — what gets built

### Page 1 — Calculator (`/`)

The entire product lives here. Three states on one page.

**State A: the result (free, no contribution required)**

Six inputs:

| Field | Type | Notes |
|---|---|---|
| Lender | Dropdown | CBA, Westpac, ANZ, NAB, Macquarie, ING, Bendigo, St George, Suncorp, AMP, ME Bank, Other |
| Loan type | Dropdown | Variable P&I / Variable IO / Fixed rolling off |
| Years since last refinance | Dropdown | <1yr / 1–2yr / 3–4yr / 5–7yr / 8+ |
| LVR band | Dropdown | Under 60% / 60–70% / 70–80% / 80%+ |
| Outstanding balance | Dropdown | <$300k / $300k–$500k / $500k–$750k / $750k–$1M / $1M+ |
| Current interest rate | Number input | Decimal. Validated 3.00–12.00%. Placed last — by the time they reach it, momentum carries them. |

On submit, show immediately:

- **Annual loyalty tax in dollars** — the big number. Calculated as `(your_rate - best_new_customer_rate) × balance_band_midpoint`. This is the primary emotional anchor. Nothing else on the page matters as much as this number.
- **Three tiles**: Your rate / Best new-customer rate at your lender today / The gap in %
- **5-year figure** with a human-scale anchor. "Over 5 years, that's $X — enough for [anchor]." Anchors are randomised from a list of 8: a bathroom renovation, a round-the-world trip, two years of school fees, a new car deposit, and so on.
- **Sample size note** in small text beneath the result: "Based on X reports for [Lender] customers." Shows a real number if data exists; shows "Be among the first to report" if it doesn't. Never fake this number.

**State B: voluntary contribution prompt**

Sits below the result. Not a gate — the user already has their loyalty tax. This is a genuine additional offer:

> "You've seen your loyalty tax. We can also show you what actually happened when [X] people called [Lender] last month — what they asked for, and what they got. Enter your email and we'll add your rate to the benchmark."

One field: email address. On submit:
- Store the submission (hashed email, rate, all six fields, timestamp, source UTM)
- Show the outcome data (State C)
- Queue the D+7 follow-up email

**State C: unlocked outcome data**

Four information panels:

1. **Call success rate** — "X% of [Lender] customers who called in the last 90 days got a rate reduction." If fewer than 20 reports exist: "Only [N] reports so far — not enough to be reliable. Check back soon."
2. **Typical reduction** — "When they got a cut, the median reduction was X basis points." Same minimum threshold applies.
3. **What they said** — Three short sentence starters, framed as reports of what people used: *"I told them I'd been a customer for X years and felt my rate should reflect that."* / *"I mentioned I'd seen better rates for new customers."* / *"I asked to be transferred to the retention team."* These are factual reports, not a script. The framing matters legally.
4. **Realistic range** — "The best outcome reported was X%. The most common was Y%." Shown only when N ≥ 20.

---

### Page 2 — Lender outcomes (`/lenders`)

The most shareable and most media-friendly element of the product.

**What it shows:**

| Column | Notes |
|---|---|
| Lender | Name |
| Avg loyalty gap | Calculated from rate scrape vs crowd-reported rates. Shown from day one. |
| % who got a cut | From outcome reports. Shows "—" until ≥ 20 reports. |
| Median reduction | From outcome reports. Same threshold. |
| Report count | Always shown. Scarcity is honest. |
| Rates as of | Date the advertised rates were last updated. |

Sortable by all columns. Default: loyalty gap descending (worst offenders first).

Each row links to the calculator pre-filled with that lender.

Footer: "Your lender isn't here? Add your data →" (links to calculator).

---

### Page 3 — Post-call report (`/report?token=abc`)

Reached via the D+7 follow-up email. Token links back to the original submission without requiring login.

Four questions. Completable in under 90 seconds:

1. **Did you call your bank?** Yes / Not yet / Decided to refinance instead
   - "Not yet" → gentle note, reschedules a second follow-up email to D+14. No judgment.
   - "Refinance" → short branch: which lender, what rate. Counts as an outcome.
2. **What happened?** Got a rate reduction / No movement / They're reviewing it (follow up later)
3. **What's your new rate?** Number field. Optional but clearly labelled "this is the most useful data point for the next person."
4. **How long was the call?** Under 5 min / 5–15 min / 15–30 min / Over 30 min

On submit: show updated loyalty tax with new rate applied if they got a reduction. Show "Your report has been added to the [Lender] benchmark. You've helped [N+1] people." No further ask.

---

### Data page (`/data`)

Single page. Three sections:

1. **Where the rate data comes from** — which lenders, how often updated, source URLs for advertised rates
2. **How the outcome data works** — what's collected, minimum thresholds, outlier removal, no individual data ever shown
3. **What we don't do** — no financial advice, no recommendations, no data sold to lenders

This page exists to make the product trustworthy. It's also the thing that gets cited in media coverage.

---

### Admin (internal only)

Retool instance or equivalent. Not public. Four views:

- Submissions feed — table with lender, rate, date, email hash. Flag button for outliers.
- Outcomes feed — all post-call reports with outcome, new rate, duration.
- Lender rate management — manual form to update best new-customer rate per lender. Updated weekly until the scraper is built.
- Email queue — pending follow-up emails, send dates, open/click status.

---

## What is explicitly NOT in the MVP

- Automated rate scraper (manual weekly update is fine at launch volume)
- User accounts or login (the follow-up token handles identity)
- Mortgage health alert subscription
- Refinance comparison tool
- Any broker placement or referral mechanism
- Data licensing API
- RBA decision alert system
- A/B testing infrastructure
- Social sharing mechanic
- Marketing emails beyond the single follow-up
- Multiple verticals
- Native mobile app

The test for everything cut from the list: does removing it prevent the core loop (enter rate → see loyalty tax → contribute → report outcome) from working? If no, it's out.

---

## Data model

Three tables. Everything else is derived at query time.

### `submissions`

```
id                uuid        PK, auto
created_at        timestamp   UTC, auto
lender            varchar     Normalised to enum at write time
loan_type         enum        variable_pi | variable_io | fixed
lvr_band          enum        lt60 | 60_70 | 70_80 | gt80
years_band        enum        lt1 | 1_2 | 3_4 | 5_7 | gt8
balance_band      enum        lt300 | 300_500 | 500_750 | 750_1000 | gt1000
current_rate      decimal     Validated 3.00–12.00
email_hash        varchar     SHA-256 of email. Raw email never stored.
follow_up_token   uuid        Auto-generated. Used in /report?token= link.
follow_up_sent    timestamp   Null until email queued.
source            varchar     UTM source
```

### `outcomes`

```
id                uuid        PK, auto
submission_id     uuid        FK → submissions.id
created_at        timestamp   UTC, auto
called            boolean     Required
outcome           enum        reduced | no_movement | pending | refinanced | null
new_rate          decimal     Optional. If outcome = reduced or refinanced.
call_duration     enum        lt5 | 5_15 | 15_30 | gt30 | null
```

### `lender_rates`

```
lender            varchar     PK (composite with loan_type)
loan_type         enum        PK (composite with lender)
best_rate         decimal     Best currently advertised rate. Updated manually.
updated_at        timestamp   Auto
source_url        varchar     URL where rate was verified
```

---

## Outlier handling

Client-side: reject rates below 3% or above 12%.

Server-side: flag any submission where the reported rate is more than 2.5 standard deviations from the current mean for that `lender + loan_type + lvr_band` combination. Flagged submissions go into the admin queue rather than the live benchmark. At MVP volumes this is a 5-minute manual review daily.

The benchmark uses a rolling 180-day window. Submissions older than 180 days still exist in the database but are excluded from live calculations.

---

## The cold start problem and how to solve it

The unlocked outcome data is empty at launch. The contribution exchange is weaker without it. Three approaches used in combination:

**1 — Founder-led seeding before launch**

Post to r/AusFinance before the public launch: "I'm building a tool to track the mortgage loyalty tax and I need 50 people to test it and report back what happened when they called their bank." The community will respond. These become the first 50 outcome data points. No payment, no incentive beyond contributing to a benchmark that helps the next person.

Target: 50 outcomes across CBA, Westpac, ANZ, and NAB before public launch. Enough to show real data for the four banks Australians are most likely to be with.

**2 — Seed the rate comparison table from public sources**

Spend one day before launch compiling: best advertised new-customer rates for all 11 lenders from their websites, plus approximate loyalty gap data from Finspo's published rate tracker and Money magazine articles. This populates the lender rankings table with real, sourced numbers on day one. Cite every source on the /data page.

**3 — Launch with transparent scarcity**

Show `N = 12 — not yet reliable` rather than hiding outcome data. Scarcity becomes a call to action. The "be among the first" framing works — it gives early users a genuine sense of being part of something being built. Return the user to the page once their lender hits threshold; show them the data they helped create.

The threshold to feel meaningfully useful: approximately 50 outcome reports per lender. At r/AusFinance seed scale this is achievable within 2–3 weeks post-launch for the big four. Smaller lenders will take longer and should display the "be the first" state until they get there.

---

## The one design principle to hold throughout

Every decision that trades user trust for conversion optimisation is the wrong decision at this stage. The product's compounding advantage is that people believe the data because it comes from real people reporting honestly. Anything that makes the product feel manipulative — fake sample counts, a gate that pretends to be voluntary, an email cadence that keeps nagging — corrodes that advantage. Move fast, but don't be clever at the user's expense.

---

## Suggested build sequence

1. Static HTML/CSS version of the calculator — no backend, client-side calculation only. Get the design right before writing backend code.
2. Backend: Supabase for the database (Postgres, free tier is fine), Resend for transactional email. Both have generous free tiers and no ops overhead.
3. Submit the form, store to Supabase, send follow-up email via Resend. Test the full loop end to end.
4. Admin view in Retool — connect to Supabase, build the four views, takes half a day.
5. Lender outcomes table — query Supabase, render client-side. Add the minimum threshold logic.
6. Post-call report form — token validation, branch logic, update outcome record.
7. Seed the lender_rates table manually. Verify every rate against the lender's website.
8. Run the r/AusFinance beta seeding. Fix everything that breaks.
9. Public launch.

Total calendar time with a developer working on this part-time: 3–4 weeks. Full-time: 10–12 days.
