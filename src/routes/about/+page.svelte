<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import Callout from '$lib/components/About/Callout.svelte';
	import StatCard from '$lib/components/About/StatCard.svelte';
	import SourceTable from '$lib/components/About/SourceTable.svelte';
	import Schematic from '$lib/components/About/Schematic.svelte';
	import ReceiptBlock from '$lib/components/About/ReceiptBlock.svelte';
	import ModelBurnChart from '$lib/components/About/ModelBurnChart.svelte';
	import ScenarioRadarChart from '$lib/components/About/ScenarioRadarChart.svelte';
	import PricePerformanceScatter from '$lib/components/About/PricePerformanceScatter.svelte';
	import { getModels } from '$lib/remote/models.remote';
	import {
		ChevronLeft,
		ExternalLink,
		ScrollText,
		Thermometer,
		Flame,
		Sparkles,
		Wallet,
		ArrowUpRight
	} from '@lucide/svelte';

	let mounted = $state(false);
	const modelsPromise = getModels();
	onMount(() => {
		mounted = true;
	});

	const steps = [
		{
			icon: Wallet,
			title: 'The bill kept climbing',
			description:
				'AI subscriptions I relied on were getting more expensive and harder to justify. The same features were costing twice as much, and I was not using half the models.'
		},
		{
			icon: Sparkles,
			title: 'OpenCode Go appeared',
			description:
				'$10/month. Thirteen open coding models. One API key. It removed the subscription anxiety, but introduced a new question: which model do I actually pick?'
		},
		{
			icon: ScrollText,
			title: 'ZenPick was the missing page',
			description:
				'A single comparison layer for benchmarks, quota burn, and fit scores. Built so the next developer making the same switch does not have to guess.'
		}
	];

	const burnTiers = [
		{
			name: 'slow',
			range: '< $1.50',
			description: 'Workhorse models. Use these for volume.',
			color: 'cyan'
		},
		{
			name: 'moderate',
			range: '$1.50 – $6.00',
			description: 'Balanced daily drivers.',
			color: 'amber'
		},
		{
			name: 'fast',
			range: '> $6.00',
			description: 'Premium models for focused sessions.',
			color: 'red'
		}
	];
</script>

<svelte:head>
	<title>About — ZenPick</title>
	<meta
		name="description"
		content="Why I switched to OpenCode Go and built ZenPick: a thermal-quota compass that compares 13+ open coding models on benchmarks, pricing, and quota burn."
	/>
</svelte:head>

<main class="relative mx-auto max-w-5xl px-4 py-12 sm:py-16">
	<!-- subtle receipt paper texture background -->
	<div
		class="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-linear-to-b from-primary/3 to-transparent"
		aria-hidden="true"
	></div>

	<!-- Document header -->
	<header class="relative mb-16">
		{#if mounted}
			<div in:fly={{ y: 12, duration: 500 }}>
				<span
					class="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary"
				>
					<Flame class="size-3" />
					From one frustrated subscriber
				</span>
			</div>
		{/if}

		<h1
			class="mb-6 text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
		>
			I switched because AI got too expensive.
			<span class="block text-muted-foreground/70">OpenCode Go made it make sense.</span>
		</h1>

		<p class="max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
			Like a lot of developers, I watched my AI subscriptions drift upward while the value stayed
			flat. OpenCode Go flipped the model: $10/month, thirteen open coding models, generous quota
			windows. But it does not tell you which model fits which task. That is what ZenPick is for.
		</p>

		<div class="mt-8 flex flex-wrap items-center gap-3 text-sm">
			<a
				href="/"
				class="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-4 py-2 text-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
			>
				<ChevronLeft class="size-4" />
				Back to comparison
			</a>
			<a
				href="https://github.com/Michael-Obele/zenpick"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
			>
				Source on GitHub
				<ExternalLink class="size-3.5" />
			</a>
		</div>
	</header>

	<!-- 01 ORIGIN STORY -->
	<section class="relative mb-20" aria-labelledby="origin">
		<div class="mb-8 flex items-baseline gap-3">
			<span class="font-mono text-xs font-medium uppercase tracking-wider text-primary">01</span>
			<h2 id="origin" class="text-2xl font-semibold tracking-tight text-foreground">
				Origin story
			</h2>
			<div class="ml-auto hidden h-px flex-1 bg-border sm:block" aria-hidden="true"></div>
		</div>

		<div class="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
			<div class="space-y-6">
				{#each steps as step, i (step.title)}
					{#if mounted}
						<div class="group flex gap-4" in:fly={{ y: 16, duration: 450, delay: 100 + i * 120 }}>
							<div
								class="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors group-hover:border-primary/30"
							>
								<step.icon class="size-4 text-primary" />
							</div>
							<div>
								<h3 class="mb-1 font-semibold text-foreground">{step.title}</h3>
								<p class="leading-relaxed text-muted-foreground">{step.description}</p>
							</div>
						</div>
					{/if}
				{/each}

				<Callout variant="amber" label="observation">
					The cost curve of a coding assistant is steeper than its value curve. Picking a model is
					not about raw capability; it is about matching the right model to the right task so your
					quota lasts.
				</Callout>
			</div>

			{#if mounted}
				<div in:fade={{ duration: 600, delay: 200 }}>
					<ReceiptBlock />
				</div>
			{/if}
		</div>
	</section>

	<!-- 02 THE PRODUCT -->
	<section class="mb-20" aria-labelledby="product">
		<div class="mb-6 flex items-baseline gap-3">
			<span class="font-mono text-xs font-medium uppercase tracking-wider text-primary">02</span>
			<h2 id="product" class="text-2xl font-semibold tracking-tight text-foreground">
				What ZenPick does
			</h2>
			<div class="ml-auto hidden h-px flex-1 bg-border sm:block" aria-hidden="true"></div>
		</div>

		<div class="space-y-4 text-base leading-relaxed text-foreground/85">
			<p>
				Three things, on one page. A sortable table of every Go model with live benchmark scores. A
				quota calculator that turns a token estimate into a number-of-requests per window. A detail
				drawer that names the closed-source model each Go model replaces, and why.
			</p>
			<p>
				Everything runs on a stale-while-revalidate cache, so the page is fast on revisit and never
				asks the upstream APIs for the same data twice within six hours.
			</p>
		</div>

		<Schematic />
	</section>

	<!-- 03 THE NUMBERS -->
	<section class="mb-20" aria-labelledby="numbers">
		<div class="mb-6 flex items-baseline gap-3">
			<span class="font-mono text-xs font-medium uppercase tracking-wider text-primary">03</span>
			<h2 id="numbers" class="text-2xl font-semibold tracking-tight text-foreground">
				The numbers
			</h2>
			<div class="ml-auto hidden h-px flex-1 bg-border sm:block" aria-hidden="true"></div>
		</div>

		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
			<StatCard figure="10" unit="/mo" label="subscription" footnote="First month $5." />
			<StatCard figure="13" unit="+" label="models tracked" footnote="Across 6 providers." />
			<StatCard figure="6" unit="h" label="cache TTL" footnote="Stale-while-revalidate." />
			<StatCard
				figure="324"
				label="upstream models"
				footnote="Cross-referenced via modelgrep + LLM Stats."
			/>
		</div>

		<div class="mt-10">
			{#if mounted}
				<div in:fade={{ duration: 500, delay: 200 }}>
					<ModelBurnChart />
				</div>
			{/if}
		</div>

		<div class="mt-10">
			{#await modelsPromise}
				<div class="h-48 animate-pulse rounded-xl bg-muted"></div>
			{:then models}
				{#if mounted}
					<div in:fade={{ duration: 500, delay: 300 }}>
						<PricePerformanceScatter {models} />
					</div>
				{/if}
			{/await}
		</div>

		<Callout variant="cyan" label="methodology note">
			"Upstream" refers to the data aggregated at modelgrep.com (OpenRouter pricing + Artificial
			Analysis benchmarks) and llm-stats.com (benchmark scores, rankings, and pricing), which tracks
			every model we cross-check against.
		</Callout>
	</section>

	<!-- 04 METHODOLOGY -->
	<section class="mb-20" aria-labelledby="methodology">
		<div class="mb-6 flex items-baseline gap-3">
			<span class="font-mono text-xs font-medium uppercase tracking-wider text-primary">04</span>
			<h2 id="methodology" class="text-2xl font-semibold tracking-tight text-foreground">
				Methodology
			</h2>
			<div class="ml-auto hidden h-px flex-1 bg-border sm:block" aria-hidden="true"></div>
		</div>

		<div class="space-y-4 text-base leading-relaxed text-foreground/85">
			<p>
				Every model gets a 0–100 fit score for five scenarios — <em>Brainstorming</em>,
				<em>Coding</em>, <em>Competitive</em>, <em>Agentic</em>, and <em>Budget</em>. Scores are
				normalized across the current model population, so the ordering is always meaningful and
				always non-empty. The table sorts by the active scenario; if no scenario is active, it sorts
				by raw coding benchmark.
			</p>
			<p>
				Tags, migration hints, and thermal burn rates are inferred. Nothing on the page is
				hand-curated. If the upstream data changes, the page changes.
			</p>
		</div>

		<!-- Radar visualization -->
		<div class="my-6">
			{#await modelsPromise}
				<div class="h-64 animate-pulse rounded-xl bg-muted"></div>
			{:then models}
				{#if mounted}
					<div in:fade={{ duration: 500, delay: 200 }}>
						<ScenarioRadarChart {models} />
					</div>
				{/if}
			{/await}
		</div>
	</section>

	<!-- 05 DATA & ATTRIBUTION -->
	<section class="mb-20" aria-labelledby="attribution">
		<div class="mb-6 flex items-baseline gap-3">
			<span class="font-mono text-xs font-medium uppercase tracking-wider text-primary">05</span>
			<h2 id="attribution" class="text-2xl font-semibold tracking-tight text-foreground">
				Data &amp; attribution
			</h2>
			<div class="ml-auto hidden h-px flex-1 bg-border sm:block" aria-hidden="true"></div>
		</div>

		<div class="space-y-4 text-base leading-relaxed text-foreground/85">
			<p>
				Benchmark scores, pricing, and speed data are aggregated by
				<a
					href="https://modelgrep.com/"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-0.5 text-primary underline-offset-4 hover:underline"
				>
					modelgrep.com
					<ExternalLink class="size-3" />
				</a>
				(OpenRouter pricing + Artificial Analysis benchmarks) and
				<a
					href="https://llm-stats.com/"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-0.5 text-primary underline-offset-4 hover:underline"
				>
					llm-stats.com
					<ExternalLink class="size-3" />
				</a>
				(benchmark scores, rankings, and pricing), and used with attribution. The model list, endpoint
				types, and quota windows come from the
				<a
					href="https://opencode.ai/docs/go/"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-0.5 text-primary underline-offset-4 hover:underline"
				>
					OpenCode Go documentation
					<ExternalLink class="size-3" />
				</a>.
			</p>
			<p class="text-muted-foreground">
				Everything ZenPick computes on top — scenario fit scores, burn rate tiers, migration hints —
				is derived from those sources, in the schematic above. The data and the attribution are kept
				close on purpose.
			</p>
		</div>

		<SourceTable />

		<Callout variant="amber" label="freshness">
			The 6-hour cache is the longest ZenPick will let any number go without re-fetching. A red
			indicator appears on the comparison page if upstream data is unreachable.
		</Callout>
	</section>

	<!-- 06 THERMAL KEY -->
	<section class="mb-16" aria-labelledby="key">
		<div class="mb-6 flex items-baseline gap-3">
			<span class="font-mono text-xs font-medium uppercase tracking-wider text-primary">06</span>
			<h2 id="key" class="text-2xl font-semibold tracking-tight text-foreground">Thermal key</h2>
			<div class="ml-auto hidden h-px flex-1 bg-border sm:block" aria-hidden="true"></div>
		</div>

		<p class="mb-6 text-base leading-relaxed text-muted-foreground">
			Every model in ZenPick is tagged with one of three thermal burn rates. It is a single
			classification — derived from blended price per million tokens — that tells you how fast the
			model will consume your $12/5h window.
		</p>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			{#each burnTiers as tier (tier.name)}
				{@const color =
					tier.color === 'cyan'
						? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-500'
						: tier.color === 'amber'
							? 'border-amber-500/20 bg-amber-500/5 text-amber-500'
							: 'border-red-500/20 bg-red-500/5 text-red-500'}
				<div class="rounded-lg border p-4 {color}">
					<div class="mb-2 flex items-center gap-2">
						<span class="inline-block h-2 w-2 rounded-full bg-current" aria-hidden="true"></span>
						<span class="font-mono text-[10px] uppercase tracking-[0.2em]">{tier.name}</span>
					</div>
					<div class="font-mono text-2xl tabular-nums text-foreground">{tier.range}</div>
					<div class="mt-1 text-xs text-muted-foreground">{tier.description}</div>
				</div>
			{/each}
		</div>

		<div class="mt-6 flex items-center gap-2 text-xs text-muted-foreground/70">
			<Thermometer class="size-3" />
			<span>
				Source function:
				<code class="font-mono text-foreground/80">burnRateFromPrice()</code> in
				<code class="font-mono text-foreground/80">src/lib/burn.ts</code>
			</span>
		</div>
	</section>

	<!-- 07 TRY IT -->
	<section class="mb-16" aria-labelledby="try-it">
		<div class="rounded-2xl border border-border bg-card/40 p-6 sm:p-10">
			<div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 id="try-it" class="mb-2 text-2xl font-semibold tracking-tight text-foreground">
						Ready to compare?
					</h2>
					<p class="max-w-xl text-muted-foreground">
						Find the model that matches your task and keep your OpenCode Go quota from disappearing
						too fast.
					</p>
				</div>
				<a
					href="/"
					class="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
				>
					Open comparison
					<ArrowUpRight class="size-4" />
				</a>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="border-t border-border pt-8">
		<div
			class="flex flex-col items-start gap-3 text-sm text-muted-foreground/70 sm:flex-row sm:items-center sm:justify-between"
		>
			<div class="flex items-center gap-3">
				<a
					href="/"
					class="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
				>
					<ChevronLeft class="size-4" />
					Back to comparison
				</a>
				<span class="text-muted-foreground/30" aria-hidden="true">·</span>
				<a
					href="https://github.com/Michael-Obele/zenpick"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
				>
					Source
					<ExternalLink class="size-3" />
				</a>
			</div>
		</div>
	</footer>
</main>
