# Calculation Overhaul & Debug Page

**Date:** 2026-07-08
**Status:** approved

## Overview

Refactor the ZenPick inference engine to fix calculation bugs, improve display fidelity, and add a debug page for real-time tweaking. Every number displayed to users will be grounded in verifiable data with clear provenance tracking.

## Problems Fixed

| #   | Issue                                                               | Impact                                                   |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | TrueSkill scores treated as 0%–100% in benchmark bars               | Bar renders at 0.6% for a TrueSkill value of 0.6         |
| 2   | `cachedReadPerM` fetched but never used in quota math               | Models with cached pricing show inflated cost            |
| 3   | Table and `QuotaCalculator` use different token assumptions         | Same model shows different requests/5h in two places     |
| 4   | `$1/$3` fallback pricing for unknown models                         | Dangerously inaccurate; removed entirely                 |
| 5   | `findRanking` uses loose substring match                            | "Kimi K2.5" matches "Kimi K2.5 Code" incorrectly         |
| 6   | `findScoreKey` with `every()` on multiple needles                   | Fragile matching, false positives                        |
| 7   | Tag thresholds too low (reasoning > 0 always fires)                 | Nearly every model gets "Strong reasoning" — meaningless |
| 8   | `agenticTags` requires 500k ctx but `scoreAgentic` gives 60 at 256k | Tag/score mismatch                                       |
| 9   | Burn rate uses 3 coarse tiers (slow/medium/fast)                    | Poor granularity for decision-making                     |
| 10  | `inferSpeed` uses `as unknown` type hack                            | Masks real type mismatch                                 |

## Architecture

### Module Split

```
src/lib/server/
  inference.ts        # Thin orchestrator (existing, trimmed)
  pricing.ts           # NEW: Pricing math + source tracking
  quota.ts             # NEW: Shared quota estimator with cached discount
  burn.ts              # NEW: Continuous burn score + named bands
  benchmarks.ts        # NEW: TrueSkill helpers + model matching
  scoring.ts           # NEW: Two-axis scenario scores (quality × fit)
  tags.ts              # NEW: Tag rules (extracted from inference.ts)
```

### New UI Components

```
src/lib/components/
  BurnBadge.svelte     # NEW: Shows burn score + band + req/$12
  FallbackBadge.svelte # NEW: "Fallback" / "Unknown" badge on price cells
  debug/               # NEW: Debug page components
    CalcReport.svelte         # Per-model calculation report
    PricingMatrix.svelte      # All-model pricing table
    QuotaMatrix.svelte        # All-model quota computation
    BurnTable.svelte          # Burn details per model
    BenchmarkMatrix.svelte    # TrueSkill display calibration
    MatchingReport.svelte     # Go ID → LLM Stats match confidence
    TagReport.svelte          # Per-model tag + rule explanation
    ScenarioBreakdown.svelte  # Per-model, per-scenario weight tree
    RawJson.svelte            # Collapsible GoModel JSON
```

### Route

```
src/routes/debug/
  +page.svelte          # Debug page shell (tabs/sections)
  +page.ts              # Loads models via getModels (same remote as home)
```

## Calculation Rules

### A. Pricing (`pricing.ts`)

```typescript
type PricingSource = 'llm-stats' | 'fallback-map' | 'unknown';

interface ModelPricing {
  inputPricePerM: number | null;
  outputPricePerM: number | null;
  cachedReadPerM: number | null;
  source: PricingSource;
}
```

1. If LLM Stats has `available && input_price_per_m != null`, use it. Output = `provider.output_price_per_m ?? input * 3`. Source = `llm-stats`.
2. Else if in known-pricing map (13 verified models), use that. Source = `fallback-map`.
3. Else all fields `null`, source = `unknown`.
4. No `$1/$3` fallback.

**UI**: Fallback badge on table price cells when source is `fallback-map` or `unknown`. Drawer shows warning banner.

### B. Quota (`quota.ts`)

```typescript
interface QuotaInputs {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
}
```

- Cost = `((inputTokens - cachedInputTokens) * inputPricePerM + cachedInputTokens * cachedReadPerM + outputTokens * outputPricePerM) / 1e6`.
- If any required price is `null`, return `null`.
- Table default: 1000 in + 500 out, 50% cached.
- Calculator uses same function with user-adjustable sliders.

### C. Burn Rate (`burn.ts`)

```typescript
type BurnBand = 'excellent' | 'good' | 'moderate' | 'high' | 'extreme';

interface BurnDetails {
  score: number;            // 0-100
  requestsPer12: number | null;
  band: BurnBand | null;
}
```

- `requestsPer12 = 12 / costPerRequest` from shared quota.
- `score = normalize(requestsPer12, 30_000)` — capped at 100.
- Bands: ≥80 Excellent, ≥60 Good, ≥40 Moderate, ≥20 High, <20 Extreme.
- Unknown pricing → null band, score 0.

### D. Benchmark Display (`benchmarks.ts`)

```typescript
interface BenchmarkDisplay {
  rawValue: number | null;    // TrueSkill μ−3σ
  percentile: number | null;  // Within Go model set
  barWidth: number;           // 0-100 for UI
  barMax: number;             // Calibration max (max(60, maxInSet))
}
```

- Display raw TrueSkill value (e.g., "47").
- Bar fills to `max(60, maxTrueSkillInSet)` — so if top model is 55, bars fill to 55.
- If `rawValue < 1` or null, show "—" (unrated).

### E. Model Matching (`benchmarks.ts`)

1. Try convention-derived ID: `goIdToLlmStatsId(goId)` (hand-curated mapping in `opencode-go.ts`).
2. If no exact match, compute normalized Levenshtein on `goIdToName(goId)` vs `model.name`. Accept ≥ 0.85.
3. Else return `null`.

Same logic for rankings.

### F. Scenario Scores (`scoring.ts`)

Two-axis multiplicative:

```
score = round(quality × fit × 100)
```

| Scenario      | Quality (0-1)            | Fit (0-1)                             |
| ------------- | ------------------------ | ------------------------------------- |
| Coding        | coding benchmark rank    | speed + burn efficiency               |
| Brainstorming | reasoning benchmark rank | context window + moderate burn        |
| Competitive   | SWE-bench + code arena   | coding rank (minor)                   |
| Agentic       | coding benchmark rank    | context ≥ 256k + tool support + speed |
| Budget        | price efficiency + quota | 1.0 (always relevant)                 |

### G. Tags (`tags.ts`)

- `Strong reasoning`: reasoning score ≥ 50th percentile of available scores.
- `Math & research`: math score ≥ 50th percentile.
- `Top-tier coding`: top 25% of coding rankings.
- `Solid coding`: top 50% of coding rankings.
- `Competitive programming`: SWE-bench > 50.
- `Agentic / autonomous`: coding score ≥ median AND ctx ≥ 256k.
- `N context`: ctx ≥ 500k.
- `Quota-friendly`: burn band excellent or good.
- `Fast inference`: tokens/s > 100.
- `New — benchmarking`: no LLM Stats data (kept but flagged when other tags exist).

## Debug Page

Route: `/debug`

Data flow: `+page.ts` → `getModels()` → `+page.svelte` → 9 sections.

### Sections

1. **Models Overview** — All models with name, provider, pricing source, burn band, 5 scenario scores. Sortable.
2. **Pricing Matrix** — Every model's input/output/cached/source. Highlights fallback/unknown.
3. **Quota Matrix** — Per-model: tokens in/out/cached → cost → requests for $12/$30/$60.
4. **Burn Details** — Score, band, raw requests/$12. Interactive token slider to test "what-if."
5. **Benchmarks Matrix** — Raw TrueSkill, calibrated bar width, percentile, source.
6. **Matching Report** — Each Go ID → matched LLM Stats name + confidence score, or "No match."
7. **Tag Report** — Each model → all tags + which rule fired.
8. **Scenario Breakdown** — Pick model + scenario → quality score, fit score, final, all inputs.
9. **Raw JSON** — Collapsible `GoModel` dump.

## Main UI Changes

- **ModelTable**: New Burn column (score + band + req/$12). Fallback badge on price. Fit segments aligned to new scoring.
- **ModelDrawer**: TrueSkill-aware benchmark bars. Fallback warning callout. Burn score detail.
- **QuotaCalculator**: Uses shared `estimateQuota`. Shows cached contribution.
- **BurnBadge**: Replaces inline burn rate display, shows continuous score + band.
- **FallbackBadge**: Small badge on price cells when source is not `llm-stats`.

## Error Handling

- Unknown pricing → graceful degradation, warnings in debug page.
- API fetch failures → keep cached data; debug page shows `fetchedAt` staleness.
- All math modules isolated and unit-testable.
