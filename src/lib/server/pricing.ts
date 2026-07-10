import type { ModelgrepModelData, ModelPricing } from '$lib/types/models';

/**
 * Temporary fallback pricing for models not yet in the OpenCode Go docs page.
 * Sourced from OpenCode's own data pages (opencode.ai/data).
 * Auto-removes once docs page adds these models (docs pricing takes priority).
 */
function getTemporaryFallbackPricing(goId: string): ModelPricing | null {
	const fallbacks: Record<string, ModelPricing> = {
		'mimo-v2-pro': {
			inputPricePerM: 1.0,
			outputPricePerM: 3.0,
			cachedReadPerM: null,
			source: 'go-api'
		},
		'mimo-v2-omni': {
			inputPricePerM: 0.4,
			outputPricePerM: 2.0,
			cachedReadPerM: null,
			source: 'go-api'
		}
	};
	return fallbacks[goId] ?? null;
}

/**
 * Infer pricing for a Go model.
 * Priority: 1) cached/scraped Go docs pricing, 2) temporary fallback from OpenCode data,
 *           3) modelgrep/OpenRouter pricing, 4) unknown.
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

	// 2. Temporary fallback from OpenCode data pages (for models not yet in docs)
	const fallback = getTemporaryFallbackPricing(goId);
	if (fallback) {
		return { ...fallback };
	}

	// 3. modelgrep / OpenRouter pricing (for comparison purposes)
	if (modelgrepModel?.pricing) {
		return {
			inputPricePerM: modelgrepModel.pricing.input,
			outputPricePerM: modelgrepModel.pricing.output,
			cachedReadPerM: modelgrepModel.pricing.cache_read ?? null,
			source: 'modelgrep'
		};
	}

	// 4. No pricing available
	return {
		inputPricePerM: null,
		outputPricePerM: null,
		cachedReadPerM: null,
		source: 'unknown'
	};
}
