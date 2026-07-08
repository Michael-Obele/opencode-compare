// OpenCode Go model with enriched metadata

export interface GoModel {
	/** Model ID for OpenCode config (e.g. "opencode-go/deepseek-v4-pro") */
	id: string;
	/** Display name (e.g. "DeepSeek V4 Pro") */
	name: string;
	/** Provider (e.g. "DeepSeek", "Alibaba", "Zhipu AI") */
	provider: string;
	/** Description from LLM Stats */
	description: string;
	/** Open-weight or proprietary */
	openWeight: boolean;
	/** Context window in tokens */
	contextWindow: number | null;
	/** Release date */
	releaseDate: string | null;

	/** Pricing per 1M tokens */
	pricing: ModelPricing;

	/** Burn efficiency details */
	burnDetails: BurnDetails;

	/** Estimated requests per Go quota window */
	quota: {
		requestsPer5h: number;
		requestsPerWeek: number;
		requestsPerMonth: number;
	};

	/** Burn rate tier based on pricing */
	burnRate: BurnRate;

	/** Per-scenario fit scores (0-100) */
	scenarioScores: ScenarioScores;

	/** Algorithmically inferred tags */
	tags: ModelTag[];

	/** Benchmark scores from LLM Stats */
	benchmarks: ModelBenchmarks;

	/** Speed metrics from LLM Stats inference block */
	speed: ModelSpeed | null;

	/** Migration hints: closed-source models this replaces */
	migrationHints: MigrationHint[];

	/** OpenCode endpoint type */
	endpoint: 'openai-compatible' | 'anthropic-compatible';

	/** API endpoint URL */
	endpointUrl: string;

	/** Whether model is new (not yet in LLM Stats) */
	isNew: boolean;

	/** Link to compare on LLM Stats */
	llmStatsUrl: string;

	/** Last time this data was fetched */
	fetchedAt: number;
}

import type { BurnRate } from '$lib/burn';
export type { BurnRate };

/** Where model pricing data came from */
export type PricingSource = 'llm-stats' | 'fallback-map' | 'unknown';

/** Named burn efficiency band */
export type BurnBand = 'excellent' | 'good' | 'moderate' | 'high' | 'extreme';

/** Shared pricing interface */
export interface ModelPricing {
	inputPricePerM: number | null;
	outputPricePerM: number | null;
	cachedReadPerM: number | null;
	source: PricingSource;
}

/** Detailed burn efficiency */
export interface BurnDetails {
	score: number;
	requestsPer12: number | null;
	band: BurnBand | null;
}

/** TrueSkill-aware benchmark display info */
export interface BenchmarkDisplay {
	rawValue: number | null;
	percentile: number | null;
	barWidth: number;
	barMax: number;
}

export interface ScenarioScores {
	brainstorming: number;
	coding: number;
	competitive: number;
	agentic: number;
	budget: number;
}

export interface ModelTag {
	label: string;
	emoji: string;
	/** How this tag was derived */
	source: 'ranking' | 'context' | 'pricing' | 'computed';
}

export interface ModelBenchmarks {
	coding: number | null;
	reasoning: number | null;
	math: number | null;
	sweBenchVerified: number | null;
	codeArena: number | null;
	/** All raw scores keyed by benchmark name */
	allScores: Record<string, number>;
}

export interface ModelSpeed {
	tokensPerSecond: number;
	timeToFirstToken: number | null;
}

export interface MigrationHint {
	/** Closed-source model name (e.g. "Claude Sonnet 4.6") */
	model: string;
	/** Why this is a replacement */
	reason: string;
}

// LLM Stats API response types (subset of what we use)

export interface LLMStatsModel {
	id: string;
	name: string;
	description: string;
	organization: { id: string; name: string };
	open_weight: boolean;
	context_window: number | null;
	release_date: string | null;
	providers: LLMStatsProvider[];
	top_scores: Record<string, number>;
	inference: LLMStatsInference | null;
	url: string;
	source: string;
}

export interface LLMStatsProvider {
	provider_id: string;
	provider_name: string;
	input_price_per_m: number | null;
	output_price_per_m: number | null;
	available: boolean;
	endpoint: string | null;
}

export interface LLMStatsInference {
	available: boolean;
	supports_vision: boolean;
	supports_tools: boolean;
	tokens_per_second?: number;
	time_to_first_token?: number;
}

export interface LLMStatsRanking {
	rank: number;
	model_id: string;
	model_name: string;
	organization: string;
	score: number;
}

// OpenCode Go API response

export interface GoModelEntry {
	id: string;
	object: 'model';
	created: number;
	owned_by: 'opencode';
}
