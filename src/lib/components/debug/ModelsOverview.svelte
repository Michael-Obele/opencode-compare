<script lang="ts">
	import type { GoModel } from '$lib/types/models';
	import BurnBadge from '../BurnBadge.svelte';
	import FallbackBadge from '../FallbackBadge.svelte';

	interface Props {
		models: GoModel[];
	}

	let { models }: Props = $props();
</script>

<h2 class="mb-4 text-lg font-semibold text-foreground">All Models — Key Metrics</h2>
<div class="overflow-x-auto">
	<table class="w-full text-left text-sm">
		<thead>
			<tr class="border-b border-border text-muted-foreground">
				<th class="p-2 font-medium">Model</th>
				<th class="p-2 font-medium">Provider</th>
				<th class="p-2 font-medium">Pricing Source</th>
				<th class="p-2 font-medium">Burn</th>
				<th class="p-2 font-medium">Burn Score</th>
				<th class="p-2 font-medium">Coding</th>
				<th class="p-2 font-medium">Brain</th>
				<th class="p-2 font-medium">Comp</th>
				<th class="p-2 font-medium">Agent</th>
				<th class="p-2 font-medium">Budget</th>
			</tr>
		</thead>
		<tbody>
			{#each models as m (m.id)}
				<tr class="border-b border-border/50 hover:bg-muted/30">
					<td class="p-2 font-medium text-foreground">{m.name}</td>
					<td class="p-2 text-muted-foreground">{m.provider}</td>
					<td class="p-2"><FallbackBadge source={m.pricing.source} /></td>
					<td class="p-2"><BurnBadge burnDetails={m.burnDetails} /></td>
					<td class="p-2 tabular-nums text-muted-foreground">
						{#if m.burnDetails?.band != null}
							{m.burnDetails.score} ({m.burnDetails.requestsPer12?.toLocaleString() ?? '?'}/$12)
						{:else}—{/if}
					</td>
					{#each ['coding', 'brainstorming', 'competitive', 'agentic', 'budget'] as sc}
						<td class="p-2 tabular-nums text-muted-foreground">
							{m.scenarioScores[sc as keyof typeof m.scenarioScores]}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
