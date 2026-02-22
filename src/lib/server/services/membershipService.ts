import { badRequest, notFound } from '$lib/server/httpErrors';
import { getMemberFreezeStatus, getMemberProfileBase } from '$lib/server/repositories/memberRepository';
import {
	createMemberMembership as createMemberMembershipRecord,
	createPlan as createPlanRecord,
	cancelMemberMembership as cancelMemberMembershipRecord,
	getCurrentMemberMembership as getCurrentMemberMembershipRecord,
	getMemberMembershipById as getMemberMembershipByIdRecord,
	getPlanById,
	listAllMemberMemberships as listAllMemberMembershipsRecord,
	listMemberMemberships as listMemberMembershipsRecord,
	listPlans as listPlansRecord,
	updatePlan as updatePlanRecord,
	type MemberMembershipRecord,
	type MembershipPlanRecord
} from '$lib/server/repositories/membershipRepository';
import { record as recordAudit } from '$lib/server/services/auditService';
import {
	getCurrentMembership as selectCurrentMembership,
	getMembershipStatusLabel
} from '$lib/server/memberships/currentMembership';
import { getMembershipState, type MembershipState } from '$lib/server/membership';

const MAX_PLAN_NAME_LENGTH = 80;
const MIN_PLAN_NAME_LENGTH = 2;
const MAX_DESCRIPTION_LENGTH = 280;
const MIN_DURATION_DAYS = 1;
const MAX_DURATION_DAYS = 3650;
const MAX_PRICE_CENTS = 100_000_000;
const MEMBERSHIP_HISTORY_LIMIT = 10;

export type AuditContext = {
	actorUserId?: string | null;
	ip?: string | null;
	userAgent?: string | null;
};

export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'FROZEN';
export type MembershipRecordStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export type MembershipPlanSummary = {
	id: string;
	name: string;
	durationDays: number;
	priceCents: number | null;
	description: string | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type MemberMembershipSummary = {
	id: string;
	planId: string;
	planName: string;
	startAt: Date;
	endAt: Date;
	cancelledAt: Date | null;
	cancelReason: string | null;
	createdAt: Date;
	createdByName: string | null;
};

export type MemberMembershipHistoryItem = MemberMembershipSummary & {
	status: MembershipRecordStatus;
};

export type MemberMembershipOverview = {
	status: MembershipStatus;
	isFrozen: boolean;
	current: MemberMembershipSummary | null;
	last: MemberMembershipSummary | null;
	history: MemberMembershipHistoryItem[];
};

export type MembershipEligibilitySettings = {
	blockIfExpired: boolean;
	blockIfFrozen: boolean;
	graceDays: number;
	allowWithoutActiveMembership: boolean;
};

export type CheckInMembershipState = MembershipState | 'NONE';

export type MembershipEligibilityResult = {
	eligible: boolean;
	status: MembershipStatus;
	membershipState: CheckInMembershipState;
	isFrozen: boolean;
	membership: MemberMembershipSummary | null;
	reason: string | null;
};

function normalizePlanName(raw: string): string {
	const name = raw.trim();
	if (!name) {
		throw badRequest('Plan name is required.', 'INVALID_INPUT');
	}
	if (name.length < MIN_PLAN_NAME_LENGTH) {
		throw badRequest(`Plan name must be at least ${MIN_PLAN_NAME_LENGTH} characters.`, 'INVALID_INPUT');
	}
	if (name.length > MAX_PLAN_NAME_LENGTH) {
		throw badRequest(
			`Plan name must be ${MAX_PLAN_NAME_LENGTH} characters or less.`,
			'INVALID_INPUT'
		);
	}
	return name;
}

function normalizeDurationDays(value: number): number {
	if (!Number.isFinite(value) || !Number.isInteger(value)) {
		throw badRequest('Duration must be a whole number of days.', 'INVALID_INPUT');
	}
	if (value < MIN_DURATION_DAYS || value > MAX_DURATION_DAYS) {
		throw badRequest(
			`Duration must be between ${MIN_DURATION_DAYS} and ${MAX_DURATION_DAYS} days.`,
			'INVALID_INPUT'
		);
	}
	return value;
}

function normalizeDescription(raw?: string | null): string | null {
	if (!raw) return null;
	const value = raw.trim();
	if (!value) return null;
	if (value.length > MAX_DESCRIPTION_LENGTH) {
		throw badRequest(
			`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`,
			'INVALID_INPUT'
		);
	}
	return value;
}

function parsePriceCents(raw?: string | null): number | null {
	if (!raw) return null;
	const value = raw.trim();
	if (!value) return null;
	if (!/^\d+(\.\d{1,2})?$/.test(value)) {
		throw badRequest('Price must be a valid amount.', 'INVALID_INPUT');
	}
	const [whole, decimals] = value.split('.');
	const cents = Number.parseInt(whole, 10) * 100 + Number.parseInt((decimals ?? '0').padEnd(2, '0'), 10);
	if (!Number.isFinite(cents) || cents < 0) {
		throw badRequest('Price must be a positive amount.', 'INVALID_INPUT');
	}
	if (cents > MAX_PRICE_CENTS) {
		throw badRequest('Price is too large.', 'INVALID_INPUT');
	}
	return cents;
}

function parseDateInput(raw: string, label: string): Date {
	const value = raw.trim();
	if (!value) {
		throw badRequest(`${label} is required.`, 'INVALID_INPUT');
	}
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
		const date = new Date(year, month - 1, day);
		if (Number.isNaN(date.getTime())) {
			throw badRequest(`${label} must be a valid date.`, 'INVALID_INPUT');
		}
		return date;
	}
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		throw badRequest(`${label} must be a valid date.`, 'INVALID_INPUT');
	}
	return parsed;
}

function computeEndAt(startAt: Date, durationDays: number): Date {
	const endAt = new Date(startAt.getTime());
	endAt.setDate(endAt.getDate() + durationDays);
	return endAt;
}

function toMembershipPlanSummary(plan: MembershipPlanRecord): MembershipPlanSummary {
	return {
		id: plan.id,
		name: plan.name,
		durationDays: plan.durationDays,
		priceCents: plan.priceCents,
		description: plan.description,
		isActive: plan.isActive,
		createdAt: plan.createdAt,
		updatedAt: plan.updatedAt
	};
}

function toMemberMembershipSummary(record: MemberMembershipRecord): MemberMembershipSummary {
	return {
		id: record.id,
		planId: record.planId,
		planName: record.plan.name,
		startAt: record.startAt,
		endAt: record.endAt,
		cancelledAt: record.cancelledAt ?? null,
		cancelReason: record.cancelReason ?? null,
		createdAt: record.createdAt,
		createdByName: record.createdBy?.username ?? null
	};
}

function deriveMembershipStatus(
	isFrozen: boolean,
	currentMembership: MemberMembershipRecord | null
): MembershipStatus {
	if (isFrozen) return 'FROZEN';
	if (currentMembership) return 'ACTIVE';
	return 'EXPIRED';
}

export async function listPlans(
	branchId: string,
	options: { activeOnly?: boolean } = {}
): Promise<MembershipPlanSummary[]> {
	const plans = await listPlansRecord({ branchId, activeOnly: options.activeOnly ?? false });
	return plans.map(toMembershipPlanSummary);
}

export async function getPlanSummary(
	branchId: string,
	planId: string
): Promise<MembershipPlanSummary | null> {
	const plan = await getPlanById(branchId, planId);
	return plan ? toMembershipPlanSummary(plan) : null;
}

export async function createPlan(
	branchId: string,
	input: {
		name: string;
		durationDays: number;
		price?: string | null;
		description?: string | null;
		isActive?: boolean;
	},
	audit?: AuditContext
): Promise<MembershipPlanSummary> {
	const name = normalizePlanName(input.name);
	const durationDays = normalizeDurationDays(input.durationDays);
	const priceCents = parsePriceCents(input.price ?? null);
	const description = normalizeDescription(input.description ?? null);
	const isActive = input.isActive ?? true;

	const plan = await createPlanRecord(branchId, {
		name,
		durationDays,
		priceCents,
		description,
		isActive
	});

	await recordAudit({
		action: 'PLAN_CREATED',
		actorUserId: audit?.actorUserId ?? null,
		entityType: 'MembershipPlan',
		entityId: plan.id,
		meta: {
			name: plan.name,
			durationDays: plan.durationDays,
			priceCents: plan.priceCents ?? null,
			isActive: plan.isActive
		},
		ip: audit?.ip ?? null,
		userAgent: audit?.userAgent ?? null
	});

	return toMembershipPlanSummary(plan);
}

export async function updatePlan(
	branchId: string,
	planId: string,
	input: {
		name?: string | null;
		durationDays?: number | null;
		price?: string | null;
		description?: string | null;
		isActive?: boolean | null;
	},
	audit?: AuditContext
): Promise<MembershipPlanSummary> {
	const existing = await getPlanById(branchId, planId);
	if (!existing) {
		throw notFound('Membership plan not found.', 'PLAN_NOT_FOUND');
	}

	const name = input.name !== undefined && input.name !== null ? normalizePlanName(input.name) : existing.name;
	const durationDays =
		input.durationDays !== undefined && input.durationDays !== null
			? normalizeDurationDays(input.durationDays)
			: existing.durationDays;
	const priceCents =
		input.price !== undefined ? parsePriceCents(input.price ?? null) : existing.priceCents;
	const description =
		input.description !== undefined
			? normalizeDescription(input.description ?? null)
			: existing.description;
	const isActive = input.isActive ?? existing.isActive;

	const plan = await updatePlanRecord(planId, {
		name,
		durationDays,
		priceCents,
		description,
		isActive
	});

	if (existing.isActive !== plan.isActive) {
		await recordAudit({
			action: 'MEMBERSHIP_PLAN_TOGGLED',
			actorUserId: audit?.actorUserId ?? null,
			entityType: 'MembershipPlan',
			entityId: plan.id,
			meta: {
				isActive: plan.isActive
			},
			ip: audit?.ip ?? null,
			userAgent: audit?.userAgent ?? null
		});
	} else {
		await recordAudit({
			action: 'PLAN_UPDATED',
			actorUserId: audit?.actorUserId ?? null,
			entityType: 'MembershipPlan',
			entityId: plan.id,
			meta: {
				name: plan.name,
				durationDays: plan.durationDays,
				priceCents: plan.priceCents ?? null
			},
			ip: audit?.ip ?? null,
			userAgent: audit?.userAgent ?? null
		});
	}

	return toMembershipPlanSummary(plan);
}

export async function getCurrentMembership(
	branchId: string,
	memberId: string,
	atDate = new Date()
): Promise<MemberMembershipSummary | null> {
	const membership = await getCurrentMemberMembershipRecord(memberId, branchId, atDate);
	return membership ? toMemberMembershipSummary(membership) : null;
}

export async function getMemberMembershipStatus(
	branchId: string,
	memberId: string,
	atDate = new Date()
): Promise<{ status: MembershipStatus; isFrozen: boolean; currentMembership: MemberMembershipSummary | null }> {
	const [member, membership] = await Promise.all([
		getMemberFreezeStatus(branchId, memberId),
		getCurrentMemberMembershipRecord(memberId, branchId, atDate)
	]);

	if (!member) {
		throw notFound('Member not found.', 'MEMBER_NOT_FOUND');
	}

	const status = deriveMembershipStatus(member.isFrozen, membership);
	return {
		status,
		isFrozen: member.isFrozen,
		currentMembership: membership ? toMemberMembershipSummary(membership) : null
	};
}

export async function listMemberMemberships(
	branchId: string,
	memberId: string,
	limit = MEMBERSHIP_HISTORY_LIMIT
): Promise<MemberMembershipSummary[]> {
	const memberships = await listMemberMembershipsRecord(memberId, branchId, limit);
	return memberships.map(toMemberMembershipSummary);
}

export async function getMemberMembershipOverview(
	branchId: string,
	memberId: string,
	atDate = new Date()
): Promise<MemberMembershipOverview> {
	const [member, membershipRecords] = await Promise.all([
		getMemberFreezeStatus(branchId, memberId),
		listAllMemberMembershipsRecord(memberId, branchId)
	]);

	if (!member) {
		throw notFound('Member not found.', 'MEMBER_NOT_FOUND');
	}

	const selection = selectCurrentMembership(membershipRecords, atDate);
	const history: MemberMembershipHistoryItem[] = membershipRecords.map((record) => ({
		...toMemberMembershipSummary(record),
		status: getMembershipStatusLabel(record, atDate)
	}));

	return {
		status: deriveMembershipStatus(member.isFrozen, selection.current),
		isFrozen: member.isFrozen,
		current: selection.current ? toMemberMembershipSummary(selection.current) : null,
		last: selection.last ? toMemberMembershipSummary(selection.last) : null,
		history
	};
}

export async function getMemberMembershipById(
	branchId: string,
	memberId: string,
	membershipId: string
): Promise<MemberMembershipSummary | null> {
	const membership = await getMemberMembershipByIdRecord(memberId, branchId, membershipId);
	return membership ? toMemberMembershipSummary(membership) : null;
}

export async function createMembershipForMember(
	branchId: string,
	memberId: string,
	planId: string,
	startAtRaw: string,
	endAtRaw: string | null | undefined,
	createdByUserId: string,
	audit?: AuditContext
): Promise<MemberMembershipSummary> {
	const member = await getMemberProfileBase(branchId, memberId);
	if (!member) {
		throw notFound('Member not found.', 'MEMBER_NOT_FOUND');
	}

	const plan = await getPlanById(branchId, planId);
	if (!plan) {
		throw notFound('Membership plan not found.', 'PLAN_NOT_FOUND');
	}
	if (!plan.isActive) {
		throw badRequest('Membership plan is inactive.', 'PLAN_INACTIVE');
	}

	const startAt = parseDateInput(startAtRaw, 'Start date');
	const endAt = endAtRaw ? parseDateInput(endAtRaw, 'End date') : computeEndAt(startAt, plan.durationDays);

	if (endAt.getTime() < startAt.getTime()) {
		throw badRequest('End date must be on or after start date.', 'INVALID_INPUT');
	}

	const membership = await createMemberMembershipRecord({
		memberId,
		planId: plan.id,
		branchId,
		startAt,
		endAt,
		createdByUserId
	});

	await recordAudit({
		action: 'MEMBERSHIP_ASSIGNED',
		actorUserId: audit?.actorUserId ?? null,
		entityType: 'MemberMembership',
		entityId: membership.id,
		meta: {
			memberId: memberId,
			planId: plan.id,
			startAt: membership.startAt.toISOString(),
			endAt: membership.endAt.toISOString()
		},
		ip: audit?.ip ?? null,
		userAgent: audit?.userAgent ?? null
	});

	return toMemberMembershipSummary(membership);
}

export async function cancelMembershipForMember(
	branchId: string,
	memberId: string,
	membershipId: string,
	reason: string | null,
	audit?: AuditContext
): Promise<MemberMembershipSummary> {
	const member = await getMemberProfileBase(branchId, memberId);
	if (!member) {
		throw notFound('Member not found.', 'MEMBER_NOT_FOUND');
	}

	const membership = await getMemberMembershipByIdRecord(memberId, branchId, membershipId);
	if (!membership) {
		throw notFound('Membership not found.', 'MEMBERSHIP_NOT_FOUND');
	}

	const now = new Date();
	let updated = membership;

	if (!membership.cancelledAt || membership.cancelledAt.getTime() > now.getTime()) {
		updated = await cancelMemberMembershipRecord(membershipId, now, reason ?? null);
		await recordAudit({
			action: 'MEMBERSHIP_CANCELLED',
			actorUserId: audit?.actorUserId ?? null,
			entityType: 'MemberMembership',
			entityId: membershipId,
			meta: {
				memberId,
				planId: membership.planId,
				cancelledAt: now.toISOString(),
				reason: reason ?? null
			},
			ip: audit?.ip ?? null,
			userAgent: audit?.userAgent ?? null
		});
	}

	return toMemberMembershipSummary(updated);
}

export async function isMemberEligibleForCheckIn(
	branchId: string,
	memberId: string,
	atDate: Date,
	settings: MembershipEligibilitySettings
): Promise<MembershipEligibilityResult> {
	const [member, membershipRecords] = await Promise.all([
		getMemberFreezeStatus(branchId, memberId),
		listAllMemberMembershipsRecord(memberId, branchId)
	]);

	if (!member) {
		throw notFound('Member not found.', 'MEMBER_NOT_FOUND');
	}

	const selection = selectCurrentMembership(membershipRecords, atDate);
	const membership = selection.current ?? selection.last ?? null;
	const membershipSummary = membership ? toMemberMembershipSummary(membership) : null;
	const membershipState: CheckInMembershipState = membership
		? getMembershipState(membership, atDate, settings.graceDays)
		: 'NONE';
	const status = deriveMembershipStatus(member.isFrozen, selection.current);

	if (member.isFrozen && settings.blockIfFrozen) {
		return {
			eligible: false,
			status,
			membershipState,
			isFrozen: member.isFrozen,
			membership: membershipSummary,
			reason: 'Membership is frozen.'
		};
	}

	if (settings.allowWithoutActiveMembership) {
		return {
			eligible: true,
			status,
			membershipState,
			isFrozen: member.isFrozen,
			membership: membershipSummary,
			reason: null
		};
	}

	if (membershipState === 'ACTIVE' || membershipState === 'GRACE') {
		return {
			eligible: true,
			status,
			membershipState,
			isFrozen: member.isFrozen,
			membership: membershipSummary,
			reason: null
		};
	}

	if (settings.blockIfExpired) {
		const endDate = membershipSummary?.endAt ?? null;
		const cancelledAt = membershipSummary?.cancelledAt ?? null;
		const formatDate = (value: Date | null) => {
			if (!value) return null;
			const year = value.getFullYear();
			const month = `${value.getMonth() + 1}`.padStart(2, '0');
			const day = `${value.getDate()}`.padStart(2, '0');
			return `${year}-${month}-${day}`;
		};

		let reason = 'Membership not eligible.';
		if (membershipState === 'CANCELLED') {
			const cancelledLabel = formatDate(cancelledAt);
			reason = cancelledLabel
				? `Membership was cancelled on ${cancelledLabel}. Please renew at front desk.`
				: 'Membership was cancelled. Please renew at front desk.';
		} else if (membershipState === 'EXPIRED') {
			const endLabel = formatDate(endDate);
			reason = endLabel
				? `Membership expired on ${endLabel}. Please renew at front desk.`
				: 'Membership has expired. Please renew at front desk.';
		} else if (membershipState === 'NONE') {
			reason = 'No active membership found. Please renew at front desk.';
		}

		return {
			eligible: false,
			status,
			membershipState,
			isFrozen: member.isFrozen,
			membership: membershipSummary,
			reason
		};
	}

	return {
		eligible: true,
		status,
		membershipState,
		isFrozen: member.isFrozen,
		membership: membershipSummary,
		reason: null
	};
}
