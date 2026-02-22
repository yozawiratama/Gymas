import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { version } from '$app/environment';
import { getMissingEnvKeys } from '$lib/server/config';
import { serverPrisma } from '$lib/server/db/server';
import { logger } from '$lib/server/logger';
import { getAppEnv } from '$lib/server/runtimeEnv';

async function checkDatabase(event: Parameters<RequestHandler>[0]) {
	const startedAt = Date.now();
	try {
		await serverPrisma.$queryRaw`SELECT 1`;
		return {
			ok: true,
			durationMs: Date.now() - startedAt
		};
	} catch (error) {
		logger.error('Health DB check failed', {
			route: event.route?.id ?? event.url.pathname,
			requestId: event.locals.requestId,
			error
		});
		return { ok: false };
	}
}

export const GET: RequestHandler = async (event) => {
	const missingEnv = getMissingEnvKeys();
	const envOk = missingEnv.length === 0;
	const db = await checkDatabase(event);
	const ok = envOk && db.ok;

	return json(
		{
			ok,
			env: {
				appEnv: getAppEnv(),
				ok: envOk,
				missing: missingEnv
			},
			db,
			version: version ?? 'unknown',
			time: new Date().toISOString()
		},
		{ status: ok ? 200 : 500 }
	);
};
