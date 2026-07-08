<script lang="ts">
	import { Calculator, Clock } from '@lucide/svelte';
	import { burnRateFromPrice } from '$lib/burn';
	import * as Select from '$lib/components/ui/select/index.js';
	import type { ModelPricing } from '$lib/types/models';

	interface CalculatorModel {
		id: string;
		name: string;
		pricing: ModelPricing;
		burnRate?: string;
	}

	interface Props {
		models: CalculatorModel[];
	}

	let { models }: Props = $props();

	let tokenInput = $state(50_000);
	let selectedModelId = $state<string>('');

	let selectedModel = $derived(models.find((m) => m.id === selectedModelId) ?? null);

	$effect(() => {
		if (!selectedModelId && models.length > 0) {
			selectedModelId = cheapestModel(models)?.id ?? '';
		}
	});

	function cheapestModel(models: CalculatorModel[]): CalculatorModel | undefined {
		return [...models].sort((a, b) => totalPrice(a.pricing) - totalPrice(b.pricing))[0];
	}

	function totalPrice(pricing: ModelPricing): number {
		return (pricing.inputPricePerM ?? 0) + (pricing.outputPricePerM ?? 0);
	}

	// Client-side cost estimate with cached-read discount
	function computeCost(
		pricing: ModelPricing,
		inputTokens: number,
		outputTokens: number,
		cachedPct: number
	): number | null {
		if (pricing.inputPricePerM == null || pricing.outputPricePerM == null) return null;
		const cachedInputTokens = Math.round(inputTokens * (cachedPct / 100));
		const uncachedInput = inputTokens - cachedInputTokens;
		const cachedRate = pricing.cachedReadPerM ?? pricing.inputPricePerM;
		return (
			(uncachedInput * pricing.inputPricePerM +
				cachedInputTokens * cachedRate +
				outputTokens * pricing.outputPricePerM) /
			1_000_000
		);
	}

	let cachedPct = $state(50);
	let useCached = $state(true);

	let costPerRequest = $derived.by(() => {
		if (!selectedModel) return null;
		const inputTokens = tokenInput * 0.7;
		const outputTokens = tokenInput * 0.15;
		return computeCost(selectedModel.pricing, inputTokens, outputTokens, cachedPct);
	});

	let quotaEstimates = $derived.by(() => {
		if (costPerRequest == null || costPerRequest <= 0) return null;
		return {
			per5h: Math.floor(12 / costPerRequest),
			perWeek: Math.floor(30 / costPerRequest),
			perMonth: Math.floor(60 / costPerRequest)
		};
	});
</script>

<div class="rounded-xl border border-border bg-card p-6">
	<div class="mb-4 flex items-center gap-2">
		<Calculator class="size-5 text-muted-foreground" />
		<h2 class="text-lg font-semibold text-foreground">Quota Calculator</h2>
	</div>

	<p class="mb-6 text-sm text-muted-foreground">
		Estimate how many coding requests you can make before hitting the
		<span class="text-foreground/70">$12/5h</span>,
		<span class="text-foreground/70">$30/week</span>, and
		<span class="text-foreground/70">$60/month</span> Go limits.
	</p>

	<div class="space-y-4">
		<!-- Token input -->
		<div>
			<label for="tokens" class="mb-1.5 block text-sm text-muted-foreground">
				Avg. tokens per request: <span class="font-medium text-foreground"
					>{tokenInput.toLocaleString()}</span
				>
			</label>
			<input
				id="tokens"
				type="range"
				min="1000"
				max="500000"
				step="1000"
				bind:value={tokenInput}
				class="w-full accent-violet-600"
			/>
			<div class="mt-1 flex justify-between text-xs text-muted-foreground/50">
				<span>Short prompt (~2K)</span>
				<span>Heavy refactor (~200K)</span>
			</div>
		</div>

		<!-- Model picker via shadcn Select -->
		<div>
			<label for="model-select" class="mb-1.5 block text-sm text-muted-foreground">
				Select a model
			</label>
			<Select.Root type="single" bind:value={selectedModelId}>
				<Select.Trigger class="w-full" id="model-select">
					{#if selectedModelId}
						{models.find((m) => m.id === selectedModelId)?.name ?? '— Pick a model —'}
					{:else}
						— Pick a model —
					{/if}
				</Select.Trigger>
				<Select.Content>
					{#each models as m}
						<Select.Item value={m.id} label={m.name}>{m.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Cached reads toggle -->
		<div>
			<label class="flex items-center gap-2 text-sm text-muted-foreground">
				<input
					type="checkbox"
					checked={useCached}
					class="accent-violet-600"
					onclick={() => {
						useCached = !useCached;
						cachedPct = useCached ? 50 : 0;
					}}
				/>
				<span>50% of input tokens are cached reads</span>
			</label>
		</div>

		<!-- Results -->
		{#if selectedModel && costPerRequest != null}
			<div class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
				<div class="text-sm text-muted-foreground">
					Cost per request: <span class="font-medium text-foreground"
						>~${costPerRequest.toFixed(6)}</span
					>
				</div>

				{#if selectedModel}
					{@const level = burnRateFromPrice(
						(selectedModel.pricing.inputPricePerM ?? 0) +
							(selectedModel.pricing.outputPricePerM ?? 0)
					)}
					<div class="flex items-center gap-2 text-xs">
						<span class="text-muted-foreground">
							{level === 'slow'
								? '❄️ Quota-friendly'
								: level === 'fast'
									? '🔥 Burns fast'
									: '⚖️ Moderate'}
						</span>
						<span class="text-muted-foreground">
							{level === 'slow'
								? 'Great for high-volume use'
								: level === 'medium'
									? 'Balanced for daily use'
									: 'Best for focused sessions'}
						</span>
					</div>
				{/if}

				<div class="grid grid-cols-3 gap-2 pt-2">
					<div class="rounded-lg border border-border p-2 text-center">
						<div class="mb-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
							<Clock class="size-3" /> 5 Hours
						</div>
						<div class="text-lg font-medium tabular-nums text-foreground">
							{quotaEstimates?.per5h.toLocaleString() ?? '—'}
						</div>
						<div class="text-xs text-muted-foreground/60">requests</div>
					</div>
					<div class="rounded-lg border border-border p-2 text-center">
						<div class="mb-1 text-xs text-muted-foreground">Week</div>
						<div class="text-lg font-medium tabular-nums text-foreground">
							{quotaEstimates?.perWeek.toLocaleString() ?? '—'}
						</div>
						<div class="text-xs text-muted-foreground/60">requests</div>
					</div>
					<div class="rounded-lg border border-border p-2 text-center">
						<div class="mb-1 text-xs text-muted-foreground">Month</div>
						<div class="text-lg font-medium tabular-nums text-foreground">
							{quotaEstimates?.perMonth.toLocaleString() ?? '—'}
						</div>
						<div class="text-xs text-muted-foreground/60">requests</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
