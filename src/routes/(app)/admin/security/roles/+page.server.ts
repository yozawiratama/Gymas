import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { createRole, deleteRole, listRoles } from '$lib/server/services/securityService';
import { parseString } from '$lib/server/validation';

const SEARCH_MAX = 80;
const ROLE_NAME_MAX = 60;
const ROLE_DESC_MAX = 280;

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

		const roles = await listRoles(search || null);

		return {
			filter: {
				search
			},
			roles
		};
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Security roles list load failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Security roles list load failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};

export const actions: Actions = {
	create: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'admin.security.manage');
			const data = await event.request.formData();

			const name = parseString(data, 'name', {
				trim: true,
				min: 2,
				max: ROLE_NAME_MAX,
				label: 'Role name'
			});
			const description = parseString(data, 'description', {
				trim: true,
				required: false,
				max: ROLE_DESC_MAX,
				label: 'Description'
			});

			await createRole(
				{
					name,
					description: description || null
				},
				{
					actorUserId: user.id,
					ip: event.getClientAddress?.() ?? null,
					userAgent: event.request.headers.get('user-agent')
				}
			);

			return {
				success: true,
				action: 'create'
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Security role create failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage, action: 'create' });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Security role create failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Something went wrong.', action: 'create' });
		}
	},
	delete: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'admin.security.manage');
			const data = await event.request.formData();

			const roleId = parseString(data, 'roleId', {
				trim: true,
				min: 3,
				max: 64,
				label: 'Role'
			});

			await deleteRole(roleId, {
				actorUserId: user.id,
				ip: event.getClientAddress?.() ?? null,
				userAgent: event.request.headers.get('user-agent')
			});

			return {
				success: true,
				action: 'delete'
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Security role delete failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage, action: 'delete' });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Security role delete failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Something went wrong.', action: 'delete' });
		}
	}
};
