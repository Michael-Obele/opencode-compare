<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'cyan' | 'amber' | 'red';
		label: string;
		children: Snippet;
	}

	let { variant = 'cyan', label, children }: Props = $props();

	const variantClasses = {
		cyan: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-100',
		amber: 'border-amber-500/30 bg-amber-500/5 text-amber-100',
		red: 'border-red-500/30 bg-red-500/5 text-red-100'
	} as const;

	const labelClasses = {
		cyan: 'text-cyan-500',
		amber: 'text-amber-500',
		red: 'text-red-500'
	} as const;
</script>

<aside
	class="relative my-6 rounded-l-lg border-l-2 px-5 py-4 {variantClasses[variant]}"
	role="note"
	aria-label={label}
>
	<div
		class="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] {labelClasses[
			variant
		]}"
	>
		// {label}
	</div>
	<div class="text-base leading-relaxed text-foreground/90">
		{@render children()}
	</div>
</aside>
