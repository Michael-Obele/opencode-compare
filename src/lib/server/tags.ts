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
