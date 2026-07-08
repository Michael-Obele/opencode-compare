<script lang="ts">
	import type { GoModel } from '$lib/types/models';
	import { burnBandColor } from '$lib/burn';

	interface Props {
		models: GoModel[];
	}

	let { models }: Props = $props();
</script>

<h2 class="mb-4 text-lg font-semibold text-foreground">Burn Details</h2>
<p class="mb-4 text-sm text-muted-foreground">
	Continuous burn score (0-100), named band, and raw requests per $12 window.
</p>
<div class="overflow-x-auto">
	<table class="w-full text-left text-sm">
		<thead>
			<tr class="border-b border-border text-muted-foreground">
				<th class="p-2 font-medium">Model</th>
				<th class="p-2 font-medium">Score</th>
				<th class="p-2 font-medium">Band</th>
				<th class="p-2 font-medium">Req / $12</th>
				<th class="p-2 font-medium">Bar</th>
			</tr>
		</thead>
		<tbody>
			{#each models as m (m.id)}
				<tr class="border-b border-border/50 hover:bg-muted/30">
					<td class="p-2 font-medium text-foreground">{m.name}</td>
					<td class="p-2 tabular-nums text-muted-foreground">
						{m.burnDetails?.band != null ? m.burnDetails.score : '—'}
					</td>
					<td class="p-2">
						{#if m.burnDetails?.band}
							<span class="{burnBandColor(m.burnDetails.band)} font-medium"
								>{m.burnDetails.band}</span
							>
						{:else}—{/if}
					</td>
					<td class="p-2 tabular-nums text-muted-foreground">
						{m.burnDetails?.requestsPer12?.toLocaleString() ?? '—'}
					</td>
					<td class="p-2">
						{#if m.burnDetails?.band != null}
							<div class="h-2 w-24 overflow-hidden rounded-full bg-muted">
								<div
									class="h-full rounded-full {m.burnDetails.score >= 60 ? 'bg-emerald-500' : m.burnDetails.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}"
									style="width: {m.burnDetails.score}%"
								></div>
							</div>
						{:else}
							<span class="text-muted-foreground/30">—</span>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
