<script lang="ts">
	import { Hash } from '@lucide/svelte';

	interface Props {
		figure: string;
		unit?: string;
		label: string;
		footnote?: string;
	}

	let { figure, unit, label, footnote }: Props = $props();
</script>

<div
	class="group relative rounded-lg border border-border bg-card/40 p-5 transition-colors hover:border-primary/40"
>
	<div class="flex items-baseline gap-1">
		<span class="font-mono text-4xl font-medium tabular-nums text-foreground">
			{figure}
		</span>
		{#if unit}
			<span class="font-mono text-sm text-muted-foreground">{unit}</span>
		{/if}
	</div>

	<div class="mt-2 flex items-center gap-1.5">
		<Hash class="size-3 shrink-0 text-muted-foreground/60" />
		<span class="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
	</div>

	{#if footnote}
		<p class="mt-3 text-xs leading-relaxed text-muted-foreground/70">{footnote}</p>
	{/if}
</div>
