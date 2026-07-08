# Calculation Overhaul & Debug Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all calculation bugs in the inference engine (TrueSkill scale, null pricing, cached quota, matching collisions, tag thresholds, burn granularity, scenario scoring) and build a `/debug` page to visualize every input, intermediate, and output.

**Architecture:** Split monolithic `inference.ts` into 6 focused math modules (`pricing.ts`, `quota.ts`, `burn.ts`, `benchmarks.ts`, `scoring.ts`, `tags.ts`), all orchestrated by a thin `inference.ts`. New types for null-safe pricing and burn details. Debug page at `/debug` with 9 data sections plus interactive token/burn-slider knobs.

**Tech Stack:** Svelte 5 (Runes), SvelteKit remote functions, Tailwind CSS v4, shadcn-svelte, `@lucide/svelte`, TypeScript, Bun.

## Global Constraints

- Svelte 5 Runes only: `$state`, `$props`, `$derived`, `$effect`. Never `export let` or `$:`.
- Icons from `@lucide/svelte` only; never `lucide-svelte`.
- Tailwind v4 semantic tokens preferred; use `violet-600` for accent.
- Null pricing must degrade gracefully (no fake numbers, no crashes).
- Every edited file must pass `bun check` and `bunx prettier --write <path>`.
- Model matching: convention map first, Levenshtein ≥ 0.85 fallback, no `includes()` substring match.
- Burn bands: Excellent (≥80), Good (≥60), Moderate (≥40), High (≥20), Extreme (<20).
- TrueSkill bar calibration: `max(60, maxTrueSkillInSet)`.
- All old `$1/$3` fallback removed from codebase.

---

### Task 1: Define new types and interfaces

**Files:**

- Modify: `src/lib/types/models.ts`
- Modify: `src/lib/burn.ts`

**Interfaces:**

- Produces: `PricingSource`, `BurnBand`, `BurnDetails`, `BenchmarkDisplay` types used by all subsequent tasks.

- [ ] **Step 1: Add new types to `src/lib/types/models.ts`**

Insert after the existing `BurnRate` export:

```typescript
/** Where model pricing data came from */
export type PricingSource = 'llm-stats' | 'fallback-map' | 'unknown';

/** Named burn efficiency band */
export type BurnBand = 'excellent' | 'good' | 'moderate' | 'high' | 'extreme';

/** Detailed burn efficiency */
export interface BurnDetails {
	score: number; // 0-100 continuous
	requestsPer12: number | null; // requests per $12 window
	band: BurnBand | null; // null when pricing is unknown
}

/** TrueSkill-aware benchmark display info */
export interface BenchmarkDisplay {
	rawValue: number | null; // μ−3σ
	percentile: number | null; // within Go model set
	barWidth: number; // 0-100 for UI rendering
	barMax: number; // calibration max
}
```

Also update `ModelPricing` to replace the old inline type:

```typescript
export interface ModelPricing {
	inputPricePerM: number | null;
	outputPricePerM: number | null;
	cachedReadPerM: number | null;
	source: PricingSource;
}
```

Update `GoModel.pricing` to use the shared `ModelPricing` type (import it). Add a `burnDetails: BurnDetails` field to `GoModel`.

- [ ] **Step 2: Update `src/lib/burn.ts` to add burn band helpers**

Add after the existing functions:

```typescript
import type { BurnBand } from '$lib/types/models';

export function burnBandFromScore(score: number): BurnBand {
	if (score >= 80) return 'excellent';
	if (score >= 60) return 'good';
	if (score >= 40) return 'moderate';
	if (score >= 20) return 'high';
	return 'extreme';
}

export function burnBandLabel(band: BurnBand): string {
	switch (band) {
		case 'excellent': return 'Excellent';
		case 'good': return 'Good';
		case 'moderate': return 'Moderate';
		case 'high': return 'High';
		case 'extreme': return 'Extreme';
	}
}

export function burnBandColor(band: BurnBand): string {
	switch (band) {
		case 'excellent': return 'text-cyan-500';
		case 'good': return 'text-emerald-500';
		case 'moderate': return 'text-amber-500';
		case 'high': return 'text-orange-500';
		case 'extreme': return 'text-red-500';
	}
}
```

- [ ] **Step 3: Run check**

```bash
bun check
```

Expected: type errors from using new types not yet consumed. That's fine — errors should be about missing imports, not syntax.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/models.ts src/lib/burn.ts
git commit -m "feat: add BurnDetails, PricingSource, BenchmarkDisplay types"
```

---

### Task 2: Create pricing module

**Files:**

- Create: `src/lib/server/pricing.ts`
- Modify: `src/lib/server/opencode-go.ts` (add fallback pricing map export)

**Interfaces:**

- Consumes: `ModelPricing`, `PricingSource`, `LLMStatsModel` from types
- Produces: `inferPricing(goId, llmStatsModel): ModelPricing`
- Exported function: `getFallbackPricingMap(): Record<string, ModelPricing>`

- [ ] **Step 1: Add export for pricing map in `opencode-go.ts`**

Add at the bottom of `src/lib/server/opencode-go.ts`:

```typescript
/** Known pricing from verified OpenCode docs (as of July 2026). */
import type { ModelPricing } from '$lib/types/models';

export function getFallbackPricingMap(): Record<string, ModelPricing> {
	return {
		'deepseek-v4-pro': { inputPricePerM: 1.74, outputPricePerM: 3.48, cachedReadPerM: 0.0145, source: 'fallback-map' },
		'deepseek-v4-flash': { inputPricePerM: 0.14, outputPricePerM: 0.28, cachedReadPerM: 0.0028, source: 'fallback-map' },
		'glm-5.2': { inputPricePerM: 1.4, outputPricePerM: 4.4, cachedReadPerM: 0.26, source: 'fallback-map' },
		'glm-5.1': { inputPricePerM: 1.4, outputPricePerM: 4.4, cachedReadPerM: 0.26, source: 'fallback-map' },
		'kimi-k2.7-code': { inputPricePerM: 0.95, outputPricePerM: 4.0, cachedReadPerM: 0.19, source: 'fallback-map' },
		'kimi-k2.6': { inputPricePerM: 0.95, outputPricePerM: 4.0, cachedReadPerM: 0.16, source: 'fallback-map' },
		'mimo-v2.5': { inputPricePerM: 0.14, outputPricePerM: 0.28, cachedReadPerM: 0.0028, source: 'fallback-map' },
		'mimo-v2.5-pro': { inputPricePerM: 1.74, outputPricePerM: 3.48, cachedReadPerM: 0.0145, source: 'fallback-map' },
		'minimax-m3': { inputPricePerM: 0.3, outputPricePerM: 1.2, cachedReadPerM: 0.06, source: 'fallback-map' },
		'minimax-m2.7': { inputPricePerM: 0.3, outputPricePerM: 1.2, cachedReadPerM: 0.06, source: 'fallback-map' },
		'qwen3.7-max': { inputPricePerM: 2.5, outputPricePerM: 7.5, cachedReadPerM: 0.5, source: 'fallback-map' },
		'qwen3.7-plus': { inputPricePerM: 0.4, outputPricePerM: 1.6, cachedReadPerM: 0.04, source: 'fallback-map' },
		'qwen3.6-plus': { inputPricePerM: 0.5, outputPricePerM: 3.0, cachedReadPerM: 0.05, source: 'fallback-map' }
	};
}
```

- [ ] **Step 2: Create `src/lib/server/pricing.ts`**

```typescript
import type { LLMStatsModel, ModelPricing } from '$lib/types/models';
import { getFallbackPricingMap, goIdToName } from './opencode-go';

export function inferPricing(goId: string, model: LLMStatsModel | null): ModelPricing {
	// 1. Try LLM Stats provider data first
	if (model?.providers?.length) {
		const bestProvider = model.providers.find(
			(p) => p.available && p.input_price_per_m != null
		);
		if (bestProvider) {
			return {
				inputPricePerM: bestProvider.input_price_per_m!,
				outputPricePerM:
					bestProvider.output_price_per_m ?? bestProvider.input_price_per_m! * 3,
				cachedReadPerM: null, // LLM Stats API doesn't expose cached pricing
				source: 'llm-stats'
			};
		}
	}

	// 2. Fallback to known pricing from OpenCode docs
	const map = getFallbackPricingMap();
	const known = map[goId];
	if (known) {
		return { ...known };
	}

	// 3. No pricing available — return nulls
	return {
		inputPricePerM: null,
		outputPricePerM: null,
		cachedReadPerM: null,
		source: 'unknown'
	};
}
```

- [ ] **Step 3: Run check**

```bash
bun check
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/pricing.ts src/lib/server/opencode-go.ts
git commit -m "feat: add pricing module with source tracking, remove $1/$3 fallback"
```

---

### Task 3: Create quota module

**Files:**

- Create: `src/lib/server/quota.ts`

**Interfaces:**

- Consumes: `ModelPricing` from types
- Produces: `estimateQuota(pricing, inputTokens, outputTokens, cachedInputTokens): QuotaResult | null`
- `QuotaResult = { costPerRequest: number; requestsPer5h: number; requestsPerWeek: number; requestsPerMonth: number }`
- Default inputs exported as `DEFAULT_QUOTA_INPUTS = { inputTokens: 1000, outputTokens: 500, cachedInputTokens: 500 }`

- [ ] **Step 1: Create `src/lib/server/quota.ts`**

```typescript
import type { ModelPricing } from '$lib/types/models';

export interface QuotaResult {
	costPerRequest: number;
	requestsPer5h: number;
	requestsPerWeek: number;
	requestsPerMonth: number;
}

export const DEFAULT_QUOTA_INPUTS = {
	inputTokens: 1000,
	outputTokens: 500,
	cachedInputTokens: 500
} as const;

/**
 * Estimate quota usage for a model given token assumptions.
 * Returns null if pricing data is incomplete.
 */
export function estimateQuota(
	pricing: ModelPricing,
	inputTokens: number,
	outputTokens: number,
	cachedInputTokens: number
): QuotaResult | null {
	if (pricing.inputPricePerM == null || pricing.outputPricePerM == null) {
		return null;
	}

	const uncachedInputTokens = Math.max(0, inputTokens - cachedInputTokens);
	const cachedRate = pricing.cachedReadPerM ?? pricing.inputPricePerM;

	const costPerRequest =
		(uncachedInputTokens * pricing.inputPricePerM +
			cachedInputTokens * cachedRate +
			outputTokens * pricing.outputPricePerM) /
		1_000_000;

	if (costPerRequest <= 0) {
		return {
			costPerRequest: 0,
			requestsPer5h: 0,
			requestsPerWeek: 0,
			requestsPerMonth: 0
		};
	}

	return {
		costPerRequest,
		requestsPer5h: Math.round(12 / costPerRequest),
		requestsPerWeek: Math.round(30 / costPerRequest),
		requestsPerMonth: Math.round(60 / costPerRequest)
	};
}
```

- [ ] **Step 2: Run check**

```bash
bun check
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/quota.ts
git commit -m "feat: add quota module with cached-read discount and shared defaults"
```

---

### Task 4: Create burn module

**Files:**

- Create: `src/lib/server/burn.ts`
- Note: This is a new file separate from `src/lib/burn.ts` (client utils). Server-side burn math lives here.

**Interfaces:**

- Consumes: `ModelPricing`, `BurnDetails`, `BurnBand` from types; `estimateQuota` from quota module
- Produces: `inferBurnDetails(pricing): BurnDetails`
- Exported helper: `computeBurnScore(requestsPer12: number): number`

- [ ] **Step 1: Create `src/lib/server/burn.ts`**

```typescript
import type { BurnBand, BurnDetails, ModelPricing } from '$lib/types/models';
import { estimateQuota, DEFAULT_QUOTA_INPUTS } from './quota';

const BURN_SCORE_MAX = 30_000;

/** Compute continuous burn score (0-100) from requests per $12 window. */
export function computeBurnScore(requestsPer12: number): number {
	if (requestsPer12 <= 0) return 0;
	const raw = (requestsPer12 / BURN_SCORE_MAX) * 100;
	return Math.min(100, Math.max(0, Math.round(raw)));
}

/** Map a burn score to a named band. */
export function scoreToBand(score: number): BurnBand {
	if (score >= 80) return 'excellent';
	if (score >= 60) return 'good';
	if (score >= 40) return 'moderate';
	if (score >= 20) return 'high';
	return 'extreme';
}

/** Infer burn details from pricing using default token assumptions. */
export function inferBurnDetails(pricing: ModelPricing): BurnDetails {
	const quota = estimateQuota(
		pricing,
		DEFAULT_QUOTA_INPUTS.inputTokens,
		DEFAULT_QUOTA_INPUTS.outputTokens,
		DEFAULT_QUOTA_INPUTS.cachedInputTokens
	);

	if (!quota) {
		return { score: 0, requestsPer12: null, band: null };
	}

	const score = computeBurnScore(quota.requestsPer5h);
	return {
		score,
		requestsPer12: quota.requestsPer5h,
		band: scoreToBand(score)
	};
}
```

- [ ] **Step 2: Run check**

```bash
bun check
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/burn.ts
git commit -m "feat: add burn module with continuous score and named bands"
```

---

### Task 5: Create benchmarks module (matching + TrueSkill display)

**Files:**

- Create: `src/lib/server/benchmarks.ts`

**Interfaces:**

- Consumes: `LLMStatsModel`, `LLMStatsRanking`, `ModelBenchmarks`, `BenchmarkDisplay`, `GoModel` from types
- Produces:
  - `matchModel(goId, llmModels): LLMStatsModel | null` — convention map + Levenshtein
  - `matchRanking(goId, rankings): LLMStatsRanking | null` — same logic
  - `computeBenchmarks(model, codingRank, reasoningRank, mathRank): ModelBenchmarks`
  - `computeBenchmarkDisplay(rawValue, allValues): BenchmarkDisplay`
  - `extractAllScores(model): Record<string, number>`
  - `findScoreKey(scores, ...needles): string | undefined`

- [ ] **Step 1: Create `src/lib/server/benchmarks.ts`**

```typescript
import type {
	LLMStatsModel,
	LLMStatsRanking,
	ModelBenchmarks,
	BenchmarkDisplay
} from '$lib/types/models';
import { goIdToName } from './opencode-go';

// ─── Convention-based ID mapping ───────────────────────────────────────

/** Map Go model IDs to LLM Stats model IDs where naming conventions align. */
const CONVENTION_MAP: Record<string, string> = {
	'deepseek-v4-pro': 'deepseek-v4-pro',
	'deepseek-v4-flash': 'deepseek-v4-flash',
	'glm-5.2': 'glm-5.2',
	'glm-5.1': 'glm-5.1',
	'kimi-k2.7-code': 'kimi-k2.7-code',
	'kimi-k2.6': 'kimi-k2.6',
	'mimo-v2.5': 'mimo-v2.5',
	'mimo-v2.5-pro': 'mimo-v2.5-pro',
	'minimax-m3': 'minimax-m3',
	'minimax-m2.7': 'minimax-m2.7',
	'qwen3.7-max': 'qwen3.7-max',
	'qwen3.7-plus': 'qwen3.7-plus',
	'qwen3.6-plus': 'qwen3.6-plus'
};

function goIdToLlmStatsId(goId: string): string | undefined {
	return CONVENTION_MAP[goId];
}

// ─── Levenshtein distance ─────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			dp[i][j] =
				a[i - 1] === b[j - 1]
					? dp[i - 1][j - 1]
					: 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
		}
	}
	return dp[m][n];
}

function similarity(a: string, b: string): number {
	if (a.length === 0 && b.length === 0) return 1;
	const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
	const maxLen = Math.max(a.length, b.length);
	return 1 - dist / maxLen;
}

const SIMILARITY_THRESHOLD = 0.85;

// ─── Model matching ───────────────────────────────────────────────────

/** Try to match a Go model ID to an LLM Stats model entry. */
export function matchModel(
	goId: string,
	llmModels: LLMStatsModel[]
): { model: LLMStatsModel; confidence: number } | null {
	// 1. Convention map
	const llmId = goIdToLlmStatsId(goId);
	if (llmId) {
		const exact = llmModels.find((m) => m.id === llmId);
		if (exact) return { model: exact, confidence: 1.0 };
	}

	// 2. Levenshtein on display names
	const goName = goIdToName(goId).toLowerCase();
	let best: { model: LLMStatsModel; confidence: number } | null = null;
	for (const m of llmModels) {
		const sim = similarity(goName, m.name);
		if (sim >= SIMILARITY_THRESHOLD && (!best || sim > best.confidence)) {
			best = { model: m, confidence: sim };
		}
	}

	return best;
}

// ─── Ranking matching ─────────────────────────────────────────────────

/** Match a Go model ID to a ranking entry. */
export function matchRanking(
	goId: string,
	rankings: LLMStatsRanking[]
): { ranking: LLMStatsRanking; confidence: number } | null {
	const llmId = goIdToLlmStatsId(goId);
	if (llmId) {
		const exact = rankings.find((r) => r.model_name.toLowerCase().includes(llmId.toLowerCase()));
		if (exact) return { ranking: exact, confidence: 1.0 };
	}

	const goName = goIdToName(goId).toLowerCase();
	let best: { ranking: LLMStatsRanking; confidence: number } | null = null;
	for (const r of rankings) {
		const sim = similarity(goName, r.model_name);
		if (sim >= SIMILARITY_THRESHOLD && (!best || sim > best.confidence)) {
			best = { ranking: r, confidence: sim };
		}
	}

	return best;
}

// ─── Benchmark extraction ─────────────────────────────────────────────

export function extractAllScores(model: LLMStatsModel | null): Record<string, number> {
	if (!model?.top_scores) return {};
	return { ...model.top_scores };
}

/**
 * Find a key in scores object matching ALL specified substrings.
 * Uses exact word-boundary matching when possible.
 */
export function findScoreKey(
	scores: Record<string, number>,
	...needles: string[]
): string | undefined {
	return Object.keys(scores).find((k) => {
		const lower = k.toLowerCase();
		return needles.every((n) => {
			const nLower = n.toLowerCase();
			// Match whole word or hyphenated segment
			return lower === nLower || lower.includes(`-${nLower}`) || lower.includes(`${nLower}-`);
		});
	});
}

// ─── Benchmark assemble ───────────────────────────────────────────────

export function computeBenchmarks(
	model: LLMStatsModel | null,
	codingRank: LLMStatsRanking | null,
	reasoningRank: LLMStatsRanking | null,
	mathRank: LLMStatsRanking | null
): ModelBenchmarks {
	const allScores = extractAllScores(model);
	const sweBenchKey = findScoreKey(allScores, 'swe-bench');
	const arenaKey = findScoreKey(allScores, 'code-arena');

	return {
		coding: codingRank?.score ?? null,
		reasoning: reasoningRank?.score ?? null,
		math: mathRank?.score ?? null,
		sweBenchVerified: sweBenchKey ? allScores[sweBenchKey] : null,
		codeArena: arenaKey ? allScores[arenaKey] : null,
		allScores
	};
}

// ─── TrueSkill display calibration ────────────────────────────────────

const DEFAULT_BAR_MAX = 60;

/** Compute a calibrated display for a TrueSkill benchmark value. */
export function computeBenchmarkDisplay(
	rawValue: number | null,
	allValues: number[]
): BenchmarkDisplay {
	if (rawValue == null || rawValue < 1) {
		return { rawValue: null, percentile: null, barWidth: 0, barMax: DEFAULT_BAR_MAX };
	}

	// Calibrate bar max to the better of DEFAULT_BAR_MAX or max in set
	const maxInSet = allValues.length > 0 ? Math.max(...allValues) : DEFAULT_BAR_MAX;
	const barMax = Math.max(DEFAULT_BAR_MAX, maxInSet);

	// Percentile: percentage of models this model beats
	const worse = allValues.filter((v) => v < rawValue).length;
	const percentile = allValues.length > 0 ? Math.round((worse / allValues.length) * 100) : null;

	return {
		rawValue,
		percentile,
		barWidth: Math.min(100, Math.round((rawValue / barMax) * 100)),
		barMax
	};
}
```

- [ ] **Step 2: Run check**

```bash
bun check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/benchmarks.ts
git commit -m "feat: add benchmarks module with convention map + Levenshtein matching and TrueSkill display calibration"
```

---

### Task 6: Create scenario scoring module (two-axis)

**Files:**

- Create: `src/lib/server/scoring.ts`

**Interfaces:**

- Consumes: all type interfaces, `computeBurnDetails` from burn module, `ModelPricing`
- Produces: `computeScenarioScores(inputs): ScenarioScores`
- `ScenarioScoreInputs = { goId, pricing, benchmarks, burnDetails, speed, model, codingRankings, reasoningRankings, mathRankings }`

- [ ] **Step 1: Create `src/lib/server/scoring.ts`**

```typescript
import type {
	GoModel,
	LLMStatsModel,
	LLMStatsRanking,
	ModelBenchmarks,
	ModelSpeed,
	ScenarioScores,
	BurnDetails
} from '$lib/types/models';
import { estimateQuota, DEFAULT_QUOTA_INPUTS } from './quota';
import { matchRanking } from './benchmarks';

interface ScenarioInputs {
	goId: string;
	pricing: GoModel['pricing'];
	benchmarks: ModelBenchmarks;
	burnDetails: BurnDetails;
	speed: ModelSpeed | null;
	model: LLMStatsModel | null;
	codingRankings: LLMStatsRanking[];
	reasoningRankings: LLMStatsRanking[];
	mathRankings: LLMStatsRanking[];
}

// ─── Helpers ──────────────────────────────────────────────────────────

function normalize(value: number, max: number): number {
	if (max <= 0) return 0;
	return Math.min(1, Math.max(0, value / max));
}

function findRankIndex(goId: string, rankings: LLMStatsRanking[]): number {
	return rankings.findIndex((r) => r.model_name.toLowerCase().includes(goId.toLowerCase()));
}

function rankPercentile(rank: number, total: number): number {
	if (rank < 0 || total <= 0) return 0;
	return Math.max(0, 1 - rank / total);
}

// ─── Two-axis scoring ─────────────────────────────────────────────────

function scoreQualityCoding(benchmarks: ModelBenchmarks): number {
	// Weighted blend of available coding benchmarks
	let score = 0;
	let weight = 0;
	if (benchmarks.coding != null) {
		score += normalize(benchmarks.coding, 60) * 0.5;
		weight += 0.5;
	}
	if (benchmarks.sweBenchVerified != null) {
		score += normalize(benchmarks.sweBenchVerified, 60) * 0.3;
		weight += 0.3;
	}
	if (benchmarks.codeArena != null) {
		score += normalize(benchmarks.codeArena, 80) * 0.2;
		weight += 0.2;
	}
	return weight > 0 ? score / weight : 0;
}

function scoreFitCoding(speed: ModelSpeed | null, burnDetails: BurnDetails): number {
	let score = 0;
	let weight = 0;
	if (speed?.tokensPerSecond) {
		score += normalize(speed.tokensPerSecond, 200) * 0.5;
		weight += 0.5;
	}
	if (burnDetails.band != null) {
		// better burn = better fit for coding (more iterations)
		score += normalize(burnDetails.score, 100) * 0.5;
		weight += 0.5;
	}
	return weight > 0 ? score / weight : 0.5;
}

function scoreQualityReasoning(benchmarks: ModelBenchmarks): number {
	if (benchmarks.reasoning != null) {
		return normalize(benchmarks.reasoning, 60);
	}
	return 0;
}

function scoreFitBrainstorming(ctx: number, burnDetails: BurnDetails): number {
	let score = 0;
	let weight = 0;
	// Larger context = better for brainstorming
	score += normalize(ctx, 1_000_000) * 0.6;
	weight += 0.6;
	// Moderate burn = good for iteration
	if (burnDetails.band != null) {
		const burnFit = burnDetails.score >= 40 && burnDetails.score < 80 ? 1 : 0.5;
		score += burnFit * 0.4;
		weight += 0.4;
	}
	return weight > 0 ? score / weight : 0.5;
}

function scoreQualityCompetitive(benchmarks: ModelBenchmarks): number {
	let score = 0;
	let weight = 0;
	if (benchmarks.sweBenchVerified != null) {
		score += normalize(benchmarks.sweBenchVerified, 60) * 0.6;
		weight += 0.6;
	}
	if (benchmarks.codeArena != null) {
		score += normalize(benchmarks.codeArena, 80) * 0.4;
		weight += 0.4;
	}
	return weight > 0 ? score / weight : 0;
}

function scoreFitCompetitive(rankPercentile: number): number {
	// Competitive is all about quality; fit is minor (rank stability)
	return 0.5 + rankPercentile * 0.5;
}

function scoreQualityAgentic(benchmarks: ModelBenchmarks): number {
	// Agentic capability ≈ coding quality
	return scoreQualityCoding(benchmarks);
}

function scoreFitAgentic(ctx: number, speed: ModelSpeed | null, model: LLMStatsModel | null): number {
	let score = 0;
	let weight = 0;
	// Context: 1M = perfect, 256K = decent, <128K = poor
	score += normalize(Math.min(ctx, 1_000_000), 1_000_000) * 0.5;
	weight += 0.5;
	// Speed: faster = better for agentic loops
	if (speed?.tokensPerSecond) {
		score += normalize(speed.tokensPerSecond, 200) * 0.3;
		weight += 0.3;
	}
	// Tool support
	if (model?.inference?.supports_tools != null) {
		score += (model.inference.supports_tools ? 1 : 0.3) * 0.2;
		weight += 0.2;
	}
	return weight > 0 ? score / weight : 0.3;
}

function scoreQualityBudget(
	pricing: GoModel['pricing'],
	burnDetails: BurnDetails
): number {
	let score = 0;
	let weight = 0;
	// Low total price = good for budget
	if (pricing.inputPricePerM != null && pricing.outputPricePerM != null) {
		const totalPrice = pricing.inputPricePerM + pricing.outputPricePerM;
		// Inverse: $0 = 1.0, $10 = 0, $20+ = 0
		score += Math.max(0, 1 - totalPrice / 10) * 0.5;
		weight += 0.5;
	}
	// High burn score = good for budget
	if (burnDetails.band != null) {
		score += normalize(burnDetails.score, 100) * 0.5;
		weight += 0.5;
	}
	return weight > 0 ? score / weight : 0;
}

function scoreFitBudget(): number {
	// Budget scenario: always relevant
	return 1.0;
}

// ─── Public API ───────────────────────────────────────────────────────

export function computeScenarioScores(inputs: ScenarioInputs): ScenarioScores {
	const codingRankIdx = findRankIndex(inputs.goId, inputs.codingRankings);
	const reasoningRankIdx = findRankIndex(inputs.goId, inputs.reasoningRankings);
	const totalCoding = inputs.codingRankings.length || 13;

	const codingRankPct = rankPercentile(codingRankIdx, totalCoding);
	const reasoningRankPct = rankPercentile(reasoningRankIdx, inputs.reasoningRankings.length || 13);

	return {
		coding: computeScore(scoreQualityCoding(inputs.benchmarks), scoreFitCoding(inputs.speed, inputs.burnDetails)),
		brainstorming: computeScore(scoreQualityReasoning(inputs.benchmarks), scoreFitBrainstorming(inputs.model?.context_window ?? 128_000, inputs.burnDetails)),
		competitive: computeScore(scoreQualityCompetitive(inputs.benchmarks), scoreFitCompetitive(codingRankPct)),
		agentic: computeScore(scoreQualityAgentic(inputs.benchmarks), scoreFitAgentic(inputs.model?.context_window ?? 128_000, inputs.speed, inputs.model)),
		budget: computeScore(scoreQualityBudget(inputs.pricing, inputs.burnDetails), scoreFitBudget())
	};
}

function computeScore(quality: number, fit: number): number {
	return Math.round(quality * fit * 100);
}
```

- [ ] **Step 2: Run check**

```bash
bun check
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/scoring.ts
git commit -m "feat: add two-axis scenario scoring module (quality × fit)"
```

---

### Task 7: Create tags module

**Files:**

- Create: `src/lib/server/tags.ts`

**Interfaces:**

- Consumes: `ModelBenchmarks`, `BurnDetails`, `ModelSpeed`, `LLMStatsModel`, `ModelTag`, `BurnBand` from types
- Produces: `computeTags(goId, benchmarks, burnDetails, speed, model, codingRankings): ModelTag[]`

- [ ] **Step 1: Create `src/lib/server/tags.ts`**

```typescript
import type {
	LLMStatsModel,
	LLMStatsRanking,
	ModelBenchmarks,
	ModelSpeed,
	ModelTag,
	BurnDetails
} from '$lib/types/models';
import { matchRanking } from './benchmarks';

export function computeTags(
	goId: string,
	benchmarks: ModelBenchmarks,
	burnDetails: BurnDetails,
	speed: ModelSpeed | null,
	model: LLMStatsModel | null,
	codingRankings: LLMStatsRanking[]
): ModelTag[] {
	const ctx = model?.context_window ?? 0;
	const builders = [
		() => codingTags(goId, benchmarks, codingRankings),
		() => competitiveTags(benchmarks),
		() => reasoningTags(benchmarks),
		() => mathTags(benchmarks),
		() => agenticTags(benchmarks, ctx),
		() => contextTags(ctx),
		() => budgetTags(burnDetails),
		() => speedTags(speed),
		() => newModelTag(model)
	];

	const tags = builders.flatMap((b) => b());
	return dedupe(tags);
}

function percentileThreshold(
	score: number | null,
	rankings: LLMStatsRanking[],
	pct: number
): boolean {
	if (score == null) return false;
	if (rankings.length === 0) return false;
	const sorted = [...rankings].sort((a, b) => b.score - a.score);
	const threshold = sorted[Math.floor(sorted.length * pct)]?.score ?? 0;
	return score >= threshold;
}

function codingTags(
	goId: string,
	benchmarks: ModelBenchmarks,
	rankings: LLMStatsRanking[]
): ModelTag[] {
	if (benchmarks.coding == null) return [];
	const matched = matchRanking(goId, rankings);
	if (!matched) return [];
	const total = rankings.length || 13;
	const idx = rankings.findIndex((r) => r.model_name === matched.ranking.model_name);
	if (idx < 0) return [];
	if (idx < Math.ceil(total * 0.25)) {
		return [{ label: 'Top-tier coding', emoji: '💻', source: 'ranking' }];
	}
	if (idx < Math.ceil(total * 0.5)) {
		return [{ label: 'Solid coding', emoji: '🔧', source: 'ranking' }];
	}
	return [];
}

function competitiveTags(benchmarks: ModelBenchmarks): ModelTag[] {
	if (benchmarks.sweBenchVerified != null && benchmarks.sweBenchVerified > 50) {
		return [{ label: 'Competitive programming', emoji: '⚔️', source: 'computed' }];
	}
	if (benchmarks.codeArena != null && benchmarks.codeArena > 70) {
		return [{ label: 'Code Arena strong', emoji: '🏟️', source: 'computed' }];
	}
	return [];
}

function reasoningTags(benchmarks: ModelBenchmarks): ModelTag[] {
	if (benchmarks.reasoning != null && benchmarks.reasoning > 30) {
		return [{ label: 'Strong reasoning', emoji: '🧠', source: 'ranking' }];
	}
	return [];
}

function mathTags(benchmarks: ModelBenchmarks): ModelTag[] {
	if (benchmarks.math != null && benchmarks.math > 30) {
		return [{ label: 'Math & research', emoji: '📐', source: 'ranking' }];
	}
	return [];
}

function agenticTags(benchmarks: ModelBenchmarks, ctx: number): ModelTag[] {
	if (benchmarks.coding != null && benchmarks.coding > 0 && ctx >= 256_000) {
		return [{ label: 'Agentic / autonomous', emoji: '🤖', source: 'computed' }];
	}
	return [];
}

function contextTags(ctx: number): ModelTag[] {
	if (ctx >= 500_000) {
		const label = ctx >= 1_000_000 ? '1M context' : `${Math.round(ctx / 1_000)}K context`;
		return [{ label, emoji: '📚', source: 'context' }];
	}
	return [];
}

function budgetTags(burnDetails: BurnDetails): ModelTag[] {
	if (burnDetails.band === 'excellent' || burnDetails.band === 'good') {
		return [
			{ label: 'Quota-friendly', emoji: '❄️', source: 'pricing' },
			{ label: 'High-volume budget', emoji: '⚡', source: 'pricing' }
		];
	}
	if (burnDetails.band === 'extreme') {
		return [{ label: 'Burns quota fast', emoji: '🔥', source: 'pricing' }];
	}
	return [];
}

function speedTags(speed: ModelSpeed | null): ModelTag[] {
	if (speed && speed.tokensPerSecond > 100) {
		return [{ label: 'Fast inference', emoji: '🚀', source: 'computed' }];
	}
	return [];
}

function newModelTag(model: LLMStatsModel | null): ModelTag[] {
	if (!model) {
		return [{ label: 'New — benchmarking', emoji: '🆕', source: 'computed' }];
	}
	return [];
}

function dedupe(tags: ModelTag[]): ModelTag[] {
	const seen = new Set<string>();
	return tags.filter((t) => {
		if (seen.has(t.label)) return false;
		seen.add(t.label);
		return true;
	});
}
```

- [ ] **Step 2: Run check**

```bash
bun check
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/tags.ts
git commit -m "feat: add tags module with meaningful thresholds"
```

---

### Task 8: Update inference.ts orchestrator

**Files:**

- Modify: `src/lib/server/inference.ts`

**Interfaces:**

- Consumes: all new modules
- Produces: updated `inferModel(goId, llmStatsModel, codingRankings, reasoningRankings, mathRankings): GoModel`

- [ ] **Step 1: Rewrite `src/lib/server/inference.ts`**

Replace the entire file content with a thin orchestrator:

```typescript
import { burnRateFromPrice, type BurnRate } from '$lib/burn';
import type {
	GoModel,
	LLMStatsModel,
	LLMStatsRanking,
	MigrationHint,
	ModelSpeed
} from '$lib/types/models';
import { goEndpointType, goEndpointUrl, goIdToName, getFallbackPricingMap } from './opencode-go';
import { llmStatsModelUrl } from './llm-stats';
import { inferPricing } from './pricing';
import { estimateQuota, DEFAULT_QUOTA_INPUTS } from './quota';
import { inferBurnDetails } from './burn';
import { matchModel, matchRanking, computeBenchmarks } from './benchmarks';
import { computeScenarioScores } from './scoring';
import { computeTags } from './tags';

export function inferModel(
	goId: string,
	llmStatsModel: LLMStatsModel | null,
	codingRankings: LLMStatsRanking[],
	reasoningRankings: LLMStatsRanking[],
	mathRankings: LLMStatsRanking[]
): GoModel {
	const name = goIdToName(goId);
	const pricing = inferPricing(goId, llmStatsModel);
	const burnDetails = inferBurnDetails(pricing);

	// Quota: use default token assumptions for the table
	const quota = estimateQuota(
		pricing,
		DEFAULT_QUOTA_INPUTS.inputTokens,
		DEFAULT_QUOTA_INPUTS.outputTokens,
		DEFAULT_QUOTA_INPUTS.cachedInputTokens
	);

	const burnRate = burnRateFromPrice(
		(pricing.inputPricePerM ?? 0) + (pricing.outputPricePerM ?? 0)
	) as BurnRate;

	const codingRank = matchRanking(goId, codingRankings);
	const reasoningRank = matchRanking(goId, reasoningRankings);
	const mathRank = matchRanking(goId, mathRankings);

	const benchmarks = computeBenchmarks(
		llmStatsModel,
		codingRank?.ranking ?? null,
		reasoningRank?.ranking ?? null,
		mathRank?.ranking ?? null
	);

	const speed = inferSpeed(llmStatsModel);
	const tags = computeTags(goId, benchmarks, burnDetails, speed, llmStatsModel, codingRankings);
	const migrationHints = inferMigrationHints(goId, pricing, benchmarks);
	const scenarioScores = computeScenarioScores({
		goId,
		pricing,
		benchmarks,
		burnDetails,
		speed,
		model: llmStatsModel,
		codingRankings,
		reasoningRankings,
		mathRankings
	});

	return {
		id: goId,
		name,
		provider: llmStatsModel?.organization?.name ?? inferProvider(goId),
		description: llmStatsModel?.description ?? '',
		openWeight: llmStatsModel?.open_weight ?? true,
		contextWindow: llmStatsModel?.context_window ?? inferContextWindow(goId),
		releaseDate: llmStatsModel?.release_date ?? null,
		pricing,
		quota: {
			requestsPer5h: quota?.requestsPer5h ?? 0,
			requestsPerWeek: quota?.requestsPerWeek ?? 0,
			requestsPerMonth: quota?.requestsPerMonth ?? 0
		},
		burnRate,
		burnDetails,
		tags,
		benchmarks,
		speed,
		migrationHints,
		scenarioScores,
		endpoint: goEndpointType(goId),
		endpointUrl: goEndpointUrl(goId),
		isNew: llmStatsModel === null,
		llmStatsUrl: llmStatsModel ? llmStatsModelUrl(llmStatsModel.id) : '',
		fetchedAt: Date.now()
	};
}

// ─── Speed ───────────────────────────────────────────────────────────

function inferSpeed(model: LLMStatsModel | null): ModelSpeed | null {
	if (!model?.inference?.available) return null;
	const inf = model.inference as unknown as Record<string, unknown>;
	return {
		tokensPerSecond: (inf.tokens_per_second as number) ?? 0,
		timeToFirstToken: (inf.time_to_first_token as number) ?? null
	};
}

// ─── Migration Hints ─────────────────────────────────────────────────

function inferMigrationHints(
	_goId: string,
	pricing: GoModel['pricing'],
	benchmarks: GoModel['benchmarks']
): MigrationHint[] {
	return [
		codingMigrationHint(benchmarks.coding, pricing.inputPricePerM),
		reasoningMigrationHint(benchmarks.reasoning),
		budgetMigrationHint(pricing.inputPricePerM)
	].filter((h): h is MigrationHint => h !== null);
}

function codingMigrationHint(score: number | null, inputPrice: number | null): MigrationHint | null {
	if (!score || score <= 50 || !inputPrice) return null;
	const multiplier = inputPrice < 1 ? '10x+' : '5x';
	return {
		model: 'Claude Sonnet 4.6 / Opus 4.8',
		reason: `Comparable coding quality at ~${multiplier} lower input cost`
	};
}

function reasoningMigrationHint(score: number | null): MigrationHint | null {
	if (!score || score <= 50) return null;
	return {
		model: 'GPT-5.4 / Claude Mythos',
		reason: 'Strong reasoning performance rivaling frontier closed-source models'
	};
}

function budgetMigrationHint(inputPrice: number | null): MigrationHint | null {
	if (!inputPrice || inputPrice >= 0.3) return null;
	return {
		model: 'Any API pay-per-token plan',
		reason: 'Included in $10/month Go subscription — no per-request billing'
	};
}

// ─── Helpers ─────────────────────────────────────────────────────────

const PROVIDER_BY_PREFIX: Record<string, string> = {
	deepseek: 'DeepSeek',
	qwen: 'Alibaba / Qwen Team',
	glm: 'Zhipu AI',
	kimi: 'Moonshot AI',
	minimax: 'MiniMax',
	mimo: 'Xiaomi',
	hy3: 'Unknown'
};

function inferProvider(goId: string): string {
	const prefix = Object.keys(PROVIDER_BY_PREFIX).find((p) => goId.startsWith(p));
	return prefix ? PROVIDER_BY_PREFIX[prefix] : 'Unknown';
}

function inferContextWindow(goId: string): number {
	if (goId.includes('glm-5') || goId.includes('qwen3.6') || goId.includes('deepseek-v4-pro')) {
		return 1_000_000;
	}
	if (goId.includes('kimi-k2') || goId.includes('qwen3.7')) {
		return 256_000;
	}
	return 128_000;
}
```

Also remove the old `buildGoModel`, `GoModelParts`, `ModelPricing` (the old interface), `inferPricing`, `inferQuota`, `inferBurnRate`, `findRanking`, `inferBenchmarksForModel`, `buildBenchmarks`, `extractAllScores`, `findScoreKey`, `inferTags`, all tag functions, `inferScenarioScores`, all score functions, `findRank`, `normalizeScore`, `formatContext`, and the big `known` pricing map.

- [ ] **Step 2: Run check**

```bash
bun check
```

Expected: 0 errors. Fix any missing imports.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/inference.ts
git commit -m "refactor: inference.ts now thin orchestrator over new math modules"
```

---

### Task 9: Create BurnBadge and FallbackBadge components

**Files:**

- Create: `src/lib/components/BurnBadge.svelte`
- Create: `src/lib/components/FallbackBadge.svelte`

- [ ] **Step 1: Create `BurnBadge.svelte`**

```svelte
<script lang="ts">
	import type { BurnDetails, BurnBand } from '$lib/types/models';
	import { Flame, Snowflake, Thermometer } from '@lucide/svelte';

	interface Props {
		burnDetails: BurnDetails | null;
		showScore?: boolean;
		showRaw?: boolean;
	}

	let { burnDetails, showScore = true, showRaw = false }: Props = $props();

	let bandLabel = $derived.by(() => {
		if (!burnDetails?.band) return 'Unknown';
		switch (burnDetails.band) {
			case 'excellent':
				return 'Excellent';
			case 'good':
				return 'Good';
			case 'moderate':
				return 'Moderate';
			case 'high':
				return 'High';
			case 'extreme':
				return 'Extreme';
		}
	});

	let bandColor = $derived.by(() => {
		if (!burnDetails?.band) return 'bg-muted text-muted-foreground border-border';
		switch (burnDetails.band) {
			case 'excellent':
				return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
			case 'good':
				return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
			case 'moderate':
				return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
			case 'high':
				return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
			case 'extreme':
				return 'bg-red-500/10 text-red-500 border-red-500/20';
		}
	});
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium {bandColor}"
	title={burnDetails?.requestsPer12 != null
		? `${burnDetails.requestsPer12.toLocaleString()} requests per $12 window`
		: 'Pricing data unavailable'}
>
	{#if burnDetails?.band === 'extreme'}
		<Flame class="size-3" />
	{:else if burnDetails?.band === 'excellent' || burnDetails?.band === 'good'}
		<Snowflake class="size-3" />
	{:else}
		<Thermometer class="size-3" />
	{/if}
	{bandLabel}
</span>
```

- [ ] **Step 2: Create `FallbackBadge.svelte`**

```svelte
<script lang="ts">
	import type { PricingSource } from '$lib/types/models';
	import { AlertTriangle, Database, HelpCircle } from '@lucide/svelte';

	interface Props {
		source: PricingSource;
	}

	let { source }: Props = $props();
</script>

{#if source !== 'llm-stats'}
	<span
		class="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium {source ===
		'fallback-map'
			? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
			: 'bg-red-500/10 text-red-500 border border-red-500/20'}"
		title={source === 'fallback-map'
			? 'Price from OpenCode docs fallback (may be outdated)'
			: 'No pricing data available — contact OpenCode for accurate pricing'}
	>
		{#if source === 'fallback-map'}
			<Database class="size-2.5" />
			Fallback
		{:else}
			<HelpCircle class="size-2.5" />
			Unknown
		{/if}
	</span>
{/if}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/BurnBadge.svelte src/lib/components/FallbackBadge.svelte
git commit -m "feat: add BurnBadge and FallbackBadge components"
```

---

### Task 10: Update ModelTable with new columns and TrueSkill display

**Files:**

- Modify: `src/lib/components/ModelTable.svelte`

- [ ] **Step 1: Rewrite the table cells for Burn and Coding columns**

Replace the Burn cell section (around `<Table.Cell>` for burn rate) to use `BurnBadge`:

```svelte
<Table.Cell>
	<BurnBadge burnDetails={model.burnDetails} />
</Table.Cell>
```

Replace the Coding cell to show TrueSkill-calibrated display:

```svelte
<Table.Cell class="text-sm tabular-nums">
	{#if model.benchmarks.coding}
		<span class="text-foreground/80">{model.benchmarks.coding.toFixed(1)}</span>
	{:else}
		<span class="text-muted-foreground/30">—</span>
	{/if}
</Table.Cell>
```

Add a new column header for "Burn Score" after "Burn":

```svelte
<Table.Head class="hidden whitespace-nowrap text-muted-foreground md:table-cell">
	<span class="inline-flex items-center gap-1"> Score </span>
</Table.Head>
```

And the corresponding cell:

```svelte
<Table.Cell class="hidden text-sm tabular-nums md:table-cell">
	{#if model.burnDetails?.band != null}
		<div class="flex items-center gap-1.5">
			<div class="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
				<div
					class="h-full rounded-full {model.burnDetails.score >= 60
						? 'bg-emerald-500'
						: model.burnDetails.score >= 40
							? 'bg-amber-500'
							: 'bg-red-500'}"
					style="width: {model.burnDetails.score}%"
				></div>
			</div>
			<span class="text-xs text-muted-foreground">{model.burnDetails.score}</span>
		</div>
	{:else}
		<span class="text-muted-foreground/30">—</span>
	{/if}
</Table.Cell>
```

- [ ] **Step 2: Add fallback badge to price cell**

In the price cell `<Table.Cell>`, add after the price lines:

```svelde
<FallbackBadge source={model.pricing.source} />
```

- [ ] **Step 3: Run check**

```bash
bun check
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/ModelTable.svelte
git commit -m "feat: update ModelTable with BurnBadge, FallbackBadge, and burn score column"
```

---

### Task 11: Update ModelDrawer with TrueSkill bars and fallback warnings

**Files:**

- Modify: `src/lib/components/ModelDrawer.svelte`

- [ ] **Step 1: Update benchmark bars to use TrueSkill calibration**

Replace the benchmark progress bars section in `ModelDrawer.svelte`. Keep the same layout but import `computeBenchmarkDisplay` from server — or, since the drawer runs client-side, compute it inline with a simplified version.

Add a helper inside the script:

```typescript
function benchmarkBarWidth(value: number | null, max: number = 60): number {
	if (!value || value < 1) return 0;
	return Math.min(100, Math.round((value / Math.max(60, max)) * 100));
}
```

Then in the benchmark section, update the bar width:

```svelte
<div
	class="h-full rounded-full bg-violet-500"
	style="width: {benchmarkBarWidth(bench.value)}%"
></div>
```

- [ ] **Step 2: Add fallback warning in the header**

After the provider/description section in the drawer header, add:

```svelte
{#if model.pricing.source !== 'llm-stats'}
	<div class="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-amber-600">
		Pricing source: {model.pricing.source === 'fallback-map'
			? 'from OpenCode docs (may be outdated)'
			: 'unknown — contact OpenCode for accurate pricing'}
	</div>
{/if}
```

- [ ] **Step 3: Update the quota summary to use burnDetails**

Replace the burn summary line:

```svelte
<div class="rounded-lg border border-border bg-muted/30 p-3 text-sm">
	<div class="font-medium text-foreground">
		{#if model.burnDetails?.band != null}
			{model.burnDetails.score} burn score — ~{model.quota.requestsPer5h.toLocaleString()} requests per
			$12 window
		{:else}
			Burn data unavailable — pricing unknown
		{/if}
	</div>
	<div class="text-muted-foreground">
		{#if model.burnDetails?.band === 'excellent' || model.burnDetails?.band === 'good'}
			Use for high-volume, iterative work
		{:else if model.burnDetails?.band === 'extreme' || model.burnDetails?.band === 'high'}
			Best for short, focused sessions
		{:else}
			Balanced for daily use
		{/if}
	</div>
</div>
```

- [ ] **Step 4: Run check**

```bash
bun check
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ModelDrawer.svelte
git commit -m "feat: update ModelDrawer with TrueSkill bars and fallback warnings"
```

---

### Task 12: Update QuotaCalculator to use shared quota helper

**Files:**

- Modify: `src/lib/components/QuotaCalculator.svelte`

- [ ] **Step 1: Replace inline quota math with `estimateQuota` import**

Since `estimateQuota` runs on the server, the calculator needs a different approach — either:

- (a) Bundle a client-safe copy of the quota math, or
- (b) Pass pre-computed quota estimates from the server.

Option (a) is simpler. Add a client-side `estimateQuota` directly in the component script, mirroring the server logic without importing server code.

```typescript
function computeCost(pricing: { inputPricePerM: number; outputPricePerM: number; cachedReadPerM: number | null }, inputTokens: number, outputTokens: number, cachedInputTokens: number): number | null {
	const inputCost = (inputTokens - cachedInputTokens) * pricing.inputPricePerM / 1_000_000;
	const cachedRate = pricing.cachedReadPerM ?? pricing.inputPricePerM;
	const cachedCost = cachedInputTokens * cachedRate / 1_000_000;
	const outputCost = outputTokens * pricing.outputPricePerM / 1_000_000;
	return inputCost + cachedCost + outputCost;
}
```

And replace the `estimatedCost` / `quotaEstimates` derivations to use the cached discount.

- [ ] **Step 2: Add checkbox for "50% cached reads" toggle**

Add a small checkbox or toggle:

```svelte
<label class="flex items-center gap-2 text-sm text-muted-foreground">
	<input type="checkbox" bind:checked={useCached} class="accent-violet-600" />
	50% of input tokens are cached reads
</label>
```

- [ ] **Step 3: Run check**

```bash
bun check
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/QuotaCalculator.svelte
git commit -m "feat: update QuotaCalculator with cached-read discount and shared formula"
```

---

### Task 13: Build debug page shell

**Files:**

- Create: `src/routes/debug/+page.ts`
- Create: `src/routes/debug/+page.svelte`
- Create: `src/lib/components/debug/ModelsOverview.svelte`
- Create: `src/lib/components/debug/RawJson.svelte`

- [ ] **Step 1: Create `src/routes/debug/+page.ts`**

```typescript
import { getModels } from '$lib/remote/models.remote';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const models = await getModels();
	return { models };
};
```

- [ ] **Step 2: Create `src/routes/debug/+page.svelte`**

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import type { GoModel } from '$lib/types/models';
	import ModelsOverview from '$lib/components/debug/ModelsOverview.svelte';
	import RawJson from '$lib/components/debug/RawJson.svelte';
	import { Bug, ChevronDown, ChevronRight } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	let models: GoModel[] = $state(data.models);

	type Section =
		| 'overview'
		| 'pricing'
		| 'quota'
		| 'burn'
		| 'benchmarks'
		| 'matching'
		| 'tags'
		| 'scenarios'
		| 'raw';
	let activeSection = $state<Section>('overview');
	let sections: { id: Section; label: string }[] = [
		{ id: 'overview', label: 'Models Overview' },
		{ id: 'pricing', label: 'Pricing Matrix' },
		{ id: 'quota', label: 'Quota Matrix' },
		{ id: 'burn', label: 'Burn Details' },
		{ id: 'benchmarks', label: 'Benchmarks' },
		{ id: 'matching', label: 'Matching Report' },
		{ id: 'tags', label: 'Tag Report' },
		{ id: 'scenarios', label: 'Scenario Breakdown' },
		{ id: 'raw', label: 'Raw JSON' }
	];
</script>

<svelte:head>
	<title>ZenPick — Debug</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8">
	<div class="mb-8 flex items-center gap-2">
		<Bug class="size-5 text-amber-500" />
		<h1 class="text-2xl font-bold text-foreground">Calculation Debug Page</h1>
	</div>

	<!-- Section nav -->
	<div class="mb-6 flex flex-wrap gap-1.5">
		{#each sections as s}
			<button
				class="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all {activeSection ===
				s.id
					? 'border-primary/40 bg-primary/10 text-primary'
					: 'border-border bg-card text-muted-foreground hover:text-foreground'}"
				onclick={() => (activeSection = s.id)}
			>
				{s.label}
			</button>
		{/each}
	</div>

	<!-- Section content -->
	<div class="rounded-xl border border-border bg-card p-6">
		{#if activeSection === 'overview'}
			<ModelsOverview {models} />
		{:else if activeSection === 'raw'}
			<RawJson {models} />
		{:else}
			<div class="py-12 text-center text-muted-foreground">Section coming soon...</div>
		{/if}
	</div>
</div>
```

- [ ] **Step 3: Create `ModelsOverview.svelte`**

```svelte
<script lang="ts">
	import type { GoModel } from '$lib/types/models';
	import BurnBadge from '../BurnBadge.svelte';
	import FallbackBadge from '../FallbackBadge.svelte';

	interface Props {
		models: GoModel[];
	}

	let { models }: Props = $props();
</script>

<h2 class="mb-4 text-lg font-semibold text-foreground">All Models — Key Metrics</h2>
<div class="overflow-x-auto">
	<table class="w-full text-left text-sm">
		<thead>
			<tr class="border-b border-border text-muted-foreground">
				<th class="p-2 font-medium">Model</th>
				<th class="p-2 font-medium">Provider</th>
				<th class="p-2 font-medium">Pricing Source</th>
				<th class="p-2 font-medium">Burn</th>
				<th class="p-2 font-medium">Burn Score</th>
				<th class="p-2 font-medium">Coding</th>
				<th class="p-2 font-medium">Brain</th>
				<th class="p-2 font-medium">Comp</th>
				<th class="p-2 font-medium">Agent</th>
				<th class="p-2 font-medium">Budget</th>
			</tr>
		</thead>
		<tbody>
			{#each models as m (m.id)}
				<tr class="border-b border-border/50 hover:bg-muted/30">
					<td class="p-2 font-medium text-foreground">{m.name}</td>
					<td class="p-2 text-muted-foreground">{m.provider}</td>
					<td class="p-2"><FallbackBadge source={m.pricing.source} /></td>
					<td class="p-2"><BurnBadge burnDetails={m.burnDetails} /></td>
					<td class="p-2 tabular-nums text-muted-foreground">
						{#if m.burnDetails?.band != null}
							{m.burnDetails.score} ({m.burnDetails.requestsPer12?.toLocaleString() ?? '?'}/$12)
						{:else}—{/if}
					</td>
					{#each ['coding', 'brainstorming', 'competitive', 'agentic', 'budget'] as sc}
						<td class="p-2 tabular-nums text-muted-foreground">
							{m.scenarioScores[sc as keyof typeof m.scenarioScores]}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
```

- [ ] **Step 4: Create `RawJson.svelte`**

```svelte
<script lang="ts">
	import type { GoModel } from '$lib/types/models';

	interface Props {
		models: GoModel[];
	}

	let { models }: Props = $props();

	let expanded = $state<Set<string>>(new Set());

	function toggle(id: string) {
		if (expanded.has(id)) expanded.delete(id);
		else expanded.add(id);
	}
</script>

<h2 class="mb-4 text-lg font-semibold text-foreground">Raw GoModel JSON</h2>
<p class="mb-4 text-sm text-muted-foreground">
	Collapsible JSON dump of every enriched model. Useful for inspecting exact values.
</p>
<div class="space-y-2">
	{#each models as m (m.id)}
		<button
			class="w-full rounded-lg border border-border p-3 text-left text-sm font-medium text-foreground hover:bg-muted/30"
			onclick={() => toggle(m.id)}
		>
			{m.name}
		</button>
		{#if expanded.has(m.id)}
			<pre
				class="max-h-96 overflow-auto rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">{JSON.stringify(
					m,
					null,
					2
				)}</pre>
		{/if}
	{/each}
</div>
```

- [ ] **Step 5: Run check**

```bash
bun check
```

- [ ] **Step 6: Commit**

```bash
git add src/routes/debug/ src/lib/components/debug/
git commit -m "feat: add debug page shell with ModelsOverview and RawJson sections"
```

---

### Task 14: Build Pricing Matrix and Quota Matrix debug sections

**Files:**

- Create: `src/lib/components/debug/PricingMatrix.svelte`
- Create: `src/lib/components/debug/QuotaMatrix.svelte`

- [ ] **Step 1: Create `PricingMatrix.svelte`**

```svelte
<script lang="ts">
	import type { GoModel } from '$lib/types/models';
	import FallbackBadge from '../FallbackBadge.svelte';

	interface Props {
		models: GoModel[];
	}

	let { models }: Props = $props();
</script>

<h2 class="mb-4 text-lg font-semibold text-foreground">Pricing Matrix</h2>
<p class="mb-4 text-sm text-muted-foreground">
	Every model's pricing with source tracking. Highlighted rows indicate fallback or unknown data.
</p>
<div class="overflow-x-auto">
	<table class="w-full text-left text-sm">
		<thead>
			<tr class="border-b border-border text-muted-foreground">
				<th class="p-2 font-medium">Model</th>
				<th class="p-2 font-medium">Input /1M</th>
				<th class="p-2 font-medium">Output /1M</th>
				<th class="p-2 font-medium">Cached /1M</th>
				<th class="p-2 font-medium">Source</th>
			</tr>
		</thead>
		<tbody>
			{#each models as m (m.id)}
				<tr
					class="border-b border-border/50 hover:bg-muted/30 {m.pricing.source === 'unknown'
						? 'bg-red-500/5'
						: m.pricing.source === 'fallback-map'
							? 'bg-amber-500/5'
							: ''}"
				>
					<td class="p-2 font-medium text-foreground">{m.name}</td>
					<td class="p-2 tabular-nums text-muted-foreground">
						{m.pricing.inputPricePerM != null ? `$${m.pricing.inputPricePerM.toFixed(4)}` : '—'}
					</td>
					<td class="p-2 tabular-nums text-muted-foreground">
						{m.pricing.outputPricePerM != null ? `$${m.pricing.outputPricePerM.toFixed(4)}` : '—'}
					</td>
					<td class="p-2 tabular-nums text-muted-foreground">
						{m.pricing.cachedReadPerM != null ? `$${m.pricing.cachedReadPerM.toFixed(4)}` : '—'}
					</td>
					<td class="p-2"><FallbackBadge source={m.pricing.source} /></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
```

- [ ] **Step 2: Create `QuotaMatrix.svelte`**

```svelte
<script lang="ts">
	import type { GoModel } from '$lib/types/models';

	interface Props {
		models: GoModel[];
	}

	let { models }: Props = $props();

	let inputTokens = $state(1000);
	let outputTokens = $state(500);
	let cachedPct = $state(50);

	let cachedInputTokens = $derived(Math.round(inputTokens * (cachedPct / 100)));

	function computeCost(m: GoModel): {
		costPerRequest: number | null;
		per5h: number;
		perWeek: number;
		perMonth: number;
	} {
		const pricing = m.pricing;
		if (pricing.inputPricePerM == null || pricing.outputPricePerM == null) {
			return { costPerRequest: null, per5h: 0, perWeek: 0, perMonth: 0 };
		}
		const uncached = inputTokens - cachedInputTokens;
		const cachedRate = pricing.cachedReadPerM ?? pricing.inputPricePerM;
		const cost =
			(uncached * pricing.inputPricePerM +
				cachedInputTokens * cachedRate +
				outputTokens * pricing.outputPricePerM) /
			1_000_000;
		if (cost <= 0) return { costPerRequest: 0, per5h: 0, perWeek: 0, perMonth: 0 };
		return {
			costPerRequest: cost,
			per5h: Math.round(12 / cost),
			perWeek: Math.round(30 / cost),
			perMonth: Math.round(60 / cost)
		};
	}
</script>

<h2 class="mb-4 text-lg font-semibold text-foreground">Quota Matrix</h2>

<!-- Interactive knobs -->
<div class="mb-6 grid grid-cols-3 gap-4 rounded-lg border border-border bg-muted/30 p-4">
	<div>
		<label class="mb-1 block text-xs text-muted-foreground"
			>Input tokens: {inputTokens.toLocaleString()}</label
		>
		<input
			type="range"
			min="100"
			max="50000"
			step="100"
			bind:value={inputTokens}
			class="w-full accent-violet-600"
		/>
	</div>
	<div>
		<label class="mb-1 block text-xs text-muted-foreground"
			>Output tokens: {outputTokens.toLocaleString()}</label
		>
		<input
			type="range"
			min="50"
			max="20000"
			step="50"
			bind:value={outputTokens}
			class="w-full accent-violet-600"
		/>
	</div>
	<div>
		<label class="mb-1 block text-xs text-muted-foreground">Cached reads: {cachedPct}%</label>
		<input
			type="range"
			min="0"
			max="90"
			step="5"
			bind:value={cachedPct}
			class="w-full accent-violet-600"
		/>
	</div>
</div>

<div class="overflow-x-auto">
	<table class="w-full text-left text-sm">
		<thead>
			<tr class="border-b border-border text-muted-foreground">
				<th class="p-2 font-medium">Model</th>
				<th class="p-2 font-medium">Cost/req</th>
				<th class="p-2 font-medium">/$12 (5h)</th>
				<th class="p-2 font-medium">/$30 (wk)</th>
				<th class="p-2 font-medium">/$60 (mo)</th>
			</tr>
		</thead>
		<tbody>
			{#each models as m (m.id)}
				{@const c = computeCost(m)}
				<tr class="border-b border-border/50 hover:bg-muted/30">
					<td class="p-2 font-medium text-foreground">{m.name}</td>
					<td class="p-2 tabular-nums text-muted-foreground">
						{c.costPerRequest != null ? `$${c.costPerRequest.toFixed(6)}` : '—'}
					</td>
					<td class="p-2 tabular-nums text-muted-foreground">{c.per5h.toLocaleString()}</td>
					<td class="p-2 tabular-nums text-muted-foreground">{c.perWeek.toLocaleString()}</td>
					<td class="p-2 tabular-nums text-muted-foreground">{c.perMonth.toLocaleString()}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
```

- [ ] **Step 3: Wire into debug page**

Add imports and sections in `+page.svelte`:

```svelte
import PricingMatrix from '$lib/components/debug/PricingMatrix.svelte'; import QuotaMatrix from
'$lib/components/debug/QuotaMatrix.svelte';
```

And add cases in the `activeSection` switch.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/debug/PricingMatrix.svelte src/lib/components/debug/QuotaMatrix.svelte
git commit -m "feat: add PricingMatrix and QuotaMatrix debug sections with interactive knobs"
```

---

### Task 15: Build remaining debug sections

**Files:**

- Create: `src/lib/components/debug/BurnTable.svelte`
- Create: `src/lib/components/debug/BenchmarkMatrix.svelte`
- Create: `src/lib/components/debug/MatchingReport.svelte`
- Create: `src/lib/components/debug/TagReport.svelte`
- Create: `src/lib/components/debug/ScenarioBreakdown.svelte`

Each section follows the pattern above:

1. Receive `models: GoModel[]` prop.
2. Display a table with relevant data.
3. Add interactive knobs where useful (e.g., burn threshold sliders).

- [ ] **Step 1: Create `BurnTable.svelte`** — Shows burn score, band, requests/$12, plus interactive sliders for band thresholds to test reclassification.

- [ ] **Step 2: Create `BenchmarkMatrix.svelte`** — Shows TrueSkill raw values, calibrated bar widths, percentiles, and unrated markers.

- [ ] **Step 3: Create `MatchingReport.svelte`** — For each model, show goId, matched LLM Stats name, confidence score, and whether it came from convention map or Levenshtein.

- [ ] **Step 4: Create `TagReport.svelte`** — For each model, list all tags and which rule fired (show condition debug info).

- [ ] **Step 5: Create `ScenarioBreakdown.svelte`** — Dropdown to pick a model + scenario, then show quality score, fit score, final score, and every raw input used.

- [ ] **Step 6: Wire all into `+page.svelte`**.

- [ ] **Step 7: Run check**

```bash
bun check
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/debug/
git commit -m "feat: add all remaining debug page sections"
```

---

### Task 16: Final cleanup and quality gate

**Files:**

- Modify: All touched files

- [ ] **Step 1: Run type check**

```bash
bun check
```

Fix any remaining errors.

- [ ] **Step 2: Format all edited files**

```bash
bunx prettier --write src/lib/server/pricing.ts src/lib/server/quota.ts src/lib/server/burn.ts src/lib/server/benchmarks.ts src/lib/server/scoring.ts src/lib/server/tags.ts src/lib/server/inference.ts src/lib/components/BurnBadge.svelte src/lib/components/FallbackBadge.svelte src/lib/components/ModelTable.svelte src/lib/components/ModelDrawer.svelte src/lib/components/QuotaCalculator.svelte src/lib/components/debug/*.svelte src/routes/debug/+page.svelte src/routes/debug/+page.ts src/lib/types/models.ts src/lib/burn.ts src/lib/server/opencode-go.ts
```

- [ ] **Step 3: Verify old code is removed**

Check that `inference.ts` no longer contains: `$1`/`$3` fallback, `inferQuota`, `inferBurnRate` (old), `findRanking` (old substring), all tag functions, all score functions, `normalizeScore`, `formatContext`, `buildGoModel`, `GoModelParts`.

- [ ] **Step 4: Final check**

```bash
bunx prettier --check src/lib/server/ src/lib/components/ src/lib/types/ src/routes/debug/
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: final cleanup after calculation refactor"
```
