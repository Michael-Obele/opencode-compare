import type {
	LLMStatsModel,
	LLMStatsRanking,
	ModelBenchmarks,
	ModelSpeed,
	ScenarioScores,
	BurnDetails,
	ModelPricing
} from '$lib/types/models';

interface ScenarioInputs {
	goId: string;
	pricing: ModelPricing;
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
	if (benchmarks.codeArena != null) {
		score += normalize(benchmarks.codeArena, 80) * 0.4;
		weight += 0.4;
	}
	return weight > 0 ? score / weight : 0;
}

function scoreFitCompetitive(rankPercentile: number): number {
	return 0.5 + rankPercentile * 0.5;
}

function scoreQualityAgentic(benchmarks: ModelBenchmarks): number {
	return scoreQualityCoding(benchmarks);
}

function scoreFitAgentic(ctx: number, speed: ModelSpeed | null, model: LLMStatsModel | null): number {
	let score = 0;
	let weight = 0;
	score += normalize(Math.min(ctx, 1_000_000), 1_000_000) * 0.5;
	weight += 0.5;
	if (speed?.tokensPerSecond) {
		score += normalize(speed.tokensPerSecond, 200) * 0.3;
		weight += 0.3;
	}
	if (model?.inference?.supports_tools != null) {
		score += (model.inference.supports_tools ? 1 : 0.3) * 0.2;
		weight += 0.2;
	}
	return weight > 0 ? score / weight : 0.3;
}

function scoreQualityBudget(
	pricing: ModelPricing,
	burnDetails: BurnDetails
): number {
	let score = 0;
	let weight = 0;
	if (pricing.inputPricePerM != null && pricing.outputPricePerM != null) {
		const totalPrice = pricing.inputPricePerM + pricing.outputPricePerM;
		score += Math.max(0, 1 - totalPrice / 10) * 0.5;
		weight += 0.5;
	}
	if (burnDetails.band != null) {
		score += normalize(burnDetails.score, 100) * 0.5;
		weight += 0.5;
	}
	return weight > 0 ? score / weight : 0;
}

function scoreFitBudget(): number {
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
