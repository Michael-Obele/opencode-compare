<script lang="ts">
	import type { GoModel } from '$lib/types/models';

	interface Props {
		models: GoModel[];
	}

	let { models }: Props = $props();
</script>

<h2 class="mb-4 text-lg font-semibold text-foreground">Tag Report</h2>
<p class="mb-4 text-sm text-muted-foreground">
	Every tag assigned to each model, with source and value that triggered it.
</p>
<div class="space-y-4">
	{#each models as m (m.id)}
		<div class="rounded-lg border border-border p-3">
			<div class="mb-2 font-medium text-foreground">{m.name}</div>
			{#if m.tags.length > 0}
				<div class="flex flex-wrap gap-1.5">
					{#each m.tags as tag (tag.label)}
						<span
							class="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
						>
							{tag.label} <span class="text-[10px] text-muted-foreground/40">({tag.source})</span>
						</span>
					{/each}
				</div>
				<div class="mt-2 text-xs text-muted-foreground/60">
					Benchmarks: coding={m.benchmarks.coding?.toFixed(1) ?? '—'}
					reasoning={m.benchmarks.reasoning?.toFixed(1) ?? '—'}
					math={m.benchmarks.math?.toFixed(1) ?? '—'}
					SWE={m.benchmarks.sweBenchVerified?.toFixed(1) ?? '—'}
					ctx={(m.contextWindow ?? 0).toLocaleString()}
				</div>
			{:else}
				<div class="text-xs text-muted-foreground/40">No tags</div>
			{/if}
		</div>
	{/each}
</div>
