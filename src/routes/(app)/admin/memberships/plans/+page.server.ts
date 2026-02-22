import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { createPlan, listPlans, updatePlan } from '$lib/server/services/membershipService';
import { parseBool, parseInt, parseString } from '$lib/server/validation';
import { requireBranch } from '$lib/server/branchContext';

const PLAN_NAME_MAX = 80;
const PLAN_DESCRIPTION_MAX = 280;
const DURATION_MIN = 1;
const DURATION_MAX = 3650;

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		await requirePermission(event, 'settings.view');
		const branchId = requireBranch(event);
		const plans = await listPlans(branchId);
		return { plans };
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Membership plans load failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Membership plans load failed', {
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
			const branchId = requireBranch(event);

			const data = await event.request.formData();
			const name = parseString(data, 'name', {
				trim: true,
				max: PLAN_NAME_MAX,
				label: 'Plan name'
			});
			const durationDays = parseInt(data, 'durationDays', {
				min: DURATION_MIN,
				max: DURATION_MAX,
				label: 'Duration days'
			});
			const price = parseString(data, 'price', {
				trim: true,
				required: false,
				max: 24,
				label: 'Price'
			});
			const description = parseString(data, 'description', {
				trim: true,
				required: false,
				max: PLAN_DESCRIPTION_MAX,
				label: 'Description'
			});
			const isActive = parseBool(data, 'isActive', { default: false, label: 'Active' });

			const plan = await createPlan(
				branchId,
				{
					name,
					durationDays,
					price: price || null,
					description: description || null,
					isActive
				},
				{
					actorUserId: user.id,
					ip: event.getClientAddress?.() ?? null,
					userAgent: event.request.headers.get('user-agent')
				}
			);

			logger.info('Membership plan created', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				planId: plan.id
			});

			const plans = await listPlans(branchId);

			return {
				success: true,
				action: 'create',
				plans
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Membership plan create failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Membership plan create failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to create plan.' });
		}
	},
	toggle: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'settings.edit');
			const branchId = requireBranch(event);
			const data = await event.request.formData();
			const planId = parseString(data, 'planId', {
				trim: true,
				max: 64,
				label: 'Plan id'
			});
			const isActive = parseBool(data, 'isActive', { default: false, label: 'Active' });

			await updatePlan(
				branchId,
				planId,
				{ isActive },
				{
					actorUserId: user.id,
					ip: event.getClientAddress?.() ?? null,
					userAgent: event.request.headers.get('user-agent')
				}
			);

			logger.info('Membership plan updated', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				planId
			});

			const plans = await listPlans(branchId);

			return {
				success: true,
				action: 'toggle',
				plans
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Membership plan update failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Membership plan update failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to update plan.' });
		}
	}
};
