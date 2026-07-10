import type { ModelgrepModelData, ModelPricing } from '$lib/types/models';

/**
 * Infer pricing for a Go model.
 * Priority: 1) cached/scraped Go docs pricing, 2) modelgrep/OpenRouter pricing,
 *           3) unknown.
 */
export function inferPricing(
	goId: string,
	modelgrepModel: ModelgrepModelData | null,
	docsPricing?: Record<string, ModelPricing>
): ModelPricing {
	// 1. Cached or freshly scraped from OpenCode Go docs page
	if (docsPricing?.[goId]) {
		return { ...docsPricing[goId], source: 'go-docs' };
	}

	// 2. modelgrep / OpenRouter pricing (for comparison purposes)
	if (modelgrepModel?.pricing) {
		return {
			inputPricePerM: modelgrepModel.pricing.input,
			outputPricePerM: modelgrepModel.pricing.output,
			cachedReadPerM: modelgrepModel.pricing.cache_read ?? null,
			source: 'modelgrep'
		};
	}

	// 3. No pricing available
	return {
		inputPricePerM: null,
		outputPricePerM: null,
		cachedReadPerM: null,
		source: 'unknown'
	};
}
