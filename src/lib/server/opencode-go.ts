/** OpenCode Go API client — fetches list of available Go models. */

import type { GoModelEntry, ModelPricing } from '$lib/types/models';

const GO_API_BASE = 'https://opencode.ai/zen/go/v1';

/** Fetch all available Go model IDs from the OpenCode Go API. */
export async function fetchGoModels(): Promise<GoModelEntry[]> {
	const res = await fetch(`${GO_API_BASE}/models`);
	if (!res.ok) {
		throw new Error(`OpenCode Go API returned ${res.status}: ${res.statusText}`);
	}
	const json = await res.json();
	return json.data as GoModelEntry[];
}

/** Map Go model ID to LLM Stats search-friendly name. */
export function goIdToName(id: string): string {
	const mapping: Record<string, string> = {
		'glm-5.2': 'GLM-5.2',
		'glm-5.1': 'GLM-5.1',
		'glm-5': 'GLM-5',
		'kimi-k2.7-code': 'Kimi K2.7 Code',
		'kimi-k2.6': 'Kimi K2.6',
		'kimi-k2.5': 'Kimi K2.5',
		'mimo-v2.5': 'MiMo-V2.5',
		'mimo-v2.5-pro': 'MiMo-V2.5-Pro',
		'mimo-v2-pro': 'MiMo-V2-Pro',
		'mimo-v2-omni': 'MiMo-V2-Omni',
		'minimax-m3': 'MiniMax M3',
		'minimax-m2.7': 'MiniMax M2.7',
		'minimax-m2.5': 'MiniMax M2.5',
		'qwen3.7-max': 'Qwen3.7 Max',
		'qwen3.7-plus': 'Qwen3.7 Plus',
		'qwen3.6-plus': 'Qwen3.6 Plus',
		'qwen3.5-plus': 'Qwen3.5 Plus',
		'deepseek-v4-pro': 'DeepSeek V4 Pro',
		'deepseek-v4-flash': 'DeepSeek V4 Flash',
		'hy3-preview': 'HY3 Preview'
	};
	return mapping[id] ?? id;
}

/** Determine endpoint type from model ID. */
export function goEndpointType(id: string): 'openai-compatible' | 'anthropic-compatible' {
	// MiniMax and Qwen use Anthropic-compatible endpoints
	const anthropicModels = [
		'minimax-m3',
		'minimax-m2.7',
		'minimax-m2.5',
		'qwen3.7-max',
		'qwen3.7-plus',
		'qwen3.6-plus',
		'qwen3.5-plus'
	];
	return anthropicModels.includes(id) ? 'anthropic-compatible' : 'openai-compatible';
}

/** Get the API endpoint URL for a model. */
export function goEndpointUrl(id: string): string {
	return goEndpointType(id) === 'anthropic-compatible'
		? 'https://opencode.ai/zen/go/v1/messages'
		: 'https://opencode.ai/zen/go/v1/chat/completions';
}

/** Known pricing from verified OpenCode docs (as of July 2026). */
export function getFallbackPricingMap(): Record<string, ModelPricing> {
	return {
		'deepseek-v4-pro': { inputPricePerM: 1.74, outputPricePerM: 3.48, cachedReadPerM: 0.0145, source: 'fallback-map' },
		'deepseek-v4-flash': { inputPricePerM: 0.14, outputPricePerM: 0.28, cachedReadPerM: 0.0028, source: 'fallback-map' },
		'glm-5.2': { inputPricePerM: 1.4, outputPricePerM: 4.4, cachedReadPerM: 0.26, source: 'fallback-map' },
		'glm-5.1': { inputPricePerM: 1.4, outputPricePerM: 4.4, cachedReadPerM: 0.26, source: 'fallback-map' },
		'kimi-k2.7-code': { inputPricePerM: 0.95, outputPricePerM: 4.0, cachedReadPerM: 0.19, source: 'fallback-map' },
		'kimi-k2.6': { inputPricePerM: 0.95, outputPricePerM: 4.0, cachedReadPerM: 0.16, source: 'fallback-map' },
		'mimo-v2.5': { inputPricePerM: 0.14, outputPricePerM: 0.28, cachedReadPerM: 0.0028, source: 'fallback-map' },
		'mimo-v2.5-pro': { inputPricePerM: 1.74, outputPricePerM: 3.48, cachedReadPerM: 0.0145, source: 'fallback-map' },
		'minimax-m3': { inputPricePerM: 0.3, outputPricePerM: 1.2, cachedReadPerM: 0.06, source: 'fallback-map' },
		'minimax-m2.7': { inputPricePerM: 0.3, outputPricePerM: 1.2, cachedReadPerM: 0.06, source: 'fallback-map' },
		'qwen3.7-max': { inputPricePerM: 2.5, outputPricePerM: 7.5, cachedReadPerM: 0.5, source: 'fallback-map' },
		'qwen3.7-plus': { inputPricePerM: 0.4, outputPricePerM: 1.6, cachedReadPerM: 0.04, source: 'fallback-map' },
		'qwen3.6-plus': { inputPricePerM: 0.5, outputPricePerM: 3.0, cachedReadPerM: 0.05, source: 'fallback-map' }
	};
}
