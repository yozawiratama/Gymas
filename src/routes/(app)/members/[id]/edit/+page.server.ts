import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { isAppError, notFound } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { requireBranch } from '$lib/server/branchContext';
import { parseId } from '$lib/server/validation';
import { getMemberEditProfile, updateMember } from '$lib/server/services/memberService';

const NAME_MAX = 120;
const MEMBER_CODE_MAX = 64;
const PHONE_MAX = 40;

type MemberFormValues = {
	name: string;
	memberCode: string;
	phone: string;
};

const readFormField = (data: FormData, key: keyof MemberFormValues): string => {
	const value = data.get(key);
	return typeof value === 'string' ? value : '';
};

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		await requirePermission(event, 'members.edit');
		const branchId = requireBranch(event);
		const memberId = parseId(event.params, 'id', { label: 'Member id' });

		const member = await getMemberEditProfile(branchId, memberId);

		if (!member) {
			throw notFound('Member not found.', 'MEMBER_NOT_FOUND');
		}

		return {
			member,
			values: {
				name: member.name,
				memberCode: member.memberCode,
				phone: member.phone ?? ''
			}
		};
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Member edit load failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Member edit load failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};

export const actions: Actions = {
	updateMember: async (event) => {
		const route = event.route?.id ?? event.url.pathname;
		let values: MemberFormValues = { name: '', memberCode: '', phone: '' };

		try {
			const user = await requirePermission(event, 'members.edit');
			const branchId = requireBranch(event);
			const memberId = parseId(event.params, 'id', { label: 'Member id' });

			const data = await event.request.formData();
			values = {
				name: readFormField(data, 'name'),
				memberCode: readFormField(data, 'memberCode'),
				phone: readFormField(data, 'phone')
			};

			const fieldErrors: Partial<Record<keyof MemberFormValues, string>> = {};
			const name = values.name.trim();
			const memberCode = values.memberCode.trim();
			const phone = values.phone.trim();

			if (!name) {
				fieldErrors.name = 'Name is required.';
			} else if (name.length > NAME_MAX) {
				fieldErrors.name = `Name must be ${NAME_MAX} characters or less.`;
			}

			if (!memberCode) {
				fieldErrors.memberCode = 'Member code is required.';
			} else if (memberCode.length > MEMBER_CODE_MAX) {
				fieldErrors.memberCode = `Member code must be ${MEMBER_CODE_MAX} characters or less.`;
			}

			if (phone && phone.length > PHONE_MAX) {
				fieldErrors.phone = `Phone must be ${PHONE_MAX} characters or less.`;
			}

			if (Object.keys(fieldErrors).length > 0) {
				return fail(400, {
					success: false,
					message: 'Please fix the errors below.',
					fieldErrors,
					values
				});
			}

			await updateMember({
				branchId,
				memberId,
				permissions: user.permissions,
				data: {
					fullName: name,
					memberCode,
					phone: phone || null
				}
			});

			logger.info('Member updated', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				memberId,
				branchId
			});

			throw redirect(303, `/members/${memberId}?updated=1`);
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Member update failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});

				if (err.code === 'MEMBER_CODE_CONFLICT') {
					return fail(err.status, {
						success: false,
						message: err.publicMessage,
						fieldErrors: {
							memberCode: err.publicMessage
						},
						values
					});
				}

				if (err.status === 404) {
					throw error(err.status, err.publicMessage);
				}

				return fail(err.status, {
					success: false,
					message: err.publicMessage,
					fieldErrors: {},
					values
				});
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Member update failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, {
				success: false,
				message: 'Unable to update member.',
				fieldErrors: {},
				values
			});
		}
	}
};
