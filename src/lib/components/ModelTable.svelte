<script lang="ts">
	import type { GoModel } from '$lib/types/models';
	import * as Table from '$lib/components/ui/table/index.js';

	interface Props {
		models: GoModel[];
		filter: string;
		onSelectModel: (model: GoModel) => void;
	}

	let { models, filter = $bindable(''), onSelectModel }: Props = $props();

	let filteredModels = $derived.by(() => {
		if (!filter) return models;
		const q = filter.toLowerCase();
		return models.filter(
			(m) =>
				m.name.toLowerCase().includes(q) ||
				m.provider.toLowerCase().includes(q) ||
				m.tags.some((t) => t.label.toLowerCase().includes(q))
		);
	});

	let sortKey = $state<'name' | 'coding' | 'price' | 'quota'>('coding');
	let sortDir = $state<'asc' | 'desc'>('desc');

	let sortedModels = $derived.by(() => {
		const copy = [...filteredModels];
		copy.sort((a, b) => {
			let cmp = 0;
			switch (sortKey) {
				case 'name':
					cmp = a.name.localeCompare(b.name);
					break;
				case 'coding':
					cmp = (a.benchmarks.coding ?? 0) - (b.benchmarks.coding ?? 0);
					break;
				case 'price':
					cmp = b.pricing.inputPricePerM - a.pricing.inputPricePerM;
					break;
				case 'quota':
					cmp = a.quota.requestsPer5h - b.quota.requestsPer5h;
					break;
			}
			return sortDir === 'asc' ? cmp : -cmp;
		});
		return copy;
	});

	function toggleSort(key: typeof sortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'desc';
		}
	}

	function sortIndicator(key: typeof sortKey) {
		if (sortKey !== key) return '';
		return sortDir === 'asc' ? ' ↑' : ' ↓';
	}

	function priceLabel(price: number): string {
		if (price < 0.3) return '$';
		if (price < 1.5) return '$$';
		return '$$$';
	}

	function burnColor(rate: string): string {
		switch (rate) {
			case 'slow':
				return 'text-green-400';
			case 'medium':
				return 'text-yellow-400';
			case 'fast':
				return 'text-red-400';
			default:
				return 'text-muted-foreground';
		}
	}
</script>

<div class="overflow-x-auto rounded-xl border border-border bg-card">
	<Table.Root>
		<Table.Header>
			<Table.Row class="border-b border-border">
				<Table.Head
					class="cursor-pointer whitespace-nowrap text-muted-foreground hover:text-foreground"
					onclick={() => toggleSort('name')}
				>
					Model{sortIndicator('name')}
				</Table.Head>
				<Table.Head
					class="cursor-pointer whitespace-nowrap text-muted-foreground hover:text-foreground"
					onclick={() => toggleSort('price')}
				>
					Price / 1M{sortIndicator('price')}
				</Table.Head>
				<Table.Head class="whitespace-nowrap text-muted-foreground">Burn</Table.Head>
				<Table.Head
					class="cursor-pointer whitespace-nowrap text-muted-foreground hover:text-foreground"
					onclick={() => toggleSort('quota')}
				>
					Req / 5h{sortIndicator('quota')}
				</Table.Head>
				<Table.Head
					class="cursor-pointer whitespace-nowrap text-muted-foreground hover:text-foreground"
					onclick={() => toggleSort('coding')}
				>
					Coding{sortIndicator('coding')}
				</Table.Head>
				<Table.Head class="hidden whitespace-nowrap text-muted-foreground md:table-cell"
					>Best for</Table.Head
				>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each sortedModels as model (model.id)}
				{@const burnLabel =
					model.burnRate === 'slow'
						? 'Quota-friendly'
						: model.burnRate === 'fast'
							? 'Burns fast'
							: 'Moderate'}
				<Table.Row
					class="cursor-pointer border-b border-border transition-colors hover:bg-muted/50"
					onclick={() => onSelectModel(model)}
					tabindex={0}
					role="button"
					onkeydown={(e) => e.key === 'Enter' && onSelectModel(model)}
				>
					<Table.Cell class="font-medium">
						<div class="flex items-center gap-2">
							<span class="text-foreground">{model.name}</span>
							{#if model.isNew}
								<span
									class="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
									>NEW</span
								>
							{/if}
						</div>
						<div class="text-xs text-muted-foreground">{model.provider}</div>
					</Table.Cell>
					<Table.Cell class="text-sm tabular-nums">
						<div class="text-foreground/80">
							${model.pricing.inputPricePerM.toFixed(2)} /
							<span class="text-muted-foreground">${model.pricing.outputPricePerM.toFixed(2)}</span>
						</div>
						<div class="text-xs text-muted-foreground">
							{priceLabel(model.pricing.inputPricePerM)}
						</div>
					</Table.Cell>
					<Table.Cell>
						<span
							class="inline-flex items-center gap-1 text-sm font-medium {burnColor(model.burnRate)}"
							title={burnLabel}
						>
							{model.burnRate === 'slow' ? 'Slow' : model.burnRate === 'fast' ? 'Fast' : 'Med'}
						</span>
					</Table.Cell>
					<Table.Cell class="text-sm tabular-nums text-muted-foreground/70">
						{model.quota.requestsPer5h.toLocaleString()}
					</Table.Cell>
					<Table.Cell class="text-sm tabular-nums">
						{#if model.benchmarks.coding}
							<span class="text-foreground/80">{model.benchmarks.coding.toFixed(1)}</span>
						{:else}
							<span class="text-muted-foreground/30">—</span>
						{/if}
					</Table.Cell>
					<Table.Cell class="hidden md:table-cell">
						<div class="flex flex-wrap gap-1">
							{#each model.tags.slice(0, 2) as tag}
								<span
									class="inline-flex items-center gap-0.5 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
								>
									{tag.label}
								</span>
							{/each}
							{#if model.tags.length > 2}
								<span class="text-xs text-muted-foreground/40">
									+{model.tags.length - 2}
								</span>
							{/if}
						</div>
					</Table.Cell>
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell colspan={6} class="py-12 text-center text-muted-foreground">
						No models match your filter. Try a different search term.
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
