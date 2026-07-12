import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			preprocess: vitePreprocess(),
			alias: {
				'@/*': './src/lib/components/*'
			},
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			experimental: {
				remoteFunctions: true
			},
			vitePlugin: {
				inspector: {
					toggleKeyCombo: 'alt-x',
					showToggleButton: 'always',
					toggleButtonPos: 'bottom-right'
				}
			}
		})
	],
	ssr: {
		noExternal: ['@dagrejs/dagre']
	}
});
