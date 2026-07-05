<script lang="ts">
	import { Calculator, Clock, ChevronDown } from 'lucide-svelte';
	import * as Select from '$lib/components/ui/select/index.js';

	interface Props {
		models: {
			id: string;
			name: string;
			pricing: { inputPricePerM: number; outputPricePerM: number };
		}[];
	}

	let { models }: Props = $props();

	let tokenInput = $state(50_000);
	let selectedModelId = $state<string>('');

	let selectedModel = $derived(models.find((m) => m.id === selectedModelId) ?? null);

	let estimatedCost = $derived.by(() => {
		if (!selectedModel) return null;
		const inputTokens = tokenInput * 0.7;
		const outputTokens = tokenInput * 0.15;
		return {
			perRequest:
				(inputTokens / 1_000_000) * selectedModel.pricing.inputPricePerM +
				(outputTokens / 1_000_000) * selectedModel.pricing.outputPricePerM
		};
	});

	let quotaEstimates = $derived.by(() => {
		if (!estimatedCost || estimatedCost.perRequest <= 0) return null;
		return {
			per5h: Math.floor(12 / estimatedCost.perRequest),
			perWeek: Math.floor(30 / estimatedCost.perRequest),
			perMonth: Math.floor(60 / estimatedCost.perRequest)
		};
	});

	let burnLevel = $derived.by(() => {
		if (!selectedModel) return null;
		const total = selectedModel.pricing.inputPricePerM + selectedModel.pricing.outputPricePerM;
		if (total < 1.5) return 'slow';
		if (total < 6) return 'moderate';
		return 'fast';
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
				Avg. tokens per request
			</label>
			<input
				id="tokens"
				type="number"
				min="1000"
				max="500000"
				step="1000"
				bind:value={tokenInput}
				class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

		<!-- Results -->
		{#if selectedModel && estimatedCost}
			<div class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
				<div class="text-sm text-muted-foreground">
					Cost per request: <span class="font-medium text-foreground"
						>~${estimatedCost.perRequest.toFixed(4)}</span
					>
				</div>

				{#if burnLevel}
					<div class="flex items-center gap-2 text-xs">
						{#if burnLevel === 'slow'}
							<span class="rounded-full bg-green-500/10 px-2 py-0.5 text-green-500">Slow burn</span>
							<span class="text-muted-foreground">Great for high-volume use</span>
						{:else if burnLevel === 'moderate'}
							<span class="rounded-full bg-yellow-500/10 px-2 py-0.5 text-yellow-500">Moderate</span
							>
							<span class="text-muted-foreground">Balanced for daily use</span>
						{:else}
							<span class="rounded-full bg-red-500/10 px-2 py-0.5 text-red-500">Fast burn</span>
							<span class="text-muted-foreground">Best for focused sessions</span>
						{/if}
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
