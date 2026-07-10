<script lang="ts">
	import type { PricingSource } from '$lib/types/models';
	import { HelpCircle } from '@lucide/svelte';

	interface Props {
		source: PricingSource;
	}

	let { source }: Props = $props();
</script>

{#if source === 'go-docs'}
	<span
		class="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
		title="Pricing from OpenCode Go docs page"
	>
		Go Docs
	</span>
{:else if source === 'unknown'}
	<span
		class="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-500 border border-red-500/20"
		title="No pricing data available — contact OpenCode for accurate pricing"
	>
		<HelpCircle class="size-2.5" />
		Unknown
	</span>
{/if}
