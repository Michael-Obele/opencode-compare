<script lang="ts">
	import type { BurnDetails } from '$lib/types/models';
	import { Flame, Snowflake, Thermometer } from '@lucide/svelte';

	interface Props {
		burnDetails: BurnDetails | null;
		showScore?: boolean;
		showRaw?: boolean;
	}

	let { burnDetails, showScore = true, showRaw = false }: Props = $props();

	let bandLabel = $derived.by(() => {
		if (!burnDetails?.band) return 'Unknown';
		switch (burnDetails.band) {
			case 'excellent':
				return 'Excellent';
			case 'good':
				return 'Good';
			case 'moderate':
				return 'Moderate';
			case 'high':
				return 'High';
			case 'extreme':
				return 'Extreme';
		}
	});

	let bandColor = $derived.by(() => {
		if (!burnDetails?.band) return 'bg-muted text-muted-foreground border-border';
		switch (burnDetails.band) {
			case 'excellent':
				return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
			case 'good':
				return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
			case 'moderate':
				return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
			case 'high':
				return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
			case 'extreme':
				return 'bg-red-500/10 text-red-500 border-red-500/20';
		}
	});
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium {bandColor}"
	title={burnDetails?.requestsPer12 != null
		? `${burnDetails.requestsPer12.toLocaleString()} requests per $12 window`
		: 'Pricing data unavailable'}
>
	{#if burnDetails?.band === 'extreme'}
		<Flame class="size-3" />
	{:else if burnDetails?.band === 'excellent' || burnDetails?.band === 'good'}
		<Snowflake class="size-3" />
	{:else}
		<Thermometer class="size-3" />
	{/if}
	{bandLabel}
</span>
