import { query } from '$app/server';
import { cacheGet, cacheSet, MODELS_TTL } from '$lib/cache';
import { fetchGoModels } from '$lib/server/opencode-go';
import {
	fetchModelgrepModels,
	goIdToModelgrepId,
	fuzzyMatchModelgrep
} from '$lib/server/modelgrep';
import { fetchGoDocsPricing } from '$lib/server/go-docs';
import {
	fetchLlmStatsModels,
	filterRelevantModels,
	matchLlmStatsModel
} from '$lib/server/llm-stats';
import { inferModel } from '$lib/server/inference';
import type { GoModel, ModelPricing, LlmStatsModel } from '$lib/types/models';
import { LLM_STATS_API_KEY } from '$env/static/private';

const CACHE_KEY = 'go-models-enriched-v9';

/**
 * Fetch all enriched Go models.
 * Uses stale-while-revalidate: returns cached data instantly,
 * refreshes in background if stale.
 */
export const getModels = query(async () => {
	const cached = cacheGet<GoModel[]>(CACHE_KEY);

	if (cached && cached.stale) {
		refreshCache().catch(console.error);
		return cached.data;
	}

	if (cached && !cached.stale) {
		return cached.data;
	}

	return await refreshCache();
});

async function refreshCache(): Promise<GoModel[]> {
	const [goModels, mgResult, docsPricing, lsModels] = await Promise.all([
		fetchGoModels(),
		fetchModelgrepModels().catch((e: unknown) => {
			const msg = e instanceof Error ? e.message : String(e);
			console.error('[refreshCache] modelgrep failed:', msg);
			return { byId: new Map(), all: [] };
		}),
		fetchGoDocsPricing().catch((e: unknown) => {
			const msg = e instanceof Error ? e.message : String(e);
			console.error('[refreshCache] go-docs failed:', msg);
			return {} as Record<string, ModelPricing>;
		}),
		fetchLlmStatsModels(LLM_STATS_API_KEY).catch((e: unknown) => {
			const msg = e instanceof Error ? e.message : String(e);
			console.error('[refreshCache] llm-stats failed:', msg);
			return [] as LlmStatsModel[];
		})
	]);

	const relevantLs = filterRelevantModels(lsModels);

	console.log(
		`[refreshCache] goModels=${goModels.length} modelgrepModels=${mgResult.byId.size} docsModels=${Object.keys(docsPricing).length} llmStats=${lsModels.length} relevantLs=${relevantLs.length}`
	);

	// Pre-match each Go model to its llm-stats counterpart
	const lsMatchCache = new Map<string, LlmStatsModel | null>();
	for (const gm of goModels) {
		if (!lsMatchCache.has(gm.id)) {
			lsMatchCache.set(gm.id, matchLlmStatsModel(gm.id, relevantLs));
		}
	}

	const filtered = goModels.filter((gm) => gm.id !== 'hy3-preview');
	const enriched = filtered.map((gm) => {
		// 1. Try exact map lookup for modelgrep
		const mgId = goIdToModelgrepId(gm.id);
		let mgModel = mgId ? (mgResult.byId.get(mgId) ?? null) : null;

		// 2. Fall back to fuzzy matching for models not in the map
		if (!mgModel) {
			mgModel = fuzzyMatchModelgrep(gm.id, mgResult.all);
		}

		// 3. Get pre-matched llm-stats model
		const lsModel = lsMatchCache.get(gm.id) ?? null;

		return inferModel(gm.id, mgModel, docsPricing, lsModel);
	});

	cacheSet(CACHE_KEY, enriched, MODELS_TTL);
	return enriched;
}
