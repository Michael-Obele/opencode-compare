<script lang="ts">
	import { Search, X, Brain, Code, Globe, Trophy, Bot, Calculator, Layout } from '@lucide/svelte';

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
