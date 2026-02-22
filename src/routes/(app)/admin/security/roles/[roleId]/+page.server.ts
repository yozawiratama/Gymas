import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import {
	getRoleDetail,
	listPermissions,
	updateRoleDescription,
	updateRolePermissions
} from '$lib/server/services/securityService';
import { parseId, parseString } from '$lib/server/validation';

const ROLE_DESC_MAX = 280;

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		await requirePermission(event, 'admin.security.manage');

		const roleId = parseId(event.params, 'roleId', { label: 'Role' });
		const tab = parseString(event.url.searchParams, 'tab', {
			trim: true,
			required: false,
			max: 32,
			label: 'Tab'
		});

		const [role, permissions] = await Promise.all([
			getRoleDetail(roleId),
			listPermissions()
		]);

		if (!role) {
			throw error(404, 'Role not found.');
		}

		const normalizedTab = tab === 'users' ? 'users' : 'permissions';

		return {
			role,
			permissions,
			tab: normalizedTab
		};
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Security role detail load failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Security role detail load failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};

export const actions: Actions = {
	updateDescription: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'admin.security.manage');
			const roleId = parseId(event.params, 'roleId', { label: 'Role' });
			const data = await event.request.formData();
			const description = parseString(data, 'description', {
				trim: true,
				required: false,
				max: ROLE_DESC_MAX,
				label: 'Description'
			});

			await updateRoleDescription(roleId, description || null, {
				actorUserId: user.id,
				ip: event.getClientAddress?.() ?? null,
				userAgent: event.request.headers.get('user-agent')
			});

			return {
				success: true,
				action: 'updateDescription'
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Security role description update failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, {
					success: false,
					message: err.publicMessage,
					action: 'updateDescription'
				});
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Security role description update failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, {
				success: false,
				message: 'Something went wrong.',
				action: 'updateDescription'
			});
		}
	},
	updatePermissions: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'admin.security.manage');
			const roleId = parseId(event.params, 'roleId', { label: 'Role' });
			const data = await event.request.formData();
			const permissionIds = data.getAll('permissionIds');

			const result = await updateRolePermissions({
				roleId,
				permissionIds,
				guardUserId: user.id,
				audit: {
					actorUserId: user.id,
					ip: event.getClientAddress?.() ?? null,
					userAgent: event.request.headers.get('user-agent')
				}
			});

			return {
				success: true,
				action: 'updatePermissions',
				updated: result
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Security role permission update failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, {
					success: false,
					message: err.publicMessage,
					action: 'updatePermissions'
				});
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Security role permission update failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, {
				success: false,
				message: 'Something went wrong.',
				action: 'updatePermissions'
			});
		}
	}
};
