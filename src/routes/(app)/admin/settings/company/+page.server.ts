import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { badRequest, isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { getCompanySettings, updateCompanySettings } from '$lib/server/services/appSettingService';
import { parseString } from '$lib/server/validation';
import { requireBranch } from '$lib/server/branchContext';

const COMPANY_NAME_MAX = 80;
const TAGLINE_MAX = 140;
const ADDRESS_MAX = 240;
const PHONE_MAX = 40;
const EMAIL_MAX = 120;
const URL_MAX = 200;
const BUSINESS_HOURS_MAX = 240;

const PHONE_PATTERN = /^[0-9+\s]+$/;
const URL_PATTERN = /^https?:\/\//i;

function parseOptionalString(
	data: FormData,
	key: string,
	options: { max?: number; label: string }
): string | null {
	const value = parseString(data, key, {
		trim: true,
		required: false,
		max: options.max,
		label: options.label
	});
	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
}

function validatePhone(value: string | null, label: string) {
	if (!value) {
		return;
	}
	if (!PHONE_PATTERN.test(value)) {
		throw badRequest(`${label} can only contain digits, spaces, and +.`);
	}
	if (!/\d/.test(value)) {
		throw badRequest(`${label} must include at least one number.`);
	}
}

function validateEmail(value: string | null, label: string) {
	if (!value) {
		return;
	}
	if (!value.includes('@')) {
		throw badRequest(`${label} must be a valid email address.`);
	}
}

function validateUrl(value: string | null, label: string) {
	if (!value) {
		return;
	}
	if (!URL_PATTERN.test(value)) {
		throw badRequest(`${label} must start with http:// or https://.`);
	}
}

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		await requirePermission(event, 'admin.settings.manage');
		const branchId = requireBranch(event);

		const settings = await getCompanySettings(branchId);

		return { settings };
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Company settings load failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Company settings load failed', {
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
			const tagline = parseOptionalString(data, 'tagline', {
				max: TAGLINE_MAX,
				label: 'Tagline'
			});
			const address = parseOptionalString(data, 'address', {
				max: ADDRESS_MAX,
				label: 'Address'
			});
			const phone = parseOptionalString(data, 'phone', {
				max: PHONE_MAX,
				label: 'Phone'
			});
			const whatsapp = parseOptionalString(data, 'whatsapp', {
				max: PHONE_MAX,
				label: 'WhatsApp'
			});
			const email = parseOptionalString(data, 'email', {
				max: EMAIL_MAX,
				label: 'Email'
			});
			const instagramUrl = parseOptionalString(data, 'instagramUrl', {
				max: URL_MAX,
				label: 'Instagram URL'
			});
			const facebookUrl = parseOptionalString(data, 'facebookUrl', {
				max: URL_MAX,
				label: 'Facebook URL'
			});
			const websiteUrl = parseOptionalString(data, 'websiteUrl', {
				max: URL_MAX,
				label: 'Website URL'
			});
			const googleMapsUrl = parseOptionalString(data, 'googleMapsUrl', {
				max: URL_MAX,
				label: 'Google Maps URL'
			});
			const businessHours = parseOptionalString(data, 'businessHours', {
				max: BUSINESS_HOURS_MAX,
				label: 'Business hours'
			});

			validatePhone(phone, 'Phone');
			validatePhone(whatsapp, 'WhatsApp');
			validateEmail(email, 'Email');
			validateUrl(instagramUrl, 'Instagram URL');
			validateUrl(facebookUrl, 'Facebook URL');
			validateUrl(websiteUrl, 'Website URL');
			validateUrl(googleMapsUrl, 'Google Maps URL');

			await updateCompanySettings(
				branchId,
				{
					companyName,
					tagline,
					address,
					phone,
					whatsapp,
					email,
					instagramUrl,
					facebookUrl,
					websiteUrl,
					googleMapsUrl,
					businessHours
				},
				{
					actorUserId: user.id,
					ip: event.getClientAddress?.() ?? null,
					userAgent: event.request.headers.get('user-agent')
				}
			);

			const settings = await getCompanySettings(branchId);

			logger.info('Company settings updated', {
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
				logger.warn('Company settings validation failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Company settings update failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Something went wrong.' });
		}
	}
};
