<script lang="ts">
	import {
		Brain,
		Code,
		Globe,
		Trophy,
		Bot,
		Layout,
		Calculator,
		Info,
		LayoutGrid,
		Gauge,
		Sparkles,
		Zap,
		Wallet,
		Compass,
		BadgeCheck
	} from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { buttonVariants } from '$lib/components/ui/button';

	const scenarios: { value: string; label: string; icon: typeof Brain; tagline: string }[] = [
		{
			value: '',
			label: 'All',
			icon: Globe,
			tagline: 'No scenario filter — compare by quota burn.'
		},
		{
			value: 'brainstorming',
			label: 'Brainstorming',
			icon: Brain,
			tagline: 'Open-ended ideation and creative thinking.'
		},
		{ value: 'coding', label: 'Coding', icon: Code, tagline: 'Agentic coding and software tasks.' },
		{
			value: 'competitive',
			label: 'Competitive',
			icon: Trophy,
			tagline: 'One-shot hard reasoning and problem solving.'
		},
		{
			value: 'agentic',
			label: 'Agentic',
			icon: Bot,
			tagline: 'Long-running agent workflows and multi-step tasks.'
		},
		{
			value: 'frontend',
			label: 'Frontend UI',
			icon: Layout,
			tagline: 'UI/website generation and visual implementation.'
		},
		{
			value: 'budget',
			label: 'Budget',
			icon: Calculator,
			tagline: 'Cheapest option that still gets the job done.'
		}
	];

	const scenarioDetails: Record<string, { quality: string; fit: string }> = {
		'': {
			quality: 'Uses overall benchmark averages.',
			fit: 'Not applied — sorting falls back to burn rate.'
		},
		brainstorming: {
			quality: 'Reasoning intelligence benchmarks.',
			fit: 'Context length, intelligence, and reasoning support.'
		},
		coding: {
			quality: 'Coding benchmarks (AA TrueSkill).',
			fit: 'Speed, tool support, and uptime.'
		},
		competitive: {
			quality: 'GPQA graduate-level reasoning + intelligence.',
			fit: 'Context length and reasoning support.'
		},
		agentic: {
			quality: 'Same coding benchmarks as the Coding scenario.',
			fit: 'Context length, speed, tool support, and uptime.'
		},
		frontend: {
			quality: 'Design Arena Elo + intelligence + coding.',
			fit: 'Vision, speed, tool support, and uptime.'
		},
		budget: {
			quality: 'Lower price is better.',
			fit: 'Constant — price drives the ranking.'
		}
	};

	const concepts: {
		icon: typeof Compass;
		label: string;
		title: string;
		description: string;
	}[] = [
		{
			icon: Compass,
			label: 'Fit',
			title: 'Fit Score',
			description:
				"How well a model's capabilities match the task — context length, speed, tool support, vision, uptime, and reasoning."
		},
		{
			icon: Zap,
			label: 'Quality',
			title: 'Quality Score',
			description:
				'Absolute capability from benchmarks — coding TrueSkill, GPQA reasoning, Design Arena Elo, and intelligence ratings.'
		},
		{
			icon: Wallet,
			label: 'Burn',
			title: 'Burn Rate',
			description:
				'How fast a model consumes your $10/month quota based on its input/output token pricing.'
		},
		{
			icon: BadgeCheck,
			label: 'Tags',
			title: 'Best For Tags',
			description:
				'Algorithmic recommendations showing which scenarios a model excels at, combining Fit and Quality.'
		}
	];
</script>

<Dialog.Root>
	<Dialog.Trigger
		class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
	>
		<Info class="size-3.5" />
		How it works
	</Dialog.Trigger>
	<Dialog.Content class="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-xl">
		<Dialog.Header class="px-6 pt-6 pb-2">
			<Dialog.Title class="flex items-center gap-2 text-lg">
				<Info class="size-5 text-primary" />
				How ZenPick works
			</Dialog.Title>
			<Dialog.Description>
				Choose a scenario to rank models, or compare by burn rate when no scenario is selected.
			</Dialog.Description>
		</Dialog.Header>

		<Tabs.Root value="scenarios" class="flex min-h-0 flex-col">
			<Tabs.List class="mx-6 mt-2 grid w-auto grid-cols-3">
				<Tabs.Trigger value="scenarios" class="gap-1.5">
					<LayoutGrid class="size-3.5" />
					Scenarios
				</Tabs.Trigger>
				<Tabs.Trigger value="scores" class="gap-1.5">
					<Gauge class="size-3.5" />
					Scores
				</Tabs.Trigger>
				<Tabs.Trigger value="about" class="gap-1.5">
					<Sparkles class="size-3.5" />
					About
				</Tabs.Trigger>
			</Tabs.List>

			<ScrollArea class="min-h-0 flex-1 px-6 py-4">
				<Tabs.Content value="scenarios" class="mt-0">
					<div class="grid gap-3 sm:grid-cols-2">
						{#each scenarios as s (s.value)}
							{@const Icon = s.icon}
							<div class="rounded-xl border border-border/60 bg-muted/30 p-3.5">
								<div class="mb-2 flex items-center gap-2.5">
									<div class="flex size-8 items-center justify-center rounded-lg bg-primary/10">
										<Icon class="size-4 text-primary" />
									</div>
									<div>
										<div class="text-sm font-semibold text-foreground">
											{s.label || 'All Models'}
										</div>
										<div class="text-xs text-muted-foreground">{s.tagline}</div>
									</div>
								</div>
								<div class="space-y-1.5 text-xs">
									<div class="flex gap-2">
										<span class="shrink-0 font-medium text-foreground">Quality:</span>
										<span class="text-muted-foreground">{scenarioDetails[s.value].quality}</span>
									</div>
									<div class="flex gap-2">
										<span class="shrink-0 font-medium text-foreground">Fit:</span>
										<span class="text-muted-foreground">{scenarioDetails[s.value].fit}</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</Tabs.Content>

				<Tabs.Content value="scores" class="mt-0">
					<div class="grid gap-3 sm:grid-cols-2">
						{#each concepts as concept (concept.title)}
							{@const Icon = concept.icon}
							<div class="rounded-xl border border-border/60 bg-muted/30 p-3.5">
								<div class="mb-2 flex items-center gap-2">
									<Icon class="size-4 text-primary" />
									<div class="text-sm font-semibold text-foreground">{concept.title}</div>
								</div>
								<p class="text-xs leading-relaxed text-muted-foreground">{concept.description}</p>
							</div>
						{/each}
					</div>
				</Tabs.Content>

				<Tabs.Content value="about" class="mt-0">
					<div class="space-y-4 text-sm leading-relaxed text-muted-foreground">
						<p>
							ZenPick compares OpenCode Go models using live benchmarks, pricing data, and
							algorithmic recommendations. Pick a scenario to see which model fits your task — and
							how fast it burns your quota.
						</p>
						<div class="rounded-xl border border-border/60 bg-muted/30 p-4">
							<div class="mb-2 text-sm font-semibold text-foreground">Data sources</div>
							<ul class="list-disc space-y-1 pl-4 text-xs">
								<li>
									<strong class="text-foreground">modelgrep</strong> — coding and reasoning benchmarks
								</li>
								<li>
									<strong class="text-foreground">LLM Stats</strong> — pricing, intelligence, and arena
									ratings
								</li>
								<li>
									<strong class="text-foreground">OpenCode Go</strong> — model metadata and availability
								</li>
							</ul>
						</div>
						<p class="text-xs">
							No scenario selected? The table sorts by
							<span class="font-medium text-foreground">Burn</span>
							so you can find the most economical model.
						</p>
					</div>
				</Tabs.Content>
			</ScrollArea>
		</Tabs.Root>

		<Dialog.Footer class="px-6 py-4">
			<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Got it</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
