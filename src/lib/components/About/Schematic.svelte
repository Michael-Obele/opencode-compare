<script lang="ts">
	import { Database, Sigma, Gauge } from '@lucide/svelte';

	// Three-stage data flow diagram: sources → engine → surface
	// Drawn as an engineering block diagram with dimension lines and callouts.

	const sources = [
		{ id: 'modelgrep', label: 'modelgrep.com API', sublabel: 'benchmarks · pricing · speed' },
		{ id: 'llm-stats', label: 'llm-stats.com API', sublabel: 'rankings · scores · pricing' },
		{ id: 'opencode', label: 'OpenCode Go', sublabel: 'models · endpoints' }
	];

	const engineBlocks = [
		{ id: 'fetch', label: 'FETCH', sublabel: 'HTTP · auth', icon: Database },
		{ id: 'cache', label: 'CACHE', sublabel: '6h TTL · SWR', icon: Database },
		{ id: 'infer', label: 'INFER', sublabel: 'tag · score · rank', icon: Sigma }
	];

	const surfaces = [
		{ id: 'table', label: 'Model Table', sublabel: 'sortable · filterable' },
		{ id: 'calc', label: 'Quota Calculator', sublabel: 'token → request' },
		{ id: 'drawer', label: 'Model Drawer', sublabel: 'detail · copy · compare' }
	];
</script>

<figure class="relative my-8 overflow-hidden rounded-lg border border-border bg-card/40 p-4 sm:p-6">
	<figcaption
		class="mb-4 flex items-center justify-between border-b border-border pb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
	>
		<span class="flex items-center gap-1.5">
			<Gauge class="size-3" />
			fig.02 — system schematic
		</span>
		<span class="text-cyan-500">data flow</span>
	</figcaption>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_1.4fr_auto_1fr]">
		<!-- INPUT column -->
		<div class="space-y-3">
			<div class="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
				input
			</div>
			{#each sources as s (s.id)}
				<div class="rounded-md border border-border bg-background/60 px-3 py-2.5 font-mono text-xs">
					<div class="font-medium text-foreground">{s.label}</div>
					<div class="mt-0.5 text-[10px] text-muted-foreground">{s.sublabel}</div>
				</div>
			{/each}
		</div>

		<!-- Arrow 1 -->
		<div
			class="hidden items-center justify-center self-center text-cyan-500/60 lg:flex"
			aria-hidden="true"
		>
			<svg width="48" height="12" viewBox="0 0 48 12" fill="none">
				<line x1="0" y1="6" x2="42" y2="6" stroke="currentColor" stroke-width="1" />
				<polyline points="38,2 44,6 38,10" stroke="currentColor" stroke-width="1" fill="none" />
			</svg>
		</div>

		<!-- ENGINE column -->
		<div class="space-y-3">
			<div class="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-500">engine</div>
			<div class="space-y-2">
				{#each engineBlocks as b (b.id)}
					<div
						class="flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/5 px-3 py-2.5"
					>
						<b.icon class="size-3.5 shrink-0 text-cyan-500" />
						<div class="font-mono text-xs">
							<div class="font-medium text-foreground">{b.label}</div>
							<div class="mt-0.5 text-[10px] text-muted-foreground">{b.sublabel}</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Arrow 2 -->
		<div
			class="hidden items-center justify-center self-center text-cyan-500/60 lg:flex"
			aria-hidden="true"
		>
			<svg width="48" height="12" viewBox="0 0 48 12" fill="none">
				<line x1="0" y1="6" x2="42" y2="6" stroke="currentColor" stroke-width="1" />
				<polyline points="38,2 44,6 38,10" stroke="currentColor" stroke-width="1" fill="none" />
			</svg>
		</div>

		<!-- OUTPUT column -->
		<div class="space-y-3">
			<div class="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
				output
			</div>
			{#each surfaces as s (s.id)}
				<div class="rounded-md border border-border bg-background/60 px-3 py-2.5 font-mono text-xs">
					<div class="font-medium text-foreground">{s.label}</div>
					<div class="mt-0.5 text-[10px] text-muted-foreground">{s.sublabel}</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Dimension marks -->
	<div
		class="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
	>
		<div class="flex flex-col gap-1">
			<span class="text-cyan-500">scale</span>
			<span class="text-foreground/70">324 models upstream</span>
		</div>
		<div class="flex flex-col gap-1">
			<span class="text-cyan-500">latency</span>
			<span class="text-foreground/70">cache hit &lt; 50ms</span>
		</div>
		<div class="flex flex-col gap-1">
			<span class="text-cyan-500">refresh</span>
			<span class="text-foreground/70">6h · stale-while-revalidate</span>
		</div>
	</div>

	<!-- Corner brackets (subtle, just a hint of the datasheet feel) -->
	<div
		class="pointer-events-none absolute left-2 top-2 h-2 w-2 border-l border-t border-cyan-500/30"
		aria-hidden="true"
	></div>
	<div
		class="pointer-events-none absolute right-2 top-2 h-2 w-2 border-r border-t border-cyan-500/30"
		aria-hidden="true"
	></div>
	<div
		class="pointer-events-none absolute bottom-2 left-2 h-2 w-2 border-b border-l border-cyan-500/30"
		aria-hidden="true"
	></div>
	<div
		class="pointer-events-none absolute bottom-2 right-2 h-2 w-2 border-b border-r border-cyan-500/30"
		aria-hidden="true"
	></div>
</figure>
