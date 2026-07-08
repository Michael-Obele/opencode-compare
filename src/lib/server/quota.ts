import type { ModelPricing } from '$lib/types/models';

export interface QuotaResult {
	costPerRequest: number;
	requestsPer5h: number;
	requestsPerWeek: number;
	requestsPerMonth: number;
}

export const DEFAULT_QUOTA_INPUTS = {
	inputTokens: 1000,
	outputTokens: 500,
	cachedInputTokens: 500
} as const;

/**
 * Estimate quota usage for a model given token assumptions.
 * Returns null if pricing data is incomplete.
 */
export function estimateQuota(
	pricing: ModelPricing,
	inputTokens: number,
	outputTokens: number,
	cachedInputTokens: number
): QuotaResult | null {
	if (pricing.inputPricePerM == null || pricing.outputPricePerM == null) {
		return null;
	}

	const uncachedInputTokens = Math.max(0, inputTokens - cachedInputTokens);
	const cachedRate = pricing.cachedReadPerM ?? pricing.inputPricePerM;

	const costPerRequest =
		(uncachedInputTokens * pricing.inputPricePerM +
			cachedInputTokens * cachedRate +
			outputTokens * pricing.outputPricePerM) /
		1_000_000;

	if (costPerRequest <= 0) {
		return {
			costPerRequest: 0,
			requestsPer5h: 0,
			requestsPerWeek: 0,
			requestsPerMonth: 0
		};
	}

	return {
		costPerRequest,
		requestsPer5h: Math.round(12 / costPerRequest),
		requestsPerWeek: Math.round(30 / costPerRequest),
		requestsPerMonth: Math.round(60 / costPerRequest)
	};
}
