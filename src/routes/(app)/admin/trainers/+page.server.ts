import type { Actions, PageServerLoad } from './$types';
import { error, fail, type RequestEvent } from '@sveltejs/kit';
import { badRequest, isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { can, requirePermission, type PermissionSubject } from '$lib/server/authz';
import { requireBranch } from '$lib/server/branchContext';
import { parsePageParams, parseString } from '$lib/server/validation';
import {
	createTrainer,
	getTrainerById,
	listTrainers,
	setTrainerActive,
	updateTrainer
} from '$lib/server/services/personalTrainerService';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const QUERY_MAX = 120;
const FULL_NAME_MIN = 2;
const FULL_NAME_MAX = 120;
const DISPLAY_NAME_MAX = 120;
const PHONE_MAX = 40;
const EMAIL_MAX = 254;
const BIO_MAX = 2000;
const SPECIALTY_MAX = 120;
const MEDIA_ID_MAX = 64;

function parseActiveOnly(params: URLSearchParams): boolean {
	const values = params.getAll('activeOnly');
	if (values.length === 0) return true;
	const raw = values[values.length - 1];
	const normalized = raw.trim().toLowerCase();
	if (!normalized) return true;
	if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
	if (['false', '0', 'no', 'off'].includes(normalized)) return false;
	throw badRequest('Active only must be a boolean.', 'INVALID_INPUT');
}

function nullIfEmpty(value: string): string | null {
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

async function fetchTrainerList(event: RequestEvent, permissions: PermissionSubject) {
	const branchId = requireBranch(event);
	const query = parseString(event.url.searchParams, 'q', {
		trim: true,
		required: false,
		max: QUERY_MAX,
		label: 'Search query'
	});
	const { page, pageSize } = parsePageParams(event.url, {
		pageDefault: 1,
		pageSizeDefault: DEFAULT_PAGE_SIZE,
		maxPageSize: MAX_PAGE_SIZE
	});
	const activeOnly = parseActiveOnly(event.url.searchParams);

	const list = await listTrainers({
		branchId,
		permissions,
		q: query,
		activeOnly,
		page,
		pageSize
	});

	let rows = list.rows;
	const canManage = can(permissions, 'trainers.manage');
	if (canManage && rows.length) {
		const details = await Promise.all(
			rows.map((trainer) => getTrainerById({ branchId, permissions, id: trainer.id }))
		);
		const detailList = details.filter(
			(trainer): trainer is NonNullable<typeof trainer> => !!trainer
		);
		const detailsById = new Map(detailList.map((trainer) => [trainer.id, trainer]));
		rows = rows.map((trainer) => detailsById.get(trainer.id) ?? trainer);
	}

	return {
		rows,
		pagination: list.pagination,
		q: query,
		activeOnly,
		canManage
	};
}

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		const user = await requirePermission(event, 'trainers.view');
		const list = await fetchTrainerList(event, user.permissions);

		return {
			...list
		};
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Trainer list load failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Trainer list load failed', {
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
			const user = await requirePermission(event, 'trainers.manage');
			const branchId = requireBranch(event);

			const data = await event.request.formData();
			const fullName = parseString(data, 'fullName', {
				trim: true,
				min: FULL_NAME_MIN,
				max: FULL_NAME_MAX,
				label: 'Full name'
			});
			const displayName = parseString(data, 'displayName', {
				trim: true,
				required: false,
				max: DISPLAY_NAME_MAX,
				label: 'Display name'
			});
			const phone = parseString(data, 'phone', {
				trim: true,
				required: false,
				max: PHONE_MAX,
				label: 'Phone'
			});
			const email = parseString(data, 'email', {
				trim: true,
				required: false,
				max: EMAIL_MAX,
				label: 'Email'
			});
			const specialty = parseString(data, 'specialty', {
				trim: true,
				required: false,
				max: SPECIALTY_MAX,
				label: 'Specialty'
			});
			const bio = parseString(data, 'bio', {
				trim: true,
				required: false,
				max: BIO_MAX,
				label: 'Bio'
			});
			const photoMediaId = parseString(data, 'photoMediaId', {
				trim: true,
				required: false,
				max: MEDIA_ID_MAX,
				label: 'Photo media id'
			});

			const trainer = await createTrainer({
				branchId,
				permissions: user.permissions,
				actorUserId: user.id,
				data: {
					fullName,
					displayName: nullIfEmpty(displayName),
					phone: nullIfEmpty(phone),
					email: nullIfEmpty(email),
					specialty: nullIfEmpty(specialty),
					bio: nullIfEmpty(bio),
					photoMediaId: nullIfEmpty(photoMediaId)
				}
			});

			logger.info('Trainer created', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				trainerId: trainer.id
			});

			const list = await fetchTrainerList(event, user.permissions);

			return {
				success: true,
				action: 'create',
				...list
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Trainer create failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Trainer create failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to create trainer.' });
		}
	},
	update: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'trainers.manage');
			const branchId = requireBranch(event);

			const data = await event.request.formData();
			const id = parseString(data, 'id', {
				trim: true,
				max: MEDIA_ID_MAX,
				label: 'Trainer id'
			});
			const fullName = parseString(data, 'fullName', {
				trim: true,
				min: FULL_NAME_MIN,
				max: FULL_NAME_MAX,
				label: 'Full name'
			});
			const displayName = parseString(data, 'displayName', {
				trim: true,
				required: false,
				max: DISPLAY_NAME_MAX,
				label: 'Display name'
			});
			const phone = parseString(data, 'phone', {
				trim: true,
				required: false,
				max: PHONE_MAX,
				label: 'Phone'
			});
			const email = parseString(data, 'email', {
				trim: true,
				required: false,
				max: EMAIL_MAX,
				label: 'Email'
			});
			const specialty = parseString(data, 'specialty', {
				trim: true,
				required: false,
				max: SPECIALTY_MAX,
				label: 'Specialty'
			});
			const bio = parseString(data, 'bio', {
				trim: true,
				required: false,
				max: BIO_MAX,
				label: 'Bio'
			});
			const photoMediaId = parseString(data, 'photoMediaId', {
				trim: true,
				required: false,
				max: MEDIA_ID_MAX,
				label: 'Photo media id'
			});

			await updateTrainer({
				branchId,
				permissions: user.permissions,
				actorUserId: user.id,
				id,
				data: {
					fullName,
					displayName: nullIfEmpty(displayName),
					phone: nullIfEmpty(phone),
					email: nullIfEmpty(email),
					specialty: nullIfEmpty(specialty),
					bio: nullIfEmpty(bio),
					photoMediaId: nullIfEmpty(photoMediaId)
				}
			});

			logger.info('Trainer updated', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				trainerId: id
			});

			const list = await fetchTrainerList(event, user.permissions);

			return {
				success: true,
				action: 'update',
				...list
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Trainer update failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Trainer update failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to update trainer.' });
		}
	},
	toggleActive: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'trainers.manage');
			const branchId = requireBranch(event);

			const data = await event.request.formData();
			const id = parseString(data, 'id', {
				trim: true,
				max: MEDIA_ID_MAX,
				label: 'Trainer id'
			});
			const rawIsActive = parseString(data, 'isActive', {
				trim: true,
				label: 'Active'
			});
			const normalized = rawIsActive.trim().toLowerCase();
			let isActive: boolean;
			if (['true', '1', 'yes', 'on'].includes(normalized)) {
				isActive = true;
			} else if (['false', '0', 'no', 'off'].includes(normalized)) {
				isActive = false;
			} else {
				throw badRequest('Active flag must be a boolean.', 'INVALID_INPUT');
			}

			await setTrainerActive({
				branchId,
				permissions: user.permissions,
				actorUserId: user.id,
				id,
				isActive
			});

			logger.info('Trainer toggled', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				trainerId: id,
				isActive
			});

			const list = await fetchTrainerList(event, user.permissions);

			return {
				success: true,
				action: 'toggleActive',
				...list
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Trainer toggle failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Trainer toggle failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to update trainer.' });
		}
	}
};
