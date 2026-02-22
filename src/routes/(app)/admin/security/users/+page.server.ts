import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { listRoleOptions, listUsers, updateUserRoles } from '$lib/server/services/securityService';
import { parseString } from '$lib/server/validation';

const SEARCH_MAX = 80;

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		await requirePermission(event, 'admin.security.manage');

		const search = parseString(event.url.searchParams, 'q', {
			trim: true,
			required: false,
			max: SEARCH_MAX,
			label: 'Search'
		});

		const [roles, users] = await Promise.all([
			listRoleOptions(),
			listUsers(search || null)
		]);

		return {
			filter: {
				search
			},
			roles,
			users
		};
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Security users list load failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Security users list load failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};

export const actions: Actions = {
	updateRoles: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'admin.security.manage');
			const data = await event.request.formData();
			const userId = parseString(data, 'userId', {
				trim: true,
				min: 3,
				max: 64,
				label: 'User'
			});
			const roleIds = data.getAll('roleIds');

			const result = await updateUserRoles({
				userId,
				roleIds,
				guardUserId: user.id,
				audit: {
					actorUserId: user.id,
					ip: event.getClientAddress?.() ?? null,
					userAgent: event.request.headers.get('user-agent')
				}
			});

			return {
				success: true,
				action: 'updateRoles',
				updated: result
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Security user role update failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, {
					success: false,
					message: err.publicMessage,
					action: 'updateRoles'
				});
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Security user role update failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, {
				success: false,
				message: 'Something went wrong.',
				action: 'updateRoles'
			});
		}
	}
};
