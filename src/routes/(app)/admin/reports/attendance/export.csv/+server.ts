import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { requirePermission, requireUser } from '$lib/server/authz';
import { isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import {
	buildAttendanceCsv,
	getAttendanceReportExport
} from '$lib/server/services/reportsService';
import { parseString } from '$lib/server/validation';
import { requireBranch } from '$lib/server/branchContext';

export const GET: RequestHandler = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		await requireUser(event, { redirectToLogin: false });
		await requirePermission(event, 'admin.access', { redirectToLogin: false });
		await requirePermission(event, 'admin.reports.export', { redirectToLogin: false });
		const branchId = requireBranch(event);

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

		const report = await getAttendanceReportExport({
			branchId,
			from: rawFrom || null,
			to: rawTo || null
		});

		const filename = `attendance-${report.filter.from}-to-${report.filter.to}.csv`;
		const csv = buildAttendanceCsv(report);

		return new Response(csv, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Attendance export validation failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Attendance export failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};
