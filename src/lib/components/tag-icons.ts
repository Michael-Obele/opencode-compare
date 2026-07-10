/** Map tag.icon name → Lucide Svelte component. */

import Code from '@lucide/svelte/icons/code';
import Wrench from '@lucide/svelte/icons/wrench';
import Swords from '@lucide/svelte/icons/swords';
import Brain from '@lucide/svelte/icons/brain';
import Bot from '@lucide/svelte/icons/bot';
import BookOpen from '@lucide/svelte/icons/book-open';
import Snowflake from '@lucide/svelte/icons/snowflake';
import Zap from '@lucide/svelte/icons/zap';
import Flame from '@lucide/svelte/icons/flame';
import Rocket from '@lucide/svelte/icons/rocket';
import Sparkles from '@lucide/svelte/icons/sparkles';

import type { Component } from 'svelte';

export const TAG_ICONS: Record<string, Component> = {
	code: Code,
	wrench: Wrench,
	swords: Swords,
	brain: Brain,
	bot: Bot,
	'book-open': BookOpen,
	snowflake: Snowflake,
	zap: Zap,
	flame: Flame,
	rocket: Rocket,
	sparkles: Sparkles
};
