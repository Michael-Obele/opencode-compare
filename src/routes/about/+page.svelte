<script lang="ts">
	import Callout from '$lib/components/About/Callout.svelte';
	import StatCard from '$lib/components/About/StatCard.svelte';
	import SourceTable from '$lib/components/About/SourceTable.svelte';
	import Schematic from '$lib/components/About/Schematic.svelte';
	import { ChevronLeft, ExternalLink, ScrollText, Thermometer } from '@lucide/svelte';
</script>

<svelte:head>
	<title>About — ZenPick</title>
	<meta
		name="description"
		content="ZenPick is a thermal-quota compass for OpenCode Go. It compares 13+ open coding models on benchmarks, pricing, and quota burn — data from LLM Stats and OpenCode Go, attributed where required."
	/>
</svelte:head>

<main class="mx-auto max-w-4xl px-4 py-12 sm:py-16">
	<!-- Document header -->
	<header class="mb-16">
		<div
			class="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
		>
			<div class="flex items-center gap-2">
				<ScrollText class="size-3" />
				<span>spec_sheet · doc-zp-2026-001</span>
			</div>
			<div class="flex items-center gap-2">
				<span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500"></span>
				<span class="text-cyan-500">active v1.0</span>
			</div>
		</div>

		<h1
			class="mb-6 text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
		>
			A thermal-quota compass
			<span class="block text-muted-foreground/70">for OpenCode Go.</span>
		</h1>

		<p class="max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
			One $10/month subscription. Thirteen open coding models. Six providers, three quota windows,
			and a cost curve steeper than its value curve. ZenPick is the comparison layer OpenCode Go
			ships without.
		</p>

		<div class="mt-8 flex flex-wrap items-center gap-3 text-sm">
			<a
				href="/"
				class="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
			>
				<ChevronLeft class="size-4" />
				Back to comparison
			</a>
			<span class="text-muted-foreground/40" aria-hidden="true">·</span>
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

	<!-- §01 THE PROBLEM -->
	<section class="mb-20" aria-labelledby="problem">
		<div class="mb-6 flex items-baseline gap-3">
			<span class="font-mono text-sm text-cyan-500">§01</span>
			<h2 id="problem" class="text-2xl font-semibold tracking-tight text-foreground">
				The problem
			</h2>
			<div class="ml-auto hidden h-px flex-1 bg-border sm:block" aria-hidden="true"></div>
		</div>

		<div class="space-y-4 text-base leading-relaxed text-foreground/85">
			<p>
				Coding assistants have settled into a comfortable lie: flat monthly subscriptions hide a
				steep, model-dependent cost curve. OpenCode Go is one of the few that publishes the
				underlying price-per-token — which makes it honest, and which makes the question obvious.
			</p>
			<p>
				Which of the thirteen models actually fits the task you're doing? Which one will still be
				usable at 2 a.m. on a Wednesday? Which one is a <em>worse</em> version of the closed-source model
				you're already paying for elsewhere?
			</p>
			<p class="text-muted-foreground">
				ZenPick answers those three questions, in the order a developer asks them.
			</p>
		</div>

		<Callout variant="amber" label="observation">
			The cost curve of a coding assistant is steeper than its value curve. Picking a model isn't
			about capability — it's about economics.
		</Callout>
	</section>

	<!-- §02 THE PRODUCT -->
	<section class="mb-20" aria-labelledby="product">
		<div class="mb-6 flex items-baseline gap-3">
			<span class="font-mono text-sm text-cyan-500">§02</span>
			<h2 id="product" class="text-2xl font-semibold tracking-tight text-foreground">
				The product
			</h2>
			<div class="ml-auto hidden h-px flex-1 bg-border sm:block" aria-hidden="true"></div>
		</div>

		<div class="space-y-4 text-base leading-relaxed text-foreground/85">
			<p>
				Three things, in one page. A sortable table of every Go model with live benchmark scores. A
				quota calculator that turns a token estimate into a number-of-requests per window. A detail
				drawer that names the closed-source model each Go model replaces, and why.
			</p>
			<p>
				The whole thing runs on a stale-while-revalidate cache, so the page is fast on revisit and
				never asks the upstream APIs for the same data twice within six hours.
			</p>
		</div>

		<Schematic />
	</section>

	<!-- §03 THE NUMBERS -->
	<section class="mb-20" aria-labelledby="numbers">
		<div class="mb-6 flex items-baseline gap-3">
			<span class="font-mono text-sm text-cyan-500">§03</span>
			<h2 id="numbers" class="text-2xl font-semibold tracking-tight text-foreground">
				The numbers
			</h2>
			<div class="ml-auto hidden h-px flex-1 bg-border sm:block" aria-hidden="true"></div>
		</div>

		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
			<StatCard figure="10" unit="/mo" label="subscription" footnote="First month $5." />
			<StatCard figure="13" unit="+" label="models tracked" footnote="Across 6 providers." />
			<StatCard figure="6" unit="h" label="cache TTL" footnote="Stale-while-revalidate." />
			<StatCard figure="324" label="upstream models" footnote="Cross-referenced via LLM Stats." />
		</div>

		<Callout variant="cyan" label="methodology note">
			"Upstream" refers to the leaderboard at llm-stats.com, which tracks every model we cross-check
			against. We don't replicate their database — we annotate it.
		</Callout>
	</section>

	<!-- §04 METHODOLOGY -->
	<section class="mb-20" aria-labelledby="methodology">
		<div class="mb-6 flex items-baseline gap-3">
			<span class="font-mono text-sm text-cyan-500">§04</span>
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

		<!-- Worked example in monospace -->
		<div class="my-6 rounded-lg border border-border bg-card/40 p-5">
			<div class="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
				worked example
			</div>
			<pre
				class="overflow-x-auto font-mono text-xs leading-relaxed text-foreground/85">{`deepseek-v4-pro  →  scenario(coding)
  coding benchmark      : 78.2   (weight 0.55)
  speed (tok/s)         :  8.5   (weight 0.20)
  burn rate (favor cool) :  -3    (weight 0.15)
  context window ≥ 256K  :  yes   (weight 0.10)
                          ─────
  fit score             : 87.3`}</pre>
		</div>
	</section>

	<!-- §05 DATA & ATTRIBUTION -->
	<section class="mb-20" aria-labelledby="attribution">
		<div class="mb-6 flex items-baseline gap-3">
			<span class="font-mono text-sm text-cyan-500">§05</span>
			<h2 id="attribution" class="text-2xl font-semibold tracking-tight text-foreground">
				Data &amp; attribution
			</h2>
			<div class="ml-auto hidden h-px flex-1 bg-border sm:block" aria-hidden="true"></div>
		</div>

		<div class="space-y-4 text-base leading-relaxed text-foreground/85">
			<p>
				Benchmark scores, pricing, and rankings are provided by
				<a
					href="https://llm-stats.com/"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-0.5 text-cyan-500 underline-offset-4 hover:underline"
				>
					llm-stats.com
					<ExternalLink class="size-3" />
				</a>
				and used with attribution per the
				<a
					href="https://llm-stats.com/legal/terms-of-service"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-0.5 text-cyan-500 underline-offset-4 hover:underline"
				>
					LLM Stats API terms
					<ExternalLink class="size-3" />
				</a>. The model list, endpoint types, and quota windows come from the
				<a
					href="https://opencode.ai/docs/go/"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-0.5 text-cyan-500 underline-offset-4 hover:underline"
				>
					OpenCode Go documentation
					<ExternalLink class="size-3" />
				</a>.
			</p>
			<p class="text-muted-foreground">
				Everything ZenPick computes on top — scenario fit scores, burn rate tiers, migration hints —
				is derived from those two sources, in the schematic above. The data and the attribution are
				kept close on purpose.
			</p>
		</div>

		<SourceTable />

		<Callout variant="amber" label="freshness">
			The 6-hour cache is the longest ZenPick will let any number go without re-fetching. A red
			indicator appears on the comparison page if upstream data is unreachable.
		</Callout>
	</section>

	<!-- §06 THERMAL KEY -->
	<section class="mb-16" aria-labelledby="key">
		<div class="mb-6 flex items-baseline gap-3">
			<span class="font-mono text-sm text-cyan-500">§06</span>
			<h2 id="key" class="text-2xl font-semibold tracking-tight text-foreground">Thermal key</h2>
			<div class="ml-auto hidden h-px flex-1 bg-border sm:block" aria-hidden="true"></div>
		</div>

		<p class="mb-6 text-base leading-relaxed text-muted-foreground">
			Every model in ZenPick is tagged with one of three thermal burn rates. It's a single
			classification — derived from blended price per million tokens — that tells you how fast the
			model will consume your $12/5h window.
		</p>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<div class="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
				<div class="mb-2 flex items-center gap-2">
					<span class="inline-block h-2 w-2 rounded-full bg-cyan-500" aria-hidden="true"></span>
					<span class="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-500">slow</span>
				</div>
				<div class="font-mono text-2xl tabular-nums text-foreground">&lt; $1.50</div>
				<div class="mt-1 text-xs text-muted-foreground">Combined price per 1M tokens.</div>
			</div>
			<div class="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
				<div class="mb-2 flex items-center gap-2">
					<span class="inline-block h-2 w-2 rounded-full bg-amber-500" aria-hidden="true"></span>
					<span class="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-500"
						>moderate</span
					>
				</div>
				<div class="font-mono text-2xl tabular-nums text-foreground">$1.50 – $6.00</div>
				<div class="mt-1 text-xs text-muted-foreground">Balanced daily use.</div>
			</div>
			<div class="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
				<div class="mb-2 flex items-center gap-2">
					<span class="inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden="true"></span>
					<span class="font-mono text-[10px] uppercase tracking-[0.2em] text-red-500">fast</span>
				</div>
				<div class="font-mono text-2xl tabular-nums text-foreground">&gt; $6.00</div>
				<div class="mt-1 text-xs text-muted-foreground">Short, focused sessions.</div>
			</div>
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
			<div class="font-mono text-[10px] uppercase tracking-[0.2em]">
				doc-zp-2026-001 · v1.0 · {new Date().getFullYear()}
			</div>
		</div>
	</footer>
</main>
