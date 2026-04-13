# LoyaltyTax — Functional Specification
**Product:** LoyaltyTax.com.au  
**Version:** 1.0 MVP  
**Last updated:** April 2026

---

## 1. Product summary

LoyaltyTax is a consumer-facing tool that quantifies the mortgage loyalty tax — the premium Australian home loan borrowers pay simply for staying with their existing lender. Users enter their mortgage details and immediately receive a dollar-denominated loyalty tax figure. Contributing their rate unlocks lender-specific call outcomes, a personalised negotiation script, and refinancing comparisons. Every contribution improves the benchmark for the next user.

**Core loop:**  
Enter details → see loyalty tax → contribute rate to unlock insights → act (call or refi) → report outcome → dataset improves

---

## 2. Design direction

**Aesthetic:** Dark editorial — investigative financial journalism meets data product. Deep charcoal/navy backgrounds, amber/gold accent for numbers and CTAs, monospace font for rates. Communicates seriousness without the blandness of traditional finance.

**Tone:** Direct, slightly adversarial toward banks, empowering toward borrowers. Not alarming. Not preachy. The product respects the user's intelligence.

**Typography:** DM Serif Display for headlines, DM Sans for UI, JetBrains Mono for rates and numbers.

**Key brand principle:** Everything is backed by a number. No unsupported claims. Every headline has a figure behind it.

---

## 3. Pages and routes

| Route | Page |
|---|---|
| `/` | Homepage / calculator |
| `/lenders` | Lender rankings table |
| `/how-it-works` | Explainer page |
| `/outcome` | Post-call outcome contribution form |
| `/data` | Methodology and data transparency page |
| `/about` | Team and mission |

---

## 4. Homepage — section by section

### 4.1 Navigation
- Logo: **LoyaltyTax** with amber accent
- Links: How it works / Lender rankings / Data / About
- Primary CTA button: **"Contribute your rate"** — anchors to the calculator
- Sticky on scroll, collapses to hamburger below 768px

### 4.2 Alert banner (dismissable)
Shown when RBA makes a cash rate decision. Message:  
> "RBA cut rates on [date]. Your bank may not have passed it on in full — check your loyalty tax now."  
Auto-dismissed after 7 days per user (localStorage).

### 4.3 Hero section
**ACCC credibility pill:**  
`ACCC confirmed: big four banks collect $4B+ annually from loyal customers`

**Headline (H1):**  
> Your bank charges *new customers* less than you.

**Subheading:**  
> Find out exactly how much more you're paying — and what to do about it. Takes 60 seconds.

### 4.4 Calculator card — Stage 1 (free)

**Fields (all required):**

| Field | Input type | Options |
|---|---|---|
| Lender | Dropdown | All major AU lenders + "Other lender" |
| Loan type | Dropdown | Variable P&I / Variable IO / Fixed (rolling off) |
| Years since last refinance | Dropdown | <1yr / 1–2yr / 3–4yr / 5–7yr / 8+yr |
| LVR band | Dropdown | <60% / 60–70% / 70–80% / 80%+ |
| Outstanding balance | Dropdown | 5 bands from <$300k to $1M+ |
| Current interest rate | Number input | Decimal, e.g. 6.89 |

**On submit:**  
- Validate all fields are populated and rate is within 3–12% range
- Show error states inline if validation fails
- Animate results section into view below the form

**Results display (calculated client-side + confirmed against live benchmark):**

```
Your annual loyalty tax: $3,840
Based on 614 NAB variable P&I customers in your LVR bracket

[ Your rate: 6.89% ] [ New customer rate: 6.09% ] [ Gap: 0.80% ]
```

Three metric tiles:
- **Your rate** — amber highlight
- **New customer rate** — pulled from latest advertised rate per lender (updated daily via backend)
- **The gap** — red if gap > 0.3%, amber if 0.1–0.3%, green if < 0.1%

Annual cost calculation:  
`(gap_percentage / 100) × outstanding_balance_midpoint`

**5-year cost line** beneath tiles:  
`Over 5 years, you'll pay approximately $X extra. That's a [destination] in New Zealand.`  
(Human-scale anchoring — calculated dynamically)

### 4.5 Contribution gate — Stage 2 (email required)

Shown immediately below the Stage 1 results.

**Gate copy:**  
> Unlock your full breakdown  
> See which customers successfully called [Lender] and what rate they got — plus a script for your call. Enter your email and we'll add your data to the benchmark (anonymised).

**Gate form:**  
- Email input field
- Submit button: **"Unlock insights →"**
- Fine print: *"We collect your rate to improve the benchmark. Your data is never sold and never attributed to you individually."*

**On submit:**  
- Validate email format
- POST anonymised data to backend: `{ lender, loan_type, years_vintage, lvr_band, balance_band, current_rate, email_hash }`
- Email is SHA-256 hashed client-side before transmission — raw email never sent to server
- Slide gate panel out, slide insight panel in (CSS transition)

### 4.6 Unlocked insights panel

Four insight cards in 2×2 grid:

| Card | Content |
|---|---|
| Called [Lender] in last 6 months | `X% got a rate reduction. Average cut: Y%.` |
| Best outcome without refinancing | `Called → threatened refi → got [best_rate]%. Saved $X/yr.` |
| If you refinanced instead | `Best rate: Z% ([best_lender]). Would save $X/yr.` |
| 5-year cost of inaction | `$X extra interest vs calling today.` |

**Call script button:**  
`View your call script for [Lender] ↓`  
Expands inline (no modal). Script is dynamically populated with:
- Lender name
- User's current rate
- Target rate to ask for (based on 75th percentile of outcomes for that lender)
- Typical call duration and success framing
- "What to say if they say no" — secondary escalation line

Script template:
> *"Hi, I've been a [Lender] customer for [approx years] years and I'm currently on [rate]%. I've been looking at the market and new customers are being offered rates around [new_cust_rate]%. I'd like to discuss getting my rate reviewed — I'm prepared to refinance if we can't come to an arrangement."*

### 4.7 Post-call outcome prompt (shown 3 days post-gate)

Email triggered 3 days after unlock event:

**Subject:** *Did you call [Lender]? Tell us what happened.*

**Landing page** (`/outcome?token=[user_token]`):

Fields:
- Did you call? Yes / Not yet / Decided to refinance instead
- If yes: Did they reduce your rate? Yes / No
- New rate achieved (if reduced): number field
- Were you offered any other retention incentives? (free text, optional)
- How long was the call? dropdown
- Satisfaction: 1–5 stars

Outcome submitted → user sees their updated loyalty tax with new rate applied and a social share prompt.

### 4.8 Trust bar (below calculator)

Four horizontal trust signals:
- **12,841 borrowers** have checked their rate
- **4,203 call outcomes** reported across 18 lenders
- **ACCC-cited research** backs the loyalty tax finding
- **All data anonymised** — never sold to lenders

Numbers update from live backend. Animated count-up on first viewport entry.

---

## 5. Lender rankings page (`/lenders`)

Full table of all lenders with sufficient data (minimum 100 reports).

**Columns:**

| Column | Description |
|---|---|
| Lender | Name + logo |
| Avg loyalty gap | % difference, colour-coded pill |
| Gap trend | ↑↓ vs 90 days ago |
| Call success rate | % who got a reduction |
| Progress bar | Visual representation of call success |
| Avg reduction when called | % |
| Avg call duration | minutes |
| Reports | Sample size (links to methodology) |
| Last updated | Date |

**Sorting:** All columns sortable. Default sort: loyalty gap descending.

**Filtering:**
- Loan type: Variable P&I / Variable IO / Fixed
- LVR band
- Data freshness: Last 30 days / 90 days / All time

**Table footer note:**  
> "Rates are crowd-reported and anonymised. Advertised new-customer rates sourced daily from lender websites. LoyaltyTax does not receive any payment from any lender."

---

## 6. Data model

### 6.1 `submissions` table

```
id              UUID PK
created_at      TIMESTAMP
lender          VARCHAR
loan_type       ENUM(variable_pi, variable_io, fixed)
lvr_band        ENUM(lt60, 60_70, 70_80, gt80)
balance_band    ENUM(lt300, 300_500, 500_750, 750_1000, gt1000)
current_rate    DECIMAL(5,2)
email_hash      VARCHAR(64)   -- SHA-256 of email
source          VARCHAR       -- utm tracking
```

### 6.2 `outcomes` table

```
id                  UUID PK
submission_id       UUID FK → submissions.id
created_at          TIMESTAMP
called              BOOLEAN
rate_reduced        BOOLEAN
new_rate            DECIMAL(5,2) NULLABLE
call_duration_mins  INTEGER NULLABLE
satisfaction        INTEGER NULLABLE   -- 1-5
free_text           TEXT NULLABLE
refinanced          BOOLEAN
refi_lender         VARCHAR NULLABLE
refi_rate           DECIMAL(5,2) NULLABLE
```

### 6.3 `lender_benchmarks` table (materialised, refreshed hourly)

```
lender              VARCHAR
loan_type           ENUM
lvr_band            ENUM
avg_existing_rate   DECIMAL(5,2)
advertised_rate     DECIMAL(5,2)      -- scraped daily
loyalty_gap         DECIMAL(5,2)
call_success_rate   DECIMAL(5,2)
avg_reduction       DECIMAL(5,2)
sample_size         INTEGER
last_updated        TIMESTAMP
```

---

## 7. Backend services

### 7.1 Rate scraper
- Runs daily at 06:00 AEST
- Scrapes or calls APIs for advertised variable P&I rates from all major lenders
- Writes to `lender_advertised_rates` table
- Triggers benchmark refresh if any rate changed by > 0.05%

### 7.2 Benchmark aggregation job
- Runs hourly
- Queries `submissions` and `outcomes` to refresh `lender_benchmarks`
- Minimum sample size of 30 records required before a lender cell is published
- Applies outlier removal: excludes submissions where rate is > 3 standard deviations from lender mean

### 7.3 Email service
- Confirmation email on gate submission (plain text)
- Outcome prompt email at D+3
- Monthly "your mortgage health" digest for opted-in users (shows if loyalty gap has increased)
- RBA decision alert (triggered manually by admin on decision day)

### 7.4 Admin dashboard
- Submission volume by day, lender, and source
- Call outcome funnel: submitted → called → reduced
- Lender benchmarks with manual override capability
- Flag suspicious submissions (same IP, same rate multiple times)

---

## 8. Referral and monetisation flows

### 8.1 Mortgage broker referral
Shown in the unlocked insights panel when loyalty gap > 0.5% and balance > $400k:

> **"Want someone to do this for you?"**  
> Our broker partners can call on your behalf and handle the refinance paperwork if needed. Most get a result within 48 hours.  
> [Connect me with a broker →]

Referral tracked via UTM. Broker pays $800–$2,500 per settled loan (revenue share, not upfront).

**Disclosure:** Displayed clearly in the CTA and on the broker referral page: *"LoyaltyTax receives a referral fee from broker partners if you proceed to refinance. This does not affect the benchmarking data."*

### 8.2 Comparison platform licensing
API endpoint for Canstar/Finder/RateCity to consume `lender_benchmarks` data (existing customer rates tab on their comparison tables). Licensing fee negotiated commercially.

### 8.3 "Mortgage health alert" subscription
Premium tier at $9.99/month or $79/year:
- Monthly loyalty tax recalculation
- Alert when your lender's loyalty gap increases
- Full history of your submissions and outcomes
- Early access to refinance rate alerts

Shown as optional upsell in the post-outcome confirmation screen.

---

## 9. Key flows — states and transitions

```
[LANDING]
  ↓ User fills calculator + clicks Calculate
[STAGE 1 RESULTS — free]
  → Loyalty tax amount shown
  → Gate CTA visible
  ↓ User enters email + submits
[STAGE 2 UNLOCKED]
  → Insights panel visible
  → Call script accessible
  → Broker referral CTA (if high gap)
  ↓ 3 days later: outcome email sent
[OUTCOME SUBMISSION — /outcome]
  → Called: yes/no
  → Rate reduction: amount
  → Data added to benchmark
[OUTCOME CONFIRMED]
  → Updated loyalty tax with new rate
  → Social share prompt
  → "Mortgage health" subscription upsell
```

---

## 10. Analytics events

| Event | Trigger |
|---|---|
| `calculator_started` | User changes any field |
| `calculator_submitted` | Calculate button clicked |
| `results_viewed` | Results section scrolls into view |
| `gate_submitted` | Email submitted |
| `insights_unlocked` | Gate cleared |
| `script_expanded` | Call script opened |
| `broker_cta_clicked` | Referral CTA clicked |
| `outcome_started` | Outcome page loaded |
| `outcome_submitted` | Outcome form submitted |
| `subscription_upsell_clicked` | Mortgage health CTA clicked |

All events include: `lender`, `loyalty_gap_band` (low/med/high), `balance_band`, `source`.

---

## 11. MVP build scope

**In scope for MVP:**
- Homepage with calculator (Stage 1 + Stage 2)
- Lender rankings table (5–7 lenders at launch with seeded data)
- Call script (templated, not personalised)
- Email collection and D+3 outcome prompt
- Basic broker referral CTA
- Responsive down to 375px
- Basic admin dashboard (Retool or equivalent)

**Deferred to V1.1:**
- RBA decision alert
- Mortgage health subscription
- Comparison platform API
- Full outcome analytics dashboard
- Lender trend data (requires 90 days of collection)
- Personalised script (requires sufficient lender outcome data)

---

## 12. Success metrics

| Metric | Target (90 days post-launch) |
|---|---|
| Calculator completions | 5,000 |
| Gate conversion (completions → unlocked) | > 40% |
| Call outcome submissions | > 800 |
| Broker referral clicks | > 300 |
| Broker referral to settlement | > 15 |
| Email list size | > 4,000 |

---

## 13. Legal and compliance notes

- **Not financial advice:** All pages must display the disclaimer: *"LoyaltyTax provides general information only. It is not financial advice. You should consider seeking independent financial advice before making any decisions about your home loan."*
- **AFSL:** The platform does not hold an AFSL and must not make specific loan recommendations. Broker referrals are facilitated through AFSL-licensed partners.
- **Privacy:** Privacy Policy must cover: data collected, anonymisation methodology, email use, no-sale guarantee to lenders. Compliant with Australian Privacy Act 1988.
- **Broker disclosure:** Any referral fee arrangement must be disclosed at point of referral per ASIC RG 234.
- **Rate accuracy:** Benchmarks must include last-updated timestamp and methodology link. Cannot be presented as current or guaranteed.
