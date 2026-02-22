import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requirePermission, requireUser } from '$lib/server/authz';
import { forbiddenJson, unauthorizedJson } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { record as recordAudit } from '$lib/server/services/auditService';
import { ingestPushBatch, validateIngestRequest } from '$lib/server/sync/ingest/ingestService';
import { validateSyncSharedSecret } from '$lib/server/sync/syncAuth';

const MAX_SYNC_BODY_BYTES = 1024 * 1024;

function parseContentLength(request: Request): number | null {
	const header = request.headers.get('content-length');
	if (!header) return null;
	const value = Number(header);
	if (!Number.isFinite(value) || value <= 0) return null;
	return value;
}

export const POST: RequestHandler = async (event) => {
	try {
		await requireUser(event, { redirectToLogin: false });
		await requirePermission(event, 'admin.ops.manage', { redirectToLogin: false });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			const errStatus = (err as { status?: unknown }).status;
			if (errStatus === 401) {
				return unauthorizedJson();
			}
			if (errStatus === 403) {
				return forbiddenJson();
			}
		}
		throw err;
	}

	const auditContext = {
		ip: event.getClientAddress?.() ?? null,
		userAgent: event.request.headers.get('user-agent')
	};

	const secretCheck = validateSyncSharedSecret(event.request);
	if (!secretCheck.ok) {
		await recordAudit({
			action: 'SYNC_PUSH_REJECTED',
			meta: { reason: 'unauthorized' },
			ip: auditContext.ip,
			userAgent: auditContext.userAgent
		});
		return unauthorizedJson();
	}

	const contentLength = parseContentLength(event.request);
	if (contentLength && contentLength > MAX_SYNC_BODY_BYTES) {
		await recordAudit({
			action: 'SYNC_PUSH_REJECTED',
			meta: { reason: 'payload_too_large', contentLength },
			ip: auditContext.ip,
			userAgent: auditContext.userAgent
		});
		return json(
			{
				error: {
					code: 'PAYLOAD_TOO_LARGE',
					message: 'Request body exceeds the allowed size.'
				}
			},
			{ status: 413 }
		);
	}

	let payload: unknown;
	try {
		payload = await event.request.json();
	} catch {
		await recordAudit({
			action: 'SYNC_PUSH_REJECTED',
			meta: { reason: 'invalid_json' },
			ip: auditContext.ip,
			userAgent: auditContext.userAgent
		});
		return json(
			{ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } },
			{ status: 400 }
		);
	}

	const validation = validateIngestRequest(payload);
	if (!validation.ok) {
		await recordAudit({
			action: 'SYNC_PUSH_REJECTED',
			meta: { reason: validation.error.code },
			ip: auditContext.ip,
			userAgent: auditContext.userAgent
		});
		return json({ error: validation.error }, { status: 400 });
	}

	try {
		const result = await ingestPushBatch(validation.data);
		await recordAudit({
			action: 'SYNC_PUSH_ACCEPTED',
			meta: {
				deviceId: validation.data.deviceId,
				gymId: validation.data.gymId,
				processedCount: result.processedCount,
				skippedCount: result.skippedCount,
				errorCount: result.errorCount
			},
			ip: auditContext.ip,
			userAgent: auditContext.userAgent
		});
		return json(result);
	} catch (error) {
		await recordAudit({
			action: 'SYNC_PUSH_REJECTED',
			meta: {
				reason: 'internal_error',
				deviceId: validation.data.deviceId,
				gymId: validation.data.gymId
			},
			ip: auditContext.ip,
			userAgent: auditContext.userAgent
		});
		logger.error('Sync ingest failed', {
			route: event.route?.id ?? event.url.pathname,
			requestId: event.locals.requestId,
			error
		});
		return json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Unexpected error.' } },
			{ status: 500 }
		);
	}
};
