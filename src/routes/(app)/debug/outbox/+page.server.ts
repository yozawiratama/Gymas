import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { fetchOutboxSummary, fetchRecentOutboxEvents } from '$lib/server/services/outboxService';
import { isProd } from '$lib/server/runtimeEnv';

export const load: PageServerLoad = async (event) => {
	if (isProd()) {
		throw error(404, 'Not found');
	}

	try {
		await requirePermission(event, 'debug.access');
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Debug outbox load forbidden', {
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Debug outbox load failed', {
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}

	const [summary, events] = await Promise.all([
		fetchOutboxSummary(),
		fetchRecentOutboxEvents(50)
	]);

	return {
		summary,
		events: events.map((event) => ({
			...event,
			createdAt: event.createdAt.toISOString(),
			lastAttemptAt: event.lastAttemptAt ? event.lastAttemptAt.toISOString() : null
		}))
	};
};
