import type { Actions, PageServerLoad } from './$types';
import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { can, requireActiveUser } from '$lib/server/authz';
import { badRequest, forbidden, isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { serverPrisma } from '$lib/server/db/server';
import type { Prisma } from '$lib/server/db/prisma-server';
import { parsePageParams, parseString } from '$lib/server/validation';
import { requireBranch } from '$lib/server/branchContext';
import { getBranchById } from '$lib/server/services/branchService';

const DAYS_ALLOWED = new Set([7, 14, 30, 60]);
const MEMBERSHIP_FILTERS = new Set(['active', 'all']);
const DEFAULT_DAYS = 14;
const DEFAULT_MEMBERSHIP_FILTER = 'active';
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_EXPORT_ROWS = 5000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type MembershipFilter = 'active' | 'all';

type InactiveMemberRow = {
	memberId: string;
	memberName: string;
	memberCode: string;
	currentPlanName: string | null;
	lastAttendanceAt: string | null;
	daysSinceLastAttendance: number | null;
};

type InactiveMemberRecord = {
	id: string;
	firstName: string;
	lastName: string;
	memberCode: string;
	attendance: Array<{ checkInAt: Date }>;
	memberships: Array<{ plan: { name: string } }>;
};

const addDays = (value: Date, days: number) => {
	const next = new Date(value.getTime());
	next.setDate(next.getDate() + days);
	return next;
};

const normalizeDays = (raw: string) => {
	const value = Number.parseInt(raw, 10);
	if (!Number.isFinite(value) || !DAYS_ALLOWED.has(value)) {
		return DEFAULT_DAYS;
	}
	return value;
};

const normalizeMembershipFilter = (raw: string): MembershipFilter => {
	const normalized = raw.trim().toLowerCase();
	if (MEMBERSHIP_FILTERS.has(normalized)) {
		return normalized as MembershipFilter;
	}
	return DEFAULT_MEMBERSHIP_FILTER;
};

const formatDateInput = (value: Date | string | null | undefined) => {
	if (!value) return '';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const escapeCsvValue = (value: unknown): string => {
	if (value === null || value === undefined) return '';
	const stringValue = String(value);
	if (/[",\n\r]/.test(stringValue)) {
		return `"${stringValue.replace(/"/g, '""')}"`;
	}
	return stringValue;
};

const buildCsv = (headers: string[], rows: Array<Array<string | number | null | undefined>>) => {
	const lines = [headers.map(escapeCsvValue).join(',')];
	for (const row of rows) {
		lines.push(row.map(escapeCsvValue).join(','));
	}
	return lines.join('\r\n');
};

const buildInactiveMembersCsv = (rows: InactiveMemberRow[]) =>
	buildCsv(
		['Member Name', 'Member Code', 'Plan', 'Last Attendance', 'Days Since Last Visit'],
		rows.map((row) => [
			row.memberName,
			row.memberCode,
			row.currentPlanName ?? '',
			formatDateInput(row.lastAttendanceAt),
			row.daysSinceLastAttendance ?? ''
		])
	);

const slugify = (value: string) => {
	const trimmed = value.trim().toLowerCase();
	const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
	return slug || 'branch';
};

const requireReportAccess = async (event: RequestEvent) => {
	const user = await requireActiveUser(event);
	if (!can(user.permissions, 'members.view') && !can(user.permissions, 'reports.view')) {
		throw forbidden('Forbidden.', 'FORBIDDEN');
	}
	return user;
};

const calculateDaysSince = (lastAttendanceAt: Date | null, now: Date) => {
	if (!lastAttendanceAt) return null;
	const diff = now.getTime() - lastAttendanceAt.getTime();
	if (diff <= 0) return 0;
	return Math.floor(diff / MS_PER_DAY);
};

const mapInactiveMemberRows = (records: InactiveMemberRecord[], now: Date): InactiveMemberRow[] =>
	records.map((record) => {
		const lastAttendance = record.attendance[0]?.checkInAt ?? null;
		const daysSinceLastAttendance = calculateDaysSince(lastAttendance, now);
		const currentPlanName = record.memberships[0]?.plan?.name ?? null;

		return {
			memberId: record.id,
			memberName: `${record.firstName} ${record.lastName}`.trim(),
			memberCode: record.memberCode,
			currentPlanName,
			lastAttendanceAt: lastAttendance ? lastAttendance.toISOString() : null,
			daysSinceLastAttendance
		};
	});

const sortInactiveMemberRows = (rows: InactiveMemberRow[]) =>
	rows.sort((a, b) => {
		const aDays = a.daysSinceLastAttendance ?? Number.POSITIVE_INFINITY;
		const bDays = b.daysSinceLastAttendance ?? Number.POSITIVE_INFINITY;
		if (aDays !== bDays) {
			return bDays - aDays;
		}
		const nameCompare = a.memberName.localeCompare(b.memberName);
		if (nameCompare !== 0) return nameCompare;
		return a.memberCode.localeCompare(b.memberCode);
	});

const fetchInactiveMemberRows = async (params: {
	branchId: string;
	days: number;
	membershipFilter: MembershipFilter;
	now: Date;
}) => {
	const thresholdDate = addDays(params.now, -params.days);
	const activeMembershipWhere: Prisma.MemberMembershipWhereInput = {
		branchId: params.branchId,
		startAt: { lte: params.now },
		endAt: { gte: params.now },
		cancelledAt: null,
		plan: { branchId: params.branchId }
	};

	const memberWhere: Prisma.MemberWhereInput = {
		branchId: params.branchId,
		attendance: {
			none: {
				branchId: params.branchId,
				checkInAt: { gte: thresholdDate }
			}
		}
	};

	if (params.membershipFilter === 'active') {
		memberWhere.memberships = { some: activeMembershipWhere };
	}

	const records = await serverPrisma.member.findMany({
		where: memberWhere,
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
		select: {
			id: true,
			firstName: true,
			lastName: true,
			memberCode: true,
			attendance: {
				where: { branchId: params.branchId },
				orderBy: { checkInAt: 'desc' },
				take: 1,
				select: { checkInAt: true }
			},
			memberships: {
				where: activeMembershipWhere,
				orderBy: { endAt: 'desc' },
				take: 1,
				select: {
					plan: { select: { name: true } }
				}
			}
		}
	});

	return mapInactiveMemberRows(records, params.now);
};

const listInactiveMembers = async (params: {
	branchId: string;
	days: number;
	membershipFilter: MembershipFilter;
	page: number;
	pageSize: number;
}) => {
	const now = new Date();
	const rows = await fetchInactiveMemberRows({
		branchId: params.branchId,
		days: params.days,
		membershipFilter: params.membershipFilter,
		now
	});

	const sortedRows = sortInactiveMemberRows(rows);
	const total = sortedRows.length;
	const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
	const safePage = total === 0 ? 1 : Math.min(Math.max(params.page, 1), totalPages);
	const startIndex = (safePage - 1) * params.pageSize;
	const pageRows = sortedRows.slice(startIndex, startIndex + params.pageSize);

	return {
		rows: pageRows,
		pagination: {
			total,
			page: safePage,
			pageSize: params.pageSize,
			totalPages
		},
		filter: {
			days: params.days,
			membershipFilter: params.membershipFilter
		}
	};
};

const listInactiveMembersExport = async (params: {
	branchId: string;
	days: number;
	membershipFilter: MembershipFilter;
}) => {
	const now = new Date();
	const rows = await fetchInactiveMemberRows({
		branchId: params.branchId,
		days: params.days,
		membershipFilter: params.membershipFilter,
		now
	});

	if (rows.length > MAX_EXPORT_ROWS) {
		throw badRequest(
			`Export is limited to ${MAX_EXPORT_ROWS} rows. Narrow the date window and try again.`,
			'INVALID_INPUT'
		);
	}

	return sortInactiveMemberRows(rows);
};

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		await requireReportAccess(event);
		const branchId = requireBranch(event);

		const daysRaw = parseString(event.url.searchParams, 'days', {
			trim: true,
			required: false,
			max: 3,
			label: 'Days'
		});
		const membershipRaw = parseString(event.url.searchParams, 'membershipFilter', {
			trim: true,
			required: false,
			max: 20,
			label: 'Membership filter'
		});

		const days = normalizeDays(daysRaw);
		const membershipFilter = normalizeMembershipFilter(membershipRaw);
		const { page, pageSize } = parsePageParams(event.url, {
			pageDefault: 1,
			pageSizeDefault: DEFAULT_PAGE_SIZE,
			maxPageSize: MAX_PAGE_SIZE
		});

		return await listInactiveMembers({
			branchId,
			days,
			membershipFilter,
			page,
			pageSize
		});
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Inactive members report validation failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Inactive members report load failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};

export const actions: Actions = {
	exportCsv: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			await requireReportAccess(event);
			const branchId = requireBranch(event);
			const formData = await event.request.formData();
			const daysRaw = parseString(formData, 'days', {
				trim: true,
				required: false,
				max: 3,
				label: 'Days'
			});
			const membershipRaw = parseString(formData, 'membershipFilter', {
				trim: true,
				required: false,
				max: 20,
				label: 'Membership filter'
			});

			const days = normalizeDays(daysRaw);
			const membershipFilter = normalizeMembershipFilter(membershipRaw);

			const rows = await listInactiveMembersExport({
				branchId,
				days,
				membershipFilter
			});

			const branch = await getBranchById(branchId);
			const branchLabel = branch?.code ?? branch?.name ?? branchId;
			const filename = `inactive-members-${slugify(branchLabel)}-${formatDateInput(new Date()).replace(/-/g, '')}.csv`;
			const csv = buildInactiveMembersCsv(rows);

			return new Response(csv, {
				headers: {
					'Content-Type': 'text/csv; charset=utf-8',
					'Content-Disposition': `attachment; filename="${filename}"`
				}
			});
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Inactive members export failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				throw error(err.status, err.publicMessage);
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Inactive members export failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			throw error(500, 'Something went wrong.');
		}
	}
};
