import { serverPrisma } from '$lib/server/db/server';
import { PaymentStatus } from '$lib/server/db/prisma';

export type AttendanceDailyRow = {
	reportDate: Date | string;
	checkInsCount: number | bigint | string;
	uniqueMembersCount: number | bigint | string;
};

export type AttendanceTotals = {
	totalCheckIns: number;
	totalUniqueMembers: number;
};

export type RevenueDailyRow = {
	reportDate: Date | string;
	paymentsCount: number | bigint | string;
	revenueSum: unknown;
};

export type RevenueTotals = {
	totalPayments: number;
	totalRevenue: unknown;
};

export type MembershipStatusCounts = {
	active: number;
	expired: number;
	frozen: number;
};

export type MembershipPlanBreakdown = {
	planId: string;
	planName: string;
	activeCount: number;
};

export async function listAttendanceDaily(params: {
	branchId: string;
	from: Date;
	to: Date;
}): Promise<AttendanceDailyRow[]> {
	return serverPrisma.$queryRaw<AttendanceDailyRow[]>`
		SELECT
			DATE(checkInAt) AS reportDate,
			COUNT(*) AS checkInsCount,
			COUNT(DISTINCT memberId) AS uniqueMembersCount
		FROM Attendance
		WHERE branchId = ${params.branchId}
			AND checkInAt >= ${params.from}
			AND checkInAt <= ${params.to}
		GROUP BY DATE(checkInAt)
		ORDER BY reportDate ASC
	`;
}

export async function getAttendanceTotals(params: {
	branchId: string;
	from: Date;
	to: Date;
}): Promise<AttendanceTotals> {
	const [totalCheckIns, uniqueRows] = await Promise.all([
		serverPrisma.attendance.count({
			where: {
				branchId: params.branchId,
				checkInAt: {
					gte: params.from,
					lte: params.to
				}
			}
		}),
		serverPrisma.$queryRaw<Array<{ total: number | bigint | string }>>`
			SELECT COUNT(DISTINCT memberId) AS total
			FROM Attendance
			WHERE branchId = ${params.branchId}
				AND checkInAt >= ${params.from}
				AND checkInAt <= ${params.to}
		`
	]);

	const totalUniqueMembers = Number(uniqueRows?.[0]?.total ?? 0);

	return {
		totalCheckIns,
		totalUniqueMembers
	};
}

export async function listRevenueDaily(params: {
	branchId: string;
	from: Date;
	to: Date;
}): Promise<RevenueDailyRow[]> {
	return serverPrisma.$queryRaw<RevenueDailyRow[]>`
		SELECT
			DATE(paidAt) AS reportDate,
			COUNT(*) AS paymentsCount,
			COALESCE(SUM(amount), 0) AS revenueSum
	FROM Payment
	WHERE branchId = ${params.branchId}
		AND paidAt >= ${params.from}
		AND paidAt <= ${params.to}
		AND deletedAt IS NULL
		AND status = ${PaymentStatus.PAID}
	GROUP BY DATE(paidAt)
	ORDER BY reportDate ASC
`;
}

export async function getRevenueTotals(params: {
	branchId: string;
	from: Date;
	to: Date;
}): Promise<RevenueTotals> {
	const totals = await serverPrisma.payment.aggregate({
		where: {
			branchId: params.branchId,
			paidAt: {
				gte: params.from,
				lte: params.to
			},
			deletedAt: null,
			status: PaymentStatus.PAID
		},
		_sum: {
			amount: true
		},
		_count: {
			_all: true
		}
	});

	return {
		totalPayments: totals._count._all ?? 0,
		totalRevenue: totals._sum.amount ?? 0
	};
}

export async function getMembershipStatusCounts(
	branchId: string,
	asOf: Date
): Promise<MembershipStatusCounts> {
	const rows = await serverPrisma.$queryRaw<
		Array<{ frozen: number | bigint | string; active: number | bigint | string; expired: number | bigint | string }>
	>`
		SELECT
			SUM(CASE WHEN m.isFrozen = true THEN 1 ELSE 0 END) AS frozen,
			SUM(
				CASE
					WHEN m.isFrozen = false
						AND EXISTS (
							SELECT 1
							FROM MemberMembership mm
							WHERE mm.memberId = m.id
								AND mm.branchId = ${branchId}
								AND mm.startAt <= ${asOf}
								AND mm.endAt >= ${asOf}
						)
					THEN 1
					ELSE 0
				END
			) AS active,
			SUM(
				CASE
					WHEN m.isFrozen = false
						AND NOT EXISTS (
							SELECT 1
							FROM MemberMembership mm
							WHERE mm.memberId = m.id
								AND mm.branchId = ${branchId}
								AND mm.startAt <= ${asOf}
								AND mm.endAt >= ${asOf}
						)
					THEN 1
					ELSE 0
				END
			) AS expired
		FROM Member m
		WHERE m.branchId = ${branchId}
			AND m.createdAt <= ${asOf}
	`;

	const row = rows?.[0];

	return {
		active: Number(row?.active ?? 0),
		expired: Number(row?.expired ?? 0),
		frozen: Number(row?.frozen ?? 0)
	};
}

export async function listActiveMembershipsByPlan(params: {
	branchId: string;
	asOf: Date;
	limit: number;
}): Promise<MembershipPlanBreakdown[]> {
	if (params.limit <= 0) {
		return [];
	}

	const rows = await serverPrisma.$queryRaw<
		Array<{ planId: string; planName: string; activeCount: number | bigint | string }>
	>`
		SELECT
			mm.planId AS planId,
			mp.name AS planName,
			COUNT(*) AS activeCount
		FROM MemberMembership mm
		INNER JOIN MembershipPlan mp ON mp.id = mm.planId
		INNER JOIN Member m ON m.id = mm.memberId
		WHERE mm.branchId = ${params.branchId}
			AND mp.branchId = ${params.branchId}
			AND m.branchId = ${params.branchId}
			AND mm.startAt <= ${params.asOf}
			AND mm.endAt >= ${params.asOf}
			AND m.isFrozen = false
			AND m.createdAt <= ${params.asOf}
		GROUP BY mm.planId, mp.name
		ORDER BY activeCount DESC
		LIMIT ${params.limit}
	`;

	return rows.map((row) => ({
		planId: row.planId,
		planName: row.planName,
		activeCount: Number(row.activeCount ?? 0)
	}));
}
