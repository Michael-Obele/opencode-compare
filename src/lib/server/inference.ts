/**
 * Inference engine orchestrator.
 * Glues together pricing, quota, burn, scoring, and tags
 * modules to produce an enriched GoModel from modelgrep data.
 */

import { burnRateFromPrice, type BurnRate } from '$lib/burn';
import type {
	GoModel,
	ModelgrepModelData,
	MigrationHint,
	ModelPricing,
	ModelSpeed
} from '$lib/types/models';
import { goEndpointType, goEndpointUrl, goIdToName } from './opencode-go';
import { inferPricing } from './pricing';
import { estimateQuota, DEFAULT_QUOTA_INPUTS } from './quota';
import { inferBurnDetails } from './burn';
import { computeScenarioScores } from './scoring';
import { computeTags } from './tags';

/** Enrich a Go model ID with modelgrep data and optional docs pricing. */
export function inferModel(
	goId: string,
	mgModel: ModelgrepModelData | null,
	docsPricing?: Record<string, ModelPricing>
): GoModel {
	const name = goIdToName(goId);
	const pricing = inferPricing(goId, mgModel, docsPricing);
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
		modelgrepId: mgModel?.id ?? null,
		fetchedAt: Date.now()
	};
}

// ─── Extract modelgrep data ─────────────────────────────────────────────

function extractModelgrepBenchmarks(mgModel: ModelgrepModelData | null): GoModel['benchmarks'] {
	const aa = mgModel?.benchmarks?.artificial_analysis;
	return {
		coding: aa?.coding ?? null,
		reasoning: aa?.intelligence ?? null,
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

// ─── Migration Hints ─────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────

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
