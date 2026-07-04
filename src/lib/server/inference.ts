/**
 * Algorithmic inference engine.
 * Generates "best for" tags, burn rates, migration hints, burnout tiers,
 * and quota estimates from raw LLM Stats + OpenCode Go data.
 * Zero manual curation — everything derived from benchmarks, pricing, and rankings.
 */

import type {
	BurnRate,
	GoModel,
	LLMStatsModel,
	LLMStatsRanking,
	MigrationHint,
	ModelBenchmarks,
	ModelSpeed,
	ModelTag
} from '$lib/types/models';
import { goEndpointType, goEndpointUrl, goIdToName } from './opencode-go';
import { llmStatsModelUrl } from './llm-stats';

/** Enrich a Go model ID with LLM Stats data and algorithmic inference. */
export function inferModel(
	goId: string,
	llmStatsModel: LLMStatsModel | null,
	codingRankings: LLMStatsRanking[],
	reasoningRankings: LLMStatsRanking[],
	mathRankings: LLMStatsRanking[]
): GoModel {
	const name = goIdToName(goId);
	const endpoint = goEndpointType(goId);

	// Pricing — use LLM Stats data, or fall back to known defaults
	const pricing = inferPricing(goId, llmStatsModel);

	// Quota estimates computed from pricing
	const quota = inferQuota(pricing);

	// Burn rate tier
	const burnRate = inferBurnRate(pricing);

	// Rankings
	const codingRank = findRanking(name, codingRankings);
	const reasoningRank = findRanking(name, reasoningRankings);
	const mathRank = findRanking(name, mathRankings);

	// Benchmarks
	const benchmarks = inferBenchmarks(goId, llmStatsModel, codingRank, reasoningRank, mathRank);

	// Speed
	const speed = inferSpeed(llmStatsModel);

	// Algorithmic tags
	const tags = inferTags(goId, pricing, benchmarks, burnRate, speed, llmStatsModel, codingRankings);

	// Migration hints
	const migrationHints = inferMigrationHints(goId, pricing, benchmarks);

	return {
		id: goId,
		name,
		provider: llmStatsModel?.organization?.name ?? inferProvider(goId),
		description: llmStatsModel?.description ?? '',
		openWeight: llmStatsModel?.open_weight ?? true, // Go models are all open
		contextWindow: llmStatsModel?.context_window ?? inferContextWindow(goId),
		releaseDate: llmStatsModel?.release_date ?? null,
		pricing,
		quota,
		burnRate,
		tags,
		benchmarks,
		speed,
		migrationHints,
		endpoint,
		endpointUrl: goEndpointUrl(goId),
		isNew: llmStatsModel === null,
		llmStatsUrl: llmStatsModel ? llmStatsModelUrl(llmStatsModel.id) : '',
		fetchedAt: Date.now()
	};
}

// ─── Pricing ────────────────────────────────────────────────────────────

interface ModelPricing {
	inputPricePerM: number;
	outputPricePerM: number;
	cachedReadPerM: number | null;
}

function inferPricing(goId: string, model: LLMStatsModel | null): ModelPricing {
	// Try LLM Stats provider data first
	if (model?.providers?.length) {
		const bestProvider = model.providers.find((p) => p.available && p.input_price_per_m != null);
		if (bestProvider) {
			return {
				inputPricePerM: bestProvider.input_price_per_m!,
				outputPricePerM: bestProvider.output_price_per_m ?? bestProvider.input_price_per_m! * 2.5,
				cachedReadPerM: null // LLM Stats doesn't expose cached pricing detail
			};
		}
	}

	// Fallback to known pricing from OpenCode docs (as of July 2026)
	const known: Record<string, ModelPricing> = {
		'deepseek-v4-pro': { inputPricePerM: 1.74, outputPricePerM: 3.48, cachedReadPerM: 0.0145 },
		'deepseek-v4-flash': { inputPricePerM: 0.14, outputPricePerM: 0.28, cachedReadPerM: 0.0028 },
		'glm-5.2': { inputPricePerM: 1.4, outputPricePerM: 4.4, cachedReadPerM: 0.26 },
		'glm-5.1': { inputPricePerM: 1.4, outputPricePerM: 4.4, cachedReadPerM: 0.26 },
		'kimi-k2.7-code': { inputPricePerM: 0.95, outputPricePerM: 4.0, cachedReadPerM: 0.19 },
		'kimi-k2.6': { inputPricePerM: 0.95, outputPricePerM: 4.0, cachedReadPerM: 0.16 },
		'mimo-v2.5': { inputPricePerM: 0.14, outputPricePerM: 0.28, cachedReadPerM: 0.0028 },
		'mimo-v2.5-pro': { inputPricePerM: 1.74, outputPricePerM: 3.48, cachedReadPerM: 0.0145 },
		'minimax-m3': { inputPricePerM: 0.3, outputPricePerM: 1.2, cachedReadPerM: 0.06 },
		'minimax-m2.7': { inputPricePerM: 0.3, outputPricePerM: 1.2, cachedReadPerM: 0.06 },
		'qwen3.7-max': { inputPricePerM: 2.5, outputPricePerM: 7.5, cachedReadPerM: 0.5 },
		'qwen3.7-plus': { inputPricePerM: 0.4, outputPricePerM: 1.6, cachedReadPerM: 0.04 },
		'qwen3.6-plus': { inputPricePerM: 0.5, outputPricePerM: 3.0, cachedReadPerM: 0.05 }
	};

	return known[goId] ?? { inputPricePerM: 1.0, outputPricePerM: 3.0, cachedReadPerM: null };
}

// ─── Quota Estimates ─────────────────────────────────────────────────────

function inferQuota(pricing: ModelPricing): GoModel['quota'] {
	// Estimate average tokens per request from known OpenCode patterns:
	// ~50% of tokens are cached reads (huge discount for most models),
	// ~700 input tokens + ~200 output tokens per typical coding request.
	const avgCostPerRequest = pricing.inputPricePerM * 0.0007 + pricing.outputPricePerM * 0.0002;

	if (avgCostPerRequest <= 0) {
		return { requestsPer5h: 0, requestsPerWeek: 0, requestsPerMonth: 0 };
	}

	return {
		requestsPer5h: Math.round(12 / avgCostPerRequest),
		requestsPerWeek: Math.round(30 / avgCostPerRequest),
		requestsPerMonth: Math.round(60 / avgCostPerRequest)
	};
}

// ─── Burn Rate ───────────────────────────────────────────────────────────

function inferBurnRate(pricing: ModelPricing): BurnRate {
	// Burn rate is based on total pricing (input + output) per 1M
	const total = pricing.inputPricePerM + pricing.outputPricePerM;
	if (total < 1.5) return 'slow';
	if (total < 6) return 'medium';
	return 'fast';
}

// ─── Rankings ────────────────────────────────────────────────────────────

function findRanking(modelName: string, rankings: LLMStatsRanking[]): LLMStatsRanking | null {
	const lowered = modelName.toLowerCase();
	return (
		rankings.find(
			(r) =>
				r.model_name.toLowerCase().includes(lowered) || lowered.includes(r.model_name.toLowerCase())
		) ?? null
	);
}

// ─── Benchmarks ──────────────────────────────────────────────────────────

function inferBenchmarks(
	goId: string,
	model: LLMStatsModel | null,
	codingRank: LLMStatsRanking | null,
	reasoningRank: LLMStatsRanking | null,
	mathRank: LLMStatsRanking | null
): ModelBenchmarks {
	const allScores: Record<string, number> = {};
	if (model?.top_scores) {
		for (const [key, val] of Object.entries(model.top_scores)) {
			allScores[key] = val;
		}
	}

	// Extract specific benchmarks from top_scores
	const sweBenchKey = Object.keys(allScores).find((k) => k.toLowerCase().includes('swe-bench'));
	const arenaKey = Object.keys(allScores).find(
		(k) => k.toLowerCase().includes('code') && k.toLowerCase().includes('arena')
	);

	return {
		coding: codingRank?.score ?? null,
		reasoning: reasoningRank?.score ?? null,
		math: mathRank?.score ?? null,
		sweBenchVerified: sweBenchKey ? allScores[sweBenchKey] : null,
		codeArena: arenaKey ? allScores[arenaKey] : null,
		allScores
	};
}

// ─── Speed ───────────────────────────────────────────────────────────────

function inferSpeed(model: LLMStatsModel | null): ModelSpeed | null {
	if (!model?.inference?.available) return null;
	return {
		tokensPerSecond:
			((model.inference as unknown as Record<string, unknown>).tokens_per_second as number) ?? 0,
		timeToFirstToken:
			((model.inference as unknown as Record<string, unknown>).time_to_first_token as number) ??
			null
	};
}

// ─── Tags ────────────────────────────────────────────────────────────────

function inferTags(
	goId: string,
	pricing: ModelPricing,
	benchmarks: ModelBenchmarks,
	burnRate: BurnRate,
	speed: ModelSpeed | null,
	model: LLMStatsModel | null,
	codingRankings: LLMStatsRanking[]
): ModelTag[] {
	const tags: ModelTag[] = [];
	const totalModels = codingRankings.length || 13; // default to Go model count
	const top25Threshold = Math.ceil(totalModels * 0.25);

	// Coding
	if (benchmarks.coding !== null && benchmarks.coding > 0) {
		const rank = codingRankings.findIndex((r) =>
			r.model_name.toLowerCase().includes(goId.toLowerCase())
		);
		if (rank >= 0 && rank < top25Threshold) {
			tags.push({ label: 'Top-tier coding', emoji: '💻', source: 'ranking' });
		} else if (rank >= 0 && rank < totalModels * 0.5) {
			tags.push({ label: 'Solid coding', emoji: '🔧', source: 'ranking' });
		}
	}

	// Competitive programming
	if (benchmarks.sweBenchVerified !== null && benchmarks.sweBenchVerified > 50) {
		tags.push({ label: 'Competitive programming', emoji: '⚔️', source: 'computed' });
	} else if (benchmarks.codeArena && benchmarks.codeArena > 70) {
		tags.push({ label: 'Code Arena strong', emoji: '🏟️', source: 'computed' });
	}

	// Reasoning
	if (benchmarks.reasoning !== null && benchmarks.reasoning > 0) {
		tags.push({ label: 'Strong reasoning', emoji: '🧠', source: 'ranking' });
	}

	// Math
	if (benchmarks.math !== null && benchmarks.math > 0) {
		tags.push({ label: 'Math & research', emoji: '📐', source: 'ranking' });
	}

	// Agentic (high coding + large context)
	const ctx = model?.context_window ?? 0;
	if (benchmarks.coding !== null && benchmarks.coding > 0 && ctx >= 500_000) {
		tags.push({ label: 'Agentic / autonomous', emoji: '🤖', source: 'computed' });
	}

	// Long context
	if (ctx >= 500_000) {
		tags.push({ label: `${formatContext(ctx)} context`, emoji: '📚', source: 'context' });
	}

	// Budget
	if (burnRate === 'slow') {
		tags.push({ label: 'Quota-friendly', emoji: '❄️', source: 'pricing' });
		tags.push({ label: 'High-volume budget', emoji: '⚡', source: 'pricing' });
	} else if (burnRate === 'fast') {
		tags.push({ label: 'Burns quota fast', emoji: '🔥', source: 'pricing' });
	}

	// Speed
	if (speed && speed.tokensPerSecond > 100) {
		tags.push({ label: 'Fast inference', emoji: '🚀', source: 'computed' });
	}

	// New / unranked
	if (!model) {
		tags.push({ label: 'New — benchmarking', emoji: '🆕', source: 'computed' });
	}

	// Deduplicate by label
	const seen = new Set<string>();
	return tags.filter((t) => {
		if (seen.has(t.label)) return false;
		seen.add(t.label);
		return true;
	});
}

// ─── Migration Hints ─────────────────────────────────────────────────────

function inferMigrationHints(
	goId: string,
	pricing: ModelPricing,
	benchmarks: ModelBenchmarks
): MigrationHint[] {
	const hints: MigrationHint[] = [];

	// Quality-to-price ratio hints based on benchmark scores
	if (benchmarks.coding && benchmarks.coding > 80) {
		hints.push({
			model: 'Claude Sonnet 4.6 / Opus 4.8',
			reason: `Comparable coding quality at ~${pricing.inputPricePerM < 1 ? '10x+' : '5x'} lower input cost`
		});
	}

	if (benchmarks.reasoning && benchmarks.reasoning > 80) {
		hints.push({
			model: 'GPT-5.4 / Claude Mythos',
			reason: 'Strong reasoning performance rivaling frontier closed-source models'
		});
	}

	// Budget alternative hints
	if (pricing.inputPricePerM < 0.3) {
		hints.push({
			model: 'Any API pay-per-token plan',
			reason: 'Included in $10/month Go subscription — no per-request billing'
		});
	}

	return hints;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function inferProvider(goId: string): string {
	if (goId.startsWith('deepseek')) return 'DeepSeek';
	if (goId.startsWith('qwen')) return 'Alibaba / Qwen Team';
	if (goId.startsWith('glm')) return 'Zhipu AI';
	if (goId.startsWith('kimi')) return 'Moonshot AI';
	if (goId.startsWith('minimax')) return 'MiniMax';
	if (goId.startsWith('mimo')) return 'Xiaomi';
	if (goId.startsWith('hy3')) return 'Unknown';
	return 'Unknown';
}

function inferContextWindow(goId: string): number {
	if (goId.includes('glm-5') || goId.includes('qwen3.6') || goId.includes('deepseek-v4-pro'))
		return 1_000_000;
	if (goId.includes('kimi-k2')) return 256_000;
	if (goId.includes('qwen3.7')) return 256_000;
	return 128_000;
}

function formatContext(tokens: number): string {
	if (tokens >= 1_000_000) return `${tokens / 1_000_000}M`;
	return `${Math.round(tokens / 1_000)}K`;
}
