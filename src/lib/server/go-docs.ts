/** Fetches Go pricing data from the official OpenCode docs page. */

import type { ModelPricing } from '$lib/types/models';
import { cacheGet, cacheSet, GO_DOCS_PRICING_TTL } from '$lib/cache';

const GO_DOCS_URL = 'https://opencode.ai/docs/go/';
const CACHE_KEY = 'go-docs-pricing';

/**
 * Normalize a display name for matching.
 * Strips hyphens, spaces, lowercases, removes "v" prefix from version numbers.
 * This lets "MiMo V2.5 Pro" match "mimo-v2.5-pro" and "MiMo-V2.5-Pro".
 */
function normalizeName(name: string): string {
	return name
		.toLowerCase()
		.replace(/[\s-]+/g, '')
		.replace(/^v(\d)/, '$1');
}

/** Build inverse map: normalized display name → Go model ID. */
function buildNameToIdMap(): Map<string, string> {
	// Reverse the goIdToName mapping from opencode-go.ts
	const KNOWN_GO_IDS: Record<string, string> = {
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

	const map = new Map<string, string>();
	for (const [goId, displayName] of Object.entries(KNOWN_GO_IDS)) {
		map.set(normalizeName(displayName), goId);
		// Also add the goId itself as a normalized entry
		map.set(normalizeName(goId), goId);
	}
	return map;
}

const nameToId = buildNameToIdMap();

/**
 * Try to match a docs-page display name (e.g. "MiMo V2.5", "Qwen3.7 Plus (≤ 256K tokens)")
 * to a known Go model ID.
 */
function matchDisplayName(docsName: string): string | null {
	// Try exact normalized match first
	const normalized = normalizeName(docsName);
	const exact = nameToId.get(normalized);
	if (exact) return exact;

	// For parenthetical variants like "Qwen3.7 Plus (≤ 256K tokens)", strip the parens and retry
	const parenIdx = docsName.indexOf('(');
	if (parenIdx > 0) {
		const baseName = docsName.substring(0, parenIdx).trim();
		const baseNormalized = normalizeName(baseName);
		const baseMatch = nameToId.get(baseNormalized);
		if (baseMatch) return baseMatch;
	}

	// Try substring: check if any known name is contained in or contains the docs name
	for (const [normKey, goId] of nameToId) {
		if (normKey.includes(normalized) || normalized.includes(normKey)) {
			return goId;
		}
	}

	return null;
}

/** Parse a dollar amount string like "$1.40" or "$0.0028" to a number. */
function parsePrice(s: string): number | null {
	const cleaned = s.replace(/[$,]/g, '').trim();
	const n = parseFloat(cleaned);
	return isNaN(n) ? null : n;
}

/**
 * Fetch Go pricing from the OpenCode docs page (cached).
 * Returns cached data instantly; refreshes in background if stale.
 */
export async function fetchGoDocsPricing(): Promise<Record<string, ModelPricing>> {
	const cached = cacheGet<Record<string, ModelPricing>>(CACHE_KEY);

	if (cached && !cached.stale) {
		return cached.data;
	}

	if (cached && cached.stale) {
		refreshGoDocsPricing().catch((e) => {
			console.error('[go-docs] background refresh failed:', e);
		});
		return cached.data;
	}

	return await refreshGoDocsPricing();
}

/**
 * Fetch Go pricing from the OpenCode docs page.
 * Returns a map of Go model ID → pricing.
 */
async function refreshGoDocsPricing(): Promise<Record<string, ModelPricing>> {
	let text: string;
	try {
		const res = await fetch(GO_DOCS_URL);
		if (!res.ok) {
			console.error(`[go-docs] returned ${res.status}: ${res.statusText}`);
			return {};
		}
		text = await res.text();
	} catch (e) {
		console.error('[go-docs] fetch failed:', e);
		return {};
	}

	// Find the pricing table: it has columns "Model | Input | Output | Cached Read | Cached Write"
	// The markdown table rows look like:
	//   | GLM-5.2 | $1.40 | $4.40 | $0.26 | - |
	// In HTML it'd be rendered <table><tr><td>GLM-5.2</td><td>$1.40</td>...
	// We search for the header pattern first, then parse rows.

	const result: Record<string, ModelPricing> = {};

	// Strategy: find the pricing table by looking for the header row
	// "| Model | Input | Output | Cached Read | Cached Write |"
	// then parse all subsequent |...| rows until we hit a non-table row.
	const lines = text.split('\n');
	let inPricingTable = false;

	for (const line of lines) {
		const trimmed = line.trim();

		// Detect the pricing table header
		if (
			trimmed.includes('|') &&
			trimmed.toLowerCase().includes('input') &&
			trimmed.toLowerCase().includes('output') &&
			trimmed.toLowerCase().includes('cached read')
		) {
			inPricingTable = true;
			continue;
		}

		// Skip the separator row (| --- | --- | ... |)
		if (inPricingTable && trimmed.match(/^\|[\s\-:]+\|/)) {
			continue;
		}

		// Parse data rows
		if (inPricingTable) {
			// Stop at blank line or non-table row
			if (!trimmed.startsWith('|') || trimmed === '|') {
				inPricingTable = false;
				continue;
			}

			const cells = trimmed
				.split('|')
				.map((c) => c.trim())
				.filter((c) => c.length > 0);

			if (cells.length >= 4) {
				const docsName = cells[0];
				const inputPrice = parsePrice(cells[1]);
				const outputPrice = parsePrice(cells[2]);
				const cachedRead = parsePrice(cells[3]);

				const goId = matchDisplayName(docsName);
				if (goId && inputPrice != null && outputPrice != null) {
					result[goId] = {
						inputPricePerM: inputPrice,
						outputPricePerM: outputPrice,
						cachedReadPerM: cachedRead,
						source: 'go-docs'
					};
				}
			}
		}
	}

	const keys = Object.keys(result);
	if (keys.length > 0) {
		console.log(`[go-docs] scraped pricing for ${keys.length} models: ${keys.join(', ')}`);
	} else {
		console.warn('[go-docs] no pricing rows parsed — page format may have changed');
	}

	cacheSet(CACHE_KEY, result, GO_DOCS_PRICING_TTL);
	return result;
}
