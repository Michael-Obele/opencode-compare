# GitHub Copilot Instructions - Standard Project Template

## Tech Stack & Architecture

- **Runtime & Tooling**: Bun (`bun`, `bunx`) is the preferred package manager and task runner.
- **Framework**: SvelteKit 5 (using Runes: `$state`, `$props`, `$derived`, `$effect`).
- **Styling**: Tailwind CSS v4. Prefer semantic classes (e.g., `btn-primary`, `text-muted-foreground`).
- **Database**: Prisma ORM v6 (NOT v7) with PostgreSQL. Use a singleton client (typically at `$lib/prisma` or `$lib/server/db`).
- **Authentication**: Better Auth (preferred) or WorkOS.
- **Icons**: Use `@lucide/svelte` (NEVER use `lucide-svelte`). Import icons as components: `import { IconName } from '@lucide/svelte'`.
- **Components**: shadcn-svelte primitives and Bits UI. Never manually write shadcn-svelte components; always generate or install them via the official CLI commands obtained from MCP documentation or trusted research.

## Coding Conventions

### Commit & Push Policy

- **Never auto-commit, auto-push, or auto-merge.** The AI agent must stop after edits, run quality checks, and hand control back to the user.
- The agent may **stage** changes (`git add`) to show what it changed, but the actual `git commit`, `git push`, PR creation, and any force operations must be done by the user after they review the diff.
- When changes are complete, the agent should summarize what was changed, why, and which files were touched — then wait. Do not run `git commit` even if the user asked for the change to be "made and committed"; surface the staged state and ask for approval first.
- This applies to all work in this repository, including chore commits, dependency bumps, formatting fixes, and doc updates.

### Quality Gate

- **Formatting**: When using Bun, format only the files you have edited rather than the entire application. Use `bunx prettier --write <file_path>` for edited files. Additionally, verify changes with `bunx prettier --check <file_path>`. Avoid full-project formatting to prevent unnecessary file changes.
- **Proactive Checking**: Run `bun check` immediately after substantive edits to catch regressions or type errors.
- **Error Handling**: Only warnings can be ignored; errors must be fixed immediately. Use `<svelte:boundary>` for async operations to handle loading and error states gracefully.

### Package Management

- **Installation**: Always install packages via CLI using `bun add <package>` or `bunx <package>` for one-time use. Never edit package.json directly.
- **Research**: Thoroughly research packages before installation to ensure compatibility, necessity, and alignment with project standards (e.g., check for Svelte 5 compatibility, bundle size, maintenance status).

### Svelte 5 Runes

Always use Svelte 5 runes for reactivity. Never use legacy `export let` or `$:`.

- `$state(value)`: Declare reactive state. Use `$state.raw` for large objects/arrays that don't need deep reactivity.
- `$props()`: Receive component props. Destructure for clarity: `let { prop1, prop2 } = $props();`.
- `$derived(expression)`: Declare derived state. Use `$derived.by(() => ...)` for complex logic.
- `$effect(() => ...)`: Handle side effects (DOM, timers, etc.). Avoid for state synchronization.
- `$bindable()`: Mark a prop as bindable for two-way communication.
- `$inspect(value)`: Debug reactive state in development.
- **Events**: Use modern event attributes (e.g., `onclick`, `onsubmit`, `onchange`) directly on elements.

### Deprecated Svelte Patterns to Avoid

Avoid these deprecated patterns from Svelte 4 and earlier. Use the modern Svelte 5 equivalents instead:

- **State Management**: Never use `let` declarations at the top level for reactivity. Use `$state()` instead.
- **Reactive Statements**: Avoid `$:` for derived state or side effects. Use `$derived()` and `$effect()` instead.
- **Props**: Never use `export let` for component props. Use `$props()` destructuring instead.
- **Event Handlers**: Avoid `on:click={handler}` directives. Use `onclick={handler}` attributes instead.
- **Component Events**: Never use `createEventDispatcher`. Pass callback props instead.
- **Component Instantiation**: Avoid `new Component()`. Use `mount(Component, ...)` instead.
- **Lifecycle Hooks**: Avoid `beforeUpdate`/`afterUpdate`. Use `$effect.pre`/`$effect` instead.
- **Slots**: Avoid `<slot />`. Use `{@render children()}` with snippets instead.
- **Dynamic Components**: Avoid `<svelte:component this={Comp}>`. Use `<Comp />` directly.
- **Legacy Props**: Avoid `$$props` and `$$restProps`. Use destructuring in `$props()` instead.
- **Stores**: Prefer runes over Svelte stores for component-level state.
- **Class Components**: Avoid class-based components. Use function components with runes.

- Use `$app/state` (e.g., `import { page } from '$app/state'`) instead of the deprecated `$app/stores` for accessing `page`, `navigating`, `updated`, etc.

### Data Fetching & Mutations (Remote Functions)

Default to **Remote Functions** (experimental `@sveltejs/kit` features or standard patterns) over `+page.server.ts` actions for most mutations.

- **Location**: Place remote functions in `src/lib/remote/` with the `.remote.ts` extension.
- **Barrel Exports**: Use `src/lib/remote/index.ts` to re-export all functions individually (not `export *`) to allow for better documentation and discovery.
- **Flavors**:
  - `query`: For reading dynamic data. Supports `refresh()`, `loading`, `error`.
  - `form`: For mutations via `<form>`. Supports progressive enhancement via `enhance`. Always prefer `form` components with `bind:value` or `.as()` attributes over manual `async handleSubmit` functions.
  - `command`: For mutations triggered by scripts/buttons without a form.
  - `prerender`: For data that can be fetched at build time.
- **Validation**: Always validate inputs using a Standard Schema library, preferably **Valibot**.
- **Form Usage**: Always use the `form` object and its fields (e.g., `form.fields.name.as('text')`) to bind to native HTML elements. Avoid creating custom `handleSubmit` async functions to manually call remote functions; instead, let the form's native submission or `enhance` handle the interaction.
- **Client-side Validation**: Use `preflight(schema)` for client-side validation before submission where applicable.
- **Efficiency**: Use `query.batch` for multiple related fetches and `submit().updates(query)` for efficient post-mutation UI updates.

### Database Access

- **Version**: Always use Prisma v6 (not v7).
- Default to using a singleton Prisma client.
- Schema changes: Use `bunx prisma db push` for rapid prototyping and `bunx prisma migrate dev` for stable environments.

### Styling & UI Design

- **Gradients**: NEVER use gradients; prefer solid colors, clean layouts, and professional minimalist aesthetics.
- **Tailwind v4**: Use semantic tokens from the CSS configuration. Avoid hardcoded HSL/Hex strings in components.
- **Responsive**: Use standard Tailwind responsive prefixes (e.g., `lg:flex-row`).
- **Utility**: Use a `cn` utility (clsx + tailwind-merge) for conditional class merging.

## Key Files & Directories Pattern

- `src/lib/remote/`: Logic for data fetching and mutations.
- `src/lib/components/ui/`: shadcn-svelte / primitive UI components. Prefer CLI-generated shadcn-svelte components over hand-written implementations.
- `src/lib/components/`: Shared components (e.g., navbar, footer) in `blocks/` subfolder; route-specific components in folders named after the route.
- `src/routes/`: Router logic. Use `+page.server.ts` or `+layout.server.ts` ONLY for initial `load` functions.
- `static/`: Static assets.

## Common Workflows

- **Development**: `bun run dev`
- **Type Checking**: `bun run check`

## AI Agent Integration

- **Memory MCP**: Persist useful context by writing to and reading from the Memory MCP during work to maintain consistency across sessions.
- **Documentation**: Use `mcp_svelte_get-documentation` for the latest Svelte 5/Kit logic and `mcp_svelte_svelte-autofixer` to validate components before finalizing.
- **shadcn-svelte Workflow**: Never author shadcn-svelte components manually. Always use the CLI commands recommended by MCP documentation or equivalent trusted research to create, add, or update them.
