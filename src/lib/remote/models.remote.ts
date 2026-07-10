import { query } from '$app/server';
import { cacheGet, cacheSet, MODELS_TTL } from '$lib/cache';
import { fetchGoModels } from '$lib/server/opencode-go';
import {
	fetchModelgrepModels,
	goIdToModelgrepId,
	fuzzyMatchModelgrep
} from '$lib/server/modelgrep';
import { fetchGoDocsPricing } from '$lib/server/go-docs';
import { inferModel } from '$lib/server/inference';
import type { GoModel, ModelPricing } from '$lib/types/models';

const CACHE_KEY = 'go-models-enriched-v8';

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
	const [goModels, mgResult, docsPricing] = await Promise.all([
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
		})
	]);

	console.log(
		`[refreshCache] goModels=${goModels.length} modelgrepModels=${mgResult.byId.size} docsModels=${Object.keys(docsPricing).length}`
	);

	const filtered = goModels.filter((gm) => gm.id !== 'hy3-preview');
	const enriched = filtered.map((gm) => {
		// 1. Try exact map lookup
		const mgId = goIdToModelgrepId(gm.id);
		let mgModel = mgId ? (mgResult.byId.get(mgId) ?? null) : null;

		// 2. Fall back to fuzzy matching for models not in the map
		if (!mgModel) {
			mgModel = fuzzyMatchModelgrep(gm.id, mgResult.all);
		}

		return inferModel(gm.id, mgModel, docsPricing);
	});

	cacheSet(CACHE_KEY, enriched, MODELS_TTL);
	return enriched;
}
