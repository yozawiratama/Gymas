import { badRequest } from '$lib/server/httpErrors';
import {
	getAttendanceTotals,
	getMembershipStatusCounts,
	getRevenueTotals,
	listActiveMembershipsByPlan,
	listAttendanceDaily,
	listRevenueDaily,
	type AttendanceDailyRow,
	type MembershipPlanBreakdown,
	type RevenueDailyRow
} from '$lib/server/repositories/reportsRepository';

const DEFAULT_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 90;
const DEFAULT_PAGE_SIZE = 31;
const MAX_PAGE_SIZE = 90;
const MAX_EXPORT_ROWS = 1000;
const PLAN_BREAKDOWN_LIMIT = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type AttendanceReportRow = {
	date: string;
	checkInsCount: number;
	uniqueMembersCount: number;
};

export type AttendanceReport = {
	filter: {
		from: string;
		to: string;
	};
	rows: AttendanceReportRow[];
	totals: {
		totalCheckIns: number;
		totalUniqueMembers: number;
	};
	pagination: {
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	};
};

export type RevenueReportRow = {
	date: string;
	paymentsCount: number;
	revenueSum: string;
};

export type RevenueReport = {
	filter: {
		from: string;
		to: string;
	};
	rows: RevenueReportRow[];
	totals: {
		totalPayments: number;
		totalRevenue: string;
	};
	pagination: {
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	};
};

export type MembershipStatusReport = {
	filter: {
		asOf: string;
	};
	counts: {
		active: number;
		expired: number;
		frozen: number;
	};
	planBreakdown: MembershipPlanBreakdown[];
};

type DateRange = {
	from: Date;
	to: Date;
	fromInput: string;
	toInput: string;
};

type AsOfDate = {
	asOf: Date;
	asOfInput: string;
};

function ensurePositiveInt(value: number | null | undefined, fallback: number): number {
	if (!Number.isFinite(value) || !value || value <= 0) {
		return fallback;
	}
	return Math.floor(value);
}

function formatDateInput(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function parseDateOnly(raw: string, label: string): Date {
	const value = raw.trim();
	if (!value) {
		throw badRequest(`${label} is required.`, 'INVALID_INPUT');
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw badRequest(`${label} must be a valid date.`, 'INVALID_INPUT');
	}
	const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
	const date = new Date(year, month - 1, day);
	if (Number.isNaN(date.getTime())) {
		throw badRequest(`${label} must be a valid date.`, 'INVALID_INPUT');
	}
	return date;
}

function parseOptionalDate(raw: string | null | undefined, label: string): Date | null {
	if (!raw) return null;
	const value = raw.trim();
	if (!value) return null;
	return parseDateOnly(value, label);
}

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function defaultDateRange(): { from: Date; to: Date } {
	const today = startOfDay(new Date());
	const from = new Date(today.getTime());
	from.setDate(from.getDate() - (DEFAULT_RANGE_DAYS - 1));
	return { from, to: today };
}

function parseDateRange(rawFrom?: string | null, rawTo?: string | null): DateRange {
	const defaults = defaultDateRange();
	const fromDate = parseOptionalDate(rawFrom, 'From date') ?? defaults.from;
	const toDate = parseOptionalDate(rawTo, 'To date') ?? defaults.to;

	const fromStart = startOfDay(fromDate);
	const toStart = startOfDay(toDate);

	if (fromStart.getTime() > toStart.getTime()) {
		throw badRequest('From date must be on or before To date.', 'INVALID_INPUT');
	}

	const days = Math.floor((toStart.getTime() - fromStart.getTime()) / MS_PER_DAY) + 1;
	if (days > MAX_RANGE_DAYS) {
		throw badRequest(`Date range cannot exceed ${MAX_RANGE_DAYS} days.`, 'INVALID_INPUT');
	}

	return {
		from: fromStart,
		to: endOfDay(toDate),
		fromInput: formatDateInput(fromStart),
		toInput: formatDateInput(toStart)
	};
}

function parseAsOfDate(raw?: string | null): AsOfDate {
	const parsed = parseOptionalDate(raw, 'As of date') ?? startOfDay(new Date());
	return {
		asOf: endOfDay(parsed),
		asOfInput: formatDateInput(parsed)
	};
}

function toNumber(value: number | bigint | string | null | undefined): number {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : 0;
	}
	if (typeof value === 'bigint') {
		return Number(value);
	}
	if (typeof value === 'string') {
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

function toDecimalString(value: unknown): string {
	if (value === null || value === undefined) {
		return '0';
	}
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number') {
		return value.toFixed(2);
	}
	if (typeof value === 'bigint') {
		return value.toString();
	}
	if (typeof value === 'object' && value && 'toString' in value) {
		return (value as { toString: () => string }).toString();
	}
	return String(value);
}

function coerceReportDate(value: Date | string): string {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		return '';
	}
	return formatDateInput(date);
}

function buildDateSeries(from: Date, to: Date): string[] {
	const dates: string[] = [];
	const cursor = startOfDay(from);
	const end = startOfDay(to);

	while (cursor.getTime() <= end.getTime()) {
		dates.push(formatDateInput(cursor));
		cursor.setDate(cursor.getDate() + 1);
	}

	return dates;
}

function fillAttendanceSeries(
	rows: AttendanceReportRow[],
	from: Date,
	to: Date
): AttendanceReportRow[] {
	const byDate = new Map(rows.map((row) => [row.date, row]));
	return buildDateSeries(from, to).map(
		(date) =>
			byDate.get(date) ?? {
				date,
				checkInsCount: 0,
				uniqueMembersCount: 0
			}
	);
}

function fillRevenueSeries(rows: RevenueReportRow[], from: Date, to: Date): RevenueReportRow[] {
	const byDate = new Map(rows.map((row) => [row.date, row]));
	return buildDateSeries(from, to).map(
		(date) =>
			byDate.get(date) ?? {
				date,
				paymentsCount: 0,
				revenueSum: '0.00'
			}
	);
}

function normalizePagination(input?: {
	page?: number | null;
	pageSize?: number | null;
}): { page: number; pageSize: number } {
	const page = ensurePositiveInt(input?.page ?? 1, 1);
	const pageSize = Math.min(
		ensurePositiveInt(input?.pageSize ?? DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE),
		MAX_PAGE_SIZE
	);
	return { page, pageSize };
}

function paginateRows<T>(
	rows: T[],
	requestedPage: number,
	pageSize: number
): { rows: T[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } } {
	const total = rows.length;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const safePage = total === 0 ? 1 : Math.min(Math.max(requestedPage, 1), totalPages);
	const start = (safePage - 1) * pageSize;

	return {
		rows: rows.slice(start, start + pageSize),
		pagination: {
			total,
			page: safePage,
			pageSize,
			totalPages
		}
	};
}

function ensureExportLimit(rows: { length: number }, label: string) {
	if (rows.length > MAX_EXPORT_ROWS) {
		throw badRequest(
			`${label} export is limited to ${MAX_EXPORT_ROWS} rows. Narrow the date range and try again.`,
			'INVALID_INPUT'
		);
	}
}

function normalizeAttendanceRows(rows: AttendanceDailyRow[]): AttendanceReportRow[] {
	return rows.map((row) => ({
		date: coerceReportDate(row.reportDate),
		checkInsCount: toNumber(row.checkInsCount),
		uniqueMembersCount: toNumber(row.uniqueMembersCount)
	}));
}

function normalizeRevenueRows(rows: RevenueDailyRow[]): RevenueReportRow[] {
	return rows.map((row) => ({
		date: coerceReportDate(row.reportDate),
		paymentsCount: toNumber(row.paymentsCount),
		revenueSum: toDecimalString(row.revenueSum)
	}));
}

export async function getAttendanceReport(input: {
	branchId: string;
	from?: string | null;
	to?: string | null;
	page?: number | null;
	pageSize?: number | null;
}): Promise<AttendanceReport> {
	const range = parseDateRange(input.from, input.to);
	const pagination = normalizePagination({
		page: input.page ?? undefined,
		pageSize: input.pageSize ?? undefined
	});

	const [dailyRows, totals] = await Promise.all([
		listAttendanceDaily({ branchId: input.branchId, from: range.from, to: range.to }),
		getAttendanceTotals({ branchId: input.branchId, from: range.from, to: range.to })
	]);

	const normalized = fillAttendanceSeries(normalizeAttendanceRows(dailyRows), range.from, range.to);
	const pageResult = paginateRows(normalized, pagination.page, pagination.pageSize);

	return {
		filter: {
			from: range.fromInput,
			to: range.toInput
		},
		rows: pageResult.rows,
		totals: {
			totalCheckIns: totals.totalCheckIns,
			totalUniqueMembers: totals.totalUniqueMembers
		},
		pagination: pageResult.pagination
	};
}

export async function getAttendanceReportExport(input: {
	branchId: string;
	from?: string | null;
	to?: string | null;
}): Promise<Omit<AttendanceReport, 'pagination'>> {
	const range = parseDateRange(input.from, input.to);
	const [dailyRows, totals] = await Promise.all([
		listAttendanceDaily({ branchId: input.branchId, from: range.from, to: range.to }),
		getAttendanceTotals({ branchId: input.branchId, from: range.from, to: range.to })
	]);
	const normalized = fillAttendanceSeries(normalizeAttendanceRows(dailyRows), range.from, range.to);
	ensureExportLimit(normalized, 'Attendance');

	return {
		filter: {
			from: range.fromInput,
			to: range.toInput
		},
		rows: normalized,
		totals: {
			totalCheckIns: totals.totalCheckIns,
			totalUniqueMembers: totals.totalUniqueMembers
		}
	};
}

export async function getRevenueReport(input: {
	branchId: string;
	from?: string | null;
	to?: string | null;
	page?: number | null;
	pageSize?: number | null;
}): Promise<RevenueReport> {
	const range = parseDateRange(input.from, input.to);
	const pagination = normalizePagination({
		page: input.page ?? undefined,
		pageSize: input.pageSize ?? undefined
	});

	const [dailyRows, totals] = await Promise.all([
		listRevenueDaily({ branchId: input.branchId, from: range.from, to: range.to }),
		getRevenueTotals({ branchId: input.branchId, from: range.from, to: range.to })
	]);

	const normalized = fillRevenueSeries(normalizeRevenueRows(dailyRows), range.from, range.to);
	const pageResult = paginateRows(normalized, pagination.page, pagination.pageSize);

	return {
		filter: {
			from: range.fromInput,
			to: range.toInput
		},
		rows: pageResult.rows,
		totals: {
			totalPayments: totals.totalPayments,
			totalRevenue: toDecimalString(totals.totalRevenue)
		},
		pagination: pageResult.pagination
	};
}

export async function getRevenueReportExport(input: {
	branchId: string;
	from?: string | null;
	to?: string | null;
}): Promise<Omit<RevenueReport, 'pagination'>> {
	const range = parseDateRange(input.from, input.to);
	const [dailyRows, totals] = await Promise.all([
		listRevenueDaily({ branchId: input.branchId, from: range.from, to: range.to }),
		getRevenueTotals({ branchId: input.branchId, from: range.from, to: range.to })
	]);
	const normalized = fillRevenueSeries(normalizeRevenueRows(dailyRows), range.from, range.to);
	ensureExportLimit(normalized, 'Revenue');

	return {
		filter: {
			from: range.fromInput,
			to: range.toInput
		},
		rows: normalized,
		totals: {
			totalPayments: totals.totalPayments,
			totalRevenue: toDecimalString(totals.totalRevenue)
		}
	};
}

export async function getMembershipStatusReport(input: {
	branchId: string;
	asOf?: string | null;
}): Promise<MembershipStatusReport> {
	const asOf = parseAsOfDate(input.asOf);

	const [counts, planBreakdown] = await Promise.all([
		getMembershipStatusCounts(input.branchId, asOf.asOf),
		listActiveMembershipsByPlan({
			branchId: input.branchId,
			asOf: asOf.asOf,
			limit: PLAN_BREAKDOWN_LIMIT
		})
	]);

	return {
		filter: {
			asOf: asOf.asOfInput
		},
		counts,
		planBreakdown
	};
}

function escapeCsvValue(value: unknown): string {
	if (value === null || value === undefined) return '';
	const stringValue = String(value);
	if (/[",\n\r]/.test(stringValue)) {
		return `"${stringValue.replace(/"/g, '""')}"`;
	}
	return stringValue;
}

function buildCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
	const lines = [headers.map(escapeCsvValue).join(',')];
	for (const row of rows) {
		lines.push(row.map(escapeCsvValue).join(','));
	}
	return lines.join('\r\n');
}

export function buildAttendanceCsv(report: Omit<AttendanceReport, 'pagination'>): string {
	return buildCsv(
		['Date', 'Check-ins', 'Unique members'],
		report.rows.map((row) => [row.date, row.checkInsCount, row.uniqueMembersCount])
	);
}

export function buildRevenueCsv(report: Omit<RevenueReport, 'pagination'>): string {
	return buildCsv(
		['Date', 'Payments', 'Revenue'],
		report.rows.map((row) => [row.date, row.paymentsCount, row.revenueSum])
	);
}

export function buildMembershipStatusCsv(report: MembershipStatusReport): string {
	const rows: Array<Array<string | number>> = [
		['status', 'active', report.counts.active],
		['status', 'expired', report.counts.expired],
		['status', 'frozen', report.counts.frozen]
	];

	for (const plan of report.planBreakdown) {
		rows.push(['plan', plan.planName, plan.activeCount]);
	}

	return buildCsv(['type', 'label', 'count'], rows);
}
