# Modelgrep Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace LLM Stats API with modelgrep.com for model benchmarks, pricing, and speed data.

**Architecture:** modelgrep provides a free, no-key REST API that aggregates OpenRouter pricing, Artificial Analysis benchmarks, and live speed data. A thin API client with hand-curated Go ID → modelgrep ID mapping replaces the fuzzy Levenshtein matching and eliminates the entire fallback chain in pricing. The `GoModel` type stays the same — only the data sources underneath change.

**Tech Stack:** SvelteKit 5, TypeScript, modelgrep.com public API (no auth)

## Global Constraints

- TypeScript strict mode
- All file paths relative to project root `/home/node/Documents/GitHub/opencode-compare`
- `bun check` must pass with 0 errors after each task
- No new dependencies — modelgrep uses plain `fetch()`
- modelgrep API base URL: `https://modelgrep.com/api/v1`
- All Go model IDs from `src/lib/server/opencode-go.ts` must have a modelgrep mapping
- `GoModel` interface in `src/lib/types/models.ts` stays unchanged

---

### Task 1: Add modelgrep types & create API client

**Files:**

- Modify: `src/lib/types/models.ts` — add `ModelgrepModelData` interface, remove `LLMStatsModel`, `LLMStatsRanking`, `LLMStatsProvider`, `LLMStatsInference` types
- Create: `src/lib/server/modelgrep.ts` — API client

**Interfaces:**

- Consumes: `GoModel` from `$lib/types/models` (unchanged)
- Produces: `ModelgrepModelData` interface, `fetchModelgrepModels(): Promise<Map<string, ModelgrepModelData>>`, `modelgrepModelUrl(id: string): string`

- [ ] **Step 1: Update types in `models.ts`**

Remove these types (delete them):

```typescript
export interface LLMStatsModel { ... }
export interface LLMStatsProvider { ... }
export interface LLMStatsInference { ... }
export interface LLMStatsRanking { ... }
```

Update `PricingSource`:

```typescript
export type PricingSource = 'modelgrep' | 'fallback-map' | 'unknown';
```

Add new `ModelgrepModelData` type at the end of the file, before any export:

```typescript
export interface ModelgrepModelData {
	/** modelgrep model ID, e.g. "deepseek/deepseek-v4-pro" */
	id: string;
	/** Display name, e.g. "DeepSeek: DeepSeek V4 Pro" */
	name: string;
	/** Maker slug, e.g. "deepseek", "z-ai" */
	maker: string;
	description: string;
	context_length: number;
	max_output: number | null;
	pricing: {
		input: number;
		output: number;
		cache_read: number | null;
		unit: 'usd_per_million_tokens';
	} | null;
	performance: {
		throughput_tps: number | null;
		latency_ms: number | null;
		uptime: number | null;
	};
	capabilities: {
		tools: boolean;
		reasoning: boolean;
		structured: boolean;
		vision: boolean;
	};
	benchmarks: {
		artificial_analysis: {
			intelligence: number | null;
			coding: number | null;
			agentic: number | null;
			gpqa: number | null;
			hle: number | null;
			scicode: number | null;
			tau2: number | null;
			intelligence_pct: number | null;
			coding_pct: number | null;
			agentic_pct: number | null;
		} | null;
		design_arena: {
			elo: number;
			win_rate: number;
			elo_pct: number;
		} | null;
	};
	url: string;
}
```

- [ ] **Step 2: Create `src/lib/server/modelgrep.ts`**

Write the full API client:

```typescript
/** modelgrep.com API client — fetches model benchmarks, pricing, and speed data. */

import type { ModelgrepModelData } from '$lib/types/models';

const MODELGREP_BASE = 'https://modelgrep.com/api/v1';

/**
 * Go model ID → modelgrep model ID mapping.
 * Hand-curated from modelgrep's OpenRouter-style maker/model-id convention.
 */
const GO_TO_MODELGREP: Record<string, string> = {
	'deepseek-v4-pro': 'deepseek/deepseek-v4-pro',
	'deepseek-v4-flash': 'deepseek/deepseek-v4-flash',
	'glm-5.2': 'z-ai/glm-5.2',
	'glm-5.1': 'z-ai/glm-5.1',
	'glm-5': 'z-ai/glm-5',
	'kimi-k2.7-code': 'moonshotai/kimi-k2.7-code',
	'kimi-k2.6': 'moonshotai/kimi-k2.6',
	'kimi-k2.5': 'moonshotai/kimi-k2.5',
	'mimo-v2.5': 'xiaomi/mimo-v2.5',
	'mimo-v2.5-pro': 'xiaomi/mimo-v2.5-pro',
	'mimo-v2-pro': 'xiaomi/mimo-v2-pro',
	'mimo-v2-omni': 'xiaomi/mimo-v2-omni',
	'minimax-m3': 'minimax/minimax-m3',
	'minimax-m2.7': 'minimax/minimax-m2.7',
	'minimax-m2.5': 'minimax/minimax-m2.5',
	'qwen3.7-max': 'qwen/qwen3.7-max',
	'qwen3.7-plus': 'qwen/qwen3.7-plus',
	'qwen3.6-plus': 'qwen/qwen3.6-plus',
	'qwen3.5-plus': 'qwen/qwen3.5-plus',
	'deepseek-v4-pro': 'deepseek/deepseek-v4-pro',
};

/** Batch-fetch all models by maker and index by modelgrep ID. */
export async function fetchModelgrepModels(): Promise<Map<string, ModelgrepModelData>> {
	const makers = ['deepseek', 'z-ai', 'moonshotai', 'xiaomi', 'minimax', 'qwen'];
	const results = await Promise.all(
		makers.map(async (maker) => {
			const url = `${MODELGREP_BASE}/models?q=${maker}&limit=30`;
			try {
				const res = await fetch(url);
				if (!res.ok) {
					console.error(`[modelgrep] ${maker} returned ${res.status}: ${res.statusText}`);
					return [];
				}
				const json = await res.json();
				return (json.data ?? []) as ModelgrepModelData[];
			} catch (e) {
				console.error(`[modelgrep] ${maker} fetch failed:`, e);
				return [];
			}
		})
	);

	const map = new Map<string, ModelgrepModelData>();
	for (const batch of results) {
		for (const model of batch) {
			map.set(model.id, model);
		}
	}
	return map;
}

/** Look up modelgrep model ID for a Go model ID. */
export function goIdToModelgrepId(goId: string): string | undefined {
	return GO_TO_MODELGREP[goId];
}

/** Get the modelgrep detail URL for a model. */
export function modelgrepModelUrl(modelgrepId: string): string {
	return `https://modelgrep.com/models/${modelgrepId}`;
}
```

- [ ] **Step 3: Verify with `bun check`**

Run: `bun check`
Expected: 0 errors. If errors from deleted LLMStats types referenced elsewhere, they'll be fixed in subsequent tasks.

---

### Task 2: Remove old modules & simplify pricing

**Files:**

- Delete: `src/lib/server/llm-stats.ts`
- Delete: `src/lib/server/benchmarks.ts`
- Modify: `src/lib/server/pricing.ts` — replace LLM Stats fallback with modelgrep

**Interfaces:**

- New `inferPricing` signature: `(goId: string, modelgrepModel: ModelgrepModelData | null) => ModelPricing`

- [ ] **Step 1: Delete `src/lib/server/llm-stats.ts`**

Remove the file entirely. No replacements needed — modelgrep.ts handles everything.

- [ ] **Step 2: Delete `src/lib/server/benchmarks.ts`**

Remove the file entirely. Remove these exported functions that won't be needed anymore:

- `goIdToLlmStatsId` (convention map replaced by modelgrep)
- `matchModel` (fuzzy matching no longer needed)
- `matchRanking` (ranking-based lookup no longer needed)
- `extractAllScores` (modelgrep provides structured AA indices)
- `findScoreKey` (text matching no longer needed)
- `computeBenchmarks` (replaced by direct index extraction)
- `computeBenchmarkDisplay` (seems unused — inline `benchmarkBarWidth` in ModelDrawer.svelte handles this)

- [ ] **Step 3: Rewrite `src/lib/server/pricing.ts`**

Replace the entire file:

```typescript
import type { ModelgrepModelData, ModelPricing } from '$lib/types/models';
import { getFallbackPricingMap } from './opencode-go';

/**
 * Infer pricing for a Go model.
 * Priority: 1) Go docs fallback map, 2) modelgrep/OpenRouter pricing, 3) unknown.
 */
export function inferPricing(
	goId: string,
	modelgrepModel: ModelgrepModelData | null
): ModelPricing {
	// 1. OpenCode Go docs pricing — what Go subscribers actually pay
	const map = getFallbackPricingMap();
	const known = map[goId];
	if (known) {
		return { ...known };
	}

	// 2. modelgrep / OpenRouter pricing (for comparison purposes)
	if (modelgrepModel?.pricing) {
		return {
			inputPricePerM: modelgrepModel.pricing.input,
			outputPricePerM: modelgrepModel.pricing.output,
			cachedReadPerM: modelgrepModel.pricing.cache_read ?? null,
			source: 'modelgrep'
		};
	}

	// 3. No pricing available
	return {
		inputPricePerM: null,
		outputPricePerM: null,
		cachedReadPerM: null,
		source: 'unknown'
	};
}
```

- [ ] **Step 4: Verify with `bun check`**

Run: `bun check`
Expected: 0 errors (may have errors from inference/scoring/tags still referencing old imports — those are Task 3).

---

### Task 3: Update inference orchestrator, scoring, and tags

**Files:**

- Modify: `src/lib/server/inference.ts` — use modelgrep instead of LLM Stats
- Modify: `src/lib/server/scoring.ts` — use AA indices instead of TrueSkill rank→percentile
- Modify: `src/lib/server/tags.ts` — remove ranking dependency, use AA indices

- [ ] **Step 1: Rewrite `src/lib/server/inference.ts`**

Replace the imports and `inferModel` function. Remove the rankings arrays from the parameter list. Extract benchmarks and speed directly from modelgrep data.

```typescript
/**
 * Inference engine orchestrator.
 * Enriches a Go model ID with modelgrep data and algorithmic inference.
 */

import { burnRateFromPrice, type BurnRate } from '$lib/burn';
import type { GoModel, ModelgrepModelData, ModelSpeed, MigrationHint } from '$lib/types/models';
import { goEndpointType, goEndpointUrl, goIdToName } from './opencode-go';
import { modelgrepModelUrl } from './modelgrep';
import { inferPricing } from './pricing';
import { estimateQuota, DEFAULT_QUOTA_INPUTS } from './quota';
import { inferBurnDetails } from './burn';
import { computeScenarioScores } from './scoring';
import { computeTags } from './tags';

/** Enrich a Go model ID with modelgrep data. */
export function inferModel(
	goId: string,
	mgModel: ModelgrepModelData | null
): GoModel {
	const name = goIdToName(goId);
	const pricing = inferPricing(goId, mgModel);
	const burnDetails = inferBurnDetails(pricing);
	const burnRate = burnRateFromPrice(
		(pricing.inputPricePerM ?? 0) + (pricing.outputPricePerM ?? 0)
	) as BurnRate;

	const quota = estimateQuota(
		pricing,
		DEFAULT_QUOTA_INPUTS.inputTokens,
		DEFAULT_QUOTA_INPUTS.outputTokens,
		DEFAULT_QUOTA_INPUTS.cachedInputTokens
	);

	const benchmarks = extractModelgrepBenchmarks(mgModel);
	const speed = extractModelgrepSpeed(mgModel);
	const tags = computeTags(benchmarks, burnDetails, speed, mgModel);
	const migrationHints = inferMigrationHints(goId, pricing, benchmarks);
	const scenarioScores = computeScenarioScores({
		goId,
		pricing,
		benchmarks,
		burnDetails,
		speed,
		mgModel
	});

	return {
		id: goId,
		name,
		provider: mgModel?.maker ?? inferProvider(goId),
		description: mgModel?.description ?? '',
		openWeight: true,
		contextWindow: mgModel?.context_length ?? inferContextWindow(goId),
		releaseDate: null,
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
		isNew: mgModel === null,
		llmStatsUrl: mgModel ? modelgrepModelUrl(mgModel.id) : '',
		fetchedAt: Date.now()
	};
}

// ─── Extract modelgrep data ─────────────────────────────────────────────

function extractModelgrepBenchmarks(
	mgModel: ModelgrepModelData | null
): GoModel['benchmarks'] {
	const aa = mgModel?.benchmarks?.artificial_analysis;
	const coding = aa?.coding ?? null;
	const reasoning = aa?.intelligence ?? null;
	return {
		coding,
		reasoning,
		math: null,
		sweBenchVerified: aa?.scicode ?? null,
		codeArena: null,
		allScores: {}
	};
}

function extractModelgrepSpeed(mgModel: ModelgrepModelData | null): ModelSpeed | null {
	if (!mgModel?.performance) return null;
	return {
		tokensPerSecond: mgModel.performance.throughput_tps ?? 0,
		timeToFirstToken: mgModel.performance.latency_ms ?? null
	};
}

// ─── Migration Hints (unchanged from current) ────────────────────────────

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

function codingMigrationHint(
	score: number | null,
	inputPrice: number | null
): MigrationHint | null {
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

// ─── Helpers (unchanged) ─────────────────────────────────────────────

const PROVIDER_BY_PREFIX: Record<string, string> = {
	deepseek: 'DeepSeek',
	qwen: 'Alibaba / Qwen Team',
	glm: 'Zhipu AI',
	kimi: 'Moonshot AI',
	minimax: 'MiniMax',
	mimo: 'Xiaomi'
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

- [ ] **Step 2: Rewrite `src/lib/server/scoring.ts`**

Replace scoring to use AA indices directly instead of rank→percentile:

```typescript
import type { ModelgrepModelData, ModelBenchmarks, ModelSpeed, ScenarioScores, BurnDetails, ModelPricing } from '$lib/types/models';

interface ScenarioInputs {
	goId: string;
	pricing: ModelPricing;
	benchmarks: ModelBenchmarks;
	burnDetails: BurnDetails;
	speed: ModelSpeed | null;
	mgModel: ModelgrepModelData | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function normalize(value: number, max: number): number {
	if (max <= 0) return 0;
	return Math.min(1, Math.max(0, value / max));
}

// ─── Two-axis scoring ─────────────────────────────────────────────────

function scoreQualityCoding(benchmarks: ModelBenchmarks, mgModel: ModelgrepModelData | null): number {
	const aaCoding = mgModel?.benchmarks?.artificial_analysis?.coding;
	let score = 0;
	let weight = 0;

	if (aaCoding != null) {
		score += normalize(aaCoding, 100) * 0.7;
		weight += 0.7;
	}
	if (benchmarks.sweBenchVerified != null) {
		score += normalize(benchmarks.sweBenchVerified, 60) * 0.2;
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
		score += normalize(burnDetails.score, 100) * 0.5;
		weight += 0.5;
	}
	return weight > 0 ? score / weight : 0.5;
}

function scoreQualityReasoning(mgModel: ModelgrepModelData | null): number {
	const aaIntel = mgModel?.benchmarks?.artificial_analysis?.intelligence;
	return aaIntel != null ? normalize(aaIntel, 100) : 0;
}

function scoreFitBrainstorming(ctx: number, burnDetails: BurnDetails): number {
	let score = 0;
	let weight = 0;
	score += normalize(ctx, 1_000_000) * 0.6;
	weight += 0.6;
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
	return weight > 0 ? score / weight : 0;
}

function scoreFitCompetitive(mgModel: ModelgrepModelData | null): number {
	const aaCoding = mgModel?.benchmarks?.artificial_analysis?.coding;
	const codingNorm = aaCoding != null ? normalize(aaCoding, 100) : 0;
	return 0.5 + codingNorm * 0.5;
}

function scoreQualityAgentic(benchmarks: ModelBenchmarks, mgModel: ModelgrepModelData | null): number {
	return scoreQualityCoding(benchmarks, mgModel);
}

function scoreFitAgentic(
	ctx: number,
	speed: ModelSpeed | null,
	mgModel: ModelgrepModelData | null
): number {
	let score = 0;
	let weight = 0;
	score += normalize(Math.min(ctx, 1_000_000), 1_000_000) * 0.5;
	weight += 0.5;
	if (speed?.tokensPerSecond) {
		score += normalize(speed.tokensPerSecond, 200) * 0.3;
		weight += 0.3;
	}
	if (mgModel?.capabilities?.tools != null) {
		score += (mgModel.capabilities.tools ? 1 : 0.3) * 0.2;
		weight += 0.2;
	}
	return weight > 0 ? score / weight : 0.3;
}

function scoreQualityBudget(pricing: ModelPricing, burnDetails: BurnDetails): number {
	let score = 0;
	let weight = 0;
	if (pricing.inputPricePerM != null && pricing.outputPricePerM != null) {
		const totalPrice = pricing.inputPricePerM + pricing.outputPricePerM;
		score += Math.max(0, 1 - totalPrice / 10) * 0.4;
		weight += 0.4;
	}
	if (burnDetails.band != null) {
		score += normalize(burnDetails.score, 100) * 0.6;
		weight += 0.6;
	}
	return weight > 0 ? score / weight : 0;
}

function scoreFitBudget(): number {
	return 1.0;
}

// ─── Public API ───────────────────────────────────────────────────────

export function computeScenarioScores(inputs: ScenarioInputs): ScenarioScores {
	return {
		coding: computeScore(
			scoreQualityCoding(inputs.benchmarks, inputs.mgModel),
			scoreFitCoding(inputs.speed, inputs.burnDetails)
		),
		brainstorming: computeScore(
			scoreQualityReasoning(inputs.mgModel),
			scoreFitBrainstorming(inputs.mgModel?.context_length ?? 128_000, inputs.burnDetails)
		),
		competitive: computeScore(
			scoreQualityCompetitive(inputs.benchmarks),
			scoreFitCompetitive(inputs.mgModel)
		),
		agentic: computeScore(
			scoreQualityAgentic(inputs.benchmarks, inputs.mgModel),
			scoreFitAgentic(inputs.mgModel?.context_length ?? 128_000, inputs.speed, inputs.mgModel)
		),
		budget: computeScore(scoreQualityBudget(inputs.pricing, inputs.burnDetails), scoreFitBudget())
	};
}

function computeScore(quality: number, fit: number): number {
	return Math.round(quality * fit * 100);
}
```

- [ ] **Step 3: Rewrite `src/lib/server/tags.ts`**

Simplify tags to use AA indices directly instead of ranking position:

```typescript
import type { ModelgrepModelData, ModelBenchmarks, ModelSpeed, ModelTag, BurnDetails } from '$lib/types/models';

export function computeTags(
	benchmarks: ModelBenchmarks,
	burnDetails: BurnDetails,
	speed: ModelSpeed | null,
	mgModel: ModelgrepModelData | null
): ModelTag[] {
	const ctx = mgModel?.context_length ?? 0;
	const builders = [
		() => codingTags(benchmarks),
		() => competitiveTags(benchmarks),
		() => reasoningTags(mgModel),
		() => agenticTags(benchmarks, ctx),
		() => contextTags(ctx),
		() => budgetTags(burnDetails),
		() => speedTags(speed),
		() => newModelTag(mgModel)
	];

	const tags = builders.flatMap((b) => b());
	return dedupe(tags);
}

function codingTags(benchmarks: ModelBenchmarks): ModelTag[] {
	if (benchmarks.coding == null) return [];
	if (benchmarks.coding > 60) {
		return [{ label: 'Top-tier coding', emoji: '💻', source: 'ranking' }];
	}
	if (benchmarks.coding > 40) {
		return [{ label: 'Solid coding', emoji: '🔧', source: 'ranking' }];
	}
	return [];
}

function competitiveTags(benchmarks: ModelBenchmarks): ModelTag[] {
	if (benchmarks.sweBenchVerified != null && benchmarks.sweBenchVerified > 50) {
		return [{ label: 'Competitive programming', emoji: '⚔️', source: 'computed' }];
	}
	return [];
}

function reasoningTags(mgModel: ModelgrepModelData | null): ModelTag[] {
	const aaIntel = mgModel?.benchmarks?.artificial_analysis?.intelligence;
	if (aaIntel != null && aaIntel > 30) {
		return [{ label: 'Strong reasoning', emoji: '🧠', source: 'ranking' }];
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

function newModelTag(mgModel: ModelgrepModelData | null): ModelTag[] {
	if (!mgModel) {
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

- [ ] **Step 4: Verify with `bun check`**

Run: `bun check`
Expected: 0 errors. (The only remaining references to old imports will be in `models.remote.ts` — fixed in Task 4.)

---

### Task 4: Update remote data loader

**Files:**

- Modify: `src/lib/remote/models.remote.ts`

- [ ] **Step 1: Rewrite `src/lib/remote/models.remote.ts`**

Replace LLM Stats imports with modelgrep, simplify refreshCache:

```typescript
import { query } from '$app/server';
import { cacheGet, cacheSet, MODELS_TTL } from '$lib/cache';
import { fetchGoModels, goIdToName } from '$lib/server/opencode-go';
import { fetchModelgrepModels, goIdToModelgrepId } from '$lib/server/modelgrep';
import { inferModel } from '$lib/server/inference';
import type { GoModel } from '$lib/types/models';

const CACHE_KEY = 'go-models-enriched-v8';

/**
 * Fetch all enriched Go models.
 * Uses stale-while-revalidate: returns cached data instantly,
 * refreshes in background if stale.
 */
export const getModels = query(async () => {
	const cached = cacheGet<GoModel[]>(CACHE_KEY);

	if (cached && cached.stale) {
		refreshCache().catch(console.error);
		return cached.data;
	}

	if (cached && !cached.stale) {
		return cached.data;
	}

	return await refreshCache();
});

async function refreshCache(): Promise<GoModel[]> {
	const [goModels, modelgrepModels] = await Promise.all([
		fetchGoModels(),
		fetchModelgrepModels().catch((e) => {
			console.error('[refreshCache] modelgrep failed:', e.message);
			return new Map();
		})
	]);

	console.log(
		`[refreshCache] goModels=${goModels.length} modelgrepModels=${modelgrepModels.size}`
	);

	const filtered = goModels.filter((gm) => gm.id !== 'hy3-preview');
	const enriched = filtered.map((gm) => {
		const mgId = goIdToModelgrepId(gm.id);
		const mgModel = mgId ? modelgrepModels.get(mgId) ?? null : null;
		return inferModel(gm.id, mgModel);
	});

	cacheSet(CACHE_KEY, enriched, MODELS_TTL);
	return enriched;
}
```

- [ ] **Step 2: Verify with `bun check`**

Run: `bun check`
Expected: 0 errors.

---

### Task 5: Update UI components, env, and docs

**Files:**

- Modify: `src/lib/components/FallbackBadge.svelte`
- Modify: `src/lib/components/ModelDrawer.svelte`
- Modify: `src/lib/components/About/Schematic.svelte`
- Modify: `src/lib/components/About/SourceTable.svelte`
- Modify: `src/lib/components/Site/SiteFooter.svelte`
- Modify: `src/routes/about/+page.svelte`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Update `FallbackBadge.svelte`**

Change the source check from `source !== 'llm-stats'` to `source === 'unknown'`. With modelgrep, the 'modelgrep' source is reliable — only show the badge when truly unknown:

```svelte
{#if source === 'unknown'}
	<span
		class="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-500 border border-red-500/20"
		title="No pricing data available — contact OpenCode for accurate pricing"
	>
		<HelpCircle class="size-2.5" />
		Unknown
	</span>
{/if}
```

Also update the script to remove unused imports — keep only `HelpCircle` and `PricingSource`:

```svelte
<script lang="ts">
	import type { PricingSource } from '$lib/types/models';
	import { HelpCircle } from '@lucide/svelte';

	interface Props {
		source: PricingSource;
	}

	let { source }: Props = $props();
</script>
```

- [ ] **Step 2: Update `ModelDrawer.svelte` pricing source banner**

Change `model.pricing.source !== 'llm-stats'` to `model.pricing.source === 'unknown'`:

```svelte
{#if model.pricing.source === 'unknown'}
	<div
		class="mx-4 mb-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-amber-600"
	>
		Pricing source: unknown — contact OpenCode for accurate pricing
	</div>
{/if}
```

- [ ] **Step 3: Update `Schematic.svelte`**

Change the `sources` array to reference `modelgrep.com API` instead of `LLM Stats API`:

```typescript
const sources = [
	{ id: 'modelgrep', label: 'modelgrep.com API', sublabel: 'benchmarks · pricing · speed' },
	{ id: 'opencode', label: 'OpenCode Go', sublabel: 'models · endpoints' }
];
```

- [ ] **Step 4: Update `SourceTable.svelte`**

Change the provider entry from llm-stats.com to modelgrep.com:

```typescript
const sources: Source[] = [
	{
		provider: 'modelgrep.com',
		href: 'https://modelgrep.com/',
		license: 'Free public API (no key required)',
		use: 'Benchmark scores, OpenRouter pricing, speed/latency, model metadata',
		required: true
	},
	{
		provider: 'opencode.ai/docs/go',
		href: 'https://opencode.ai/docs/go/',
		license: 'Per OpenCode Go docs',
		use: 'Model list, endpoint types, quota windows'
	}
];
```

Also update the subtitle from `2 sources · required attribution` to the correct count.

- [ ] **Step 5: Update `SiteFooter.svelte`**

Replace or remove the LLM Stats footer link. The footer currently links to `https://llm-stats.com`. Replace it with a link to `https://modelgrep.com` or the data sources page.

- [ ] **Step 6: Update `routes/about/+page.svelte`**

Update the StatCard footnote from `"Cross-referenced via LLM Stats."` to `"Cross-referenced via modelgrep."` and the Callout text to reference modelgrep.com instead of llm-stats.com.

- [ ] **Step 7: Update `.env.example`**

Remove the API_KEY and LLM_STATS_API_KEY entries since modelgrep requires no auth. Replace with a comment noting no API keys are needed.

- [ ] **Step 8: Update `README.md`**

Update the description from LLM Stats to modelgrep.

- [ ] **Step 9: Final verification**

Run: `bun check`
Expected: 0 errors.

Run: `bunx prettier --check src/`
Expected: all clean.

Run: `bun dev` and verify the site loads and shows model data correctly.
