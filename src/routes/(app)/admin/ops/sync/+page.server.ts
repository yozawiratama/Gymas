import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { fetchOutboxSummary, fetchRecentOutboxFailures } from '$lib/server/services/outboxService';
import { countProcessedEventsSince } from '$lib/server/sync/ingest/processedEventService';

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		await requirePermission(event, 'admin.ops.manage');

		const since = new Date(Date.now() - RECENT_WINDOW_MS);

		const [summary, processedLast24h, failures] = await Promise.all([
			fetchOutboxSummary(),
			countProcessedEventsSince(since),
			fetchRecentOutboxFailures(25)
		]);

		return {
			summary,
			processedLast24h,
			failures: failures.map((failure) => ({
				...failure,
				createdAt: failure.createdAt.toISOString(),
				updatedAt: failure.updatedAt.toISOString(),
				lastAttemptAt: failure.lastAttemptAt ? failure.lastAttemptAt.toISOString() : null
			}))
		};
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Sync ops load failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Sync ops load failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};
