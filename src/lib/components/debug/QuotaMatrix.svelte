<script lang="ts">
	import type { GoModel } from '$lib/types/models';

	interface Props {
		models: GoModel[];
	}

	let { models }: Props = $props();

	let inputTokens = $state(1000);
	let outputTokens = $state(500);
	let cachedPct = $state(50);

	let cachedInputTokens = $derived(Math.round(inputTokens * (cachedPct / 100)));

	function computeCost(m: GoModel): {
		costPerRequest: number | null;
		per5h: number;
		perWeek: number;
		perMonth: number;
	} {
		const pricing = m.pricing;
		if (pricing.inputPricePerM == null || pricing.outputPricePerM == null) {
			return { costPerRequest: null, per5h: 0, perWeek: 0, perMonth: 0 };
		}
		const uncached = inputTokens - cachedInputTokens;
		const cachedRate = pricing.cachedReadPerM ?? pricing.inputPricePerM;
		const cost =
			(uncached * pricing.inputPricePerM +
				cachedInputTokens * cachedRate +
				outputTokens * pricing.outputPricePerM) /
			1_000_000;
		if (cost <= 0) return { costPerRequest: 0, per5h: 0, perWeek: 0, perMonth: 0 };
		return {
			costPerRequest: cost,
			per5h: Math.round(12 / cost),
			perWeek: Math.round(30 / cost),
			perMonth: Math.round(60 / cost)
		};
	}
</script>

<h2 class="mb-4 text-lg font-semibold text-foreground">Quota Matrix</h2>

<!-- Interactive knobs -->
<div class="mb-6 grid grid-cols-3 gap-4 rounded-lg border border-border bg-muted/30 p-4">
	<div>
		<label class="mb-1 block text-xs text-muted-foreground"
			>Input tokens: {inputTokens.toLocaleString()}</label
		>
		<input
			type="range"
			min="100"
			max="50000"
			step="100"
			bind:value={inputTokens}
			class="w-full accent-violet-600"
		/>
	</div>
	<div>
		<label class="mb-1 block text-xs text-muted-foreground"
			>Output tokens: {outputTokens.toLocaleString()}</label
		>
		<input
			type="range"
			min="50"
			max="20000"
			step="50"
			bind:value={outputTokens}
			class="w-full accent-violet-600"
		/>
	</div>
	<div>
		<label class="mb-1 block text-xs text-muted-foreground">Cached reads: {cachedPct}%</label>
		<input
			type="range"
			min="0"
			max="90"
			step="5"
			bind:value={cachedPct}
			class="w-full accent-violet-600"
		/>
	</div>
</div>

<div class="overflow-x-auto">
	<table class="w-full text-left text-sm">
		<thead>
			<tr class="border-b border-border text-muted-foreground">
				<th class="p-2 font-medium">Model</th>
				<th class="p-2 font-medium">Cost/req</th>
				<th class="p-2 font-medium">/$12 (5h)</th>
				<th class="p-2 font-medium">/$30 (wk)</th>
				<th class="p-2 font-medium">/$60 (mo)</th>
			</tr>
		</thead>
		<tbody>
			{#each models as m (m.id)}
				{@const c = computeCost(m)}
				<tr class="border-b border-border/50 hover:bg-muted/30">
					<td class="p-2 font-medium text-foreground">{m.name}</td>
					<td class="p-2 tabular-nums text-muted-foreground">
						{c.costPerRequest != null ? `$${c.costPerRequest.toFixed(6)}` : '—'}
					</td>
					<td class="p-2 tabular-nums text-muted-foreground">{c.per5h.toLocaleString()}</td>
					<td class="p-2 tabular-nums text-muted-foreground">{c.perWeek.toLocaleString()}</td>
					<td class="p-2 tabular-nums text-muted-foreground">{c.perMonth.toLocaleString()}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
