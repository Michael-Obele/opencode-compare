<script lang="ts">
	import { Flame, Menu, X, ExternalLink } from '@lucide/svelte';
	import { page } from '$app/state';

	const links = [
		{ href: '/', label: 'Compare' },
		{ href: '/about', label: 'About' }
	];

	let open = $state(false);

	function isActive(href: string): boolean {
		// ponytail: simple match — covers 2-page site, refine when nav grows
		const path: string = page.url.pathname;
		if (href === '/') return path === '/';
		return path === href || path.startsWith(href + '/');
	}
</script>

<header
	class="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60"
>
	<nav
		class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4"
		aria-label="Primary"
	>
		<!-- Brand -->
		<a
			href="/"
			class="flex items-center gap-2 font-mono text-sm font-semibold text-foreground transition-colors hover:text-primary"
			aria-label="ZenPick home"
		>
			<Flame class="size-4 text-primary" />
			<span>ZenPick</span>
		</a>

		<!-- Desktop links -->
		<div class="hidden items-center gap-1 sm:flex">
			{#each links as link (link.href)}
				<a
					href={link.href}
					aria-current={isActive(link.href) ? 'page' : undefined}
					class="rounded-md px-3 py-1.5 text-sm transition-colors {isActive(link.href)
						? 'text-foreground'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					{link.label}
				</a>
			{/each}
		</div>

		<!-- Right side: GitHub link + mobile toggle -->
		<div class="flex items-center gap-2">
			<a
				href="https://github.com/Michael-Obele/zenpick"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="ZenPick on GitHub"
				class="hidden items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:inline-flex"
			>
				<span class="font-mono">main</span>
				<ExternalLink class="size-3" />
			</a>

			<button
				type="button"
				class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground sm:hidden"
				aria-label={open ? 'Close menu' : 'Open menu'}
				aria-expanded={open}
				onclick={() => (open = !open)}
			>
				{#if open}
					<X class="size-4" />
				{:else}
					<Menu class="size-4" />
				{/if}
			</button>
		</div>
	</nav>

	<!-- Mobile menu -->
	{#if open}
		<div class="border-t border-border bg-background sm:hidden">
			<div class="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
				{#each links as link (link.href)}
					<a
						href={link.href}
						aria-current={isActive(link.href) ? 'page' : undefined}
						class="rounded-md px-3 py-2 text-sm {isActive(link.href)
							? 'bg-muted text-foreground'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
						onclick={() => (open = false)}
					>
						{link.label}
					</a>
				{/each}
				<a
					href="https://github.com/Michael-Obele/zenpick"
					target="_blank"
					rel="noopener noreferrer"
					class="mt-1 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					GitHub
					<ExternalLink class="size-3.5" />
				</a>
			</div>
		</div>
	{/if}
</header>
