// OpenCode Go model with enriched metadata

export interface GoModel {
	/** Model ID for OpenCode config (e.g. "opencode-go/deepseek-v4-pro") */
	id: string;
	/** Display name (e.g. "DeepSeek V4 Pro") */
	name: string;
	/** Provider (e.g. "DeepSeek", "Alibaba", "Zhipu AI") */
	provider: string;
	/** Description from modelgrep */
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

	/** Benchmark scores from modelgrep */
	benchmarks: ModelBenchmarks;

	/** Speed metrics from modelgrep */
	speed: ModelSpeed | null;

	/** Migration hints: closed-source models this replaces */
	migrationHints: MigrationHint[];

	/** OpenCode endpoint type */
	endpoint: 'openai-compatible' | 'anthropic-compatible';

	/** API endpoint URL */
	endpointUrl: string;

	/** Whether model is new (not yet in modelgrep) */
	isNew: boolean;

	/** Modelgrep model ID (e.g. "deepseek/deepseek-v4-pro"), null if unmatched */
	modelgrepId: string | null;

	/** Last time this data was fetched */
	fetchedAt: number;
}

import type { BurnRate } from '$lib/burn';
export type { BurnRate };

/** Where model pricing data came from */
export type PricingSource = 'go-docs' | 'go-api' | 'modelgrep' | 'unknown';

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
	/** Lucide icon name (e.g. "code", "brain", "zap") */
	icon: string;
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

// modelgrep.com API response types (aggregates OpenRouter + Artificial Analysis)

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

// OpenCode Go API response

export interface GoModelEntry {
	id: string;
	object: 'model';
	created: number;
	owned_by: 'opencode';
}
