# Modelgrep Integration Design

**Date:** 2026-07-09
**Status:** Draft
**Owner:** Michael Obele
**Goal:** Replace LLM Stats API with modelgrep.com for model benchmark, pricing, and speed data.

## Why Modelgrep

| Concern               | LLM Stats                                                         | modelgrep                                          |
| --------------------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| **Go model coverage** | Partial — missing many Go models (GLM 5.2, Kimi K2.7, MiMo, etc.) | ✅ All Go models present with complete data        |
| **Pricing**           | Often missing or from unknown providers                           | ✅ OpenRouter-sourced, always populated            |
| **Model matching**    | Fuzzy Levenshtein — error-prone                                   | ✅ Exact `maker/model-id` mapping                  |
| **Inference speed**   | Often `null`                                                      | ✅ Every model has `throughput_tps` + `latency_ms` |
| **Benchmarks**        | TrueSkill rankings (proprietary)                                  | ✅ Artificial Analysis indices (industry standard) |
| **API key**           | Required                                                          | ✅ None needed — free, no signup, CORS-enabled     |
| **Rate limits**       | Unlimited                                                         | "Reasonable volume" — no hard cap                  |

## Architecture Change

### Before (`src/lib/server/`)

```
opencode-go.ts ──┐
                 ├──> pricing.ts ──> inference.ts ──> models.remote.ts
llm-stats.ts ────┤                                     ↑
                 ├──> benchmarks.ts (Levenshtein) ─────┘
                 └──> scoring.ts (TrueSkill ranks)
                        tags.ts (ranking-dependent)
```

### After (`src/lib/server/`)

```
opencode-go.ts ──┐
                 ├──> pricing.ts ──> inference.ts ──> models.remote.ts
modelgrep.ts ────┤
                 ├──> (no benchmarks.ts needed)
                 ├──> scoring.ts (AA indices directly)
                 └──> tags.ts (simplified, no ranking dep)
```

- `llm-stats.ts` → **removed** (replaced by `modelgrep.ts`)
- `benchmarks.ts` → **removed** (no more fuzzy matching needed)
- `pricing.ts` → **simplified** (modelgrep pricing replaces steps 2-3 of fallback chain)
- `scoring.ts` → **simplified** (AA indices replace TrueSkill rank→percentile)
- `tags.ts` → **simplified** (removes `LLMStatsRanking` dependency)

## New Files

### `src/lib/server/modelgrep.ts`

Thin API client over `https://modelgrep.com/api/v1/models`.

```typescript
// Go model ID → modelgrep model ID mapping (hand-curated)
const GO_TO_MODELGREP: Record<string, string> = {
  'deepseek-v4-pro': 'deepseek/deepseek-v4-pro',
  'deepseek-v4-flash': 'deepseek/deepseek-v4-flash',
  'glm-5.2': 'z-ai/glm-5.2',
  'glm-5.1': 'z-ai/glm-5.1',
  'kimi-k2.7-code': 'moonshotai/kimi-k2.7-code',
  'kimi-k2.6': 'moonshotai/kimi-k2.6',
  'mimo-v2.5': 'xiaomi/mimo-v2.5',
  'mimo-v2.5-pro': 'xiaomi/mimo-v2.5-pro',
  'minimax-m3': 'minimax/minimax-m3',
  'minimax-m2.7': 'minimax/minimax-m2.7',
  'qwen3.7-max': 'qwen/qwen3.7-max',
  'qwen3.7-plus': 'qwen/qwen3.7-plus',
  'qwen3.6-plus': 'qwen/qwen3.6-plus',
};
```

**Endpoints used:**

- `GET /api/v1/models?q={maker}&limit=30` — batch fetch by maker (deepseek, z-ai, moonshotai, minimax, xiaomi, qwen)

**What it returns per model:**

- `pricing` — `{ input: number, output: number, cache_read: number | null }`
- `performance` — `{ throughput_tps: number | null, latency_ms: number | null }`
- `benchmarks.artificial_analysis` — `{ intelligence, coding, agentic, gpqa, hle, scicode, tau2, *_pct }`
- `benchmarks.design_arena` — `{ elo, win_rate, elo_pct, tournaments }`
- `context_length`, `max_output`, `capabilities`, `description`, `url`

### New Model Types (`src/lib/types/models.ts`)

Add `ModelgrepModelData` interface for the raw API response. Keep `GoModel` as the canonical enriched type consumed by components. The `inferModel()` function maps modelgrep data → GoModel fields.

**PricingSource** updated to: `'modelgrep' | 'fallback-map' | 'unknown'`

## Data Flow

1. `fetchGoModels()` → gets Go model IDs from OpenCode API (unchanged)
2. `fetchModelgrepData()` → batch-fetches all maker queries, indexes results by modelgrep ID
3. For each Go model:
   - Look up by GO_TO_MODELGREP map → get modelgrep model
   - `inferPricing()`: try Go pricing map first, fall back to modelgrep pricing
   - Extract AA coding/intelligence/agentic indices directly (no ranking percentile)
   - Extract speed data directly (always available)
   - `computeScenarioScores()` uses AA indices instead of rank→percentile
4. Cache enriched GoModel[] (same stale-while-revalidate pattern)

## Scoring Changes (`src/lib/server/scoring.ts`)

**Before:** `findRankPct()` → fuzzy match ranking → compute percentile → blend with benchmark scores

**After:**

- `scoreQualityCoding()` = normalized AA coding index (0-100 scale, no ranking needed)
- `scoreQualityReasoning()` = normalized AA intelligence index
- `scoreQualityCompetitive()` = normalized SWE-bench / Code Arena scores
- `scoreFitAgentic()` = blend of context window + throughput + tools capability
- All scoring uses direct values from modelgrep, no rank→percentile conversion

## Beneficiary Changes

### Removed

- `src/lib/server/llm-stats.ts` — full removal
- `src/lib/server/benchmarks.ts` — full removal (no Levenshtein, no convention maps)
- `src/lib/types/models.ts` — `LLMStatsModel`, `LLMStatsRanking`, `LLMStatsProvider`, `LLMStatsInference` types removed

### Simplified

- `src/lib/server/inference.ts` — no more `llmStatsModelUrl`, no rankings arrays passed around; modelgrep data is self-contained
- `src/lib/server/pricing.ts` — fallback chain loses steps 2 & 3 (provider data + ranking min_input_price), replaced by single modelgrep lookup
- `src/lib/server/scoring.ts` — AA indices instead of TrueSkill rank→percentile
- `src/lib/server/tags.ts` — removes `LLMStatsRanking` dependency
- `src/lib/remote/models.remote.ts` — replaces LLM Stats fetches with modelgrep fetches

### Updated (UI)

- `src/lib/components/About/Schematic.svelte` — "modelgrep.com API" instead of "LLM Stats API"
- `src/lib/components/About/SourceTable.svelte` — update data sources
- `src/lib/components/FallbackBadge.svelte` — `'modelgrep'` pricing source support
- `src/lib/components/ModelDrawer.svelte` — update LLM Stats link to modelgrep link
- `src/lib/components/Site/SiteFooter.svelte` — update footer link
- `src/routes/about/+page.svelte` — update about page copy
- `.env.example` — remove LLM Stats API key
- `README.md` — update description

## No API Key Required

modelgrep requires no authentication. The `.env` file can lose `API_KEY`. The `headers()` and `env.API_KEY` check in the current `llm-stats.ts` disappears entirely.

## Risks & Mitigations

| Risk                                 | Mitigation                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| modelgrep goes down                  | Keep stale cache; site shows cached data until modelgrep recovers                   |
| modelgrep data stale                 | Refreshes hourly (site caches 6h with SWR)                                          |
| New Go model without modelgrep entry | Fallback to Go pricing map + generic display (same as current "new model" handling) |
| modelgrep API changes                | README is a scriptable, thin wrapper — easy to adapt                                |

## Out of Scope

- Changing the `GoModel` type consumed by UI components (stays the same)
- Changing the OpenCode Go API client (`opencode-go.ts`) — only its helper functions may simplify
- Adding new features or pages
- Changing caching strategy
