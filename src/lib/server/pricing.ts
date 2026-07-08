import type { LLMStatsModel, ModelPricing } from '$lib/types/models';
import { getFallbackPricingMap } from './opencode-go';

export function inferPricing(goId: string, model: LLMStatsModel | null): ModelPricing {
	// 1. Try LLM Stats provider data first
	if (model?.providers?.length) {
		const bestProvider = model.providers.find((p) => p.available && p.input_price_per_m != null);
		if (bestProvider) {
			return {
				inputPricePerM: bestProvider.input_price_per_m!,
				outputPricePerM: bestProvider.output_price_per_m ?? bestProvider.input_price_per_m! * 3,
				cachedReadPerM: null, // LLM Stats API doesn't expose cached pricing
				source: 'llm-stats'
			};
		}
	}

	// 2. Fallback to known pricing from OpenCode docs
	const map = getFallbackPricingMap();
	const known = map[goId];
	if (known) {
		return { ...known };
	}

	// 3. No pricing available — return nulls
	return {
		inputPricePerM: null,
		outputPricePerM: null,
		cachedReadPerM: null,
		source: 'unknown'
	};
}
