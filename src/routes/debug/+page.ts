import { getModels } from '$lib/remote/models.remote';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const models = await getModels();
	return { models };
};
