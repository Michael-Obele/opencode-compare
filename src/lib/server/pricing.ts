import type { LLMStatsModel, LLMStatsRanking, ModelPricing } from '$lib/types/models';
import { getFallbackPricingMap, goIdToName } from './opencode-go';
import { goIdToLlmStatsId } from './benchmarks';

export function inferPricing(
	goId: string,
	model: LLMStatsModel | null,
	allRankings?: LLMStatsRanking[]
): ModelPricing {
	// 1. OpenCode Go docs pricing — this is what Go subscribers actually pay.
	//    Most Go models have published pricing in the Go docs.
	const map = getFallbackPricingMap();
	const known = map[goId];
	if (known) {
		return { ...known };
	}

	// 2. LLM Stats provider data (for models not on Go plan)
	if (model?.providers?.length) {
		const bestProvider = model.providers.find(
			(p) => p.available !== false && p.input_price_per_m != null
		);
		if (bestProvider) {
			return {
				inputPricePerM: bestProvider.input_price_per_m!,
				outputPricePerM: bestProvider.output_price_per_m ?? bestProvider.input_price_per_m! * 3,
				cachedReadPerM: null,
				source: 'llm-stats'
			};
		}
	}

	// 3. Ranking min_input_price (last resort, no cached info)
	if (allRankings?.length) {
		const llmId = goIdToLlmStatsId(goId);
		const goName = goIdToName(goId).toLowerCase();
		const match = allRankings.find(
			(r) =>
				(llmId && r.model_id === llmId) ||
				r.model_id === goId ||
				(model &&
					(r.model_id === model.id || r.model_name.toLowerCase() === model.name.toLowerCase())) ||
				r.model_name.toLowerCase() === goName ||
				r.model_name.toLowerCase().includes(goName) ||
				goName.includes(r.model_name.toLowerCase())
		);
		if (match?.min_input_price != null) {
			return {
				inputPricePerM: match.min_input_price,
				outputPricePerM: match.min_input_price * 3,
				cachedReadPerM: null,
				source: 'llm-stats'
			};
		}
	}

	// 4. No pricing available — return nulls
	return {
		inputPricePerM: null,
		outputPricePerM: null,
		cachedReadPerM: null,
		source: 'unknown'
	};
}
