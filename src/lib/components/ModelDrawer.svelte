<script lang="ts">
	import type { GoModel } from '$lib/types/models';
	import * as Drawer from '$lib/components/ui/drawer/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { ExternalLink, Copy, Check, Info } from '@lucide/svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import BurnBadge from './BurnBadge.svelte';
	import FallbackBadge from './FallbackBadge.svelte';

	interface Props {
		model: GoModel | null;
		open?: boolean;
	}

	let { model, open = $bindable(false) }: Props = $props();

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

	function benchmarkBarWidth(value: number | null, max: number = 60): number {
		if (!value || value < 1) return 0;
		return Math.min(100, Math.round((value / Math.max(60, max)) * 100));
	}
</script>

<Drawer.Root bind:open>
	<Drawer.Content class="mx-auto max-w-2xl">
		<ScrollArea class="h-[65vh] rounded-md border">
			{#if model}
				<Drawer.Header>
					<div class="flex items-start justify-between gap-3">
						<div>
							<Drawer.Title class="flex flex-wrap items-center gap-2 text-xl">
								{model.name}
								{#if model.isNew}
									<Badge variant="outline">New</Badge>
								{/if}
								<BurnBadge burnDetails={model.burnDetails} />
							</Drawer.Title>
							<Drawer.Description>
								{model.provider}
								{#if model.description}
									<span class="mt-1 block text-sm text-muted-foreground">{model.description}</span>
								{/if}
							</Drawer.Description>
						</div>
					</div>
					{#if model.tags.length > 0}
						<div class="mt-3 flex flex-wrap gap-1.5">
							{#each model.tags as tag (tag.label)}
								<span
									class="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
								>
									{tag.label}
								</span>
							{/each}
						</div>
					{/if}
				</Drawer.Header>

				<div class="px-4 pb-2">
					<div class="rounded-lg border border-border bg-muted/30 p-3 text-sm">
						<div class="font-medium text-foreground">
							{#if model.burnDetails?.band != null}
								{model.burnDetails.score} burn score — ~{model.quota.requestsPer5h.toLocaleString()} requests
								per $12 window
							{:else}
								Burn data unavailable — pricing unknown
							{/if}
						</div>
						<div class="text-muted-foreground">
							{#if model.burnDetails?.band === 'excellent' || model.burnDetails?.band === 'good'}
								Use for high-volume, iterative work
							{:else if model.burnDetails?.band === 'extreme' || model.burnDetails?.band === 'high'}
								Best for short, focused sessions
							{:else}
								Balanced for daily use
							{/if}
						</div>
					</div>
				</div>

				{#if model.pricing.source === 'unknown'}
					<div
						class="mx-4 mb-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-amber-600"
					>
						Pricing source: unknown — contact OpenCode for accurate pricing
					</div>
				{/if}

				<div class="space-y-6 px-4 pb-8">
					<!-- Pricing -->
					<section>
						<h3 class="mb-2 text-sm font-medium text-muted-foreground">Pricing (per 1M tokens)</h3>
						<div class="grid grid-cols-2 gap-2 text-sm">
							<div class="rounded-lg border border-border p-3">
								<div class="text-muted-foreground">Input</div>
								<div class="text-lg tabular-nums text-foreground">
									{model.pricing.inputPricePerM != null
										? `$${model.pricing.inputPricePerM.toFixed(2)}`
										: '—'}
								</div>
							</div>
							<div class="rounded-lg border border-border p-3">
								<div class="text-muted-foreground">Output</div>
								<div class="text-lg tabular-nums text-foreground">
									{model.pricing.outputPricePerM != null
										? `$${model.pricing.outputPricePerM.toFixed(2)}`
										: '—'}
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
						<div class="space-y-3">
							{#each [{ label: 'Coding', value: model.benchmarks.coding }, { label: 'Reasoning', value: model.benchmarks.reasoning }, { label: 'Math', value: model.benchmarks.math }, { label: 'SciCode', value: model.benchmarks.sweBenchVerified }] as bench (bench.label)}
								{#if bench.value !== null}
									<div>
										<div class="mb-1 flex justify-between text-sm">
											<span class="text-muted-foreground">{bench.label}</span>
											<span class="font-medium tabular-nums text-foreground"
												>{bench.value.toFixed(1)}</span
											>
										</div>
										<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
											<div
												class="h-full rounded-full bg-violet-500"
												style="width: {benchmarkBarWidth(bench.value)}%"
											></div>
										</div>
									</div>
								{/if}
							{/each}
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
								{#each model.migrationHints as hint (hint.model)}
									<div class="rounded-lg border border-border bg-muted/30 p-3 text-sm">
										<div class="font-medium text-foreground/80">{hint.model}</div>
										<div class="text-muted-foreground">{hint.reason}</div>
									</div>
								{/each}
							</div>
						</section>
					{/if}
				</div>

				<div class="border-t border-border bg-background/95 px-4 pb-4 pt-3 backdrop-blur-sm">
					<div class="flex flex-wrap gap-2">
						<button
							class={buttonVariants({ variant: 'default', size: 'sm' })}
							onclick={copyModelId}
						>
							{#if copied}
								<Check class="size-3.5" />
								Copied!
							{:else}
								<Copy class="size-3.5" />
								Copy model ID
							{/if}
						</button>
						{#if model.modelgrepId}
							<a
								href={'https://modelgrep.com/models/' + model.modelgrepId}
								target="_blank"
								rel="noopener noreferrer"
								class={buttonVariants({ variant: 'outline', size: 'sm' })}
							>
								<ExternalLink class="size-3.5" />
								View on modelgrep
							</a>
						{/if}
						<a
							href={'https://llm-stats.com/models/' + model.id}
							target="_blank"
							rel="noopener noreferrer"
							class={buttonVariants({ variant: 'outline', size: 'sm' })}
						>
							<ExternalLink class="size-3.5" />
							View on llm-stats
						</a>
					</div>
				</div>
			{:else}
				<div class="p-8 text-center text-muted-foreground">No model selected.</div>
			{/if}
		</ScrollArea>
	</Drawer.Content>
</Drawer.Root>
