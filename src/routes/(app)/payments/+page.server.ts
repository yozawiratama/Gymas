import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { badRequest, isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { listPayments } from '$lib/server/services/paymentService';
import { parsePageParams, parseString } from '$lib/server/validation';
import { requireBranch } from '$lib/server/branchContext';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function parseDateFilter(
	raw: string,
	label: string,
	boundary: 'start' | 'end'
): Date | null {
	const value = raw.trim();
	if (!value) return null;

	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw badRequest(`${label} is invalid.`, 'INVALID_INPUT');
	}

	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) {
		throw badRequest(`${label} is invalid.`, 'INVALID_INPUT');
	}

	if (boundary === 'end') {
		date.setHours(23, 59, 59, 999);
	}

	return date;
}

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		await requirePermission(event, 'payments.view');
		const branchId = requireBranch(event);

		const query = parseString(event.url.searchParams, 'q', {
			trim: true,
			required: false,
			max: 120,
			label: 'Search query'
		});
		const rawFrom = parseString(event.url.searchParams, 'from', {
			trim: true,
			required: false,
			max: 10,
			label: 'From date'
		});
		const rawTo = parseString(event.url.searchParams, 'to', {
			trim: true,
			required: false,
			max: 10,
			label: 'To date'
		});
		const flash = parseString(event.url.searchParams, 'flash', {
			trim: true,
			required: false,
			max: 64,
			label: 'Flash'
		});

		const dateFrom = parseDateFilter(rawFrom, 'From date', 'start');
		const dateTo = parseDateFilter(rawTo, 'To date', 'end');
		const { page, pageSize } = parsePageParams(event.url, {
			pageDefault: 1,
			pageSizeDefault: DEFAULT_PAGE_SIZE,
			maxPageSize: MAX_PAGE_SIZE
		});

		const result = await listPayments({
			branchId,
			query,
			dateFrom,
			dateTo,
			page,
			pageSize
		});

		return {
			flash,
			query,
			from: rawFrom,
			to: rawTo,
			rows: result.rows,
			pagination: result.pagination
		};
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Payments list validation failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Payments list load failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};
