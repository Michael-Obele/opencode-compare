<script lang="ts">
	import { ScatterChart } from 'layerchart';
	import type { GoModel } from '$lib/types/models';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	interface Props {
		models: GoModel[];
		selectedModel: GoModel;
	}

	let { models, selectedModel }: Props = $props();

	const selectedName = $derived(selectedModel?.name ?? '');
	const chartConfig = $derived({
		selected: { label: selectedName, color: 'var(--primary)' },
		peer: { label: 'Other models', color: 'var(--muted-foreground)' }
	});

	interface ScatterPoint {
		modelId: string;
		name: string;
		totalPrice: number;
		codingScore: number;
		isSelected: boolean;
	}

	const allPoints = $derived.by(() => {
		const points: ScatterPoint[] = [];
		for (const m of models) {
			const input = m.pricing.inputPricePerM;
			const output = m.pricing.outputPricePerM;
			const coding = m.benchmarks.coding;
			if (input == null || output == null || coding == null) continue;
			points.push({
				modelId: m.id,
				name: m.name,
				totalPrice: input + output,
				codingScore: coding,
				isSelected: m.id === selectedModel?.id
			});
		}
		return points;
	});

	const selectedPoint = $derived(allPoints.find((p) => p.isSelected));
	const peerPoints = $derived(allPoints.filter((p) => !p.isSelected));
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Price vs. Performance</Card.Title>
		<Card.Description>Where this model sits in the field</Card.Description>
	</Card.Header>
	<Card.Content>
		<Chart.Container config={chartConfig}>
			{#if selectedPoint}
				<ScatterChart
					data={[...peerPoints, selectedPoint]}
					x="totalPrice"
					y="codingScore"
					height={200}
					axis="x"
					props={{
						xAxis: {
							format: (d: number) => `$${d.toFixed(2)}`
						},
						yAxis: {
							format: (d: number) => d.toFixed(0)
						},
						highlight: { points: { r: 4 } }
					}}
					series={[
						{
							key: 'peers',
							label: 'Other models',
							color: 'var(--muted-foreground)',
							data: peerPoints,
							props: {
								class: 'opacity-20',
								r: 4
							}
						},
						{
							key: 'selected',
							label: selectedModel.name,
							color: 'var(--primary)',
							data: [selectedPoint],
							props: {
								r: 7,
								stroke: 'var(--primary)',
								strokeWidth: 2
							}
						}
					]}
				>
					{#snippet tooltip()}
						<Chart.Tooltip />
					{/snippet}
				</ScatterChart>
			{/if}
		</Chart.Container>
	</Card.Content>
</Card.Root>
