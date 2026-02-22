import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getMissingEnvKeys } from '$lib/server/config';

export const GET: RequestHandler = async () => {
	const missing = getMissingEnvKeys();
	const ok = missing.length === 0;

	return json(
		{
			ok,
			missing
		},
		{ status: ok ? 200 : 500 }
	);
};
