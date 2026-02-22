import type { LocalTxClient } from '$lib/server/db/localTx';
import type { Prisma } from '@prisma/client';

export type AttendanceRecord = {
	id: string;
	memberId: string;
	branchId: string;
	membershipId: string | null;
	checkInAt: Date;
	checkOutAt: Date | null;
	source: string;
	memberSnapshot: Prisma.JsonValue | null;
	createdAt: Date;
};

export type AttendanceCreateInput = {
	memberId: string;
	branchId: string;
	membershipId?: string | null;
	checkInAt: Date;
	source: 'MANUAL' | 'AUTO';
	memberSnapshot: Prisma.InputJsonValue | null;
};

export async function findRecentCheckIn(
	tx: LocalTxClient,
	params: { memberId: string; branchId: string; since: Date }
): Promise<AttendanceRecord | null> {
	return tx.attendance.findFirst({
		where: {
			memberId: params.memberId,
			branchId: params.branchId,
			checkInAt: {
				gte: params.since
			}
		},
		orderBy: { checkInAt: 'desc' },
		select: {
			id: true,
			memberId: true,
			branchId: true,
			membershipId: true,
			checkInAt: true,
			checkOutAt: true,
			source: true,
			memberSnapshot: true,
			createdAt: true
		}
	});
}

export async function createCheckIn(
	tx: LocalTxClient,
	data: AttendanceCreateInput
): Promise<AttendanceRecord> {
	return tx.attendance.create({
		data: {
			memberId: data.memberId,
			branchId: data.branchId,
			membershipId: data.membershipId ?? null,
			checkInAt: data.checkInAt,
			source: data.source,
			memberSnapshot: data.memberSnapshot ?? undefined
		},
		select: {
			id: true,
			memberId: true,
			branchId: true,
			membershipId: true,
			checkInAt: true,
			checkOutAt: true,
			source: true,
			memberSnapshot: true,
			createdAt: true
		}
	});
}
