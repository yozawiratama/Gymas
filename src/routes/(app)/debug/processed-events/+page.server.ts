import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { listRecentProcessedEvents } from '$lib/server/sync/ingest/processedEventService';
import { isProd } from '$lib/server/runtimeEnv';

export const load: PageServerLoad = async (event) => {
	if (isProd()) {
		throw error(404, 'Not found');
	}

	try {
		await requirePermission(event, 'debug.access');
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Debug processed events load forbidden', {
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Debug processed events load failed', {
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}

	const rawType = event.url.searchParams.get('type');
	const eventType = rawType && rawType.trim().length > 0 ? rawType.trim() : undefined;

	const events = await listRecentProcessedEvents(50, eventType);

	return {
		filter: eventType ?? '',
		events: events.map((record) => ({
			id: record.id,
			eventId: record.eventId,
			eventType: record.eventType,
			idempotencyKey: record.idempotencyKey,
			status: record.status,
			processedAt: record.processedAt instanceof Date
				? record.processedAt.toISOString()
				: new Date(record.processedAt).toISOString(),
			deviceId: record.deviceId ?? null,
			gymId: record.gymId ?? null
		}))
	};
};
