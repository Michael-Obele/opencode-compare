/** modelgrep.com API client — fetches model benchmarks, pricing, and speed data. */

import type { ModelgrepModelData } from '$lib/types/models';
import { goIdToName } from './opencode-go';

const MODELGREP_BASE = 'https://modelgrep.com/api/v1';

/**
 * Go model ID → modelgrep model ID mapping.
 * Hand-curated for fast path. Models not in this map fall back to fuzzy
 * name matching, so new Go models auto-resolve without code changes.
 */
const GO_TO_MODELGREP: Record<string, string> = {
	'deepseek-v4-pro': 'deepseek/deepseek-v4-pro',
	'deepseek-v4-flash': 'deepseek/deepseek-v4-flash',
	'glm-5.2': 'z-ai/glm-5.2',
	'glm-5.1': 'z-ai/glm-5.1',
	'glm-5': 'z-ai/glm-5',
	'kimi-k2.7-code': 'moonshotai/kimi-k2.7-code',
	'kimi-k2.6': 'moonshotai/kimi-k2.6',
	'kimi-k2.5': 'moonshotai/kimi-k2.5',
	'mimo-v2.5': 'xiaomi/mimo-v2.5',
	'mimo-v2.5-pro': 'xiaomi/mimo-v2.5-pro',
	'mimo-v2-pro': 'xiaomi/mimo-v2-pro',
	'mimo-v2-omni': 'xiaomi/mimo-v2-omni',
	'minimax-m3': 'minimax/minimax-m3',
	'minimax-m2.7': 'minimax/minimax-m2.7',
	'minimax-m2.5': 'minimax/minimax-m2.5',
	'qwen3.7-max': 'qwen/qwen3.7-max',
	'qwen3.7-plus': 'qwen/qwen3.7-plus',
	'qwen3.6-plus': 'qwen/qwen3.6-plus',
	'qwen3.5-plus': 'qwen/qwen3.5-plus-20260420'
};

/**
 * Result of a modelgrep fetch: indexed map for fast exact lookups,
 * plus flat array for fuzzy fallback matching.
 */
export interface ModelgrepResult {
	byId: Map<string, ModelgrepModelData>;
	all: ModelgrepModelData[];
}

/** Batch-fetch all models by maker and index by modelgrep ID. */
export async function fetchModelgrepModels(): Promise<ModelgrepResult> {
	const makers = ['deepseek', 'z-ai', 'moonshotai', 'xiaomi', 'minimax', 'qwen'];
	const results = await Promise.all(
		makers.map(async (maker) => {
			const url = `${MODELGREP_BASE}/models?q=${maker}&limit=30`;
			try {
				const res = await fetch(url);
				if (!res.ok) {
					console.error(`[modelgrep] ${maker} returned ${res.status}: ${res.statusText}`);
					return [];
				}
				const json = await res.json();
				return (json.data ?? []) as ModelgrepModelData[];
			} catch (e) {
				console.error(`[modelgrep] ${maker} fetch failed:`, e);
				return [];
			}
		})
	);

	const all = results.flat();
	const byId = new Map<string, ModelgrepModelData>();
	for (const model of all) {
		byId.set(model.id, model);
	}
	return { byId, all };
}

/** Look up modelgrep model ID for a Go model ID (exact map only). */
export function goIdToModelgrepId(goId: string): string | undefined {
	return GO_TO_MODELGREP[goId];
}

// ─── Fuzzy matching (fallback for models not in the exact map) ─────────────
// ponytail: naive inclusion match. Replace with levenshtein if model names drift.

function normalize(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function similarity(a: string, b: string): number {
	const [na, nb] = [normalize(a), normalize(b)];
	if (na === nb) return 1;
	if (na.includes(nb) || nb.includes(na)) return 0.85;
	return 0;
}

const SIMILARITY_THRESHOLD = 0.7;

/**
 * Try to fuzzy-match a Go model to a modelgrep model by name.
 * Checks against: display name, maker-stripped name, and modelgrep model ID suffix.
 * Returns null if no model meets the threshold.
 */
export function fuzzyMatchModelgrep(
	goId: string,
	allModels: ModelgrepModelData[]
): ModelgrepModelData | null {
	const goName = goIdToName(goId).toLowerCase();
	let best: ModelgrepModelData | null = null;
	let bestScore = 0;

	for (const model of allModels) {
		// Strip "Maker: " prefix from modelgrep names (e.g. "DeepSeek: DeepSeek V4 Pro" → "DeepSeek V4 Pro")
		const strippedName = model.name.includes(': ') ? model.name.split(': ')[1] : model.name;
		// Last segment of modelgrep ID (e.g. "deepseek-v4-pro" from "deepseek/deepseek-v4-pro")
		const idSuffix = model.id.split('/').pop() ?? '';

		const sim = Math.max(
			similarity(goName, model.name.toLowerCase()),
			similarity(goName, strippedName.toLowerCase()),
			similarity(goName, idSuffix.toLowerCase())
		);

		if (sim >= SIMILARITY_THRESHOLD && sim > bestScore) {
			best = model;
			bestScore = sim;
		}
	}

	if (best) {
		console.log(
			`[modelgrep] fuzzy matched "${goId}" → "${best.id}" (score: ${bestScore.toFixed(2)})`
		);
	}
	return best;
}
