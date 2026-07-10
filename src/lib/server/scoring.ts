import type {
	ModelgrepModelData,
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
	mgModel: ModelgrepModelData | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function normalize(value: number, max: number): number {
	if (max <= 0) return 0;
	return Math.min(1, Math.max(0, value / max));
}

// ─── Two-axis scoring ─────────────────────────────────────────────────

function scoreQualityCoding(
	benchmarks: ModelBenchmarks,
	mgModel: ModelgrepModelData | null
): number {
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

function scoreQualityAgentic(
	benchmarks: ModelBenchmarks,
	mgModel: ModelgrepModelData | null
): number {
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
