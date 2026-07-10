<script lang="ts">
	import { Calculator, Clock, Snowflake, Flame, Thermometer } from '@lucide/svelte';
	import { burnRateFromPrice, burnClasses, burnLabel } from '$lib/burn';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Card from '$lib/components/ui/card';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Slider } from '$lib/components/ui/slider/index.js';
	import { Label } from './ui/label';
	import { Badge } from './ui/badge';
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

	let enabled = $state(false);
	let tokenInput = $state(50_000);
	let cachedPctValue = $state(50);
	let selectedModelId = $state<string>('');

	let selectedModel = $derived(models.find((m) => m.id === selectedModelId) ?? null);

	let hasCachedPricing = $derived(selectedModel?.pricing.cachedReadPerM != null);

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

	let costPerRequest = $derived.by(() => {
		if (!selectedModel) return null;
		const inputTokens = tokenInput * 0.7;
		const outputTokens = tokenInput * 0.15;
		const effectiveCachedPct = hasCachedPricing ? cachedPctValue : 0;
		return computeCost(selectedModel.pricing, inputTokens, outputTokens, effectiveCachedPct);
	});

	let quotaEstimates = $derived.by(() => {
		if (costPerRequest == null || costPerRequest <= 0) return null;
		return {
			per5h: Math.floor(12 / costPerRequest),
			perWeek: Math.floor(30 / costPerRequest),
			perMonth: Math.floor(60 / costPerRequest)
		};
	});

	let burnLevel = $derived.by(() => {
		if (!selectedModel) return null;
		return burnRateFromPrice(
			(selectedModel.pricing.inputPricePerM ?? 0) + (selectedModel.pricing.outputPricePerM ?? 0)
		);
	});
</script>

<Card.Root class="border-border bg-card">
	<Card.Header class="pb-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Calculator class="size-4 text-muted-foreground" />
				<Card.Title class="text-base font-semibold">Quota Calculator</Card.Title>
			</div>
			<div class="flex items-center gap-2">
				<Label for="calc-toggle" class="text-xs text-muted-foreground">
					{enabled ? 'Hide' : 'Show'}
				</Label>
				<Switch id="calc-toggle" bind:checked={enabled} size="sm" />
			</div>
		</div>
		<Card.Description>
			Estimate requests before hitting the
			<span class="text-foreground/70">$12/5h</span>,
			<span class="text-foreground/70">$30/week</span>, and
			<span class="text-foreground/70">$60/month</span> Go limits.
		</Card.Description>
	</Card.Header>

	{#if enabled}
		<Card.Content class="space-y-5 pt-0">
			<!-- Token slider -->
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<Label for="tokens-slider" class="text-sm text-muted-foreground">
						Avg. tokens per request
					</Label>
					<span class="text-sm font-medium tabular-nums text-foreground">
						{tokenInput.toLocaleString()}
					</span>
				</div>
				<Slider
					id="tokens-slider"
					type="single"
					bind:value={tokenInput}
					min={1000}
					max={500000}
					step={1000}
				/>
				<div class="flex justify-between text-xs text-muted-foreground/50">
					<span>Short (~2K)</span>
					<span>Heavy refactor (~200K)</span>
				</div>
			</div>

			<!-- Cached reads slider -->
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<Label for="cached-slider" class="text-sm text-muted-foreground">Cached reads</Label>
					{#if selectedModel && !hasCachedPricing}
						<span class="text-xs text-muted-foreground/60">Not available for this model</span>
					{:else}
						<span class="text-sm font-medium tabular-nums text-foreground">
							{cachedPctValue}%
						</span>
					{/if}
				</div>
				<Slider
					id="cached-slider"
					type="single"
					bind:value={cachedPctValue}
					min={0}
					max={90}
					step={5}
					disabled={!hasCachedPricing}
				/>
				<div class="flex justify-between text-xs text-muted-foreground/50">
					<span>No cache</span>
					<span>90% cached</span>
				</div>
			</div>

			<!-- Model picker -->
			<div class="space-y-2">
				<Label for="model-select" class="text-sm text-muted-foreground">Select a model</Label>
				<Select.Root type="single" bind:value={selectedModelId}>
					<Select.Trigger class="w-full" id="model-select">
						{#if selectedModelId}
							{models.find((m) => m.id === selectedModelId)?.name ?? '— Pick a model —'}
						{:else}
							— Pick a model —
						{/if}
					</Select.Trigger>
					<Select.Content>
						{#each models as m (m.id)}
							<Select.Item value={m.id} label={m.name}>{m.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<!-- Results -->
			{#if selectedModel && costPerRequest != null}
				<div class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground">Cost per request</span>
						<span class="text-sm font-medium tabular-nums text-foreground">
							~${costPerRequest.toFixed(6)}
						</span>
					</div>

					{#if burnLevel}
						<div class="flex items-center gap-2">
							<Badge variant="outline" class={burnClasses(burnLevel)}>
								{#if burnLevel === 'slow'}
									<Snowflake class="mr-1 size-3" /> Quota-friendly
								{:else if burnLevel === 'fast'}
									<Flame class="mr-1 size-3" /> Burns fast
								{:else}
									<Thermometer class="mr-1 size-3" /> Moderate
								{/if}
							</Badge>
							<span class="text-xs text-muted-foreground">
								{burnLabel(burnLevel)}
							</span>
						</div>
					{/if}

					<div class="grid grid-cols-3 gap-2 pt-1">
						<div class="rounded-lg border border-border p-2.5 text-center">
							<div
								class="mb-1 flex items-center justify-center gap-1 text-xs text-muted-foreground"
							>
								<Clock class="size-3" /> 5 Hours
							</div>
							<div class="text-lg font-medium tabular-nums text-foreground">
								{quotaEstimates?.per5h.toLocaleString() ?? '—'}
							</div>
							<div class="text-xs text-muted-foreground/60">requests</div>
						</div>
						<div class="rounded-lg border border-border p-2.5 text-center">
							<div class="mb-1 text-xs text-muted-foreground">Week</div>
							<div class="text-lg font-medium tabular-nums text-foreground">
								{quotaEstimates?.perWeek.toLocaleString() ?? '—'}
							</div>
							<div class="text-xs text-muted-foreground/60">requests</div>
						</div>
						<div class="rounded-lg border border-border p-2.5 text-center">
							<div class="mb-1 text-xs text-muted-foreground">Month</div>
							<div class="text-lg font-medium tabular-nums text-foreground">
								{quotaEstimates?.perMonth.toLocaleString() ?? '—'}
							</div>
							<div class="text-xs text-muted-foreground/60">requests</div>
						</div>
					</div>
				</div>
			{/if}
		</Card.Content>
	{/if}
</Card.Root>
