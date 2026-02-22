import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { badRequest, isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { createFixedWindowRateLimiter, retryAfterSeconds } from '$lib/server/rateLimit';
import { checkInMember } from '$lib/server/services/attendanceService';
import { searchMembersForCheckIn } from '$lib/server/services/memberService';
import { fetchPendingOutboxCount } from '$lib/server/services/outboxService';
import { getAttendanceSettings } from '$lib/server/services/appSettingService';
import { getRuntimeConfig } from '$lib/server/config';
import { parseString } from '$lib/server/validation';
import { requireBranch } from '$lib/server/branchContext';

const SEARCH_LIMIT = 15;
const SEARCH_MIN_LENGTH = 2;
const SEARCH_RATE_WINDOW_MS = 60_000;
const SEARCH_RATE_MAX = 30;

const searchLimiter = createFixedWindowRateLimiter({
	windowMs: SEARCH_RATE_WINDOW_MS,
	max: SEARCH_RATE_MAX
});

const serializeCheckInResult = (result: Awaited<ReturnType<typeof checkInMember>>) => ({
	checkedInAt: result.attendance.checkInAt.toISOString(),
	duplicate: result.duplicate,
	member: result.member
});

type SearchValidation =
	| { ok: true; query: string; codeQuery: boolean }
	| { ok: false; message: string };

function isCodeQuery(query: string): boolean {
	return /^[0-9]+$/.test(query) || (/^[A-Za-z0-9-]+$/.test(query) && /\d/.test(query));
}

function validateSearchQuery(query: string, requireMemberCode: boolean): SearchValidation {
	const trimmed = query.trim();
	if (!trimmed) {
		return { ok: false, message: 'Enter a member code or name to search.' };
	}

	const codeQuery = isCodeQuery(trimmed);
	if (requireMemberCode && !codeQuery) {
		return { ok: false, message: 'Member code is required for search.' };
	}

	const minLength = codeQuery ? 1 : SEARCH_MIN_LENGTH;
	if (trimmed.length < minLength) {
		return {
			ok: false,
			message: codeQuery
				? 'Enter at least 1 digit of the member code.'
				: `Enter at least ${SEARCH_MIN_LENGTH} characters to search.`
		};
	}

	return { ok: true, query: trimmed, codeQuery };
}

async function ensureAttendanceAccess(event: RequestEvent) {
	const branchId = requireBranch(event);
	const settings = await getAttendanceSettings(branchId);
	if (settings.requireAuth) {
		await requirePermission(event, 'attendance.checkin');
	}
	return { settings, branchId };
}

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		const { settings } = await ensureAttendanceAccess(event);
		const pendingOutboxCount = await fetchPendingOutboxCount();

		return {
			settings,
			pendingOutboxCount,
			searchResults: []
		};
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Attendance load failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Attendance load failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};

export const actions: Actions = {
	search: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const { settings, branchId } = await ensureAttendanceAccess(event);

			const data = await event.request.formData();
			const rawQuery = parseString(data, 'query', {
				trim: true,
				required: false,
				max: 120,
				label: 'Search query'
			});

			const validation = validateSearchQuery(rawQuery, settings.requireMemberCode);
			if (!validation.ok) {
				throw badRequest(validation.message, 'INVALID_INPUT');
			}

			const rateDecision = searchLimiter(event.getClientAddress?.() ?? null);
			if (!rateDecision.allowed) {
				const retryAfter = retryAfterSeconds(rateDecision.retryAfterMs, 60);
				event.setHeaders({ 'Retry-After': String(retryAfter) });
				logger.warn('Attendance search rate limited', {
					route,
					requestId: event.locals.requestId,
					errorCode: 'TOO_MANY_REQUESTS'
				});
				return fail(429, {
					success: false,
					message: 'Too many searches. Please wait a minute and try again.'
				});
			}

			const searchResults = await searchMembersForCheckIn(branchId, {
				query: validation.query,
				limit: SEARCH_LIMIT,
				requireMemberCode: settings.requireMemberCode
			});

			return {
				success: true,
				searchQuery: validation.query,
				searchResults
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Attendance search validation failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Attendance search failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Something went wrong.' });
		}
	},
	checkIn: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const { branchId } = await ensureAttendanceAccess(event);

			const data = await event.request.formData();
			const memberId = parseString(data, 'memberId', {
				trim: true,
				required: false,
				max: 64,
				label: 'Member id'
			});
			const memberCode = parseString(data, 'memberCode', {
				trim: true,
				required: false,
				max: 64,
				label: 'Member code'
			});
			const searchQuery = parseString(data, 'searchQuery', {
				trim: true,
				required: false,
				max: 120,
				label: 'Search query'
			});

			if (!memberId && !memberCode) {
				throw badRequest('Select a member to check in.', 'INVALID_INPUT');
			}

			const result = await checkInMember({
				branchId,
				memberId: memberId || undefined,
				memberCode: memberCode || undefined
			});

			const pendingOutboxCount = await fetchPendingOutboxCount();

			let searchResults: Awaited<ReturnType<typeof searchMembersForCheckIn>> | undefined;
			if (searchQuery) {
				const settings = await getAttendanceSettings(branchId);
				const validation = validateSearchQuery(searchQuery, settings.requireMemberCode);
				if (validation.ok) {
					searchResults = await searchMembersForCheckIn(branchId, {
						query: validation.query,
						limit: SEARCH_LIMIT,
						requireMemberCode: settings.requireMemberCode
					});
				}
			}

			const { gymId } = getRuntimeConfig();

			logger.info('Attendance check-in recorded', {
				route,
				requestId: event.locals.requestId,
				userId: event.locals.user?.id ?? null,
				gymId,
				memberId: result.member.id,
				duplicate: result.duplicate
			});

			return {
				success: true,
				checkInResult: serializeCheckInResult(result),
				pendingOutboxCount,
				searchQuery: searchResults ? searchQuery : undefined,
				searchResults
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Attendance check-in failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Attendance check-in failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Unable to check in member.' });
		}
	}
};
