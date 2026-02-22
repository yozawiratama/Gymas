import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import {
	getBrandingSettings,
	updateBrandingLogo,
	updateBrandingSettings
} from '$lib/server/services/appSettingService';
import { MediaUploadError, storeUploadedImage } from '$lib/server/services/mediaService';
import { parseBool, parseString } from '$lib/server/validation';
import { requireBranch } from '$lib/server/branchContext';

const COMPANY_NAME_MAX = 80;

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		await requirePermission(event, 'admin.settings.manage');
		const branchId = requireBranch(event);

		const branding = await getBrandingSettings(branchId);

		return { branding };
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Branding settings load failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Branding settings load failed', {
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
			const companyName = parseString(data, 'companyName', {
				trim: true,
				min: 1,
				max: COMPANY_NAME_MAX,
				label: 'Company name'
			});
			const showLogoOnLogin = parseBool(data, 'showLogoOnLogin', { default: false });
			const showLogoOnLayout = parseBool(data, 'showLogoOnLayout', { default: false });
			const current = await getBrandingSettings(branchId);

			await updateBrandingSettings(
				branchId,
				{
					companyName,
					logoMediaId: current.logoMediaId,
					showLogoOnLogin,
					showLogoOnLayout
				},
				{
					actorUserId: user.id,
					ip: event.getClientAddress?.() ?? null,
					userAgent: event.request.headers.get('user-agent')
				}
			);

			const branding = await getBrandingSettings(branchId);

			logger.info('Branding settings updated', {
				route,
				requestId: event.locals.requestId,
				userId: user.id
			});

			return {
				success: true,
				action: 'save',
				branding
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Branding settings validation failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Branding settings update failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Something went wrong.' });
		}
	},
	uploadLogo: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'admin.settings.manage');
			const branchId = requireBranch(event);

			const data = await event.request.formData();
			const logo = data.get('logo');

			if (!(logo instanceof File)) {
				return fail(400, { success: false, message: 'Select a logo image to upload.' });
			}

			const media = await storeUploadedImage(branchId, logo, 'branding.logo');
			await updateBrandingLogo(branchId, media.id, {
				actorUserId: user.id,
				ip: event.getClientAddress?.() ?? null,
				userAgent: event.request.headers.get('user-agent')
			});

			const branding = await getBrandingSettings(branchId);

			logger.info('Branding logo updated', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				mediaId: media.id
			});

			return {
				success: true,
				action: 'uploadLogo',
				branding
			};
		} catch (err) {
			if (err instanceof MediaUploadError) {
				logger.warn('Branding logo validation failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: 'INVALID_FILE'
				});
				return fail(400, { success: false, message: err.message });
			}

			if (isAppError(err)) {
				logger.warn('Branding logo validation failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Branding logo upload failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Something went wrong.' });
		}
	}
};
