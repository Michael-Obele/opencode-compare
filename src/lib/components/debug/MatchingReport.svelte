<script lang="ts">
	import type { GoModel } from '$lib/types/models';

	interface Props {
		models: GoModel[];
	}

	let { models }: Props = $props();
</script>

<h2 class="mb-4 text-lg font-semibold text-foreground">Matching Report</h2>
<p class="mb-4 text-sm text-muted-foreground">
	How each Go model ID was matched to modelgrep data (via hand-curated maker/model-id mapping).
</p>
<div class="overflow-x-auto">
	<table class="w-full text-left text-sm">
		<thead>
			<tr class="border-b border-border text-muted-foreground">
				<th class="p-2 font-medium">Go ID</th>
				<th class="p-2 font-medium">Has modelgrep match?</th>
				<th class="p-2 font-medium">Has Coding Score?</th>
				<th class="p-2 font-medium">Has Reasoning Score?</th>
				<th class="p-2 font-medium">Has Math Score?</th>
			</tr>
		</thead>
		<tbody>
			{#each models as m (m.id)}
				<tr class="border-b border-border/50 hover:bg-muted/30 {m.isNew ? 'bg-amber-500/5' : ''}">
					<td class="p-2 font-mono text-xs text-foreground">{m.id}</td>
					<td class="p-2">{!m.isNew ? '✅' : '❌'}</td>
					<td class="p-2"
						>{m.benchmarks.coding != null ? `✅ ${m.benchmarks.coding.toFixed(1)}` : '❌'}</td
					>
					<td class="p-2"
						>{m.benchmarks.reasoning != null ? `✅ ${m.benchmarks.reasoning.toFixed(1)}` : '❌'}</td
					>
					<td class="p-2"
						>{m.benchmarks.math != null ? `✅ ${m.benchmarks.math.toFixed(1)}` : '❌'}</td
					>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
