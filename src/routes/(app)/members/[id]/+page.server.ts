import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	canRecordPayments,
	canVoidPayments,
	canViewMemberNotes,
	canViewPaymentDetails,
	can,
	requirePermission
} from '$lib/server/authz';
import { badRequest, isAppError, notFound } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { getMemberProfile360, setMemberStatus } from '$lib/server/services/memberService';
import {
	createMembershipForMember,
	cancelMembershipForMember,
	getMemberMembershipById,
	getMemberMembershipOverview,
	getPlanSummary,
	listPlans
} from '$lib/server/services/membershipService';
import { createPayment, voidPayment } from '$lib/server/services/paymentService';
import { parseId, parseString } from '$lib/server/validation';
import { requireBranch } from '$lib/server/branchContext';

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseDateInputValue = (raw: string): Date | null => {
	const value = raw.trim();
	if (!value) return null;
	if (DATE_INPUT_PATTERN.test(value)) {
		const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
		const date = new Date(year, month - 1, day);
		return Number.isNaN(date.getTime()) ? null : date;
	}
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const addDays = (value: Date, days: number) => {
	const next = new Date(value.getTime());
	next.setDate(next.getDate() + days);
	return next;
};

const endOfDay = (value: Date) => {
	const next = new Date(value.getTime());
	next.setHours(23, 59, 59, 999);
	return next;
};

const formatDateInput = (value: Date) => {
	const year = value.getFullYear();
	const month = `${value.getMonth() + 1}`.padStart(2, '0');
	const day = `${value.getDate()}`.padStart(2, '0');
	return `${year}-${month}-${day}`;
};

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		const user = await requirePermission(event, 'members.view');
		const branchId = requireBranch(event);
		const memberId = parseId(event.params, 'id', { label: 'Member id' });
		const createdRaw = parseString(event.url.searchParams, 'created', {
			trim: true,
			required: false,
			max: 12,
			label: 'Created'
		});
		const created = ['1', 'true', 'yes'].includes(createdRaw.toLowerCase());
		const updatedRaw = parseString(event.url.searchParams, 'updated', {
			trim: true,
			required: false,
			max: 12,
			label: 'Updated'
		});
		const updated = ['1', 'true', 'yes'].includes(updatedRaw.toLowerCase());
		const statusUpdatedRaw = parseString(event.url.searchParams, 'statusUpdated', {
			trim: true,
			required: false,
			max: 12,
			label: 'Status updated'
		});
		const statusUpdated = ['1', 'true', 'yes'].includes(statusUpdatedRaw.toLowerCase());
		const paymentVoidedRaw = parseString(event.url.searchParams, 'paymentVoided', {
			trim: true,
			required: false,
			max: 12,
			label: 'Payment voided'
		});
		const paymentVoided = ['1', 'true', 'yes'].includes(paymentVoidedRaw.toLowerCase());
		const renewedRaw = parseString(event.url.searchParams, 'renewed', {
			trim: true,
			required: false,
			max: 12,
			label: 'Renewed'
		});
		const renewed = ['1', 'true', 'yes'].includes(renewedRaw.toLowerCase());
		const membershipCancelledRaw = parseString(event.url.searchParams, 'membershipCancelled', {
			trim: true,
			required: false,
			max: 12,
			label: 'Membership cancelled'
		});
		const membershipCancelled = ['1', 'true', 'yes'].includes(
			membershipCancelledRaw.toLowerCase()
		);

		const profile = await getMemberProfile360(branchId, memberId, user.permissions);

		if (!profile) {
			throw notFound('Member not found.', 'MEMBER_NOT_FOUND');
		}

		const canAssignMembership = can(user.permissions, 'members.edit');
		const planOptions = canAssignMembership
			? await listPlans(branchId, { activeOnly: true })
			: [];
		const baseMembership =
			profile.membership.currentMembership ?? profile.membership.lastMembership ?? null;
		const basePlan =
			canAssignMembership && baseMembership
				? await getPlanSummary(branchId, baseMembership.planId)
				: null;
		const renewalPlan = basePlan
			? {
					id: basePlan.id,
					name: basePlan.name,
					durationDays: basePlan.durationDays,
					isActive: basePlan.isActive
				}
			: null;

		return {
			profile,
			created,
			updated,
			permissions: {
				canViewNotes: canViewMemberNotes(user.permissions),
				canViewPayments: canViewPaymentDetails(user.permissions),
				canRecordPayments: canRecordPayments(user.permissions),
				canVoidPayments: canVoidPayments(user.permissions),
				canAssignMembership,
				canCancelMembership: can(user.permissions, 'memberships.cancel'),
				canArchive: can(user.permissions, 'members.archive')
			},
			statusUpdated,
			paymentVoided,
			renewed,
			membershipCancelled,
			planOptions,
			renewalPlan
		};
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Member profile validation failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Member profile load failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};

export const actions: Actions = {
	recordPayment: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'payments.create');
			const branchId = requireBranch(event);
			const memberId = parseId(event.params, 'id', { label: 'Member id' });

			const data = await event.request.formData();
			const amount = parseString(data, 'amount', {
				trim: true,
				max: 20,
				label: 'Amount'
			});
			const paidAt = parseString(data, 'paidAt', {
				trim: true,
				required: false,
				max: 32,
				label: 'Paid at'
			});
			const method = parseString(data, 'method', {
				trim: true,
				required: false,
				max: 24,
				label: 'Payment method'
			});
			const note = parseString(data, 'note', {
				trim: true,
				required: false,
				max: 191,
				label: 'Note'
			});
			const membershipIdInput = parseString(data, 'membershipId', {
				trim: true,
				required: false,
				max: 64,
				label: 'Membership'
			});
			const membershipId = membershipIdInput || null;

			if (membershipId) {
				const membership = await getMemberMembershipById(branchId, memberId, membershipId);
				if (!membership) {
					throw badRequest('Membership selection is invalid.', 'INVALID_INPUT');
				}
			}

			const result = await createPayment(
				branchId,
				{
					memberId,
					membershipId,
					amount,
					paidAt: paidAt || undefined,
					method: method || undefined,
					note: note || undefined
				},
				user,
				{
					ip: event.getClientAddress?.() ?? null,
					userAgent: event.request.headers.get('user-agent')
				}
			);

			logger.info('Payment recorded', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				memberId,
				paymentId: result.id
			});

			return {
				success: true,
				action: 'recordPayment',
				paymentId: result.id
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Payment record failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Payment record failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to record payment.' });
		}
	},
	voidPayment: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'payments.void');
			const branchId = requireBranch(event);
			const memberId = parseId(event.params, 'id', { label: 'Member id' });

			const data = await event.request.formData();
			const paymentId = parseString(data, 'paymentId', {
				trim: true,
				max: 64,
				label: 'Payment id'
			});
			const reason = parseString(data, 'reason', {
				trim: true,
				required: false,
				max: 500,
				label: 'Reason'
			});

			const result = await voidPayment(
				branchId,
				{
					memberId,
					paymentId,
					reason: reason || undefined
				},
				user,
				{
					ip: event.getClientAddress?.() ?? null,
					userAgent: event.request.headers.get('user-agent')
				}
			);

			logger.info('Payment voided', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				memberId,
				paymentId: result.id,
				alreadyVoided: result.alreadyVoided
			});

			throw redirect(303, `/members/${memberId}?paymentVoided=1`);
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Payment void failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				if (err.status === 404) {
					throw error(err.status, err.publicMessage);
				}
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Payment void failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to void payment.' });
		}
	},
	deactivateMember: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'members.archive');
			const branchId = requireBranch(event);
			const memberId = parseId(event.params, 'id', { label: 'Member id' });

			await setMemberStatus({
				branchId,
				memberId,
				permissions: user.permissions,
				status: 'INACTIVE'
			});

			logger.info('Member deactivated', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				memberId,
				branchId
			});

			throw redirect(303, `/members/${memberId}?statusUpdated=1`);
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Member deactivation failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				if (err.status === 404) {
					throw error(err.status, err.publicMessage);
				}
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Member deactivation failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to deactivate member.' });
		}
	},
	reactivateMember: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'members.archive');
			const branchId = requireBranch(event);
			const memberId = parseId(event.params, 'id', { label: 'Member id' });

			await setMemberStatus({
				branchId,
				memberId,
				permissions: user.permissions,
				status: 'ACTIVE'
			});

			logger.info('Member reactivated', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				memberId,
				branchId
			});

			throw redirect(303, `/members/${memberId}?statusUpdated=1`);
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Member reactivation failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				if (err.status === 404) {
					throw error(err.status, err.publicMessage);
				}
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Member reactivation failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to reactivate member.' });
		}
	},
	assignMembership: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'members.edit');
			await requirePermission(event, 'payments.create');
			const branchId = requireBranch(event);
			const memberId = parseId(event.params, 'id', { label: 'Member id' });

			const data = await event.request.formData();
			const planId = parseString(data, 'planId', {
				trim: true,
				max: 64,
				label: 'Plan'
			});
			const startAt = parseString(data, 'startAt', {
				trim: true,
				max: 32,
				label: 'Start date'
			});
			const endAt = parseString(data, 'endAt', {
				trim: true,
				required: false,
				max: 32,
				label: 'End date'
			});

			const membership = await createMembershipForMember(
				branchId,
				memberId,
				planId,
				startAt,
				endAt || null,
				user.id,
				{
					actorUserId: user.id,
					ip: event.getClientAddress?.() ?? null,
					userAgent: event.request.headers.get('user-agent')
				}
			);

			logger.info('Membership assigned', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				memberId,
				membershipId: membership.id
			});

			return {
				success: true,
				action: 'assignMembership',
				membershipId: membership.id
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Membership assignment failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Membership assignment failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to assign membership.' });
		}
	},
	renewMembership: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'members.edit');
			const branchId = requireBranch(event);
			const memberId = parseId(event.params, 'id', { label: 'Member id' });

			const data = await event.request.formData();
			const planIdInput = parseString(data, 'planId', {
				trim: true,
				required: false,
				max: 64,
				label: 'Plan'
			});
			const startAtInput = parseString(data, 'startAt', {
				trim: true,
				required: false,
				max: 32,
				label: 'Start date'
			});
			const endAtInput = parseString(data, 'endAt', {
				trim: true,
				required: false,
				max: 32,
				label: 'End date'
			});
			const amount = parseString(data, 'amount', {
				trim: true,
				max: 20,
				label: 'Amount'
			});
			const paidAt = parseString(data, 'paidAt', {
				trim: true,
				required: false,
				max: 32,
				label: 'Paid at'
			});
			const method = parseString(data, 'method', {
				trim: true,
				required: false,
				max: 24,
				label: 'Payment method'
			});
			const note = parseString(data, 'note', {
				trim: true,
				required: false,
				max: 191,
				label: 'Note'
			});

			const overview = await getMemberMembershipOverview(branchId, memberId);
			const baseMembership = overview.current ?? overview.last;

			if (!baseMembership) {
				return fail(400, { success: false, message: 'No membership to renew yet.' });
			}

			const basePlan = await getPlanSummary(branchId, baseMembership.planId);
			if (!basePlan) {
				return fail(400, { success: false, message: 'Membership plan not found.' });
			}

			const planId = planIdInput || basePlan.id;
			const selectedPlan =
				planId === basePlan.id ? basePlan : await getPlanSummary(branchId, planId);

			if (!selectedPlan) {
				return fail(400, { success: false, message: 'Membership plan not found.' });
			}

			if (!selectedPlan.isActive) {
				return fail(400, { success: false, message: 'Membership plan is inactive.' });
			}

			const today = startOfDay(new Date());
			const baseEndAt = baseMembership.endAt ? startOfDay(baseMembership.endAt) : null;
			const defaultStartAt =
				baseEndAt && baseEndAt.getTime() >= today.getTime() ? addDays(baseEndAt, 1) : today;

			const parsedStartAt = startAtInput ? parseDateInputValue(startAtInput) : null;
			if (startAtInput && !parsedStartAt) {
				return fail(400, { success: false, message: 'Start date must be a valid date.' });
			}
			const startAt = parsedStartAt ?? defaultStartAt;

			let endAt: Date | null = null;
			if (endAtInput) {
				const parsedEndAt = parseDateInputValue(endAtInput);
				if (!parsedEndAt) {
					return fail(400, { success: false, message: 'End date must be a valid date.' });
				}
				endAt = parsedEndAt;
			} else if (Number.isFinite(selectedPlan.durationDays)) {
				const durationDays = Math.max(selectedPlan.durationDays - 1, 0);
				endAt = addDays(startAt, durationDays);
			}

			if (!endAt) {
				return fail(400, { success: false, message: 'End date is required.' });
			}

			const normalizedEndAt = endOfDay(endAt);

			if (normalizedEndAt.getTime() < startAt.getTime()) {
				return fail(400, {
					success: false,
					message: 'End date must be on or after start date.'
				});
			}

			const membership = await createMembershipForMember(
				branchId,
				memberId,
				selectedPlan.id,
				formatDateInput(startAt),
				normalizedEndAt.toISOString(),
				user.id,
				{
					actorUserId: user.id,
					ip: event.getClientAddress?.() ?? null,
					userAgent: event.request.headers.get('user-agent')
				}
			);

			try {
				await createPayment(
					branchId,
					{
						memberId,
						membershipId: membership.id,
						amount,
						paidAt: paidAt || undefined,
						method: method || undefined,
						note: note || undefined
					},
					user,
					{
						ip: event.getClientAddress?.() ?? null,
						userAgent: event.request.headers.get('user-agent')
					}
				);
			} catch (paymentError) {
				try {
					await cancelMembershipForMember(
						branchId,
						memberId,
						membership.id,
						'Payment required but failed to record.',
						{
							actorUserId: user.id,
							ip: event.getClientAddress?.() ?? null,
							userAgent: event.request.headers.get('user-agent')
						}
					);
				} catch (cancelError) {
					logger.error('Membership auto-cancel failed after payment error', {
						route,
						requestId: event.locals.requestId,
						memberId,
						membershipId: membership.id,
						error: cancelError
					});
				}
				throw paymentError;
			}

			logger.info('Membership renewed', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				memberId,
				membershipId: membership.id
			});

			throw redirect(303, `/members/${memberId}?renewed=1`);
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Membership renewal failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Membership renewal failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to renew membership.' });
		}
	},
	cancelMembership: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'memberships.cancel');
			const branchId = requireBranch(event);
			const memberId = parseId(event.params, 'id', { label: 'Member id' });

			const data = await event.request.formData();
			const membershipId = parseString(data, 'membershipId', {
				trim: true,
				max: 64,
				label: 'Membership'
			});
			const reason = parseString(data, 'reason', {
				trim: true,
				required: false,
				max: 500,
				label: 'Reason'
			});

			await cancelMembershipForMember(branchId, memberId, membershipId, reason || null, {
				actorUserId: user.id,
				ip: event.getClientAddress?.() ?? null,
				userAgent: event.request.headers.get('user-agent')
			});

			logger.info('Membership cancelled', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				memberId,
				membershipId
			});

			throw redirect(303, `/members/${memberId}?membershipCancelled=1`);
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Membership cancellation failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				if (err.status === 404) {
					throw error(err.status, err.publicMessage);
				}
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Membership cancellation failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to cancel membership.' });
		}
	}
};
