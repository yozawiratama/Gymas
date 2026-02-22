import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { version } from '$app/environment';
import { notFoundJson } from '$lib/server/httpErrors';

export const GET: RequestHandler = async () => {
	const commit =
		env.GIT_COMMIT ??
		env.VERCEL_GIT_COMMIT_SHA ??
		env.COMMIT_SHA ??
		env.RENDER_GIT_COMMIT ??
		null;
	const appVersion = env.APP_VERSION ?? version ?? null;

	if (!appVersion && !commit) {
		return notFoundJson('Version metadata not available.', 'VERSION_NOT_AVAILABLE');
	}

	return json({
		ok: true,
		version: appVersion ?? 'unknown',
		commit
	});
};
