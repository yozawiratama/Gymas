import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { requirePermission, requireUser } from '$lib/server/authz';
import { isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import {
	buildMembershipStatusCsv,
	getMembershipStatusReport
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

		const rawAsOf = parseString(event.url.searchParams, 'asOf', {
			trim: true,
			required: false,
			max: 10,
			label: 'As of date'
		});

		const report = await getMembershipStatusReport({
			branchId,
			asOf: rawAsOf || null
		});

		const filename = `memberships-${report.filter.asOf}.csv`;
		const csv = buildMembershipStatusCsv(report);

		return new Response(csv, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Membership status export validation failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Membership status export failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};
