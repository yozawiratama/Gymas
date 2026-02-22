import { canRecordPayments, canVoidPayments, type ActiveUser } from '$lib/server/authz';
import { Prisma as PrismaValue, PaymentMethod, PaymentStatus } from '$lib/server/db/prisma';
import type { Prisma as PrismaTypes, PaymentMethod as PaymentMethodType } from '$lib/server/db/prisma-server';
import { badRequest, forbidden, notFound, unauthorized } from '$lib/server/httpErrors';
import { getMemberProfileBase } from '$lib/server/repositories/memberRepository';
import {
	createPayment as createPaymentRecord,
	getPaymentForMember as fetchPaymentForMember,
	getMemberPaymentSummary as fetchMemberPaymentSummary,
	getMemberPayments as fetchMemberPayments,
	listPayments as fetchPayments,
	voidPaymentForMember as setPaymentVoidStatus,
	type MemberPaymentRecentItem,
	type MemberPaymentSummary,
	type PaymentListRow
} from '$lib/server/repositories/paymentRepository';
import { record as recordAudit } from '$lib/server/services/auditService';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_AMOUNT = new PrismaValue.Decimal('1000000');
const MAX_NOTE_LENGTH = 191;
const MAX_VOID_REASON_LENGTH = 500;
const MAX_FUTURE_MINUTES = 10;

const PAYMENT_METHODS = new Set<string>(Object.values(PaymentMethod));

export type PaymentCreateInput = {
	memberId: string;
	membershipId?: string | null;
	amount: string;
	paidAt?: string;
	method?: string;
	note?: string;
};

export type AuditContext = {
	ip?: string | null;
	userAgent?: string | null;
};

export type PaymentCreateResult = {
	id: string;
	paidAt: Date;
};

export type PaymentVoidInput = {
	memberId: string;
	paymentId: string;
	reason?: string;
};

export type PaymentVoidResult = {
	id: string;
	alreadyVoided: boolean;
};

export type PaymentListRowDto = {
	id: string;
	memberId: string;
	memberName: string;
	memberCode: string;
	amount: string;
	currency: string;
	method: string;
	status: string;
	paidAt: string;
	recordedBy: string;
	note: string | null;
};

export type PaymentListPage = {
	rows: PaymentListRowDto[];
	pagination: {
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	};
};

export type MemberPaymentSection = {
	totalCount: number;
	lastPaidAt: string | null;
	recent: {
		id: string;
		amount: string;
		currency: string;
		method: string;
		status: string;
		paidAt: string;
		note: string | null;
		membership: {
			id: string;
			planName: string;
			startAt: string | null;
			endAt: string | null;
		} | null;
	}[];
};

function ensurePositiveInt(value: number, fallback: number): number {
	if (!Number.isFinite(value) || value <= 0) {
		return fallback;
	}
	return Math.floor(value);
}

function formatDisplayName(member: { firstName: string; lastName: string }): string {
	return `${member.firstName} ${member.lastName}`.trim();
}

function parseAmount(raw: string): PrismaTypes.Decimal {
	const value = raw.trim();

	if (!value) {
		throw badRequest('Amount is required.', 'INVALID_INPUT');
	}

	if (!/^\d+(\.\d{1,2})?$/.test(value)) {
		throw badRequest('Amount must be a valid number.', 'INVALID_INPUT');
	}

	const amount = new PrismaValue.Decimal(value);

	if (amount.lte(0)) {
		throw badRequest('Amount must be greater than 0.', 'INVALID_INPUT');
	}

	if (amount.gt(MAX_AMOUNT)) {
		throw badRequest(`Amount must be ${MAX_AMOUNT.toString()} or less.`, 'INVALID_INPUT');
	}

	return amount;
}

function parsePaidAt(raw?: string): Date {
	const now = new Date();
	if (!raw) return now;

	const parsed = new Date(raw);
	if (Number.isNaN(parsed.getTime())) {
		throw badRequest('Paid at must be a valid date.', 'INVALID_INPUT');
	}

	const maxFuture = new Date(now.getTime() + MAX_FUTURE_MINUTES * 60 * 1000);
	if (parsed.getTime() > maxFuture.getTime()) {
		throw badRequest('Paid at cannot be in the future.', 'INVALID_INPUT');
	}

	return parsed;
}

function parseMethod(raw?: string): PaymentMethodType {
	if (!raw) {
		return PaymentMethod.CASH;
	}

	const normalized = raw.trim().toUpperCase();
	if (!PAYMENT_METHODS.has(normalized)) {
		throw badRequest('Payment method is invalid.', 'INVALID_INPUT');
	}

	return normalized as PaymentMethodType;
}

function parseNote(raw?: string): string | null {
	if (!raw) return null;
	const value = raw.trim();
	if (!value) return null;
	if (value.length > MAX_NOTE_LENGTH) {
		throw badRequest(`Note must be ${MAX_NOTE_LENGTH} characters or less.`, 'INVALID_INPUT');
	}
	return value;
}

function parseVoidReason(raw?: string): string | null {
	if (!raw) return null;
	const value = raw.trim();
	if (!value) return null;
	if (value.length > MAX_VOID_REASON_LENGTH) {
		throw badRequest(
			`Reason must be ${MAX_VOID_REASON_LENGTH} characters or less.`,
			'INVALID_INPUT'
		);
	}
	return value;
}

function normalizeMemberPayments(
	summary: MemberPaymentSummary,
	recent: MemberPaymentRecentItem[]
): MemberPaymentSection {
	return {
		totalCount: summary.totalCount,
		lastPaidAt: summary.lastPaidAt ? summary.lastPaidAt.toISOString() : null,
		recent: recent.map((record) => ({
			id: record.id,
			amount: record.amount.toString(),
			currency: record.currency,
			method: record.method,
			status: record.status,
			paidAt: record.paidAt.toISOString(),
			note: record.note ?? null,
			membership: record.membership
				? {
						id: record.membership.id,
						planName: record.membership.plan.name,
						startAt: record.membership.startAt.toISOString(),
						endAt: record.membership.endAt.toISOString()
				  }
				: null
		}))
	};
}

function normalizePaymentRow(row: PaymentListRow): PaymentListRowDto {
	const memberName = formatDisplayName(row.member);
	return {
		id: row.id,
		memberId: row.member.id,
		memberName,
		memberCode: row.member.memberCode,
		amount: row.amount.toString(),
		currency: row.currency,
		method: row.method,
		status: row.status,
		paidAt: row.paidAt.toISOString(),
		recordedBy: row.recordedBy?.username ?? 'System',
		note: row.note ?? null
	};
}

export async function createPayment(
	branchId: string,
	input: PaymentCreateInput,
	actor: ActiveUser | null,
	audit?: AuditContext
): Promise<PaymentCreateResult> {
	if (!actor) {
		throw unauthorized('Unauthorized.', 'UNAUTHORIZED');
	}

	if (!canRecordPayments(actor.permissions)) {
		throw forbidden('Forbidden.', 'FORBIDDEN');
	}

	const memberId = input.memberId.trim();
	if (!memberId) {
		throw badRequest('Member is required.', 'INVALID_INPUT');
	}

	const member = await getMemberProfileBase(branchId, memberId);
	if (!member) {
		throw notFound('Member not found.', 'MEMBER_NOT_FOUND');
	}

	const amount = parseAmount(input.amount);
	const paidAt = parsePaidAt(input.paidAt);
	const method = parseMethod(input.method);
	const note = parseNote(input.note);
	const membershipId = input.membershipId?.trim() ? input.membershipId.trim() : null;

	const payment = await createPaymentRecord({
		memberId,
		membershipId,
		branchId,
		amount,
		currency: 'USD',
		method,
		status: PaymentStatus.PAID,
		paidAt,
		note,
		createdByUserId: actor.id
	});

	await recordAudit({
		action: 'PAYMENT_CREATED',
		actorUserId: actor.id,
		entityType: 'Payment',
		entityId: payment.id,
		meta: {
			memberId,
			amount: amount.toString(),
			currency: payment.currency,
			method: payment.method
		},
		ip: audit?.ip ?? null,
		userAgent: audit?.userAgent ?? null
	});

	return {
		id: payment.id,
		paidAt: payment.paidAt
	};
}

export async function voidPayment(
	branchId: string,
	input: PaymentVoidInput,
	actor: ActiveUser | null,
	audit?: AuditContext
): Promise<PaymentVoidResult> {
	if (!actor) {
		throw unauthorized('Unauthorized.', 'UNAUTHORIZED');
	}

	if (!canVoidPayments(actor.permissions)) {
		throw forbidden('Forbidden.', 'FORBIDDEN');
	}

	const memberId = input.memberId.trim();
	if (!memberId) {
		throw badRequest('Member is required.', 'INVALID_INPUT');
	}

	const paymentId = input.paymentId.trim();
	if (!paymentId) {
		throw badRequest('Payment is required.', 'INVALID_INPUT');
	}

	const reason = parseVoidReason(input.reason);
	const payment = await fetchPaymentForMember(memberId, branchId, paymentId);
	if (!payment) {
		throw notFound('Payment not found.', 'PAYMENT_NOT_FOUND');
	}

	let alreadyVoided = payment.status === PaymentStatus.VOID;
	if (!alreadyVoided) {
		const voidedAt = new Date();
		const updated = await setPaymentVoidStatus(
			memberId,
			branchId,
			paymentId,
			voidedAt,
			actor.id,
			reason ?? null
		);
		alreadyVoided = !updated;
	}

	await recordAudit({
		action: 'PAYMENT_VOIDED',
		actorUserId: actor.id,
		entityType: 'Payment',
		entityId: payment.id,
		meta: {
			memberId,
			paymentId: payment.id,
			alreadyVoided,
			reason,
			previousStatus: payment.status,
			amount: payment.amount.toString(),
			currency: payment.currency,
			method: payment.method
		},
		ip: audit?.ip ?? null,
		userAgent: audit?.userAgent ?? null
	});

	return {
		id: payment.id,
		alreadyVoided
	};
}

export async function listPayments(input: {
	branchId: string;
	query: string;
	dateFrom?: Date | null;
	dateTo?: Date | null;
	page: number;
	pageSize: number;
}): Promise<PaymentListPage> {
	const query = input.query.trim();
	const pageSize = Math.min(ensurePositiveInt(input.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
	const requestedPage = ensurePositiveInt(input.page, 1);

	if (input.dateFrom && input.dateTo && input.dateFrom.getTime() > input.dateTo.getTime()) {
		throw badRequest('From date cannot be after to date.', 'INVALID_INPUT');
	}

	const initial = await fetchPayments({
		branchId: input.branchId,
		q: query,
		dateFrom: input.dateFrom ?? null,
		dateTo: input.dateTo ?? null,
		page: requestedPage,
		pageSize
	});

	const totalPages = Math.max(1, Math.ceil(initial.total / pageSize));
	const safePage =
		initial.total === 0 ? 1 : Math.min(Math.max(requestedPage, 1), totalPages);

	let rows = initial.rows;
	if (safePage !== requestedPage) {
		const adjusted = await fetchPayments({
			branchId: input.branchId,
			q: query,
			dateFrom: input.dateFrom ?? null,
			dateTo: input.dateTo ?? null,
			page: safePage,
			pageSize
		});
		rows = adjusted.rows;
	}

	return {
		rows: rows.map(normalizePaymentRow),
		pagination: {
			total: initial.total,
			page: safePage,
			pageSize,
			totalPages
		}
	};
}

export async function getMemberPaymentSummary(
	branchId: string,
	memberId: string,
	limit = 10
): Promise<MemberPaymentSection> {
	const [summary, recent] = await Promise.all([
		fetchMemberPaymentSummary(memberId, branchId),
		fetchMemberPayments(memberId, branchId, limit)
	]);

	return normalizeMemberPayments(summary, recent);
}
