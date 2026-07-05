<script lang="ts">
	import { getModels } from '$lib/remote/models.remote';
	import type { GoModel } from '$lib/types/models';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import QuotaCalculator from '$lib/components/QuotaCalculator.svelte';
	import ModelTable from '$lib/components/ModelTable.svelte';
	import ModelDrawer from '$lib/components/ModelDrawer.svelte';
	import { ArrowUpRight, Server, Brain, Zap } from '@lucide/svelte';

	let filter = $state('');
	let scenario = $state('');
	let selectedModel = $state<GoModel | null>(null);
	let drawerOpen = $state(false);

	function openDrawer(model: GoModel) {
		selectedModel = model;
		drawerOpen = true;
	}

	function closeDrawer() {
		drawerOpen = false;
	}
</script>

<svelte:head>
	<title>OpenCode Compare — Find the right Go model</title>
	<meta
		name="description"
		content="Compare OpenCode Go models with live benchmarks, pricing, and quota estimates. Find which model is best for brainstorming, coding, agentic work — and how fast it burns your quota."
	/>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12">
	<!-- Hero -->
	<section class="mb-16 text-center">
		<h1 class="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
			Pick the right <span class="text-violet-600">OpenCode Go</span> model
		</h1>
		<p class="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
			Live benchmarks from LLM Stats, algorithmic "best for" tags, and quota burn estimates — so you
			make economically informed decisions, not guesses.
		</p>
		<div class="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
			<span
				class="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1"
			>
				<Server class="size-3.5" /> 13+ models
			</span>
			<span
				class="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1"
			>
				<Brain class="size-3.5" /> Live benchmark data
			</span>
			<span
				class="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1"
			>
				<Zap class="size-3.5" /> $10/month subscription
			</span>
		</div>
	</section>

	<!-- Calculator -->
	<section class="mb-10">
		{#await getModels() then models}
			<QuotaCalculator
				models={models.map((m) => ({
					id: m.id,
					name: m.name,
					pricing: m.pricing,
					burnRate: m.burnRate
				}))}
			/>
		{/await}
	</section>

	<!-- Model Table -->
	<section>
		{#await getModels()}
			<div class="space-y-3">
				<div class="h-10 animate-pulse rounded-lg bg-muted"></div>
				<div class="h-64 animate-pulse rounded-xl bg-muted"></div>
			</div>
		{:then models}
			<div class="mb-4">
				<FilterBar bind:filter bind:scenario />
			</div>
			<ModelTable {models} {filter} {scenario} onSelectModel={openDrawer} />
			<ModelDrawer model={selectedModel} open={drawerOpen} onClose={closeDrawer} />
		{:catch err}
			<div class="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
				<div class="text-red-400">Failed to load model data</div>
				<div class="mt-1 text-sm text-red-400/60">{(err as Error).message}</div>
			</div>
		{/await}
	</section>

	<!-- Footer -->
	<footer class="mt-20 border-t border-border pt-8">
		<div
			class="flex flex-col items-center gap-4 text-sm text-muted-foreground/60 sm:flex-row sm:justify-between"
		>
			<p>
				Data from the
				<a
					href="https://llm-stats.com"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
				>
					LLM Stats API <ArrowUpRight class="size-3" />
				</a>
				and
				<a
					href="https://opencode.ai/docs/go/"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
				>
					OpenCode Go docs <ArrowUpRight class="size-3" />
				</a>
			</p>
			<p>
				Made to help developers make
				<span class="text-muted-foreground/70">economically informed</span>
				model choices.
			</p>
		</div>
	</footer>
</div>
