import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { getAttendanceReport } from '$lib/server/services/reportsService';
import { parseInt, parseString } from '$lib/server/validation';
import { requireBranch } from '$lib/server/branchContext';

const DEFAULT_PAGE_SIZE = 31;
const MAX_PAGE_SIZE = 90;

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;
	let branchId: string | null = null;

	try {
		await requirePermission(event, 'admin.reports.view');
		branchId = requireBranch(event);

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
		const page = parseInt(event.url.searchParams, 'page', {
			min: 1,
			default: 1,
			label: 'Page'
		});
		const pageSize = parseInt(event.url.searchParams, 'pageSize', {
			min: 1,
			max: MAX_PAGE_SIZE,
			default: DEFAULT_PAGE_SIZE,
			label: 'Page size'
		});

		const report = await getAttendanceReport({
			branchId,
			from: rawFrom || null,
			to: rawTo || null,
			page,
			pageSize
		});

		return {
			...report,
			errorMessage: null
		};
	} catch (err) {
		if (isAppError(err) && err.status === 400) {
			logger.warn('Attendance report validation failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});

			if (!branchId) {
				branchId = requireBranch(event);
			}

			const fallback = await getAttendanceReport({ branchId });
			return {
				...fallback,
				errorMessage: err.publicMessage
			};
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Attendance report load failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};
