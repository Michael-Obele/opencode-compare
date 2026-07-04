/** LLM Stats API client — fetches model benchmarks, pricing, and rankings. */

import { env } from '$env/dynamic/private';
import type { LLMStatsModel, LLMStatsRanking } from '$lib/types/models';

const LLM_STATS_BASE = 'https://api.llm-stats.com/stats/v1';

function headers(): HeadersInit {
	const key = env.API_KEY;
	if (!key) throw new Error('API_KEY environment variable is required');
	return {
		Authorization: `Bearer ${key}`,
		'Content-Type': 'application/json'
	};
}

/** Fetch all models from LLM Stats, optionally filtered by organization. */
export async function fetchLLMStatsModels(organization?: string): Promise<LLMStatsModel[]> {
	const params = new URLSearchParams({ limit: '200' });
	if (organization) params.set('organization', organization);

	const url = `${LLM_STATS_BASE}/models?${params}`;
	const res = await fetch(url, { headers: headers() });
	if (!res.ok) {
		throw new Error(`LLM Stats API returned ${res.status}: ${res.statusText}`);
	}
	const json = await res.json();
	return json.models as LLMStatsModel[];
}

/** Fetch a single model's full details including all scores. */
export async function fetchLLMStatsModelDetail(modelId: string): Promise<LLMStatsModel> {
	const url = `${LLM_STATS_BASE}/models/${encodeURIComponent(modelId)}`;
	const res = await fetch(url, { headers: headers() });
	if (!res.ok) {
		throw new Error(`LLM Stats model detail returned ${res.status}: ${res.statusText}`);
	}
	return (await res.json()) as LLMStatsModel;
}

/** Fetch rankings for a specific category (coding, reasoning, math). */
export async function fetchLLMStatsRankings(
	category: string,
	limit = 50
): Promise<LLMStatsRanking[]> {
	const params = new URLSearchParams({ category, limit: String(limit) });
	const url = `${LLM_STATS_BASE}/rankings?${params}`;
	const res = await fetch(url, { headers: headers() });
	if (!res.ok) {
		throw new Error(`LLM Stats rankings returned ${res.status}: ${res.statusText}`);
	}
	const json = await res.json();
	return json.models as LLMStatsRanking[];
}

/** Get the LLM Stats compare URL for a model. */
export function llmStatsModelUrl(modelId: string): string {
	return `https://llm-stats.com/models/${encodeURIComponent(modelId)}`;
}
