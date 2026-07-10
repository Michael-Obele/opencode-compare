import type {
	ModelgrepModelData,
	ModelBenchmarks,
	ModelSpeed,
	ModelTag,
	BurnDetails
} from '$lib/types/models';

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
		return [{ label: 'Top-tier coding', icon: 'code', source: 'ranking' }];
	}
	if (benchmarks.coding > 40) {
		return [{ label: 'Solid coding', icon: 'wrench', source: 'ranking' }];
	}
	return [];
}

function competitiveTags(benchmarks: ModelBenchmarks): ModelTag[] {
	if (benchmarks.sweBenchVerified != null && benchmarks.sweBenchVerified > 50) {
		return [{ label: 'Competitive programming', icon: 'swords', source: 'computed' }];
	}
	return [];
}

function reasoningTags(mgModel: ModelgrepModelData | null): ModelTag[] {
	const aaIntel = mgModel?.benchmarks?.artificial_analysis?.intelligence;
	if (aaIntel != null && aaIntel > 30) {
		return [{ label: 'Strong reasoning', icon: 'brain', source: 'ranking' }];
	}
	return [];
}

function agenticTags(benchmarks: ModelBenchmarks, ctx: number): ModelTag[] {
	if (benchmarks.coding != null && benchmarks.coding > 0 && ctx >= 256_000) {
		return [{ label: 'Agentic / autonomous', icon: 'bot', source: 'computed' }];
	}
	return [];
}

function contextTags(ctx: number): ModelTag[] {
	if (ctx >= 500_000) {
		const label = ctx >= 1_000_000 ? '1M context' : `${Math.round(ctx / 1_000)}K context`;
		return [{ label, icon: 'book-open', source: 'context' }];
	}
	return [];
}

function budgetTags(burnDetails: BurnDetails): ModelTag[] {
	if (burnDetails.band === 'excellent' || burnDetails.band === 'good') {
		return [
			{ label: 'Quota-friendly', icon: 'snowflake', source: 'pricing' },
			{ label: 'High-volume budget', icon: 'zap', source: 'pricing' }
		];
	}
	if (burnDetails.band === 'extreme') {
		return [{ label: 'Burns quota fast', icon: 'flame', source: 'pricing' }];
	}
	return [];
}

function speedTags(speed: ModelSpeed | null): ModelTag[] {
	if (speed && speed.tokensPerSecond > 100) {
		return [{ label: 'Fast inference', icon: 'rocket', source: 'computed' }];
	}
	return [];
}

function newModelTag(mgModel: ModelgrepModelData | null): ModelTag[] {
	if (!mgModel) {
		return [{ label: 'New — benchmarking', icon: 'sparkles', source: 'computed' }];
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
