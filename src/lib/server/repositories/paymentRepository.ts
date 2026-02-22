import { serverPrisma } from '$lib/server/db/server';
import { PaymentStatus as PaymentStatusValue } from '$lib/server/db/prisma';
import type { PaymentMethod, PaymentStatus, Prisma } from '$lib/server/db/prisma-server';

export type PaymentCreateInput = {
	memberId: string;
	membershipId?: string | null;
	branchId: string;
	amount: Prisma.Decimal;
	currency: string;
	method: PaymentMethod;
	status: PaymentStatus;
	paidAt: Date;
	note?: string | null;
	createdByUserId: string;
};

export type PaymentRecord = {
	id: string;
	memberId: string;
	branchId: string;
	amount: Prisma.Decimal;
	currency: string;
	method: PaymentMethod;
	status: PaymentStatus;
	paidAt: Date;
	createdAt: Date;
	note: string | null;
	createdByUserId: string;
	deletedAt?: Date | null;
	deletedByUserId?: string | null;
	voidReason?: string | null;
};

export type PaymentListRow = {
	id: string;
	amount: Prisma.Decimal;
	currency: string;
	method: PaymentMethod;
	status: PaymentStatus;
	paidAt: Date;
	createdAt: Date;
	note: string | null;
	member: {
		id: string;
		memberCode: string;
		firstName: string;
		lastName: string;
	};
	recordedBy: {
		id: string;
		username: string;
	} | null;
};

export type PaymentListResult = {
	total: number;
	rows: PaymentListRow[];
};

export type MemberPaymentSummary = {
	totalCount: number;
	lastPaidAt: Date | null;
};

export type MemberPaymentRecentItem = {
	id: string;
	amount: Prisma.Decimal;
	currency: string;
	method: PaymentMethod;
	status: PaymentStatus;
	paidAt: Date;
	note: string | null;
	membership: {
		id: string;
		startAt: Date;
		endAt: Date;
		plan: {
			name: string;
		};
	} | null;
};

export type MemberPaymentLookupItem = {
	id: string;
	memberId: string;
	branchId: string;
	amount: Prisma.Decimal;
	currency: string;
	method: PaymentMethod;
	status: PaymentStatus;
	paidAt: Date;
	note: string | null;
	createdByUserId: string;
};

function buildPaymentWhere(params: {
	branchId: string;
	q?: string;
	dateFrom?: Date | null;
	dateTo?: Date | null;
}): Prisma.PaymentWhereInput {
	const filters: Prisma.PaymentWhereInput[] = [{ branchId: params.branchId }];

	if (params.q) {
		filters.push({
			member: {
				OR: [
					{ firstName: { contains: params.q } },
					{ lastName: { contains: params.q } },
					{ memberCode: { contains: params.q } }
				]
			}
		});
	}

	if (params.dateFrom || params.dateTo) {
		filters.push({
			paidAt: {
				gte: params.dateFrom ?? undefined,
				lte: params.dateTo ?? undefined
			}
		});
	}

	return { AND: filters };
}

export async function createPayment(data: PaymentCreateInput): Promise<PaymentRecord> {
	return serverPrisma.payment.create({
		data: {
			memberId: data.memberId,
			membershipId: data.membershipId ?? null,
			branchId: data.branchId,
			amount: data.amount,
			currency: data.currency,
			method: data.method,
			status: data.status,
			note: data.note ?? null,
			paidAt: data.paidAt,
			createdByUserId: data.createdByUserId
		},
		select: {
			id: true,
			memberId: true,
			branchId: true,
			amount: true,
			currency: true,
			method: true,
			status: true,
			paidAt: true,
			createdAt: true,
			note: true,
			createdByUserId: true,
			deletedAt: true,
			deletedByUserId: true,
			voidReason: true
		}
	});
}

export async function listPayments(params: {
	branchId: string;
	q: string;
	dateFrom?: Date | null;
	dateTo?: Date | null;
	page: number;
	pageSize: number;
}): Promise<PaymentListResult> {
	const where = buildPaymentWhere(params);
	const skip = (params.page - 1) * params.pageSize;

	const [total, rows] = await Promise.all([
		serverPrisma.payment.count({ where }),
		serverPrisma.payment.findMany({
			where,
			orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
			skip,
			take: params.pageSize,
			select: {
				id: true,
				amount: true,
				currency: true,
				method: true,
				status: true,
				paidAt: true,
				createdAt: true,
				note: true,
				member: {
					select: {
						id: true,
						memberCode: true,
						firstName: true,
						lastName: true
					}
				},
				createdBy: {
					select: {
						id: true,
						username: true
					}
				}
			}
		})
	]);

	return {
		total,
		rows: rows.map(({ createdBy, ...row }) => ({
			...row,
			recordedBy: createdBy ?? null
		}))
	};
}

export async function getMemberPaymentSummary(
	memberId: string,
	branchId: string
): Promise<MemberPaymentSummary> {
	const summary = await serverPrisma.payment.aggregate({
		where: {
			memberId,
			branchId,
			deletedAt: null,
			status: {
				not: PaymentStatusValue.VOID
			}
		},
		_count: { _all: true },
		_max: { paidAt: true }
	});

	return {
		totalCount: summary._count._all ?? 0,
		lastPaidAt: summary._max.paidAt ?? null
	};
}

export async function getMemberPayments(
	memberId: string,
	branchId: string,
	limit: number
): Promise<MemberPaymentRecentItem[]> {
	return serverPrisma.payment.findMany({
		where: { memberId, branchId },
		orderBy: { paidAt: 'desc' },
		take: limit,
		select: {
			id: true,
			amount: true,
			currency: true,
			method: true,
			status: true,
			paidAt: true,
			note: true,
			membership: {
				select: {
					id: true,
					startAt: true,
					endAt: true,
					plan: {
						select: {
							name: true
						}
					}
				}
			}
		}
	});
}

export async function getPaymentForMember(
	memberId: string,
	branchId: string,
	paymentId: string
): Promise<MemberPaymentLookupItem | null> {
	return serverPrisma.payment.findFirst({
		where: {
			id: paymentId,
			memberId,
			branchId
		},
		select: {
			id: true,
			memberId: true,
			branchId: true,
			amount: true,
			currency: true,
			method: true,
			status: true,
			paidAt: true,
			note: true,
			createdByUserId: true
		}
	});
}

export async function voidPaymentForMember(
	memberId: string,
	branchId: string,
	paymentId: string,
	voidedAt: Date,
	voidedByUserId: string,
	voidReason: string | null
): Promise<boolean> {
	const updated = await serverPrisma.payment.updateMany({
		where: {
			id: paymentId,
			memberId,
			branchId,
			status: {
				not: PaymentStatusValue.VOID
			}
		},
		data: {
			status: PaymentStatusValue.VOID,
			deletedAt: voidedAt,
			deletedByUserId: voidedByUserId,
			voidReason: voidReason ?? null
		}
	});

	return updated.count > 0;
}
