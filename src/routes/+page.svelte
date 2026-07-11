<script lang="ts">
	import { getModels } from '$lib/remote/models.remote';
	import type { GoModel } from '$lib/types/models';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import QuotaCalculator from '$lib/components/QuotaCalculator.svelte';
	import ModelTable from '$lib/components/ModelTable.svelte';
	import ModelDrawer from '$lib/components/ModelDrawer.svelte';
	import ScenarioHelpDialog from '$lib/components/ScenarioHelpDialog.svelte';
	import { Server, Brain, Zap, BarChart3, Compass, Wallet, Sparkles } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';

	let filter = $state('');
	let scenario = $state('');
	let selectedModel = $state<GoModel | null>(null);
	let drawerOpen = $state(false);

	function openDrawer(model: GoModel) {
		selectedModel = model;
		drawerOpen = true;
	}

	const modelsPromise = getModels();

	const features = [
		{
			icon: BarChart3,
			title: 'Live Benchmarks',
			description:
				'Real-time coding & reasoning scores from modelgrep and LLM Stats — never stale.',
			accent: 'text-violet-500',
			bg: 'bg-violet-500/10'
		},
		{
			icon: Compass,
			title: 'Smart Recommendations',
			description:
				'Algorithmic best-for tags based on scenario scores — brainstorming, coding, agentic.',
			accent: 'text-sky-500',
			bg: 'bg-sky-500/10'
		},
		{
			icon: Wallet,
			title: 'Quota Burn Estimates',
			description:
				'See how fast each model burns your $10/month — make economically informed choices.',
			accent: 'text-emerald-500',
			bg: 'bg-emerald-500/10'
		}
	];
</script>

<svelte:head>
	<title>ZenPick — Find the right Go model</title>
	<meta
		name="description"
		content="Compare OpenCode Go models with live benchmarks, pricing, and quota estimates. ZenPick helps you find which model fits your task — and how fast it burns your quota."
	/>
</svelte:head>

<!-- Hero with decorative background -->
<div class="relative overflow-hidden">
	<!-- Dot grid pattern -->
	<div class="bg-dot-grid absolute inset-0 opacity-40"></div>
	<!-- Radial glow -->
	<div class="bg-hero-glow absolute inset-0"></div>

	<div class="relative mx-auto max-w-6xl px-4 pb-6 pt-16 sm:pt-20">
		<!-- Hero -->
		<section class="mb-16 text-center">
			<h1
				class="animate-fade-in-up animation-delay-100 mb-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
			>
				Pick the right
				<br class="hidden sm:inline" />
				<span class="text-primary">OpenCode Go</span> model
			</h1>
			<p
				class="animate-fade-in-up animation-delay-200 mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground"
			>
				Live benchmarks, algorithmic recommendations, and quota burn estimates — so you make
				<span class="text-foreground/80">economically informed</span> decisions, not guesses.
			</p>

			<!-- Stat pills -->
			<div
				class="animate-fade-in-up animation-delay-300 flex flex-wrap items-center justify-center gap-3"
			>
				<div
					class="flex items-center gap-2.5 rounded-xl border border-border bg-card/80 px-4 py-2.5 shadow-sm backdrop-blur-sm"
				>
					<div class="flex size-8 items-center justify-center rounded-lg bg-violet-500/10">
						<Server class="size-4 text-violet-500" />
					</div>
					<div class="text-left">
						<div class="text-sm font-semibold text-foreground">13+ models</div>
						<div class="text-xs text-muted-foreground">Live tracking</div>
					</div>
				</div>
				<div
					class="flex items-center gap-2.5 rounded-xl border border-border bg-card/80 px-4 py-2.5 shadow-sm backdrop-blur-sm"
				>
					<div class="flex size-8 items-center justify-center rounded-lg bg-sky-500/10">
						<Brain class="size-4 text-sky-500" />
					</div>
					<div class="text-left">
						<div class="text-sm font-semibold text-foreground">Live benchmarks</div>
						<div class="text-xs text-muted-foreground">From modelgrep + LLM Stats</div>
					</div>
				</div>
				<div
					class="flex items-center gap-2.5 rounded-xl border border-border bg-card/80 px-4 py-2.5 shadow-sm backdrop-blur-sm"
				>
					<div class="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
						<Wallet class="size-4 text-emerald-500" />
					</div>
					<div class="text-left">
						<div class="text-sm font-semibold text-foreground">$10/month</div>
						<div class="text-xs text-muted-foreground">Subscription tier</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Feature cards -->
		<section class="mb-16">
			<div class="grid gap-4 sm:grid-cols-3">
				{#each features as feature, i (feature.title)}
					{@const Icon = feature.icon}
					<Card.Root
						class="animate-fade-in-up group border-border/60 bg-card/50 transition-all duration-200 hover:border-border hover:shadow-md"
						style="animation-delay: {200 + i * 100}ms"
					>
						<Card.Content class="p-5">
							<div
								class="mb-3 flex size-10 items-center justify-center rounded-xl {feature.bg} transition-transform duration-200 group-hover:scale-105"
							>
								<Icon class="size-5 {feature.accent}" />
							</div>
							<h3 class="mb-1 text-sm font-semibold text-foreground">{feature.title}</h3>
							<p class="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		</section>
	</div>
</div>

<!-- Main content -->
<div class="mx-auto max-w-6xl px-4 pb-16">
	<!-- Calculator -->
	<section class="mb-12">
		{#await modelsPromise then models}
			<QuotaCalculator
				models={models.map((m) => ({
					id: m.id,
					name: m.name,
					pricing: m.pricing,
					burnRate: m.burnRate
				})) as Array<{
					id: string;
					name: string;
					pricing: import('$lib/types/models').ModelPricing;
					burnRate: string;
				}>}
			/>
		{/await}
	</section>

	<!-- Model Table -->
	<section>
		{#await modelsPromise}
			<div class="space-y-3">
				<div class="h-10 animate-pulse rounded-lg bg-muted"></div>
				<div class="h-64 animate-pulse rounded-xl bg-muted"></div>
			</div>
		{:then models}
			<div class="mb-4 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<h2 class="text-lg font-semibold text-foreground">Compare Models</h2>
					<span
						class="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
					>
						{models.length} models
					</span>
					<ScenarioHelpDialog />
				</div>
			</div>
			<div class="mb-4">
				<FilterBar bind:filter bind:scenario />
			</div>
			<ModelTable
				{models}
				{filter}
				{scenario}
				selectedModelId={selectedModel?.id}
				onSelectModel={openDrawer}
			/>
			<ModelDrawer model={selectedModel} bind:open={drawerOpen} />
		{:catch err}
			<div class="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
				<div class="text-red-400">Failed to load model data</div>
				<div class="mt-1 text-sm text-red-400/60">{(err as Error).message}</div>
			</div>
		{/await}
	</section>

	<!-- Footer (in-page attribution & tagline) -->
	<div class="mt-20 text-center text-sm text-muted-foreground/60">
		<p>
			Made to help developers make
			<span class="text-muted-foreground/70">economically informed</span>
			model choices.
		</p>
	</div>
</div>
