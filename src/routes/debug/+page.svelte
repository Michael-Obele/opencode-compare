<script lang="ts">
	import type { PageData } from './$types';
	import type { GoModel } from '$lib/types/models';
	import ModelsOverview from '$lib/components/debug/ModelsOverview.svelte';
	import PricingMatrix from '$lib/components/debug/PricingMatrix.svelte';
	import QuotaMatrix from '$lib/components/debug/QuotaMatrix.svelte';
	import BurnTable from '$lib/components/debug/BurnTable.svelte';
	import BenchmarkMatrix from '$lib/components/debug/BenchmarkMatrix.svelte';
	import MatchingReport from '$lib/components/debug/MatchingReport.svelte';
	import TagReport from '$lib/components/debug/TagReport.svelte';
	import ScenarioBreakdown from '$lib/components/debug/ScenarioBreakdown.svelte';
	import RawJson from '$lib/components/debug/RawJson.svelte';
	import { Bug } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	let models: GoModel[] = $state(data.models);

	type Section =
		| 'overview'
		| 'pricing'
		| 'quota'
		| 'burn'
		| 'benchmarks'
		| 'matching'
		| 'tags'
		| 'scenarios'
		| 'raw';
	let activeSection = $state<Section>('overview');
	let sections: { id: Section; label: string }[] = [
		{ id: 'overview', label: 'Models Overview' },
		{ id: 'pricing', label: 'Pricing Matrix' },
		{ id: 'quota', label: 'Quota Matrix' },
		{ id: 'burn', label: 'Burn Details' },
		{ id: 'benchmarks', label: 'Benchmarks' },
		{ id: 'matching', label: 'Matching Report' },
		{ id: 'tags', label: 'Tag Report' },
		{ id: 'scenarios', label: 'Scenario Breakdown' },
		{ id: 'raw', label: 'Raw JSON' }
	];
</script>

<svelte:head>
	<title>ZenPick — Debug</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8">
	<div class="mb-8 flex items-center gap-2">
		<Bug class="size-5 text-amber-500" />
		<h1 class="text-2xl font-bold text-foreground">Calculation Debug Page</h1>
		<span class="ml-2 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
			>{models.length} models</span
		>
	</div>

	<!-- Section nav -->
	<div class="mb-6 flex flex-wrap gap-1.5">
		{#each sections as s}
			<button
				class="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all {activeSection ===
				s.id
					? 'border-primary/40 bg-primary/10 text-primary'
					: 'border-border bg-card text-muted-foreground hover:text-foreground'}"
				onclick={() => (activeSection = s.id)}
			>
				{s.label}
			</button>
		{/each}
	</div>

	<!-- Section content -->
	<div class="rounded-xl border border-border bg-card p-6">
		{#if activeSection === 'overview'}
			<ModelsOverview {models} />
		{:else if activeSection === 'pricing'}
			<PricingMatrix {models} />
		{:else if activeSection === 'quota'}
			<QuotaMatrix {models} />
		{:else if activeSection === 'burn'}
			<BurnTable {models} />
		{:else if activeSection === 'benchmarks'}
			<BenchmarkMatrix {models} />
		{:else if activeSection === 'matching'}
			<MatchingReport {models} />
		{:else if activeSection === 'tags'}
			<TagReport {models} />
		{:else if activeSection === 'scenarios'}
			<ScenarioBreakdown {models} />
		{:else if activeSection === 'raw'}
			<RawJson {models} />
		{/if}
	</div>
</div>
