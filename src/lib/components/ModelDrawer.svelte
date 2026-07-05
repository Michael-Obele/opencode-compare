<script lang="ts">
	import type { GoModel } from '$lib/types/models';
	import * as Drawer from '$lib/components/ui/drawer/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { ExternalLink, Copy, Check, Info } from 'lucide-svelte';

	interface Props {
		model: GoModel | null;
		open: boolean;
		onClose: () => void;
	}

	let { model, open = $bindable(false), onClose }: Props = $props();

	let copied = $state(false);

	function copyModelId() {
		if (!model) return;
		navigator.clipboard.writeText(`opencode-go/${model.id}`);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function formatTokens(n: number | null): string {
		if (!n) return '—';
		if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
		return `${Math.round(n / 1_000)}K`;
	}
</script>

<Drawer.Root {open} onOpenChange={(o) => (open = o)}>
	<Drawer.Content class="mx-auto max-h-[90vh] max-w-lg overflow-y-auto">
		{#if model}
			<Drawer.Header>
				<Drawer.Title class="flex items-center gap-2 text-xl">
					{model.name}
					{#if model.isNew}
						<Badge variant="outline">New</Badge>
					{/if}
				</Drawer.Title>
				<Drawer.Description>
					{model.provider}
					{#if model.description}
						<span class="mt-1 block text-sm text-muted-foreground">{model.description}</span>
					{/if}
				</Drawer.Description>
			</Drawer.Header>

			<div class="space-y-6 px-4 pb-8">
				<!-- Tags -->
				<div class="flex flex-wrap gap-1.5">
					{#each model.tags as tag}
						<span
							class="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
						>
							{tag.label}
						</span>
					{/each}
				</div>

				<!-- Pricing -->
				<section>
					<h3 class="mb-2 text-sm font-medium text-muted-foreground">Pricing (per 1M tokens)</h3>
					<div class="grid grid-cols-2 gap-2 text-sm">
						<div class="rounded-lg border border-border p-3">
							<div class="text-muted-foreground">Input</div>
							<div class="text-lg tabular-nums text-foreground">
								${model.pricing.inputPricePerM.toFixed(2)}
							</div>
						</div>
						<div class="rounded-lg border border-border p-3">
							<div class="text-muted-foreground">Output</div>
							<div class="text-lg tabular-nums text-foreground">
								${model.pricing.outputPricePerM.toFixed(2)}
							</div>
						</div>
					</div>
				</section>

				<!-- Quota usage -->
				<section>
					<h3 class="mb-2 text-sm font-medium text-muted-foreground">
						Estimated requests per Go limit
					</h3>
					<div class="grid grid-cols-3 gap-2 text-sm">
						<div class="rounded-lg border border-border p-3 text-center">
							<div class="text-xs text-muted-foreground">5 Hours ($12)</div>
							<div class="text-lg font-medium tabular-nums text-foreground">
								{model.quota.requestsPer5h.toLocaleString()}
							</div>
						</div>
						<div class="rounded-lg border border-border p-3 text-center">
							<div class="text-xs text-muted-foreground">Week ($30)</div>
							<div class="text-lg font-medium tabular-nums text-foreground">
								{model.quota.requestsPerWeek.toLocaleString()}
							</div>
						</div>
						<div class="rounded-lg border border-border p-3 text-center">
							<div class="text-xs text-muted-foreground">Month ($60)</div>
							<div class="text-lg font-medium tabular-nums text-foreground">
								{model.quota.requestsPerMonth.toLocaleString()}
							</div>
						</div>
					</div>
				</section>

				<!-- Benchmarks -->
				<section>
					<h3 class="mb-2 text-sm font-medium text-muted-foreground">Benchmarks</h3>
					<div class="grid grid-cols-2 gap-2 text-sm">
						{#if model.benchmarks.coding}
							<div class="rounded-lg border border-border p-3">
								<div class="text-muted-foreground">Coding</div>
								<div class="text-lg tabular-nums text-foreground">
									{model.benchmarks.coding.toFixed(1)}
								</div>
							</div>
						{/if}
						{#if model.benchmarks.reasoning}
							<div class="rounded-lg border border-border p-3">
								<div class="text-muted-foreground">Reasoning</div>
								<div class="text-lg tabular-nums text-foreground">
									{model.benchmarks.reasoning.toFixed(1)}
								</div>
							</div>
						{/if}
						{#if model.benchmarks.math}
							<div class="rounded-lg border border-border p-3">
								<div class="text-muted-foreground">Math</div>
								<div class="text-lg tabular-nums text-foreground">
									{model.benchmarks.math.toFixed(1)}
								</div>
							</div>
						{/if}
						{#if model.benchmarks.sweBenchVerified}
							<div class="rounded-lg border border-border p-3">
								<div class="text-muted-foreground">SWE-bench</div>
								<div class="text-lg tabular-nums text-foreground">
									{model.benchmarks.sweBenchVerified.toFixed(1)}%
								</div>
							</div>
						{/if}
					</div>
				</section>

				<!-- Details -->
				<section>
					<h3 class="mb-2 text-sm font-medium text-muted-foreground">Details</h3>
					<div class="space-y-2 rounded-lg border border-border p-3 text-sm">
						<div class="flex justify-between">
							<span class="text-muted-foreground">Context window</span>
							<span class="text-foreground/80">{formatTokens(model.contextWindow)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Endpoint</span>
							<span class="text-foreground/80">{model.endpoint}</span>
						</div>
						{#if model.speed}
							<div class="flex justify-between">
								<span class="text-muted-foreground">Speed</span>
								<span class="text-foreground/80">{model.speed.tokensPerSecond} tok/s</span>
							</div>
						{/if}
					</div>
				</section>

				<!-- Migration hints -->
				{#if model.migrationHints.length > 0}
					<section>
						<h3 class="mb-2 flex items-center gap-1 text-sm font-medium text-muted-foreground">
							<Info class="size-3.5" />
							If you're coming from...
						</h3>
						<div class="space-y-2">
							{#each model.migrationHints as hint}
								<div class="rounded-lg border border-border bg-muted/30 p-3 text-sm">
									<div class="font-medium text-foreground/80">{hint.model}</div>
									<div class="text-muted-foreground">{hint.reason}</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Actions -->
				<div class="flex flex-wrap gap-2">
					<button class={buttonVariants({ variant: 'outline', size: 'sm' })} onclick={copyModelId}>
						{#if copied}
							<Check class="size-3.5" />
							Copied!
						{:else}
							<Copy class="size-3.5" />
							Copy model ID
						{/if}
					</button>
					{#if model.llmStatsUrl}
						<a
							href={model.llmStatsUrl}
							target="_blank"
							rel="noopener noreferrer"
							class={buttonVariants({ variant: 'outline', size: 'sm' })}
						>
							<ExternalLink class="size-3.5" />
							Compare on LLM Stats
						</a>
					{/if}
				</div>
			</div>
		{:else}
			<div class="p-8 text-center text-muted-foreground">No model selected.</div>
		{/if}
	</Drawer.Content>
</Drawer.Root>
