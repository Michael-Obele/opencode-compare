<script lang="ts">
	import CalculatorIcon from '@lucide/svelte/icons/calculator';
	import ClockIcon from '@lucide/svelte/icons/clock';

	interface Props {
		models: {
			id: string;
			name: string;
			pricing: { inputPricePerM: number; outputPricePerM: number };
		}[];
	}

	let { models }: Props = $props();

	let tokenInput = $state(50_000); // default: 50K tokens
	let selectedModelId = $state<string>('');

	let selectedModel = $derived(models.find((m) => m.id === selectedModelId) ?? null);

	let estimatedCost = $derived.by(() => {
		if (!selectedModel) return null;
		const inputTokens = tokenInput * 0.7; // 70% input
		const outputTokens = tokenInput * 0.15; // 15% output
		const cachedTokens = tokenInput * 0.65; // ~65% cached reads

		return {
			input: (inputTokens / 1_000_000) * selectedModel.pricing.inputPricePerM,
			output: (outputTokens / 1_000_000) * selectedModel.pricing.outputPricePerM,
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

	let burnLabel = $derived.by(() => {
		if (!selectedModel) return '';
		const total = selectedModel.pricing.inputPricePerM + selectedModel.pricing.outputPricePerM;
		if (total < 1.5) return '🐢 Burns quota slowly — great for high-volume use';
		if (total < 6) return '⚡ Moderate burn — balanced for daily use';
		return '🔥 Burns quota fast — best for focused sessions';
	});
</script>

<div class="rounded-xl border border-white/10 bg-white/[0.02] p-6">
	<div class="mb-4 flex items-center gap-2">
		<CalculatorIcon class="size-5 text-white/60" />
		<h2 class="text-lg font-semibold text-white">Quota Calculator</h2>
	</div>

	<p class="mb-6 text-sm text-white/50">
		Estimate how many coding requests you can make before hitting the
		<span class="text-white/70">$12/5h</span>,
		<span class="text-white/70">$30/week</span>, and
		<span class="text-white/70">$60/month</span> Go limits.
	</p>

	<div class="space-y-4">
		<!-- Token input -->
		<div>
			<label for="tokens" class="mb-1.5 block text-sm text-white/60">
				Average tokens per request
			</label>
			<input
				id="tokens"
				type="number"
				min="1000"
				max="500000"
				step="1000"
				bind:value={tokenInput}
				class="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none"
			/>
			<div class="mt-1 flex justify-between text-xs text-white/30">
				<span>Short prompt (~2K)</span>
				<span>Heavy refactor (~200K)</span>
			</div>
		</div>

		<!-- Model picker -->
		<div>
			<label for="model-pick" class="mb-1.5 block text-sm text-white/60"> Select a model </label>
			<select
				id="model-pick"
				bind:value={selectedModelId}
				class="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
			>
				<option value="">— Pick a model —</option>
				{#each models as m}
					<option value={m.id}>{m.name}</option>
				{/each}
			</select>
		</div>

		<!-- Results -->
		{#if selectedModel && estimatedCost}
			<div class="space-y-3 rounded-lg border border-white/5 bg-white/[0.02] p-4">
				<div class="text-sm text-white/50">
					Estimated cost per request: <span class="text-white"
						>~${estimatedCost.perRequest.toFixed(4)}</span
					>
				</div>
				<div class="text-xs text-white/40">{burnLabel}</div>

				<div class="grid grid-cols-3 gap-2 pt-2">
					<div class="rounded-lg border border-white/5 p-2 text-center">
						<div class="flex items-center justify-center gap-1 text-xs text-white/40">
							<ClockIcon class="size-3" /> 5 Hours
						</div>
						<div class="text-lg font-medium tabular-nums text-white">
							{quotaEstimates?.per5h.toLocaleString() ?? '—'}
						</div>
						<div class="text-xs text-white/30">requests</div>
					</div>
					<div class="rounded-lg border border-white/5 p-2 text-center">
						<div class="text-xs text-white/40">Week</div>
						<div class="text-lg font-medium tabular-nums text-white">
							{quotaEstimates?.perWeek.toLocaleString() ?? '—'}
						</div>
						<div class="text-xs text-white/30">requests</div>
					</div>
					<div class="rounded-lg border border-white/5 p-2 text-center">
						<div class="text-xs text-white/40">Month</div>
						<div class="text-lg font-medium tabular-nums text-white">
							{quotaEstimates?.perMonth.toLocaleString() ?? '—'}
						</div>
						<div class="text-xs text-white/30">requests</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
