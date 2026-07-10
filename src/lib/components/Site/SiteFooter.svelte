<script lang="ts">
	import { ArrowUpRight, Receipt } from '@lucide/svelte';

	const year = new Date().getFullYear();
</script>

<footer class="border-t border-border">
	<div
		class="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-sm text-muted-foreground/70 sm:flex-row sm:justify-between"
	>
		<div class="flex items-center gap-2">
			<Receipt class="size-3.5 text-primary" />
			<span>ZenPick · {year}</span>
		</div>
		<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
			<a
				href="https://modelgrep.com"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
			>
				Data: modelgrep <ArrowUpRight class="size-3" />
			</a>
			<a
				href="https://opencode.ai/docs/go/"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
			>
				OpenCode Go <ArrowUpRight class="size-3" />
			</a>
			<a
				href="https://github.com/Michael-Obele/zenpick"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
			>
				Source <ArrowUpRight class="size-3" />
			</a>
		</div>
	</div>
</footer>
