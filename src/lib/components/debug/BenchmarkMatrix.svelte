<script lang="ts">
	import type { GoModel } from '$lib/types/models';

	interface Props {
		models: GoModel[];
	}

	let { models }: Props = $props();

	function barWidth(value: number | null, calibrationMax: number = 60): number {
		if (!value || value < 1) return 0;
		return Math.min(100, Math.round((value / calibrationMax) * 100));
	}

	const calibrationMax = 60;
</script>

<h2 class="mb-4 text-lg font-semibold text-foreground">Benchmark Scores</h2>
<p class="mb-4 text-sm text-muted-foreground">
	Raw TrueSkill values (μ−3σ), not percentages. Bars calibrated to max {calibrationMax}. Models with
	no data show "—".
</p>
<div class="overflow-x-auto">
	<table class="w-full text-left text-sm">
		<thead>
			<tr class="border-b border-border text-muted-foreground">
				<th class="p-2 font-medium">Model</th>
				<th class="p-2 font-medium">Coding</th>
				<th class="p-2 font-medium">Reasoning</th>
				<th class="p-2 font-medium">Math</th>
				<th class="p-2 font-medium">SWE-bench</th>
			</tr>
		</thead>
		<tbody>
			{#each models as m (m.id)}
				<tr class="border-b border-border/50 hover:bg-muted/30">
					<td class="p-2 font-medium text-foreground">{m.name}</td>
					{#each [m.benchmarks.coding, m.benchmarks.reasoning, m.benchmarks.math, m.benchmarks.sweBenchVerified] as val}
						<td class="p-2">
							{#if val != null}
								<div class="flex items-center gap-2">
									<div class="h-2 w-16 overflow-hidden rounded-full bg-muted">
										<div
											class="h-full rounded-full bg-violet-500"
											style="width: {barWidth(val, calibrationMax)}%"
										></div>
									</div>
									<span class="tabular-nums text-muted-foreground">{val.toFixed(1)}</span>
								</div>
							{:else}
								<span class="text-muted-foreground/30">—</span>
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
