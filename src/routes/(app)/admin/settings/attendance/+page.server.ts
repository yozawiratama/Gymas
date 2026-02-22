import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { getAttendanceSettings, updateAttendanceSettings } from '$lib/server/services/appSettingService';
import { parseBool, parseInt } from '$lib/server/validation';
import { requireBranch } from '$lib/server/branchContext';

const DUPLICATE_WINDOW_MIN = 1;
const DUPLICATE_WINDOW_MAX = 60;
const GRACE_DAYS_MIN = 0;
const GRACE_DAYS_MAX = 30;

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		await requirePermission(event, 'admin.settings.manage');
		const branchId = requireBranch(event);

		const settings = await getAttendanceSettings(branchId);

		return { settings };
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Attendance settings load failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Attendance settings load failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};

export const actions: Actions = {
	save: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'admin.settings.manage');
			const branchId = requireBranch(event);

			const data = await event.request.formData();
			const duplicateWindowMinutes = parseInt(data, 'duplicateWindowMinutes', {
				min: DUPLICATE_WINDOW_MIN,
				max: DUPLICATE_WINDOW_MAX,
				label: 'Duplicate window minutes'
			});
			const requireAuth = parseBool(data, 'requireAuth', { default: false });
			const requireMemberCode = parseBool(data, 'requireMemberCode', { default: false });
			const blockIfExpired = parseBool(data, 'blockIfExpired', { default: false });
			const blockIfFrozen = parseBool(data, 'blockIfFrozen', { default: true });
			const graceDays = parseInt(data, 'graceDays', {
				min: GRACE_DAYS_MIN,
				max: GRACE_DAYS_MAX,
				label: 'Grace days'
			});
			const allowWithoutActiveMembership = parseBool(data, 'allowWithoutActiveMembership', {
				default: false
			});

			await updateAttendanceSettings(
				branchId,
				{
					duplicateWindowMinutes,
					requireAuth,
					requireMemberCode,
					blockIfExpired,
					blockIfFrozen,
					graceDays,
					allowWithoutActiveMembership
				},
				{
					actorUserId: user.id,
					ip: event.getClientAddress?.() ?? null,
					userAgent: event.request.headers.get('user-agent')
				}
			);

			const settings = await getAttendanceSettings(branchId);

			logger.info('Attendance settings updated', {
				route,
				requestId: event.locals.requestId,
				userId: user.id
			});

			return {
				success: true,
				settings
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Attendance settings validation failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Attendance settings update failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Something went wrong.' });
		}
	}
};
