<script lang="ts">
	import type { PricingSource } from '$lib/types/models';
	import { AlertTriangle, Database, HelpCircle } from '@lucide/svelte';

	interface Props {
		source: PricingSource;
	}

	let { source }: Props = $props();
</script>

{#if source !== 'llm-stats'}
	<span
		class="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium {source ===
		'fallback-map'
			? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
			: 'bg-red-500/10 text-red-500 border border-red-500/20'}"
		title={source === 'fallback-map'
			? 'Price from OpenCode docs fallback (may be outdated)'
			: 'No pricing data available — contact OpenCode for accurate pricing'}
	>
		{#if source === 'fallback-map'}
			<Database class="size-2.5" />
			Fallback
		{:else}
			<HelpCircle class="size-2.5" />
			Unknown
		{/if}
	</span>
{/if}
