import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { getMembershipStatusReport } from '$lib/server/services/reportsService';
import { parseString } from '$lib/server/validation';
import { requireBranch } from '$lib/server/branchContext';

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;
	let branchId: string | null = null;

	try {
		await requirePermission(event, 'admin.reports.view');
		branchId = requireBranch(event);

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

		return {
			...report,
			errorMessage: null
		};
	} catch (err) {
		if (isAppError(err) && err.status === 400) {
			logger.warn('Membership status report validation failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});

			if (!branchId) {
				branchId = requireBranch(event);
			}

			const fallback = await getMembershipStatusReport({ branchId });
			return {
				...fallback,
				errorMessage: err.publicMessage
			};
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Membership status report load failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};
