# Calculation Refactor Design

## Date

2026-07-08

## Status

Approved — ready for implementation planning.

## Problem Statement

The current inference engine in `src/lib/server/inference.ts` mixes pricing, quota, burn rate, benchmark matching, tags, and scenario scoring in one monolithic file. This has produced several visible and hidden bugs:

1. **TrueSkill scale confusion**: LLM Stats publishes scores as `μ − 3σ` (TrueSkill conservative rating, typical range ~0–60). The UI treats them as 0–100 percentages, so a score like 0.6 renders as a 0.6% wide progress bar while the label reads "0.6".
2. **Dangerous pricing fallback**: `inferPricing` returns `$1 input / $3 output` for unknown models — values that look real but are fabricated.
3. **Cached pricing unused**: `cachedReadPerM` is fetched/stored but never applied to quota calculations despite the "~50% cached" comment.
4. **Two quota formulas**: `inferQuota` uses fixed `700 input + 200 output` tokens, while `QuotaCalculator.svelte` uses `70% input + 15% output` of a 50k token slider.
5. **Coarse burn rate**: slow/medium/fast buckets based on `input + output` sum ignore that output is typically 3–5× more expensive and cached reads are 10–100× cheaper.
6. **Substring matching collisions**: `findRanking` matches "Kimi K2.5" to "Kimi K2.5 Code" because it uses loose `includes` in both directions.
7. **Meaningless tags**: `Strong reasoning` and `Math & research` fire for any score > 0, so they appear on almost every model.
8. **Inconsistent agentic thresholds**: `agenticTags` requires context ≥ 500k, but `scoreAgentic` gives partial credit at 256k.
9. **Type hack in `inferSpeed`**: casts `inference` to `unknown` then `Record<string, unknown>` to access snake_case fields that the type claims don't exist.
10. **Hardcoded context windows**: `inferContextWindow` guesses 1M/256K/128K instead of using LLM Stats `context_window` when available.

## Goals

- Make every calculation transparent, testable, and consistent across the table, drawer, and calculator.
- Never show fabricated data as real.
- Make the burn rate informative beyond three buckets.
- Fix model matching so the right LLM Stats data maps to the right Go model.
- Build a debug page where every input, intermediate value, and output is visible and tweakable without UI iteration.

## Non-Goals

- Removing the hardcoded known-pricing map entirely (accepted as short-term necessary, but must be flagged).
- Adding user-editable prices in the public UI.
- Supporting non-OpenCode-Go model catalogs.

## Architecture

Split the monolithic `inference.ts` into focused, unit-testable modules:

```
src/lib/server/
  inference.ts          # Orchestrator: calls helpers, builds GoModel
  pricing.ts            # Price resolution + source tracking
  quota.ts              # Single quota formula with cached-read support
  burn.ts               # Continuous burn score + named bands
  benchmarks.ts         # TrueSkill display helpers + strict model matching
  scoring.ts            # Two-axis (quality × fit) scenario scores
  tags.ts               # Tag rules with meaningful thresholds

src/lib/components/
  ModelTable.svelte     # New burn columns, fallback badges
  ModelDrawer.svelte    # TrueSkill bars, fallback warning callout
  QuotaCalculator.svelte# Shared quota helper
  BurnBadge.svelte      # Score + band + raw requests/$12
  FallbackBadge.svelte  # Source indicator for pricing
  debug/                # Debug-page components

src/routes/
  debug/+page.ts        # Load models via getModels()
  debug/+page.svelte    # Debug dashboard
```

## Module Designs

### 1. Pricing (`src/lib/server/pricing.ts`)

```typescript
export type PricingSource = 'llm-stats' | 'fallback-map' | 'unknown';

export interface ModelPricing {
  inputPricePerM: number | null;
  outputPricePerM: number | null;
  cachedReadPerM: number | null;
  source: PricingSource;
}
```

- **LLM Stats provider**: use the cheapest available provider with `input_price_per_m != null`. If `output_price_per_m` is missing, estimate with multiplier `3`. Set `source: 'llm-stats'`.
- **Known-pricing map**: keep verified OpenCode prices for known Go models. Set `source: 'fallback-map'`.
- **Unknown**: all prices `null`, `source: 'unknown'`.
- No `$1/$3` fabricated default.

UI effect: price cells show `—` or a fallback badge when source is not `'llm-stats'`.

### 2. Quota (`src/lib/server/quota.ts`)

```typescript
export interface QuotaInputs {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
}

export function estimateQuota(
  pricing: ModelPricing,
  inputs: QuotaInputs
): { requestsPer5h: number; requestsPerWeek: number; requestsPerMonth: number } | null;
```

- Return `null` if any required price is `null`.
- Cost per request:
  ```
  uncached = (inputTokens - cachedInputTokens) * inputPricePerM / 1_000_000
  cached   = cachedInputTokens * cachedReadPerM / 1_000_000
  output   = outputTokens * outputPricePerM / 1_000_000
  cost     = uncached + cached + output
  ```
- Default table assumption: `1000 input + 500 output, 50% cached`.
- Calculator uses the same function with user-adjustable sliders.

### 3. Burn Rate (`src/lib/server/burn.ts`)

```typescript
export type BurnBand = 'excellent' | 'good' | 'moderate' | 'high' | 'extreme';

export interface BurnDetails {
  score: number;        // 0-100, higher = more efficient
  requestsPer12: number | null;
  band: BurnBand | null;
}
```

- `requestsPer12` from shared quota helper with default tokens.
- `score = normalize(requestsPer12, 30_000)` capped at 100.
- Bands:
  - ≥80 Excellent
  - ≥60 Good
  - ≥40 Moderate
  - ≥20 High
  - <20 Extreme
- Unknown pricing → `band: null`, `score: 0`, `requestsPer12: null`.

UI shows: score progress bar, band label, and raw `~X req/$12`.

### 4. Benchmark Display (`src/lib/server/benchmarks.ts`)

```typescript
export interface BenchmarkDisplay {
  rawValue: number | null;   // TrueSkill μ−3σ
  percentile: number | null; // within Go model set
  barWidth: number;          // 0-100 for UI
  barMax: number;            // calibration max
}
```

- Calibration max defaults to `60` but expands to `max(60, highestTrueSkillInSet)`.
- `rawValue < 1` or missing → "unrated".
- Bar width = `normalize(rawValue, barMax)`.

### 5. Model Matching (`src/lib/server/benchmarks.ts`)

```typescript
function matchModel(goId: string, llmModels: LLMStatsModel[]): LLMStatsModel | null;
```

1. Try convention-derived LLM Stats ID from `goId` (e.g., `kimi-k2.5` → `kimi-k2.5`).
2. If no exact match, compute normalized Levenshtein similarity between `goIdToName(goId)` and each `model.name`. Accept only if similarity ≥ 0.85.
3. Otherwise return `null`.

Same matching logic applies to rankings.

### 6. Scenario Scores (`src/lib/server/scoring.ts`)

Two-axis, multiplicative:

```
quality = normalized capability for scenario (0-1)
fit     = normalized scenario-fit factors (0-1)
score   = round(quality * fit * 100)
```

Examples:
- **Coding**: quality = coding benchmark; fit = speed + burn efficiency.
- **Brainstorming**: quality = reasoning benchmark; fit = context + burn efficiency.
- **Competitive**: quality = SWE-bench/code-arena; fit = coding benchmark.
- **Agentic**: quality = coding benchmark; fit = context + tool support.
- **Budget**: quality = price efficiency; fit = quota. (Always relevant.)

Multiplicative scoring prevents a model from ranking high on a scenario purely due to fit factors when its core capability is low.

### 7. Tags (`src/lib/server/tags.ts`)

Raise thresholds so tags carry meaning:
- `Top-tier coding`: top 25% of coding rankings.
- `Solid coding`: top 50% of coding rankings.
- `Strong reasoning`: reasoning score ≥ 50th percentile of available reasoning scores.
- `Math & research`: math score ≥ 50th percentile of available math scores.
- `Agentic / autonomous`: coding score ≥ median AND context ≥ 256k (aligned with scoring).
- `Competitive programming`: sweBenchVerified > 50.
- `Code Arena strong`: codeArena > 70.
- `Fast inference`: tokens/s > 100.
- Context and budget tags unchanged.

## Debug Page (`/debug`)

### Data Flow

`+page.ts` calls `getModels()` (same remote as home page) and passes enriched models to `+page.svelte`.

### Sections

| Section | Content |
|---|---|
| **Models Overview** | Per-model: pricing source, burn band, 5 scenario scores. Sortable. |
| **Pricing Matrix** | Input/output/cached/source per model. Highlights fallback/unknown. |
| **Quota Matrix** | Tokens in/out/cached → cost/request → requests for $12/$30/$60. |
| **Burn Details** | Continuous score, band, raw requests/$12. Slider to test token assumptions. |
| **Benchmarks Matrix** | Raw TrueSkill, calibrated bar width, percentile, source. |
| **Matching Report** | Go ID → matched LLM Stats name + confidence, or "No match". |
| **Tag Report** | Each model → tags + which rule fired. |
| **Scenario Breakdown** | Pick model + scenario → quality, fit, final score, and all inputs. |
| **Raw GoModel JSON** | Collapsible final enriched object. |

### Interactive Knobs

- Token sliders (input/output/cached) update quota table live.
- Burn band threshold sliders show which models shift bands.
- TrueSkill calibration max shows how benchmark bars rescale.

## Main UI Changes

- **ModelTable**: add burn score + band columns, fallback badge on price, fit segments aligned to new scoring.
- **ModelDrawer**: TrueSkill-aware benchmark bars, fallback warning callout, burn score detail.
- **QuotaCalculator**: uses shared `estimateQuota`, shows cached contribution.

## Error Handling

- Unknown pricing: graceful degradation, no fabricated numbers.
- API fetch failures: return cached data; debug page shows `fetchedAt` staleness.
- Matching failures: model marked `isNew: true`, benchmarks null, tags reduced.

## Testing

Add unit tests for:
- `pricing.ts` (source resolution, unknown fallback)
- `quota.ts` (cached contribution, null handling)
- `burn.ts` (band boundaries, unknown pricing)
- `scoring.ts` (two-axis multiplication, null inputs)

## Success Criteria

- No fabricated `$1/$3` pricing appears anywhere.
- Benchmark bars visually match the TrueSkill value shown.
- Table and calculator agree on quota for the same token assumptions.
- No model matches the wrong LLM Stats entry.
- Debug page renders every calculation input/output without UI navigation.
- `bun check` passes after implementation.
