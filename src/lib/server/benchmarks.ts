import type {
	LLMStatsModel,
	LLMStatsRanking,
	ModelBenchmarks,
	BenchmarkDisplay
} from '$lib/types/models';
import { goIdToName } from './opencode-go';

// ─── Convention-based ID mapping ───────────────────────────────────────

/** Map Go model IDs to LLM Stats model IDs where naming conventions align. */
const CONVENTION_MAP: Record<string, string> = {
	'deepseek-v4-pro': 'deepseek-v4-pro-max',
	'deepseek-v4-flash': 'deepseek-v4-flash-max',
	'glm-5.2': 'glm-5.2',
	'glm-5.1': 'glm-5.1',
	'kimi-k2.7-code': 'kimi-k2.7-code',
	'kimi-k2.6': 'kimi-k2.6',
	'mimo-v2.5': 'mimo-v2.5',
	'mimo-v2.5-pro': 'mimo-v2.5-pro',
	'minimax-m3': 'minimax-m3',
	'minimax-m2.7': 'minimax-m2.7',
	'qwen3.7-max': 'qwen3.7-max',
	'qwen3.7-plus': 'qwen3.7-plus',
	'qwen3.6-plus': 'qwen3.6-plus'
};

export function goIdToLlmStatsId(goId: string): string | undefined {
	return CONVENTION_MAP[goId];
}

// ─── Levenshtein distance ─────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			dp[i][j] =
				a[i - 1] === b[j - 1]
					? dp[i - 1][j - 1]
					: 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
		}
	}
	return dp[m][n];
}

function similarity(a: string, b: string): number {
	if (a.length === 0 && b.length === 0) return 1;
	const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
	const maxLen = Math.max(a.length, b.length);
	return 1 - dist / maxLen;
}

const SIMILARITY_THRESHOLD = 0.85;

// ─── Model matching ───────────────────────────────────────────────────

/** Try to match a Go model ID to an LLM Stats model entry. */
export function matchModel(
	goId: string,
	llmModels: LLMStatsModel[]
): { model: LLMStatsModel; confidence: number } | null {
	// 1. Convention map
	const llmId = goIdToLlmStatsId(goId);
	if (llmId) {
		const exact = llmModels.find((m) => m.id === llmId);
		if (exact) return { model: exact, confidence: 1.0 };
	}

	// 2. Levenshtein on display names
	const goName = goIdToName(goId).toLowerCase();
	let best: { model: LLMStatsModel; confidence: number } | null = null;
	for (const m of llmModels) {
		const sim = similarity(goName, m.name);
		if (sim >= SIMILARITY_THRESHOLD && (!best || sim > best.confidence)) {
			best = { model: m, confidence: sim };
		}
	}

	return best;
}

// ─── Ranking matching ─────────────────────────────────────────────────

/** Match a Go model ID to a ranking entry. */
export function matchRanking(
	goId: string,
	rankings: LLMStatsRanking[]
): { ranking: LLMStatsRanking; confidence: number } | null {
	const llmId = goIdToLlmStatsId(goId);
	if (llmId) {
		// Match by model_id (uses hyphens like our convention map)
		const exact = rankings.find((r) => r.model_id === llmId);
		if (exact) return { ranking: exact, confidence: 1.0 };
	}

	// Fallback: Levenshtein on display names
	const goName = goIdToName(goId).toLowerCase();
	let best: { ranking: LLMStatsRanking; confidence: number } | null = null;
	for (const r of rankings) {
		const sim = similarity(goName, r.model_name);
		if (sim >= SIMILARITY_THRESHOLD && (!best || sim > best.confidence)) {
			best = { ranking: r, confidence: sim };
		}
	}

	return best;
}

// ─── Benchmark extraction ─────────────────────────────────────────────

export function extractAllScores(model: LLMStatsModel | null): Record<string, number> {
	if (!model?.top_scores) return {};
	return { ...model.top_scores };
}

/**
 * Find a key in scores object matching ALL specified substrings.
 * Uses exact word-boundary matching when possible.
 */
export function findScoreKey(
	scores: Record<string, number>,
	...needles: string[]
): string | undefined {
	return Object.keys(scores).find((k) => {
		const lower = k.toLowerCase();
		return needles.every((n) => {
			const nLower = n.toLowerCase();
			// Match whole word or hyphenated segment
			return lower === nLower || lower.includes(`-${nLower}`) || lower.includes(`${nLower}-`);
		});
	});
}

// ─── Benchmark assemble ───────────────────────────────────────────────

export function computeBenchmarks(
	model: LLMStatsModel | null,
	codingRank: LLMStatsRanking | null,
	reasoningRank: LLMStatsRanking | null,
	mathRank: LLMStatsRanking | null
): ModelBenchmarks {
	const allScores = extractAllScores(model);
	const sweBenchKey = findScoreKey(allScores, 'swe-bench');
	const arenaKey = findScoreKey(allScores, 'code-arena');

	return {
		coding: codingRank?.conservative_rating ?? null,
		reasoning: reasoningRank?.conservative_rating ?? null,
		math: mathRank?.conservative_rating ?? null,
		sweBenchVerified: sweBenchKey ? allScores[sweBenchKey] : null,
		codeArena: arenaKey ? allScores[arenaKey] : null,
		allScores
	};
}

// ─── TrueSkill display calibration ────────────────────────────────────

const DEFAULT_BAR_MAX = 60;

/** Compute a calibrated display for a TrueSkill benchmark value. */
export function computeBenchmarkDisplay(
	rawValue: number | null,
	allValues: number[]
): BenchmarkDisplay {
	if (rawValue == null || rawValue < 1) {
		return { rawValue: null, percentile: null, barWidth: 0, barMax: DEFAULT_BAR_MAX };
	}

	// Calibrate bar max to the better of DEFAULT_BAR_MAX or max in set
	const maxInSet = allValues.length > 0 ? Math.max(...allValues) : DEFAULT_BAR_MAX;
	const barMax = Math.max(DEFAULT_BAR_MAX, maxInSet);

	// Percentile: percentage of models this model beats
	const worse = allValues.filter((v) => v < rawValue).length;
	const percentile = allValues.length > 0 ? Math.round((worse / allValues.length) * 100) : null;

	return {
		rawValue,
		percentile,
		barWidth: Math.min(100, Math.round((rawValue / barMax) * 100)),
		barMax
	};
}
