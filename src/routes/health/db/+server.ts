import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { serverPrisma } from '$lib/server/db/server';
import { logger } from '$lib/server/logger';
import { isProd } from '$lib/server/runtimeEnv';

const DB_HEALTH_ENABLED =
	env.HEALTH_DB_ENABLED === 'true' || env.HEALTH_DB_ENABLED === '1';

export const GET: RequestHandler = async (event) => {
	if (!DB_HEALTH_ENABLED) {
		return json(
			{ ok: false, error: 'Not found' },
			{ status: isProd() ? 404 : 404 }
		);
	}

	const startedAt = Date.now();

	try {
		await serverPrisma.$queryRaw`SELECT 1`;
		return json({
			ok: true,
			time: new Date().toISOString(),
			durationMs: Date.now() - startedAt
		});
	} catch (err) {
		logger.error('Health DB check failed', {
			route: event.route?.id ?? event.url.pathname,
			requestId: event.locals.requestId,
			error: err
		});
		return json({ ok: false }, { status: 500 });
	}
};
