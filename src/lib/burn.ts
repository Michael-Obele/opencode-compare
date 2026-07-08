export type BurnRate = 'slow' | 'medium' | 'fast';

/** Tailwind classes for a thermal-burn badge. */
export function burnClasses(rate: BurnRate | string): string {
	switch (rate) {
		case 'slow':
			return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
		case 'medium':
			return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
		case 'fast':
			return 'bg-red-500/10 text-red-500 border-red-500/20';
		default:
			return 'bg-muted text-muted-foreground border-border';
	}
}

/** Human-readable burn label. */
export function burnLabel(rate: BurnRate | string): string {
	switch (rate) {
		case 'slow':
			return 'Slow burn';
		case 'fast':
			return 'Fast burn';
		case 'medium':
			return 'Moderate';
		default:
			return 'Unknown';
	}
}

/** Compute a burn rate from combined price per 1M tokens. */
export function burnRateFromPrice(totalPricePerM: number): BurnRate {
	if (totalPricePerM < 1.5) return 'slow';
	if (totalPricePerM < 6) return 'medium';
	return 'fast';
}

import type { BurnBand } from '$lib/types/models';

export function burnBandFromScore(score: number): BurnBand {
	if (score >= 80) return 'excellent';
	if (score >= 60) return 'good';
	if (score >= 40) return 'moderate';
	if (score >= 20) return 'high';
	return 'extreme';
}

export function burnBandLabel(band: BurnBand): string {
	switch (band) {
		case 'excellent': return 'Excellent';
		case 'good': return 'Good';
		case 'moderate': return 'Moderate';
		case 'high': return 'High';
		case 'extreme': return 'Extreme';
	}
}

export function burnBandColor(band: BurnBand): string {
	switch (band) {
		case 'excellent': return 'text-cyan-500';
		case 'good': return 'text-emerald-500';
		case 'moderate': return 'text-amber-500';
		case 'high': return 'text-orange-500';
		case 'extreme': return 'text-red-500';
	}
}
