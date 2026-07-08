/**
 * Inference engine orchestrator.
 * Glues together pricing, quota, burn, benchmarks, scoring, and tags
 * modules to produce an enriched GoModel from raw API data.
 */

import { burnRateFromPrice, type BurnRate } from '$lib/burn';
import type {
	GoModel,
	LLMStatsModel,
	LLMStatsRanking,
	MigrationHint,
	ModelSpeed
} from '$lib/types/models';
import { goEndpointType, goEndpointUrl, goIdToName } from './opencode-go';
import { llmStatsModelUrl } from './llm-stats';
import { inferPricing } from './pricing';
import { estimateQuota, DEFAULT_QUOTA_INPUTS } from './quota';
import { inferBurnDetails } from './burn';
import { matchRanking, computeBenchmarks } from './benchmarks';
import { computeScenarioScores } from './scoring';
import { computeTags } from './tags';

/** Enrich a Go model ID with LLM Stats data and algorithmic inference. */
export function inferModel(
	goId: string,
	llmStatsModel: LLMStatsModel | null,
	codingRankings: LLMStatsRanking[],
	reasoningRankings: LLMStatsRanking[],
	mathRankings: LLMStatsRanking[]
): GoModel {
	const name = goIdToName(goId);
	const pricing = inferPricing(goId, llmStatsModel, [
		...codingRankings,
		...reasoningRankings,
		...mathRankings
	]);
	const burnDetails = inferBurnDetails(pricing);

	// Quota using default token assumptions for the table
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

// ─── Speed ───────────────────────────────────────────────────────────────

function inferSpeed(model: LLMStatsModel | null): ModelSpeed | null {
	if (!model?.inference?.available) return null;
	const inf = model.inference as unknown as Record<string, unknown>;
	return {
		tokensPerSecond: (inf.tokens_per_second as number) ?? 0,
		timeToFirstToken: (inf.time_to_first_token as number) ?? null
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
