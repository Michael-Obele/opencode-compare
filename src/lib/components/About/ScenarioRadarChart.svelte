<script lang="ts">
	import { LineChart } from 'layerchart';
	import { scaleBand } from 'd3-scale';
	import { curveLinearClosed } from 'd3-shape';
	import type { GoModel } from '$lib/types/models';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	interface Props {
		models: GoModel[];
	}

	let { models }: Props = $props();

	const scenarios = [
		'Brainstorming',
		'Coding',
		'Competitive',
		'Agentic',
		'Budget',
		'Frontend'
	] as const;

	interface RadarDataPoint {
		scenario: string;
		[modelName: string]: string | number;
	}

	const topModels = $derived.by(() => {
		const scored = models
			.map((m) => {
				const scores = m.scenarioScores;
				const avg =
					(scores.brainstorming +
						scores.coding +
						scores.competitive +
						scores.agentic +
						scores.budget +
						scores.frontend) /
					6;
				return { model: m, avg };
			})
			.sort((a, b) => b.avg - a.avg)
			.slice(0, 5);
		return scored.map((s) => s.model);
	});

	const chartConfig = $derived.by(() => {
		const config: Record<string, { label: string; color: string }> = {};
		topModels.forEach((m, i) => {
			config[m.id] = { label: m.name, color: `var(--chart-${(i % 6) + 1})` };
		});
		return config;
	});

	const radarData = $derived.by(() => {
		return scenarios.map((scenario) => {
			const key = scenario.toLowerCase() as keyof (typeof topModels)[0]['scenarioScores'];
			const point: RadarDataPoint = { scenario };
			for (const model of topModels) {
				point[model.id] = model.scenarioScores[key] ?? 0;
			}
			return point;
		});
	});

	const series = $derived(
		topModels.map((m, i) => ({
			key: m.id,
			label: m.name,
			color: `var(--chart-${(i % 6) + 1})`,
			props: {
				fill: `var(--chart-${(i % 6) + 1})`,
				fillOpacity: 0.15 + i * 0.05
			}
		}))
	);
</script>

<Card.Root>
	<Card.Header class="items-center">
		<Card.Title>Scenario Profiles</Card.Title>
		<Card.Description>
			Top {topModels.length} models — wider polygons mean stronger across all scenarios
		</Card.Description>
	</Card.Header>
	<Card.Content class="flex-1">
		<Chart.Container config={chartConfig} class="mx-auto aspect-square max-h-96">
			<LineChart
				data={radarData}
				{series}
				radial
				x="scenario"
				xScale={scaleBand()}
				padding={12}
				props={{
					spline: {
						curve: curveLinearClosed,
						stroke: '0',
						motion: { type: 'tween', duration: 600 }
					},
					xAxis: {
						tickLength: 0
					},
					yAxis: {
						format: () => ''
					},
					grid: {
						radialY: 'linear'
					},
					tooltip: {
						context: {
							mode: 'voronoi'
						}
					},
					highlight: {
						lines: false,
						points: { r: 3 }
					}
				}}
			>
				{#snippet tooltip()}
					<Chart.Tooltip />
				{/snippet}
			</LineChart>
		</Chart.Container>
	</Card.Content>
	<Card.Footer class="flex-col gap-2 text-sm">
		<div class="flex w-full items-start gap-2 text-sm">
			<div class="grid gap-1">
				<div class="flex items-center gap-2 leading-none font-medium text-foreground">
					Each model's 6 scenario scores form a unique shape
				</div>
				<div class="text-muted-foreground flex items-center gap-2 leading-none">
					Brainstorming · Coding · Competitive · Agentic · Budget · Frontend
				</div>
			</div>
		</div>
	</Card.Footer>
</Card.Root>
