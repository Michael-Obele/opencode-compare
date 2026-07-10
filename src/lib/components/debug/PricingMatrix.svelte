<script lang="ts">
	import type { GoModel } from '$lib/types/models';
	import FallbackBadge from '../FallbackBadge.svelte';

	interface Props {
		models: GoModel[];
	}

	let { models }: Props = $props();
</script>

<h2 class="mb-4 text-lg font-semibold text-foreground">Pricing Matrix</h2>
<p class="mb-4 text-sm text-muted-foreground">
	Every model's pricing with source tracking. Highlighted rows indicate fallback or unknown data.
</p>
<div class="overflow-x-auto">
	<table class="w-full text-left text-sm">
		<thead>
			<tr class="border-b border-border text-muted-foreground">
				<th class="p-2 font-medium">Model</th>
				<th class="p-2 font-medium">Input /1M</th>
				<th class="p-2 font-medium">Output /1M</th>
				<th class="p-2 font-medium">Cached /1M</th>
				<th class="p-2 font-medium">Source</th>
			</tr>
		</thead>
		<tbody>
			{#each models as m (m.id)}
				<tr
					class="border-b border-border/50 hover:bg-muted/30 {m.pricing.source === 'unknown'
						? 'bg-red-500/5'
						: m.pricing.source === 'go-docs'
							? 'bg-emerald-500/5'
							: m.pricing.source === 'go-api'
								? 'bg-blue-500/5'
								: m.pricing.source === 'modelgrep'
									? 'bg-amber-500/5'
									: ''}"
				>
					<td class="p-2 font-medium text-foreground">{m.name}</td>
					<td class="p-2 tabular-nums text-muted-foreground">
						{m.pricing.inputPricePerM != null ? `$${m.pricing.inputPricePerM.toFixed(4)}` : '—'}
					</td>
					<td class="p-2 tabular-nums text-muted-foreground">
						{m.pricing.outputPricePerM != null ? `$${m.pricing.outputPricePerM.toFixed(4)}` : '—'}
					</td>
					<td class="p-2 tabular-nums text-muted-foreground">
						{m.pricing.cachedReadPerM != null ? `$${m.pricing.cachedReadPerM.toFixed(4)}` : '—'}
					</td>
					<td class="p-2"><FallbackBadge source={m.pricing.source} /></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
