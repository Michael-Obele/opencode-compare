/**
 * LLM Stats API client — fetches model benchmark scores from llm-stats.com.
 *
 * API docs: https://docs.llm-stats.com/api-reference/list-models
 * Base: https://api.llm-stats.com/stats/v1/models
 * Auth: Bearer token via LLM_STATS_API_KEY env var
 */

import type { LlmStatsModel } from '$lib/types/models';

const LLM_STATS_BASE = 'https://api.llm-stats.com/stats/v1/models';

/** Organizations we care about (maps to our Go model providers). */
const RELEVANT_ORGS = ['deepseek', 'zai-org', 'moonshotai', 'xiaomi', 'minimax', 'qwen'];

/**
 * Fetch all models from the LLM Stats API, filtered to relevant organizations.
 * Uses pagination via next_cursor. Returns empty array on failure.
 */
export async function fetchLlmStatsModels(apiKey: string): Promise<LlmStatsModel[]> {
	const allModels: LlmStatsModel[] = [];
	let cursor: string | null = null;

	try {
		while (true) {
			const params = new URLSearchParams({ limit: '200' });
			if (cursor) params.set('cursor', cursor);

			const res = await fetch(`${LLM_STATS_BASE}?${params.toString()}`, {
				headers: {
					Authorization: `Bearer ${apiKey}`,
					Accept: 'application/json'
				}
			});

			if (!res.ok) {
				console.error(`[llm-stats] API returned ${res.status}: ${res.statusText}`);
				break;
			}

			const json = await res.json();
			const models = (json.models ?? []) as LlmStatsModel[];
			allModels.push(...models);

			cursor = json.next_cursor ?? null;
			if (!cursor) break;
		}

		console.log(`[llm-stats] fetched ${allModels.length} models total`);
		return allModels;
	} catch (e) {
		console.error('[llm-stats] fetch failed:', e instanceof Error ? e.message : String(e));
		return [];
	}
}

/**
 * Filter to only models from organizations we care about.
 */
export function filterRelevantModels(models: LlmStatsModel[]): LlmStatsModel[] {
	return models.filter((m) => {
		const orgId = m.organization?.id ?? '';
		return RELEVANT_ORGS.includes(orgId);
	});
}

// ─── Model Matching ───────────────────────────────────────────────────────

/**
 * Normalize a model ID for comparison: lowercase, strip dots and dashes.
 */
function normalize(id: string): string {
	return id.toLowerCase().replace(/[.-]/g, '');
}

/**
 * Match a Go model ID to an LLM Stats model.
 *
 * Strategy (in order of precedence):
 * 1. Exact ID match
 * 2. Normalized exact match (ignoring dots/dashes)
 * 3. Fuzzy: Go ID is a prefix of LS ID (e.g., "deepseek-v4-flash" → "deepseek-v4-flash-max")
 * 4. Fuzzy: normalized substring inclusion (e.g., "glm-5" matches "glm-5")
 */
export function matchLlmStatsModel(
	goId: string,
	relevantModels: LlmStatsModel[]
): LlmStatsModel | null {
	const goNorm = normalize(goId);

	// Pass 1: Exact match
	const exact = relevantModels.find((m) => m.id === goId);
	if (exact) return exact;

	// Pass 2: Normalized exact match
	const normExact = relevantModels.find((m) => normalize(m.id) === goNorm);
	if (normExact) return normExact;

	// Pass 3: Go ID is a prefix of LS model ID
	const prefix = relevantModels.find((m) => {
		const lsNorm = normalize(m.id);
		return lsNorm.startsWith(goNorm) && lsNorm.length > goNorm.length;
	});
	if (prefix) return prefix;

	// Pass 4: Normalized substring inclusion (prefer exact-length match)
	const candidates = relevantModels.filter((m) => normalize(m.id).includes(goNorm));
	if (candidates.length === 1) return candidates[0];
	if (candidates.length > 1) {
		// Prefer the one with the same normalized length (not "glm-5" matching "glm-5v-turbo")
		const sameLen = candidates.find((m) => normalize(m.id).length === goNorm.length);
		return sameLen ?? candidates[0];
	}

	return null;
}
