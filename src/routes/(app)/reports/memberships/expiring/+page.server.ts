import type { Actions, PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { badRequest, isAppError } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { serverPrisma } from '$lib/server/db/server';
import { parsePageParams, parseString } from '$lib/server/validation';
import { requireBranch } from '$lib/server/branchContext';
import { getBranchById } from '$lib/server/services/branchService';

const DAYS_ALLOWED = new Set([7, 14, 30, 60]);
const DEFAULT_DAYS = 7;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_EXPORT_ROWS = 5000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type ExpiringMembershipRow = {
	memberId: string;
	memberName: string;
	memberCode: string;
	planName: string;
	startAt: string;
	endAt: string;
	daysLeft: number;
};

type ExpiringMembershipFilters = {
	branchId: string;
	query: string;
	days: number;
	now: Date;
	endWindow: Date;
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

const formatDateInput = (value: Date | string) => {
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

const buildExpiringMembershipCsv = (rows: ExpiringMembershipRow[]) =>
	buildCsv(
		['Member Name', 'Member Code', 'Plan', 'Start Date', 'End Date', 'Days Left'],
		rows.map((row) => [
			row.memberName,
			row.memberCode,
			row.planName,
			formatDateInput(row.startAt),
			formatDateInput(row.endAt),
			row.daysLeft
		])
	);

const slugify = (value: string) => {
	const trimmed = value.trim().toLowerCase();
	const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
	return slug || 'branch';
};

const calculateDaysLeft = (endAt: Date, now: Date) =>
	Math.max(0, Math.ceil((endAt.getTime() - now.getTime()) / MS_PER_DAY));

const buildMembershipWhere = ({ branchId, query, now, endWindow }: ExpiringMembershipFilters) => {
	const memberFilter = query
		? {
				branchId,
				OR: [
					{ firstName: { contains: query } },
					{ lastName: { contains: query } },
					{ memberCode: { contains: query } }
				]
			}
		: { branchId };

	return {
		branchId,
		startAt: { lte: now },
		endAt: { gte: now, lte: endWindow },
		cancelledAt: null,
		member: memberFilter,
		plan: { branchId }
	};
};

const mapMembershipRows = (
	records: Array<{
		startAt: Date;
		endAt: Date;
		member: { id: string; firstName: string; lastName: string; memberCode: string };
		plan: { name: string };
	}>,
	now: Date
): ExpiringMembershipRow[] =>
	records.map((record) => ({
		memberId: record.member.id,
		memberName: `${record.member.firstName} ${record.member.lastName}`.trim(),
		memberCode: record.member.memberCode,
		planName: record.plan.name,
		startAt: record.startAt.toISOString(),
		endAt: record.endAt.toISOString(),
		daysLeft: calculateDaysLeft(record.endAt, now)
	}));

const listExpiringMemberships = async (params: {
	branchId: string;
	query: string;
	days: number;
	page: number;
	pageSize: number;
}) => {
	const now = new Date();
	const endWindow = addDays(now, params.days);
	const where = buildMembershipWhere({
		branchId: params.branchId,
		query: params.query,
		days: params.days,
		now,
		endWindow
	});

	const total = await serverPrisma.memberMembership.count({ where });
	const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
	const safePage = total === 0 ? 1 : Math.min(Math.max(params.page, 1), totalPages);
	const skip = (safePage - 1) * params.pageSize;

	const records = await serverPrisma.memberMembership.findMany({
		where,
		orderBy: [
			{ endAt: 'asc' },
			{ member: { lastName: 'asc' } },
			{ member: { firstName: 'asc' } }
		],
		skip,
		take: params.pageSize,
		select: {
			startAt: true,
			endAt: true,
			member: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					memberCode: true
				}
			},
			plan: {
				select: {
					name: true
				}
			}
		}
	});

	return {
		rows: mapMembershipRows(records, now),
		pagination: {
			total,
			page: safePage,
			pageSize: params.pageSize,
			totalPages
		},
		filter: {
			days: params.days,
			q: params.query
		}
	};
};

const listExpiringMembershipsExport = async (params: {
	branchId: string;
	query: string;
	days: number;
}) => {
	const now = new Date();
	const endWindow = addDays(now, params.days);
	const where = buildMembershipWhere({
		branchId: params.branchId,
		query: params.query,
		days: params.days,
		now,
		endWindow
	});

	const records = await serverPrisma.memberMembership.findMany({
		where,
		orderBy: [
			{ endAt: 'asc' },
			{ member: { lastName: 'asc' } },
			{ member: { firstName: 'asc' } }
		],
		take: MAX_EXPORT_ROWS + 1,
		select: {
			startAt: true,
			endAt: true,
			member: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					memberCode: true
				}
			},
			plan: {
				select: {
					name: true
				}
			}
		}
	});

	if (records.length > MAX_EXPORT_ROWS) {
		throw badRequest(
			`Export is limited to ${MAX_EXPORT_ROWS} rows. Narrow the date window and try again.`,
			'INVALID_INPUT'
		);
	}

	return mapMembershipRows(records, now);
};

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		await requirePermission(event, 'reports.view');
		const branchId = requireBranch(event);

		const query = parseString(event.url.searchParams, 'q', {
			trim: true,
			required: false,
			max: 120,
			label: 'Search query'
		});
		const daysRaw = parseString(event.url.searchParams, 'days', {
			trim: true,
			required: false,
			max: 3,
			label: 'Days'
		});
		const days = normalizeDays(daysRaw);
		const { page, pageSize } = parsePageParams(event.url, {
			pageDefault: 1,
			pageSizeDefault: DEFAULT_PAGE_SIZE,
			maxPageSize: MAX_PAGE_SIZE
		});

		return await listExpiringMemberships({
			branchId,
			query,
			days,
			page,
			pageSize
		});
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Expiring memberships report validation failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Expiring memberships report load failed', {
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
			await requirePermission(event, 'reports.view');
			const branchId = requireBranch(event);
			const formData = await event.request.formData();
			const query = parseString(formData, 'q', {
				trim: true,
				required: false,
				max: 120,
				label: 'Search query'
			});
			const daysRaw = parseString(formData, 'days', {
				trim: true,
				required: false,
				max: 3,
				label: 'Days'
			});
			const days = normalizeDays(daysRaw);

			const rows = await listExpiringMembershipsExport({
				branchId,
				query,
				days
			});

			const branch = await getBranchById(branchId);
			const branchLabel = branch?.code ?? branch?.name ?? branchId;
			const filename = `expiring-memberships-${slugify(branchLabel)}-${formatDateInput(new Date()).replace(/-/g, '')}.csv`;
			const csv = buildExpiringMembershipCsv(rows);

			return new Response(csv, {
				headers: {
					'Content-Type': 'text/csv; charset=utf-8',
					'Content-Disposition': `attachment; filename="${filename}"`
				}
			});
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Expiring memberships export failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				throw error(err.status, err.publicMessage);
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Expiring memberships export failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			throw error(500, 'Something went wrong.');
		}
	}
};
