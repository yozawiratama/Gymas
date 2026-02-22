import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { can, requirePermission } from '$lib/server/authz';
import { logger } from '$lib/server/logger';
import { isAppError } from '$lib/server/httpErrors';
import { getMemberList } from '$lib/server/services/memberService';
import { parsePageParams, parseString } from '$lib/server/validation';
import { requireBranch } from '$lib/server/branchContext';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const STATUS_FILTERS = new Set(['active', 'inactive', 'all']);
const MEMBERSHIP_STATUS_FILTERS = new Set(['active', 'expired', 'none', 'all']);

const normalizeStatusFilter = (raw: string) => {
	const normalized = raw.trim().toLowerCase();
	if (STATUS_FILTERS.has(normalized)) {
		return normalized as 'active' | 'inactive' | 'all';
	}
	return 'active';
};

const normalizeMembershipStatusFilter = (raw: string) => {
	const normalized = raw.trim().toLowerCase();
	if (MEMBERSHIP_STATUS_FILTERS.has(normalized)) {
		return normalized as 'active' | 'expired' | 'none' | 'all';
	}
	return 'active';
};

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		const user = await requirePermission(event, 'members.view');
		const branchId = requireBranch(event);

		const query = parseString(event.url.searchParams, 'q', {
			trim: true,
			required: false,
			max: 120,
			label: 'Search query'
		});
		const statusRaw = parseString(event.url.searchParams, 'status', {
			trim: true,
			required: false,
			max: 12,
			label: 'Status'
		});
		const membershipStatusRaw = parseString(event.url.searchParams, 'membershipStatus', {
			trim: true,
			required: false,
			max: 12,
			label: 'Membership status'
		});
		const statusFilter = normalizeStatusFilter(statusRaw);
		const membershipStatusFilter = normalizeMembershipStatusFilter(membershipStatusRaw);
		const statusValue =
			statusFilter === 'all' ? null : statusFilter === 'inactive' ? 'INACTIVE' : 'ACTIVE';
		const { page, pageSize } = parsePageParams(event.url, {
			pageDefault: 1,
			pageSizeDefault: DEFAULT_PAGE_SIZE,
			maxPageSize: MAX_PAGE_SIZE
		});

		const list = await getMemberList({
			branchId,
			query,
			page,
			pageSize,
			status: statusValue,
			membershipStatus: membershipStatusFilter
		});

		return {
			...list,
			statusFilter,
			membershipStatusFilter,
			canCreate: can(user.permissions, 'members.create'),
			canRenewMembership: can(user.permissions, 'members.edit')
		};
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Members list validation failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Members list load failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};
