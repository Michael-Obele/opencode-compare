<script lang="ts">
	import { getModels } from '$lib/remote/models.remote';
	import type { GoModel } from '$lib/types/models';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import QuotaCalculator from '$lib/components/QuotaCalculator.svelte';
	import ModelTable from '$lib/components/ModelTable.svelte';
	import ModelDrawer from '$lib/components/ModelDrawer.svelte';
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import ServerIcon from '@lucide/svelte/icons/server';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import SnowflakeIcon from '@lucide/svelte/icons/snowflake';
	import BrainIcon from '@lucide/svelte/icons/brain';
	import CodeIcon from '@lucide/svelte/icons/code';
	import ZapIcon from '@lucide/svelte/icons/zap';

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
		<h1 class="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
			Find your <span
				class="bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
				>OpenCode Go</span
			> model
		</h1>
		<p class="mx-auto mb-8 max-w-2xl text-lg text-white/50">
			Live benchmarks from LLM Stats, algorithmic "best for" tags, and quota burn estimates — so you
			make
			<span class="text-white/70">economically informed</span> decisions, not guesses.
		</p>
		<div class="flex flex-wrap items-center justify-center gap-4 text-sm text-white/40">
			<span class="flex items-center gap-1">
				<ServerIcon class="size-3.5" /> 13+ models
			</span>
			<span class="flex items-center gap-1">
				<BrainIcon class="size-3.5" /> Live benchmark data
			</span>
			<span class="flex items-center gap-1">
				<ZapIcon class="size-3.5" /> $10/month subscription
			</span>
		</div>
	</section>

	<!-- Calculator -->
	<section class="mb-10">
		{#await getModels() then models}
			<QuotaCalculator {models} />
		{/await}
	</section>

	<!-- Model Table -->
	<section>
		<div class="mb-6">
			<h2 class="text-2xl font-semibold text-white">Models</h2>
			<p class="mt-1 text-sm text-white/40">
				Click any model to see full details, migration hints, and copy-paste config IDs.
			</p>

			<!-- Legend -->
			<div class="mt-3 flex flex-wrap gap-4 text-xs text-white/40">
				<span class="flex items-center gap-1">
					<SnowflakeIcon class="size-3" /> Slow burn = more requests per quota window
				</span>
				<span class="flex items-center gap-1">
					<FlameIcon class="size-3" /> Fast burn = fewer requests, use for focused work
				</span>
			</div>
		</div>

		{#await getModels() then models}
			<div class="mb-4">
				<FilterBar bind:filter bind:scenario />
			</div>
			<ModelTable {models} {filter} onSelectModel={openDrawer} />
			<ModelDrawer model={selectedModel} open={drawerOpen} onClose={closeDrawer} />
		{:catch err}
			<div class="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
				<div class="text-red-400">Failed to load model data</div>
				<div class="mt-1 text-sm text-red-400/60">{(err as Error).message}</div>
			</div>
		{/await}
	</section>

	<!-- Footer -->
	<footer class="mt-20 border-t border-white/5 pt-8">
		<div
			class="flex flex-col items-center gap-4 text-sm text-white/30 sm:flex-row sm:justify-between"
		>
			<p>
				Data from the
				<a
					href="https://llm-stats.com"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 text-white/40 underline-offset-4 hover:text-white/60 hover:underline"
				>
					LLM Stats API <ArrowUpRightIcon class="size-3" />
				</a>
				and
				<a
					href="https://opencode.ai/docs/go/"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 text-white/40 underline-offset-4 hover:text-white/60 hover:underline"
				>
					OpenCode Go docs <ArrowUpRightIcon class="size-3" />
				</a>
			</p>
			<p>
				Made to help developers make
				<span class="text-white/50">economically informed</span>
				model choices.
			</p>
		</div>
	</footer>
</div>
