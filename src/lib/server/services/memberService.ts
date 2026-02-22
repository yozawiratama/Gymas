import type { Prisma } from '$lib/server/db/prisma-server';
import { badRequest, conflict, notFound } from '$lib/server/httpErrors';
import {
	countMembers,
	createMember as createMemberRecord,
	getAttendanceSummary,
	getMemberEditProfile as getMemberEditProfileRecord,
	getMemberProfileBase,
	listMemberFlags,
	listMemberNotes,
	listMemberTags,
	listMembers,
	listMembersForQuery,
	listMembersForPage,
	listRecentAttendance,
	searchMembersByCode,
	searchMembersByName,
	setMemberStatus as setMemberStatusRecord,
	updateMember as updateMemberRecord,
	type AttendanceRecentItem,
	type AttendanceSummary,
	type MemberFlagItem,
	type MemberListItem,
	type MemberNoteItem,
	type MemberSearchResult
} from '$lib/server/repositories/memberRepository';
import {
	listMembershipsForMembers,
	type MemberMembershipListRecord
} from '$lib/server/repositories/membershipRepository';
import {
	canViewMemberNotes,
	canViewPaymentDetails,
	require as requirePermission,
	type PermissionSubject
} from '$lib/server/authz';
import {
	getMemberPaymentSummary,
	type MemberPaymentSection
} from '$lib/server/services/paymentService';
import { getMemberMembershipOverview } from '$lib/server/services/membershipService';
import {
	getCurrentMembership as selectCurrentMembership,
	getMembershipStatusLabel
} from '$lib/server/memberships/currentMembership';

const RECENT_ATTENDANCE_LIMIT = 12;
const RECENT_PAYMENT_LIMIT = 10;
const RECENT_NOTE_LIMIT = 10;
const RECENT_FLAG_LIMIT = 10;
const MAX_MEMBER_PAGE_SIZE = 50;
const MEMBER_NAME_MAX = 120;
const MEMBER_CODE_MAX = 64;
const PHONE_MAX = 40;
const EMAIL_MAX = 254;
const MEMBER_STATUS_VALUES = ['ACTIVE', 'INACTIVE'] as const;

type MemberStatusValue = (typeof MEMBER_STATUS_VALUES)[number];

export async function getMemberOptions(branchId: string) {
	return listMembers(branchId);
}

export type MemberSearchItem = {
	id: string;
	displayName: string;
	memberCode: string;
	status: string;
};

type MemberSearchInput = {
	query: string;
	limit?: number;
	requireMemberCode?: boolean;
};

export type MemberListRow = {
	id: string;
	name: string;
	memberCode: string;
	status: string;
	currentPlanName: string | null;
	currentMembershipEndAt: string | null;
	currentMembershipStatus: MemberMembershipStatus;
	currentMembershipStatusLabel: string;
};

export type MemberMembershipStatus = 'ACTIVE' | 'EXPIRED' | 'NONE' | 'CANCELLED';

export type MembershipStatusFilter = 'active' | 'expired' | 'none' | 'all';

export type MemberListPage = {
	query: string;
	rows: MemberListRow[];
	pagination: {
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	};
};

export type MemberCreateData = {
	fullName: string;
	memberCode: string;
	phone?: string | null;
	email?: string | null;
};

export type MemberEditProfile = {
	id: string;
	name: string;
	memberCode: string;
	phone: string | null;
};

export type MemberUpdateData = {
	fullName: string;
	memberCode: string;
	phone?: string | null;
};

export type MemberProfile360 = {
	member: {
		id: string;
		name: string;
		memberCode: string;
		status: string;
		joinedAt: string | null;
		avatarMediaId: string | null;
	};
	membership: {
		status: string;
		isFrozen: boolean;
		currentMembership: {
			id: string;
			planId: string;
			planName: string;
			startAt: string | null;
			endAt: string | null;
			cancelledAt: string | null;
			cancelReason: string | null;
		} | null;
		lastMembership: {
			id: string;
			planId: string;
			planName: string;
			startAt: string | null;
			endAt: string | null;
			cancelledAt: string | null;
			cancelReason: string | null;
		} | null;
		membershipHistory: {
			id: string;
			planName: string;
			startAt: string | null;
			endAt: string | null;
			status: string;
			cancelledAt: string | null;
			cancelReason: string | null;
		}[];
		// Backward compatibility for existing UI.
		current?: {
			id: string;
			planId: string;
			planName: string;
			startAt: string | null;
			endAt: string | null;
			cancelledAt: string | null;
			cancelReason: string | null;
		} | null;
		history?: {
			id: string;
			planName: string;
			startAt: string | null;
			endAt: string | null;
			status: string;
			cancelledAt: string | null;
			cancelReason: string | null;
		}[];
	};
	tags: { id: string; name: string }[];
	flags: { id: string; type: string; createdAt: string }[];
	notes: { id: string; text: string; createdAt: string; author: string }[];
	attendance: {
		totalCount: number;
		lastCheckInAt: string | null;
		recent: { id: string; checkedInAt: string }[];
	};
	payments: MemberPaymentSection;
};

function formatDisplayName(member: { firstName: string; lastName: string }): string {
	return `${member.firstName} ${member.lastName}`.trim();
}

function toIso(value: Date | null | undefined): string | null {
	return value ? value.toISOString() : null;
}

function isCodeQuery(query: string): boolean {
	return /^[0-9]+$/.test(query) || (/^[A-Za-z0-9-]+$/.test(query) && /\d/.test(query));
}

function allowPhoneSearch(query: string): boolean {
	return /^[0-9]+$/.test(query) && query.length >= 4;
}

function buildMemberSearchWhere(query: string, codeQuery: boolean): Prisma.MemberWhereInput {
	if (!query) {
		return {};
	}

	if (codeQuery) {
		return {
			memberCode: {
				startsWith: query
			}
		};
	}

	return {
		OR: [
			{ firstName: { contains: query } },
			{ lastName: { contains: query } }
		]
	};
}

function buildMemberListWhere(params: {
	query: string;
	codeQuery: boolean;
	status?: MemberStatusValue | null;
}): Prisma.MemberWhereInput {
	const filters: Prisma.MemberWhereInput[] = [];
	const searchWhere = buildMemberSearchWhere(params.query, params.codeQuery);
	if (Object.keys(searchWhere).length > 0) {
		filters.push(searchWhere);
	}
	if (params.status) {
		filters.push({ status: params.status });
	}

	if (filters.length === 0) {
		return {};
	}
	if (filters.length === 1) {
		return filters[0];
	}
	return { AND: filters };
}

function buildMemberOrderBy(codeQuery: boolean): Prisma.MemberOrderByWithRelationInput[] {
	return codeQuery
		? [{ memberCode: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }]
		: [{ lastName: 'asc' }, { firstName: 'asc' }];
}

function ensurePositiveInt(value: number, fallback: number): number {
	if (!Number.isFinite(value) || value <= 0) {
		return fallback;
	}
	return Math.floor(value);
}

function normalizeRequiredText(raw: string, label: string, max: number): string {
	if (typeof raw !== 'string') {
		throw badRequest(`${label} is required.`, 'INVALID_INPUT');
	}
	const value = raw.trim();
	if (!value) {
		throw badRequest(`${label} is required.`, 'INVALID_INPUT');
	}
	if (value.length > max) {
		throw badRequest(`${label} must be ${max} characters or less.`, 'INVALID_INPUT');
	}
	return value;
}

function normalizeOptionalText(
	raw: string | null | undefined,
	label: string,
	max: number
): string | null {
	if (raw === undefined || raw === null) {
		return null;
	}
	if (typeof raw !== 'string') {
		throw badRequest(`${label} must be a string.`, 'INVALID_INPUT');
	}
	const value = raw.trim();
	if (!value) {
		return null;
	}
	if (value.length > max) {
		throw badRequest(`${label} must be ${max} characters or less.`, 'INVALID_INPUT');
	}
	return value;
}

function normalizeId(raw: string, label: string): string {
	if (typeof raw !== 'string') {
		throw badRequest(`${label} is required.`, 'INVALID_INPUT');
	}
	const value = raw.trim();
	if (!value) {
		throw badRequest(`${label} is required.`, 'INVALID_INPUT');
	}
	return value;
}

function normalizeMemberStatus(raw: string, label = 'Status'): MemberStatusValue {
	if (typeof raw !== 'string') {
		throw badRequest(`${label} is required.`, 'INVALID_INPUT');
	}
	const value = raw.trim().toUpperCase();
	if (!MEMBER_STATUS_VALUES.includes(value as MemberStatusValue)) {
		throw badRequest(`${label} is invalid.`, 'INVALID_INPUT');
	}
	return value as MemberStatusValue;
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
	const trimmed = fullName.trim();
	const parts = trimmed.split(/\s+/);
	const firstName = parts.shift() ?? '';
	const lastName = parts.join(' ');
	return { firstName, lastName };
}

function isUniqueConstraintError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code?: string }).code === 'P2002'
	);
}

function normalizeNotes(
	notes: MemberNoteItem[]
): { id: string; text: string; createdAt: string; author: string }[] {
	return notes.map((note) => ({
		id: note.id,
		text: note.text,
		createdAt: note.createdAt.toISOString(),
		author: note.author ?? 'System'
	}));
}

function normalizeFlags(
	flags: MemberFlagItem[]
): { id: string; type: string; createdAt: string }[] {
	return flags.map((flag) => ({
		id: flag.id,
		type: flag.type,
		createdAt: flag.createdAt.toISOString()
	}));
}

function normalizeAttendance(
	summary: AttendanceSummary,
	recent: AttendanceRecentItem[]
): { totalCount: number; lastCheckInAt: string | null; recent: { id: string; checkedInAt: string }[] } {
	return {
		totalCount: summary.totalCount,
		lastCheckInAt: toIso(summary.lastCheckInAt),
		recent: recent.map((record) => ({
			id: record.id,
			checkedInAt: record.checkedInAt.toISOString()
		}))
	};
}

const MEMBERSHIP_STATUS_LABELS: Record<MemberMembershipStatus, string> = {
	ACTIVE: 'Active',
	EXPIRED: 'Expired',
	CANCELLED: 'Cancelled',
	NONE: 'None'
};

type MembershipSummary = {
	current: MemberMembershipListRecord | null;
	last: MemberMembershipListRecord | null;
	status: MemberMembershipStatus;
	label: string;
};

function summarizeMembership(
	records: MemberMembershipListRecord[],
	atDate: Date
): MembershipSummary {
	const selection = selectCurrentMembership(records, atDate);

	if (selection.current) {
		return {
			current: selection.current,
			last: selection.last,
			status: 'ACTIVE',
			label: MEMBERSHIP_STATUS_LABELS.ACTIVE
		};
	}

	if (selection.last) {
		const lastStatus = getMembershipStatusLabel(selection.last, atDate);
		if (lastStatus === 'CANCELLED') {
			return {
				current: null,
				last: selection.last,
				status: 'CANCELLED',
				label: MEMBERSHIP_STATUS_LABELS.CANCELLED
			};
		}
		return {
			current: null,
			last: selection.last,
			status: 'EXPIRED',
			label: MEMBERSHIP_STATUS_LABELS.EXPIRED
		};
	}

	return {
		current: null,
		last: null,
		status: 'NONE',
		label: MEMBERSHIP_STATUS_LABELS.NONE
	};
}

function groupMembershipsByMemberId(
	records: MemberMembershipListRecord[]
): Map<string, MemberMembershipListRecord[]> {
	const grouped = new Map<string, MemberMembershipListRecord[]>();
	for (const record of records) {
		const bucket = grouped.get(record.memberId);
		if (bucket) {
			bucket.push(record);
		} else {
			grouped.set(record.memberId, [record]);
		}
	}
	return grouped;
}

async function buildMemberRows(
	branchId: string,
	members: MemberListItem[],
	atDate: Date
): Promise<MemberListRow[]> {
	if (!members.length) {
		return [];
	}

	const membershipRecords = await listMembershipsForMembers({
		branchId,
		memberIds: members.map((member) => member.id)
	});
	const membershipByMemberId = groupMembershipsByMemberId(membershipRecords);

	return members.map((member) => {
		const memberships = membershipByMemberId.get(member.id) ?? [];
		const summary = summarizeMembership(memberships, atDate);
		const currentPlanName = summary.current?.plan?.name ?? null;
		const currentMembershipEndAt = summary.current?.endAt ?? null;

		return {
			id: member.id,
			name: formatDisplayName(member),
			memberCode: member.memberCode,
			status: member.status,
			currentPlanName,
			currentMembershipEndAt: toIso(currentMembershipEndAt),
			currentMembershipStatus: summary.status,
			currentMembershipStatusLabel: summary.label
		};
	});
}

function matchesMembershipFilter(
	status: MemberMembershipStatus,
	filter: MembershipStatusFilter
): boolean {
	if (filter === 'all') return true;
	if (filter === 'active') return status === 'ACTIVE';
	if (filter === 'expired') return status === 'EXPIRED';
	if (filter === 'none') return status === 'NONE';
	return true;
}

export async function searchMembersForCheckIn(
	branchId: string,
	input: MemberSearchInput
): Promise<MemberSearchItem[]> {
	const query = input.query.trim();
	const limit = input.limit ?? 15;
	const requireMemberCode = input.requireMemberCode ?? false;
	const codeQuery = isCodeQuery(query);

	let members: MemberSearchResult[] = [];

	if (requireMemberCode || codeQuery) {
		members = await searchMembersByCode(branchId, query, limit);
		const exactIndex = members.findIndex((member) => member.memberCode === query);
		if (exactIndex > 0) {
			const [exact] = members.splice(exactIndex, 1);
			members.unshift(exact);
		}
	} else {
		members = await searchMembersByName(branchId, query, limit, allowPhoneSearch(query));
	}

	return members.map((member) => ({
		id: member.id,
		displayName: formatDisplayName(member),
		memberCode: member.memberCode,
		status: member.status
	}));
}

export async function getMemberList(input: {
	branchId: string;
	query: string;
	page: number;
	pageSize: number;
	status?: MemberStatusValue | null;
	membershipStatus?: MembershipStatusFilter | null;
}): Promise<MemberListPage> {
	const query = input.query.trim();
	const codeQuery = query ? isCodeQuery(query) : false;
	const where = buildMemberListWhere({ query, codeQuery, status: input.status ?? null });
	const pageSize = Math.min(ensurePositiveInt(input.pageSize, 20), MAX_MEMBER_PAGE_SIZE);
	const orderBy = buildMemberOrderBy(codeQuery);
	const membershipStatus = input.membershipStatus ?? 'all';
	const now = new Date();

	if (membershipStatus === 'all') {
		const total = await countMembers(input.branchId, where);
		const totalPages = Math.max(1, Math.ceil(total / pageSize));
		const safePage =
			total === 0 ? 1 : Math.min(Math.max(ensurePositiveInt(input.page, 1), 1), totalPages);
		const skip = (safePage - 1) * pageSize;
		const members = await listMembersForPage({
			branchId: input.branchId,
			where,
			orderBy,
			skip,
			take: pageSize
		});
		const rows = await buildMemberRows(input.branchId, members, now);

		return {
			query,
			rows,
			pagination: {
				total,
				page: safePage,
				pageSize,
				totalPages
			}
		};
	}

	const members = await listMembersForQuery({
		branchId: input.branchId,
		where,
		orderBy
	});
	const rows = await buildMemberRows(input.branchId, members, now);
	const filtered = rows.filter((row) =>
		matchesMembershipFilter(row.currentMembershipStatus, membershipStatus)
	);
	const total = filtered.length;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const safePage =
		total === 0 ? 1 : Math.min(Math.max(ensurePositiveInt(input.page, 1), 1), totalPages);
	const skip = (safePage - 1) * pageSize;
	const pageRows = filtered.slice(skip, skip + pageSize);

	return {
		query,
		rows: pageRows,
		pagination: {
			total,
			page: safePage,
			pageSize,
			totalPages
		}
	};
}

export async function getMemberProfile360(
	branchId: string,
	memberId: string,
	viewerPermissions: PermissionSubject
): Promise<MemberProfile360 | null> {
	const member = await getMemberProfileBase(branchId, memberId);
	if (!member) {
		return null;
	}

	const allowNotes = canViewMemberNotes(viewerPermissions);
	const allowPayments = canViewPaymentDetails(viewerPermissions);
	const emptyPayments: MemberPaymentSection = { totalCount: 0, lastPaidAt: null, recent: [] };

	const [tags, flags, attendanceSummary, attendanceRecent, payments, notes, membership] =
		await Promise.all([
			listMemberTags(branchId, memberId),
			listMemberFlags(branchId, memberId, RECENT_FLAG_LIMIT),
			getAttendanceSummary(branchId, memberId),
			listRecentAttendance(branchId, memberId, RECENT_ATTENDANCE_LIMIT),
			allowPayments
				? getMemberPaymentSummary(branchId, memberId, RECENT_PAYMENT_LIMIT)
				: Promise.resolve(emptyPayments),
			allowNotes ? listMemberNotes(branchId, memberId, RECENT_NOTE_LIMIT) : Promise.resolve([]),
			getMemberMembershipOverview(branchId, memberId)
		]);

	const membershipHistory = membership.history.map((record) => ({
		id: record.id,
		planName: record.planName,
		startAt: toIso(record.startAt),
		endAt: toIso(record.endAt),
		status: record.status,
		cancelledAt: toIso(record.cancelledAt),
		cancelReason: record.cancelReason ?? null
	}));

	const currentMembership = membership.current
		? {
				id: membership.current.id,
				planId: membership.current.planId,
				planName: membership.current.planName,
				startAt: toIso(membership.current.startAt),
				endAt: toIso(membership.current.endAt),
				cancelledAt: toIso(membership.current.cancelledAt),
				cancelReason: membership.current.cancelReason ?? null
		  }
		: null;

	const lastMembership = membership.last
		? {
				id: membership.last.id,
				planId: membership.last.planId,
				planName: membership.last.planName,
				startAt: toIso(membership.last.startAt),
				endAt: toIso(membership.last.endAt),
				cancelledAt: toIso(membership.last.cancelledAt),
				cancelReason: membership.last.cancelReason ?? null
		  }
		: null;

	return {
		member: {
			id: member.id,
			name: formatDisplayName(member),
			memberCode: member.memberCode,
			status: member.status,
			joinedAt: toIso(member.joinedAt),
			avatarMediaId: null
		},
		membership: {
			status: membership.status,
			isFrozen: membership.isFrozen,
			currentMembership,
			lastMembership,
			membershipHistory,
			current: currentMembership,
			history: membershipHistory
		},
		tags: tags.map((tag) => ({ id: tag.id, name: tag.name })),
		flags: normalizeFlags(flags),
		notes: normalizeNotes(notes),
		attendance: normalizeAttendance(attendanceSummary, attendanceRecent),
		payments
	};
}

export async function getMemberEditProfile(
	branchId: string,
	memberId: string
): Promise<MemberEditProfile | null> {
	const member = await getMemberEditProfileRecord(branchId, memberId);
	if (!member) {
		return null;
	}

	return {
		id: member.id,
		name: formatDisplayName(member),
		memberCode: member.memberCode,
		phone: member.phone ?? null
	};
}

export async function createMember(input: {
	branchId: string;
	permissions: PermissionSubject;
	data: MemberCreateData;
}) {
	requirePermission(input.permissions, 'members.create');

	const branchId = normalizeId(input.branchId, 'Branch id');
	const fullName = normalizeRequiredText(input.data.fullName, 'Name', MEMBER_NAME_MAX);
	const memberCode = normalizeRequiredText(input.data.memberCode, 'Member code', MEMBER_CODE_MAX);
	const phone = normalizeOptionalText(input.data.phone, 'Phone', PHONE_MAX);
	const email = normalizeOptionalText(input.data.email, 'Email', EMAIL_MAX);
	const { firstName, lastName } = splitFullName(fullName);

	try {
		return await createMemberRecord({
			branchId,
			memberCode,
			firstName,
			lastName,
			phone,
			email
		});
	} catch (error) {
		if (isUniqueConstraintError(error)) {
			throw conflict('Member code already exists.', 'MEMBER_CODE_CONFLICT');
		}
		throw error;
	}
}

export async function setMemberStatus(input: {
	branchId: string;
	memberId: string;
	permissions: PermissionSubject;
	status: string;
}) {
	requirePermission(input.permissions, 'members.archive');

	const branchId = normalizeId(input.branchId, 'Branch id');
	const memberId = normalizeId(input.memberId, 'Member id');
	const status = normalizeMemberStatus(input.status);

	const updated = await setMemberStatusRecord(branchId, memberId, status);
	if (!updated) {
		throw notFound('Member not found.', 'MEMBER_NOT_FOUND');
	}

	return updated;
}

export async function updateMember(input: {
	branchId: string;
	memberId: string;
	permissions: PermissionSubject;
	data: MemberUpdateData;
}) {
	requirePermission(input.permissions, 'members.edit');

	const branchId = normalizeId(input.branchId, 'Branch id');
	const memberId = normalizeId(input.memberId, 'Member id');
	const fullName = normalizeRequiredText(input.data.fullName, 'Name', MEMBER_NAME_MAX);
	const memberCode = normalizeRequiredText(input.data.memberCode, 'Member code', MEMBER_CODE_MAX);
	const phone = normalizeOptionalText(input.data.phone, 'Phone', PHONE_MAX);
	const { firstName, lastName } = splitFullName(fullName);

	try {
		const updated = await updateMemberRecord(branchId, memberId, {
			memberCode,
			firstName,
			lastName,
			phone
		});

		if (!updated) {
			throw notFound('Member not found.', 'MEMBER_NOT_FOUND');
		}

		return updated;
	} catch (error) {
		if (isUniqueConstraintError(error)) {
			throw conflict('Member code already exists.', 'MEMBER_CODE_CONFLICT');
		}
		throw error;
	}
}
