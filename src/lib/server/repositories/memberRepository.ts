import { serverPrisma } from '$lib/server/db/server';
import type { LocalTxClient } from '$lib/server/db/localTx';
import type { MemberStatus, Prisma } from '@prisma/client';

export type MemberListItem = {
	id: string;
	memberCode: string;
	firstName: string;
	lastName: string;
	status: string;
};

export type MemberSearchResult = {
	id: string;
	memberCode: string;
	firstName: string;
	lastName: string;
	status: string;
};

export type MemberSnapshot = {
	id: string;
	memberCode: string;
	firstName: string;
	lastName: string;
	email: string | null;
	phone: string | null;
	status: string;
};

export type MemberProfileBase = {
	id: string;
	memberCode: string;
	firstName: string;
	lastName: string;
	status: string;
	joinedAt: Date;
};

export type MemberEditProfile = {
	id: string;
	memberCode: string;
	firstName: string;
	lastName: string;
	phone: string | null;
};

export type MemberCreateInput = {
	branchId: string;
	memberCode: string;
	firstName: string;
	lastName: string;
	email?: string | null;
	phone?: string | null;
};

export type MemberUpdateInput = {
	memberCode?: string;
	firstName?: string;
	lastName?: string;
	email?: string | null;
	phone?: string | null;
};

export type MemberFreezeStatus = {
	id: string;
	isFrozen: boolean;
};

export type MemberTagItem = {
	id: string;
	name: string;
};

export type MemberFlagItem = {
	id: string;
	type: string;
	createdAt: Date;
};

export type MemberNoteItem = {
	id: string;
	text: string;
	createdAt: Date;
	author: string | null;
};

export type AttendanceSummary = {
	totalCount: number;
	lastCheckInAt: Date | null;
};

export type AttendanceRecentItem = {
	id: string;
	checkedInAt: Date;
};

export type PaymentSummary = {
	totalCount: number;
	lastPaidAt: Date | null;
};

export type PaymentRecentItem = {
	id: string;
	amount: Prisma.Decimal;
	paidAt: Date;
	method: string;
};

export async function listMembers(branchId: string): Promise<MemberListItem[]> {
	return serverPrisma.member.findMany({
		where: { branchId },
		select: {
			id: true,
			memberCode: true,
			firstName: true,
			lastName: true,
			status: true
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
	});
}

export async function searchMembersByCode(
	branchId: string,
	query: string,
	limit = 15
): Promise<MemberSearchResult[]> {
	return serverPrisma.member.findMany({
		where: {
			branchId,
			memberCode: {
				startsWith: query
			}
		},
		orderBy: {
			memberCode: 'asc'
		},
		take: limit,
		select: {
			id: true,
			memberCode: true,
			firstName: true,
			lastName: true,
			status: true
		}
	});
}

export async function searchMembersByName(
	branchId: string,
	query: string,
	limit = 15,
	includePhone = false
): Promise<MemberSearchResult[]> {
	const orFilters: Prisma.MemberWhereInput[] = [
		{ firstName: { contains: query } },
		{ lastName: { contains: query } }
	];

	if (includePhone) {
		orFilters.push({ phone: { contains: query } });
	}

	return serverPrisma.member.findMany({
		where: {
			AND: [{ branchId }, { OR: orFilters }]
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
		take: limit,
		select: {
			id: true,
			memberCode: true,
			firstName: true,
			lastName: true,
			status: true
		}
	});
}

export async function countMembers(
	branchId: string,
	where: Prisma.MemberWhereInput
): Promise<number> {
	const scopedWhere = where ? { AND: [{ branchId }, where] } : { branchId };
	return serverPrisma.member.count({ where: scopedWhere });
}

export async function listMembersForPage(params: {
	branchId: string;
	where: Prisma.MemberWhereInput;
	orderBy: Prisma.MemberOrderByWithRelationInput[];
	skip: number;
	take: number;
}): Promise<MemberListItem[]> {
	const scopedWhere = params.where ? { AND: [{ branchId: params.branchId }, params.where] } : { branchId: params.branchId };
	return serverPrisma.member.findMany({
		where: scopedWhere,
		orderBy: params.orderBy,
		skip: params.skip,
		take: params.take,
		select: {
			id: true,
			memberCode: true,
			firstName: true,
			lastName: true,
			status: true
		}
	});
}

export async function listMembersForQuery(params: {
	branchId: string;
	where: Prisma.MemberWhereInput;
	orderBy: Prisma.MemberOrderByWithRelationInput[];
}): Promise<MemberListItem[]> {
	const scopedWhere = params.where ? { AND: [{ branchId: params.branchId }, params.where] } : { branchId: params.branchId };
	return serverPrisma.member.findMany({
		where: scopedWhere,
		orderBy: params.orderBy,
		select: {
			id: true,
			memberCode: true,
			firstName: true,
			lastName: true,
			status: true
		}
	});
}

export async function createMember(input: MemberCreateInput): Promise<MemberProfileBase> {
	return serverPrisma.member.create({
		data: {
			branchId: input.branchId,
			memberCode: input.memberCode,
			firstName: input.firstName,
			lastName: input.lastName,
			email: input.email ?? null,
			phone: input.phone ?? null
		},
		select: {
			id: true,
			memberCode: true,
			firstName: true,
			lastName: true,
			status: true,
			joinedAt: true
		}
	});
}

export async function updateMember(
	branchId: string,
	memberId: string,
	data: MemberUpdateInput
): Promise<MemberProfileBase | null> {
	const updated = await serverPrisma.member.updateMany({
		where: { id: memberId, branchId },
		data
	});

	if (updated.count === 0) {
		return null;
	}

	return getMemberProfileBase(branchId, memberId);
}

export async function setMemberStatus(
	branchId: string,
	memberId: string,
	status: MemberStatus
): Promise<MemberProfileBase | null> {
	const updated = await serverPrisma.member.updateMany({
		where: { id: memberId, branchId },
		data: { status }
	});

	if (updated.count === 0) {
		return null;
	}

	return getMemberProfileBase(branchId, memberId);
}

export async function getMemberEditProfile(
	branchId: string,
	memberId: string
): Promise<MemberEditProfile | null> {
	return serverPrisma.member.findFirst({
		where: { id: memberId, branchId },
		select: {
			id: true,
			memberCode: true,
			firstName: true,
			lastName: true,
			phone: true
		}
	});
}

export async function getMemberProfileBase(
	branchId: string,
	memberId: string
): Promise<MemberProfileBase | null> {
	return serverPrisma.member.findFirst({
		where: { id: memberId, branchId },
		select: {
			id: true,
			memberCode: true,
			firstName: true,
			lastName: true,
			status: true,
			joinedAt: true
		}
	});
}

export async function getMemberFreezeStatus(
	branchId: string,
	memberId: string
): Promise<MemberFreezeStatus | null> {
	return serverPrisma.member.findFirst({
		where: { id: memberId, branchId },
		select: {
			id: true,
			isFrozen: true
		}
	});
}

export async function listMemberTags(branchId: string, memberId: string): Promise<MemberTagItem[]> {
	const rows = await serverPrisma.memberTag.findMany({
		where: { memberId, member: { branchId } },
		orderBy: {
			tag: {
				name: 'asc'
			}
		},
		select: {
			tag: {
				select: {
					id: true,
					name: true
				}
			}
		}
	});

	return rows.map((row) => row.tag);
}

export async function listMemberFlags(
	branchId: string,
	memberId: string,
	limit: number
): Promise<MemberFlagItem[]> {
	const rows = await serverPrisma.memberFlag.findMany({
		where: { memberId, member: { branchId } },
		orderBy: { createdAt: 'desc' },
		take: limit,
		select: {
			id: true,
			flag: true,
			createdAt: true
		}
	});

	return rows.map((row) => ({
		id: row.id,
		type: row.flag,
		createdAt: row.createdAt
	}));
}

export async function listMemberNotes(
	branchId: string,
	memberId: string,
	limit: number
): Promise<MemberNoteItem[]> {
	const rows = await serverPrisma.memberNote.findMany({
		where: { memberId, member: { branchId } },
		orderBy: { createdAt: 'desc' },
		take: limit,
		select: {
			id: true,
			note: true,
			createdAt: true,
			createdBy: {
				select: {
					username: true
				}
			}
		}
	});

	return rows.map((row) => ({
		id: row.id,
		text: row.note,
		createdAt: row.createdAt,
		author: row.createdBy?.username ?? null
	}));
}

export async function getAttendanceSummary(
	branchId: string,
	memberId: string
): Promise<AttendanceSummary> {
	const summary = await serverPrisma.attendance.aggregate({
		where: { memberId, branchId },
		_count: { _all: true },
		_max: { checkInAt: true }
	});

	return {
		totalCount: summary._count._all ?? 0,
		lastCheckInAt: summary._max.checkInAt ?? null
	};
}

export async function listRecentAttendance(
	branchId: string,
	memberId: string,
	limit: number
): Promise<AttendanceRecentItem[]> {
	const rows = await serverPrisma.attendance.findMany({
		where: { memberId, branchId },
		orderBy: { checkInAt: 'desc' },
		take: limit,
		select: {
			id: true,
			checkInAt: true
		}
	});

	return rows.map((row) => ({
		id: row.id,
		checkedInAt: row.checkInAt
	}));
}

export async function getPaymentSummary(
	branchId: string,
	memberId: string
): Promise<PaymentSummary> {
	const summary = await serverPrisma.payment.aggregate({
		where: {
			memberId,
			branchId,
			deletedAt: null,
			status: { not: 'VOID' }
		},
		_count: { _all: true },
		_max: { paidAt: true }
	});

	return {
		totalCount: summary._count._all ?? 0,
		lastPaidAt: summary._max.paidAt ?? null
	};
}

export async function listRecentPayments(
	branchId: string,
	memberId: string,
	limit: number
): Promise<PaymentRecentItem[]> {
	return serverPrisma.payment.findMany({
		where: {
			memberId,
			branchId,
			deletedAt: null
		},
		orderBy: { paidAt: 'desc' },
		take: limit,
		select: {
			id: true,
			amount: true,
			paidAt: true,
			method: true
		}
	});
}

export async function findMemberForCheckIn(
	tx: LocalTxClient,
	params: { branchId: string; memberId?: string; memberCode?: string }
): Promise<MemberSnapshot | null> {
	if (params.memberId) {
		return tx.member.findFirst({
			where: { id: params.memberId, branchId: params.branchId },
			select: {
				id: true,
				memberCode: true,
				firstName: true,
				lastName: true,
				email: true,
				phone: true,
				status: true
			}
		});
	}

	if (params.memberCode) {
		return tx.member.findFirst({
			where: { memberCode: params.memberCode, branchId: params.branchId },
			select: {
				id: true,
				memberCode: true,
				firstName: true,
				lastName: true,
				email: true,
				phone: true,
				status: true
			}
		});
	}

	return null;
}
