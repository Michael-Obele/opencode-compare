<script lang="ts">
	import type { GoModel } from '$lib/types/models';
	import * as Select from '$lib/components/ui/select/index.js';

	interface Props {
		models: GoModel[];
	}

	let { models }: Props = $props();

	let selectedModelId = $state('');
	let selectedScenario = $state('coding');

	let scenarios = ['coding', 'brainstorming', 'competitive', 'agentic', 'budget'];

	let model = $derived(models.find((m) => m.id === selectedModelId) ?? null);
	let score = $derived(
		model ? model.scenarioScores[selectedScenario as keyof typeof model.scenarioScores] : null
	);

	let scenarioLabels: Record<string, string> = {
		coding: 'Coding — quality(coding benchmarks) × fit(speed + burn)',
		brainstorming: 'Brainstorming — quality(reasoning) × fit(context + moderate burn)',
		competitive: 'Competitive — quality(SWE-bench + code arena) × fit(rank stability)',
		agentic: 'Agentic — quality(coding benchmarks) × fit(context + speed + tools)',
		budget: 'Budget — quality(price + burn) × fit(always relevant)'
	};
</script>

<h2 class="mb-4 text-lg font-semibold text-foreground">Scenario Score Breakdown</h2>
<p class="mb-4 text-sm text-muted-foreground">
	Two-axis multiplicative scoring: <code>quality × fit × 100</code>. Select a model and scenario to
	see the breakdown.
</p>

<div class="mb-4 grid grid-cols-2 gap-4">
	<div>
		<label class="mb-1 block text-xs text-muted-foreground">Model</label>
		<Select.Root type="single" bind:value={selectedModelId}>
			<Select.Trigger class="w-full">
				{model?.name ?? '— Pick a model —'}
			</Select.Trigger>
			<Select.Content>
				{#each models as m}
					<Select.Item value={m.id} label={m.name}>{m.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
	<div>
		<label class="mb-1 block text-xs text-muted-foreground">Scenario</label>
		<Select.Root type="single" bind:value={selectedScenario}>
			<Select.Trigger class="w-full">
				{selectedScenario}
			</Select.Trigger>
			<Select.Content>
				{#each scenarios as sc}
					<Select.Item value={sc} label={sc}>{sc}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
</div>

{#if model && score != null}
	<div class="rounded-lg border border-border bg-muted/30 p-4">
		<div class="mb-3 text-lg font-semibold text-foreground">
			{model.name} — {selectedScenario}
			<span class="ml-2 text-2xl text-violet-500">{score}</span>
		</div>
		<p class="mb-4 text-xs text-muted-foreground">{scenarioLabels[selectedScenario]}</p>
		<div class="grid grid-cols-2 gap-3 text-sm">
			<div class="rounded border border-border bg-card p-3">
				<div class="text-xs text-muted-foreground">Quality</div>
				<div class="text-lg tabular-nums text-foreground">{((score ?? 0) / 100).toFixed(2)}</div>
			</div>
			<div class="rounded border border-border bg-card p-3">
				<div class="text-xs text-muted-foreground">Fit</div>
				<div class="text-lg tabular-nums text-foreground">
					{(score ?? 0) > 0 ? ((score ?? 0) / 100).toFixed(2) : 'N/A'}
				</div>
			</div>
		</div>
		<div class="mt-3 space-y-1 text-xs text-muted-foreground">
			<div>
				Pricing: {model.pricing.inputPricePerM != null
					? `$${model.pricing.inputPricePerM.toFixed(4)} in / $${model.pricing.outputPricePerM?.toFixed(4)} out`
					: 'unknown'}
			</div>
			<div>Burn: {model.burnDetails?.band ?? 'N/A'} ({model.burnDetails?.score ?? 0})</div>
			<div>Coding benchmark: {model.benchmarks.coding?.toFixed(1) ?? '—'}</div>
			<div>Reasoning: {model.benchmarks.reasoning?.toFixed(1) ?? '—'}</div>
			<div>Context: {(model.contextWindow ?? 0).toLocaleString()} tokens</div>
			<div>Speed: {model.speed?.tokensPerSecond ?? '—'} tok/s</div>
		</div>
	</div>
{:else if model}
	<div
		class="rounded-lg border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground"
	>
		No score data available for this model/scenario.
	</div>
{/if}
