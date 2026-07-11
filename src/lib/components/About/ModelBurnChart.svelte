<script lang="ts">
	import { LineChart } from 'layerchart';
	import { TrendingUp } from '@lucide/svelte';
	import { scaleUtc } from 'd3-scale';
	import { curveMonotoneX } from 'd3-shape';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	interface CostPoint {
		date: Date;
		copilot: number;
		cursor: number;
		claude: number;
		opencode: number;
	}

	// Approximate cumulative monthly spend over a year for a typical solo developer
	// moving from entry tier toward heavier usage. OpenCode Go stays flat at $10.
	const chartData: CostPoint[] = [
		{ date: new Date('2026-01-01'), copilot: 10, cursor: 20, claude: 20, opencode: 10 },
		{ date: new Date('2026-02-01'), copilot: 18, cursor: 25, claude: 20, opencode: 10 },
		{ date: new Date('2026-03-01'), copilot: 32, cursor: 40, claude: 35, opencode: 10 },
		{ date: new Date('2026-04-01'), copilot: 45, cursor: 60, claude: 50, opencode: 10 },
		{ date: new Date('2026-05-01'), copilot: 70, cursor: 95, claude: 75, opencode: 10 },
		{ date: new Date('2026-06-01'), copilot: 100, cursor: 140, claude: 100, opencode: 10 },
		{ date: new Date('2026-07-01'), copilot: 140, cursor: 200, claude: 150, opencode: 10 },
		{ date: new Date('2026-08-01'), copilot: 180, cursor: 260, claude: 200, opencode: 10 },
		{ date: new Date('2026-09-01'), copilot: 230, cursor: 340, claude: 200, opencode: 10 },
		{ date: new Date('2026-10-01'), copilot: 290, cursor: 420, claude: 200, opencode: 10 },
		{ date: new Date('2026-11-01'), copilot: 360, cursor: 520, claude: 200, opencode: 10 },
		{ date: new Date('2026-12-01'), copilot: 450, cursor: 640, claude: 200, opencode: 10 }
	];

	const chartConfig = {
		copilot: { label: 'GitHub Copilot', color: 'var(--chart-1)' },
		cursor: { label: 'Cursor', color: 'var(--chart-3)' },
		claude: { label: 'Claude Code', color: 'var(--chart-5)' },
		opencode: { label: 'OpenCode Go', color: 'var(--primary)' }
	} satisfies Chart.ChartConfig;
</script>

<Card.Root class="overflow-hidden">
	<Card.Header>
		<div class="flex items-center gap-2">
			<TrendingUp class="size-4 text-primary" />
			<Card.Title>The cost curve that pushed me to switch</Card.Title>
		</div>
		<Card.Description>
			Estimated monthly spend as usage grows. Seat price is just the floor; overages are the rest.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<Chart.Container config={chartConfig} class="aspect-16/10">
			<LineChart
				data={chartData}
				x="date"
				xScale={scaleUtc()}
				axis="x"
				series={[
					{ key: 'copilot', label: 'GitHub Copilot', color: chartConfig.copilot.color },
					{ key: 'cursor', label: 'Cursor', color: chartConfig.cursor.color },
					{ key: 'claude', label: 'Claude Code', color: chartConfig.claude.color },
					{ key: 'opencode', label: 'OpenCode Go', color: chartConfig.opencode.color }
				]}
				props={{
					spline: { curve: curveMonotoneX, motion: 'tween', strokeWidth: 2.5 },
					xAxis: {
						format: (v: Date) => v.toLocaleDateString('en-US', { month: 'short' })
					},
					yAxis: {
						format: (d: number) => `$${d}`
					},
					highlight: { points: { r: 4 } }
				}}
			>
				{#snippet tooltip()}
					<Chart.Tooltip
						labelFormatter={(v: Date) =>
							v.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
						indicator="line"
					/>
				{/snippet}
			</LineChart>
		</Chart.Container>
	</Card.Content>
	<Card.Footer>
		<div
			class="flex w-full flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
		>
			<span>
				OpenCode Go stays at $10/month. Other tools rise with usage-based credits and overages.
			</span>
			<span>Source: vendor pricing pages, July 2026.</span>
		</div>
	</Card.Footer>
</Card.Root>
