import type { BurnBand, BurnDetails, ModelPricing } from '$lib/types/models';
import { estimateQuota, DEFAULT_QUOTA_INPUTS } from './quota';

const BURN_SCORE_MAX = 30_000;

/** Compute continuous burn score (0-100) from requests per $12 window. */
export function computeBurnScore(requestsPer12: number): number {
	if (requestsPer12 <= 0) return 0;
	const raw = (requestsPer12 / BURN_SCORE_MAX) * 100;
	return Math.min(100, Math.max(0, Math.round(raw)));
}

/** Map a burn score to a named band. */
export function scoreToBand(score: number): BurnBand {
	if (score >= 80) return 'excellent';
	if (score >= 60) return 'good';
	if (score >= 40) return 'moderate';
	if (score >= 20) return 'high';
	return 'extreme';
}

/** Infer burn details from pricing using default token assumptions. */
export function inferBurnDetails(pricing: ModelPricing): BurnDetails {
	const quota = estimateQuota(
		pricing,
		DEFAULT_QUOTA_INPUTS.inputTokens,
		DEFAULT_QUOTA_INPUTS.outputTokens,
		DEFAULT_QUOTA_INPUTS.cachedInputTokens
	);

	if (!quota) {
		return { score: 0, requestsPer12: null, band: null };
	}

	const score = computeBurnScore(quota.requestsPer5h);
	return {
		score,
		requestsPer12: quota.requestsPer5h,
		band: scoreToBand(score)
	};
}
