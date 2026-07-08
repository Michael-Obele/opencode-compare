<script lang="ts">
	import type { GoModel } from '$lib/types/models';

	interface Props {
		models: GoModel[];
	}

	let { models }: Props = $props();

	let expanded = $state<Set<string>>(new Set());

	function toggle(id: string) {
		if (expanded.has(id)) expanded.delete(id);
		else expanded.add(id);
	}
</script>

<h2 class="mb-4 text-lg font-semibold text-foreground">Raw GoModel JSON</h2>
<p class="mb-4 text-sm text-muted-foreground">
	Collapsible JSON dump of every enriched model. Useful for inspecting exact values.
</p>
<div class="space-y-2">
	{#each models as m (m.id)}
		<button
			class="w-full rounded-lg border border-border p-3 text-left text-sm font-medium text-foreground hover:bg-muted/30"
			onclick={() => toggle(m.id)}
		>
			{m.name}
		</button>
		{#if expanded.has(m.id)}
			<pre class="max-h-96 overflow-auto rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">{JSON.stringify(m, null, 2)}</pre>
		{/if}
	{/each}
</div>
