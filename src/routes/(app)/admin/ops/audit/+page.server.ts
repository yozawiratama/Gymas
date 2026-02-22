import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { listAuditLogs } from '$lib/server/services/auditService';
import { parsePageParams, parseString } from '$lib/server/validation';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const META_PREVIEW_MAX = 240;

function formatMeta(meta: unknown): string {
	if (!meta) return '';
	try {
		const serialized = JSON.stringify(meta);
		if (serialized.length <= META_PREVIEW_MAX) {
			return serialized;
		}
		return `${serialized.slice(0, META_PREVIEW_MAX)}...`;
	} catch {
		return '...';
	}
}

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		await requirePermission(event, 'admin.ops.manage');

		const action = parseString(event.url.searchParams, 'action', {
			trim: true,
			required: false,
			max: 80,
			label: 'Action'
		});
		const { page, pageSize } = parsePageParams(event.url, {
			pageDefault: 1,
			pageSizeDefault: DEFAULT_PAGE_SIZE,
			maxPageSize: MAX_PAGE_SIZE
		});

		const result = await listAuditLogs({
			action: action || null,
			page,
			pageSize
		});

		return {
			filter: {
				action
			},
			rows: result.rows.map((row) => ({
				id: row.id,
				action: row.action,
				actorUserId: row.actorUserId,
				actorUsername: row.actorUsername,
				entityType: row.entityType,
				entityId: row.entityId,
				metaPreview: formatMeta(row.metaJson),
				ip: row.ip,
				userAgent: row.userAgent,
				createdAt: row.createdAt.toISOString()
			})),
			pagination: result.pagination
		};
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Audit log list validation failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Audit log list load failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};
