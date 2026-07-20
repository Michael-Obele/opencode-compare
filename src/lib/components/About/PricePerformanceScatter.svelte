<script lang="ts">
	import { ScatterChart } from 'layerchart';
	import type { GoModel } from '$lib/types/models';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	interface Props {
		models: GoModel[];
	}

	let { models }: Props = $props();

	interface PricePerfPoint {
		name: string;
		provider: string;
		totalPrice: number;
		codingScore: number;
		burnColor: string;
	}

	const burnColors: Record<string, string> = {
		excellent: 'var(--chart-1)',
		good: 'var(--chart-2)',
		moderate: 'var(--chart-3)',
		high: 'var(--chart-4)',
		extreme: 'var(--chart-5)'
	};

	const chartData = $derived.by(() => {
		const points: PricePerfPoint[] = [];
		for (const m of models) {
			const input = m.pricing.inputPricePerM;
			const output = m.pricing.outputPricePerM;
			const coding = m.benchmarks.coding;
			if (input == null || output == null || coding == null) continue;
			const band = m.burnDetails?.band ?? 'moderate';
			points.push({
				name: m.name,
				provider: m.provider,
				totalPrice: input + output,
				codingScore: coding,
				burnColor: burnColors[band] ?? 'var(--muted-foreground)'
			});
		}
		return points.sort((a, b) => a.totalPrice - b.totalPrice);
	});

	const chartConfig = {
		price: { label: 'Price per 1M tokens', color: 'var(--chart-1)' }
	} satisfies Chart.ChartConfig;

	// Build per-model series for individual point coloring
	const series = $derived(
		chartData.map((p) => ({
			key: p.name,
			label: p.name,
			color: p.burnColor,
			data: [p]
		}))
	);
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Price vs. Performance</Card.Title>
		<Card.Description>
			Cheaper isn't always worse — find the sweet spot for your workload
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<Chart.Container config={chartConfig} class="aspect-16/10">
			<ScatterChart
				data={chartData}
				x="totalPrice"
				y="codingScore"
				height={280}
				axis="x"
				props={{
					xAxis: {
						format: (d: number) => `$${d.toFixed(2)}`
					},
					yAxis: {
						format: (d: number) => d.toFixed(0)
					},
					highlight: { points: { r: 6 } }
				}}
				{series}
			>
				{#snippet tooltip()}
					<Chart.Tooltip />
				{/snippet}
			</ScatterChart>
		</Chart.Container>
	</Card.Content>
	<Card.Footer>
		<div
			class="flex w-full flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
		>
			<span>Dots colored by burn band: cyan = excellent, red = extreme.</span>
			<span>Hover or tap a point for details.</span>
		</div>
	</Card.Footer>
</Card.Root>
