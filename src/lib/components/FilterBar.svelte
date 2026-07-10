<script lang="ts">
	import {
		Search,
		X,
		Brain,
		Code,
		Globe,
		Trophy,
		Bot,
		Calculator,
		Layout,
		Info
	} from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { buttonVariants } from '$lib/components/ui/button';

	interface Props {
		filter: string;
		scenario: string;
	}

	let { filter = $bindable(''), scenario = $bindable('') }: Props = $props();

	let searchOpen = $state(false);

	const scenarios: { value: string; label: string; icon: typeof Brain }[] = [
		{ value: '', label: 'All', icon: Globe },
		{ value: 'brainstorming', label: 'Brainstorming', icon: Brain },
		{ value: 'coding', label: 'Coding', icon: Code },
		{ value: 'competitive', label: 'Competitive', icon: Trophy },
		{ value: 'agentic', label: 'Agentic', icon: Bot },
		{ value: 'frontend', label: 'Frontend UI', icon: Layout },
		{ value: 'budget', label: 'Budget', icon: Calculator }
	];

	const scenarioInfo: Record<string, string> = {
		'': 'Shows all models. Sort by Burn (quota cost) by default.',
		brainstorming:
			'Open-ended ideation. Quality = reasoning intelligence. Fit = context length, intelligence, reasoning support.',
		coding:
			'Agentic coding tasks. Quality = coding benchmarks (AA TrueSkill). Fit = speed, tool support, uptime.',
		competitive:
			'One-shot hard reasoning. Quality = GPQA (graduate-level) + intelligence. Fit = context length, reasoning support.',
		agentic:
			'Long-running agent tasks. Quality = same as coding. Fit = context length, speed, tool support.',
		frontend:
			'UI/website generation. Quality = Design Arena Elo (human preference) + intelligence + coding. Fit = vision, speed, tools, uptime.',
		budget:
			'Cheapest option that works. Quality = lower price is better. Fit = constant (price drives ranking).'
	};

	function applyScenario(value: string) {
		scenario = value;
	}

	function clearFilter() {
		filter = '';
		searchOpen = false;
	}
</script>

<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
	<!-- Scenario filter buttons -->
	<div class="flex flex-wrap items-center gap-1.5">
		{#each scenarios as s (s.value)}
			{@const Icon = s.icon}
			<button
				class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all {scenario ===
				s.value
					? 'border-primary/70 bg-primary/60 text-white/80'
					: 'border-border bg-card text-muted-foreground hover:border-border hover:text-foreground'}"
				onclick={() => applyScenario(s.value)}
			>
				<Icon class="size-3" />
				{s.label}
			</button>
		{/each}

		<!-- Info button with dialog -->
		<Dialog.Root>
			<Dialog.Trigger
				class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
			>
				<Info class="size-3" />
				<span class="text-xs">Help</span>
			</Dialog.Trigger>
			<Dialog.Content class="sm:max-w-lg">
				<Dialog.Header>
					<Dialog.Title class="flex items-center gap-2">
						<Info class="size-4 text-primary" />
						How ZenPick Works
					</Dialog.Title>
					<Dialog.Description>
						Understand what each scenario checks and how models are ranked.
					</Dialog.Description>
				</Dialog.Header>

				<div class="space-y-4 py-2">
					<!-- Scenarios section -->
					<div>
						<h4 class="mb-3 text-sm font-semibold text-foreground">Scenarios</h4>
						<div class="space-y-3">
							{#each scenarios as s (s.value)}
								{@const Icon = s.icon}
								<div
									class="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3"
								>
									<div
										class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10"
									>
										<Icon class="size-3.5 text-primary" />
									</div>
									<div class="min-w-0">
										<div class="text-sm font-medium text-foreground">{s.label || 'All Models'}</div>
										<div class="mt-0.5 text-xs leading-relaxed text-muted-foreground">
											{scenarioInfo[s.value]}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- Key concepts -->
					<div class="border-t border-border pt-4">
						<h4 class="mb-3 text-sm font-semibold text-foreground">Key Concepts</h4>
						<div class="grid gap-3 sm:grid-cols-2">
							<div class="rounded-lg border border-border/60 bg-muted/30 p-3">
								<div class="text-sm font-medium text-foreground">Fit Score</div>
								<div class="mt-1 text-xs leading-relaxed text-muted-foreground">
									How well a model's capabilities match the task requirements — context length,
									speed, tool support, vision, uptime, etc.
								</div>
							</div>
							<div class="rounded-lg border border-border/60 bg-muted/30 p-3">
								<div class="text-sm font-medium text-foreground">Quality Score</div>
								<div class="mt-1 text-xs leading-relaxed text-muted-foreground">
									Absolute capability measure from benchmarks — coding scores, reasoning
									intelligence, design arena ratings, etc.
								</div>
							</div>
							<div class="rounded-lg border border-border/60 bg-muted/30 p-3">
								<div class="text-sm font-medium text-foreground">Burn Rate</div>
								<div class="mt-1 text-xs leading-relaxed text-muted-foreground">
									How fast a model consumes your $10/month quota based on input/output token
									pricing.
								</div>
							</div>
							<div class="rounded-lg border border-border/60 bg-muted/30 p-3">
								<div class="text-sm font-medium text-foreground">Best For Tags</div>
								<div class="mt-1 text-xs leading-relaxed text-muted-foreground">
									Algorithmic recommendation tags showing which scenarios a model excels at — based
									on Fit + Quality scores.
								</div>
							</div>
						</div>
					</div>
				</div>

				<Dialog.Footer>
					<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Got it</Dialog.Close>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	</div>

	<!-- Search -->
	<div class="flex items-center gap-2">
		{#if !searchOpen}
			<button
				class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
				onclick={() => (searchOpen = true)}
			>
				<Search class="size-4" />
				Search
			</button>
		{:else}
			<div
				class="relative inline-flex items-center rounded-lg border border-primary/40 bg-card px-3 py-2"
			>
				<Search class="mr-2 size-3.5 shrink-0 text-muted-foreground" />
				<input
					type="text"
					bind:value={filter}
					placeholder="Search models..."
					class="w-44 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
				/>
				<button
					class="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
					onclick={clearFilter}
				>
					<X class="size-3.5" />
				</button>
			</div>
		{/if}
	</div>
</div>
