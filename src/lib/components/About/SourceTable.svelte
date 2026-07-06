<script lang="ts">
	import { Database, ExternalLink } from '@lucide/svelte';

	interface Source {
		provider: string;
		href: string;
		license: string;
		use: string;
		required?: boolean;
	}

	const sources: Source[] = [
		{
			provider: 'llm-stats.com',
			href: 'https://llm-stats.com/',
			license: 'Per LLM Stats API terms',
			use: 'Benchmark scores, pricing, rankings, model metadata',
			required: true
		},
		{
			provider: 'opencode.ai/docs/go',
			href: 'https://opencode.ai/docs/go/',
			license: 'Per OpenCode Go docs',
			use: 'Model list, endpoint types, quota windows'
		}
	];
</script>

<div class="overflow-hidden rounded-lg border border-border bg-card/40">
	<div
		class="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
	>
		<span class="flex items-center gap-1.5">
			<Database class="size-3" />
			data_sources.json
		</span>
		<span class="text-cyan-500">2 sources · required attribution</span>
	</div>

	<table class="w-full text-left text-sm">
		<thead>
			<tr class="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
				<th class="px-4 py-2 font-medium">Provider</th>
				<th class="px-4 py-2 font-medium">License</th>
				<th class="px-4 py-2 font-medium">Use in ZenPick</th>
			</tr>
		</thead>
		<tbody class="font-mono">
			{#each sources as source (source.provider)}
				<tr class="border-b border-border/50 last:border-0 align-top">
					<td class="px-4 py-3">
						<a
							href={source.href}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1 text-cyan-500 underline-offset-4 hover:underline"
						>
							{source.provider}
							<ExternalLink class="size-3" />
						</a>
						{#if source.required}
							<div class="mt-1 text-[10px] uppercase tracking-wider text-amber-500/80">
								attribution required
							</div>
						{/if}
					</td>
					<td class="px-4 py-3 text-xs text-muted-foreground">{source.license}</td>
					<td class="px-4 py-3 text-xs text-foreground/80">{source.use}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
