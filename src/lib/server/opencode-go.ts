/** OpenCode Go API client — fetches list of available Go models. */

import type { GoModelEntry } from '$lib/types/models';

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

/** Map Go model ID to display name. */
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
		'deepseek-v4-flash': 'DeepSeek V4 Flash'
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
