import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { createBranch, deleteBranch, listBranches, updateBranch } from '$lib/server/services/branchService';
import { parseBool, parseString } from '$lib/server/validation';

const NAME_MAX = 80;
const CODE_MAX = 24;
const ADDRESS_MAX = 200;

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		await requirePermission(event, 'settings.view');

		const branches = await listBranches();
		return { branches };
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Branch list load failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Branch list load failed', {
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
			const user = await requirePermission(event, 'settings.edit');

			const data = await event.request.formData();
			const name = parseString(data, 'name', {
				trim: true,
				max: NAME_MAX,
				label: 'Branch name'
			});
			const code = parseString(data, 'code', {
				trim: true,
				required: false,
				max: CODE_MAX,
				label: 'Branch code'
			});
			const address = parseString(data, 'address', {
				trim: true,
				required: false,
				max: ADDRESS_MAX,
				label: 'Branch address'
			});
			const isActive = parseBool(data, 'isActive', { default: false, label: 'Active' });

			const branch = await createBranch({
				name,
				code: code || null,
				address: address || null,
				isActive
			});

			logger.info('Branch created', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				branchId: branch.id
			});

			const branches = await listBranches();

			return {
				success: true,
				action: 'create',
				branches
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Branch create failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Branch create failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to create branch.' });
		}
	},
	update: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'settings.edit');

			const data = await event.request.formData();
			const branchId = parseString(data, 'branchId', {
				trim: true,
				max: 64,
				label: 'Branch id'
			});
			const name = parseString(data, 'name', {
				trim: true,
				required: false,
				max: NAME_MAX,
				label: 'Branch name'
			});
			const code = parseString(data, 'code', {
				trim: true,
				required: false,
				max: CODE_MAX,
				label: 'Branch code'
			});
			const address = parseString(data, 'address', {
				trim: true,
				required: false,
				max: ADDRESS_MAX,
				label: 'Branch address'
			});
			const isActive = parseBool(data, 'isActive', { default: false, label: 'Active' });

			await updateBranch(branchId, {
				name: name || null,
				code: code || null,
				address: address || null,
				isActive
			});

			logger.info('Branch updated', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				branchId
			});

			const branches = await listBranches();

			return {
				success: true,
				action: 'update',
				branches
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Branch update failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Branch update failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to update branch.' });
		}
	},
	delete: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'settings.edit');

			const data = await event.request.formData();
			const branchId = parseString(data, 'branchId', {
				trim: true,
				max: 64,
				label: 'Branch id'
			});

			await deleteBranch(branchId);

			logger.info('Branch deleted', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				branchId
			});

			const branches = await listBranches();

			return {
				success: true,
				action: 'delete',
				branches
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Branch delete failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Branch delete failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to delete branch.' });
		}
	}
};
