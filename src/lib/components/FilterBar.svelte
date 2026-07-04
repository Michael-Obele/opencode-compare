<script lang="ts">
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';

	interface Props {
		filter: string;
		scenario: string;
	}

	let { filter = $bindable(''), scenario = $bindable('') }: Props = $props();

	let showSearch = $state(false);

	const scenarios = [
		{ value: '', label: 'All models' },
		{ value: 'brainstorming', label: '🧠 Brainstorming & Reasoning' },
		{ value: 'coding', label: '💻 General Coding' },
		{ value: 'competitive', label: '⚔️ Competitive Programming' },
		{ value: 'agentic', label: '🤖 Agentic / Autonomous' },
		{ value: 'budget', label: '⚡ Budget / High Volume' },
		{ value: 'long-context', label: '📚 Long Context' }
	];

	function applyScenario(value: string) {
		scenario = value;
		// Map scenario to search terms for filtering
		switch (value) {
			case 'brainstorming':
				filter = 'reasoning';
				break;
			case 'coding':
				filter = 'coding';
				break;
			case 'competitive':
				filter = 'competitive';
				break;
			case 'agentic':
				filter = 'agentic';
				break;
			case 'budget':
				filter = 'budget quota-friendly';
				break;
			case 'long-context':
				filter = 'context';
				break;
			default:
				filter = '';
		}
	}
</script>

<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
	<!-- Scenario chips -->
	<div class="flex flex-wrap gap-1.5">
		{#each scenarios as s}
			<button
				class="rounded-full border px-3 py-1 text-xs transition-colors {scenario === s.value
					? 'border-white/30 bg-white/10 text-white'
					: 'border-white/10 bg-transparent text-white/50 hover:border-white/20 hover:text-white/70'}"
				onclick={() => applyScenario(s.value)}
			>
				{s.label}
			</button>
		{/each}
	</div>

	<!-- Search -->
	<div class="relative">
		{#if !showSearch}
			<button
				class="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/50 transition-colors hover:text-white/70"
				onclick={() => (showSearch = true)}
			>
				<SearchIcon class="size-4" />
				Search models
			</button>
		{:else}
			<div
				class="flex items-center gap-2 rounded-lg border border-white/20 bg-white/[0.04] px-3 py-2"
			>
				<SearchIcon class="size-4 text-white/40" />
				<input
					type="text"
					bind:value={filter}
					placeholder="Search by name, tag, provider..."
					class="w-48 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
				/>
				<button
					class="text-white/30 hover:text-white/60"
					onclick={() => {
						filter = '';
						showSearch = false;
					}}
				>
					<XIcon class="size-4" />
				</button>
			</div>
		{/if}
	</div>
</div>
