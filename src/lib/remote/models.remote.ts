import { query } from '$app/server';
import { cacheGet, cacheSet, MODELS_TTL } from '$lib/cache';
import { fetchGoModels, goIdToName } from '$lib/server/opencode-go';
import { fetchLLMStatsModels, fetchLLMStatsRankings } from '$lib/server/llm-stats';
import { inferModel } from '$lib/server/inference';
import type { GoModel } from '$lib/types/models';

const CACHE_KEY = 'go-models-enriched-v4';

/**
 * Fetch all enriched Go models.
 * Uses stale-while-revalidate: returns cached data instantly,
 * refreshes in background if stale.
 */
export const getModels = query(async () => {
	const cached = cacheGet<GoModel[]>(CACHE_KEY);

	// Return stale data immediately, refresh in background
	if (cached && cached.stale) {
		// ponytail: fire-and-forget refresh, don't await
		refreshCache().catch(console.error);
		return cached.data;
	}

	// Fresh cache hit
	if (cached && !cached.stale) {
		return cached.data;
	}

	// Cold start — must fetch
	return await refreshCache();
});

// ─── Internal ─────────────────────────────────────────────────────────────

async function refreshCache(): Promise<GoModel[]> {
	const [goModels, llmModels, codingRankings, reasoningRankings, mathRankings] = await Promise.all([
		fetchGoModels(),
		fetchLLMStatsModels().catch((e) => { console.error('[refreshCache] LLM Stats models failed:', e.message); return []; }),
		fetchLLMStatsRankings('coding', 50).catch((e) => { console.error('[refreshCache] coding rankings failed:', e.message); return []; }),
		fetchLLMStatsRankings('reasoning', 50).catch((e) => { console.error('[refreshCache] reasoning rankings failed:', e.message); return []; }),
		fetchLLMStatsRankings('math', 50).catch((e) => { console.error('[refreshCache] math rankings failed:', e.message); return []; })
	]);

	console.log(`[refreshCache] goModels=${goModels.length} llmModels=${llmModels.length} codingRanks=${codingRankings.length} reasoningRanks=${reasoningRankings.length} mathRanks=${mathRankings.length}`);

	const enriched = goModels.map((gm) => {
		const llmModel =
			llmModels.find(
				(m) =>
					m.name.toLowerCase().includes(goIdToName(gm.id).toLowerCase()) ||
					goIdToName(gm.id).toLowerCase().includes(m.name.toLowerCase())
			) ?? null;

		return inferModel(gm.id, llmModel, codingRankings, reasoningRankings, mathRankings);
	});

	cacheSet(CACHE_KEY, enriched, MODELS_TTL);
	return enriched;
}
