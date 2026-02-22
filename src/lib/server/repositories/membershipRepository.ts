import { serverPrisma } from '$lib/server/db/server';

const prisma = serverPrisma as any;

export type MembershipPlanRecord = {
	id: string;
	name: string;
	branchId: string;
	durationDays: number;
	priceCents: number | null;
	description: string | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type MembershipPlanCreateInput = {
	name: string;
	durationDays: number;
	priceCents?: number | null;
	description?: string | null;
	isActive?: boolean;
};

export type MembershipPlanUpdateInput = {
	name?: string;
	durationDays?: number;
	priceCents?: number | null;
	description?: string | null;
	isActive?: boolean;
};

export type MemberMembershipRecord = {
	id: string;
	memberId: string;
	planId: string;
	branchId: string;
	startAt: Date;
	endAt: Date;
	cancelledAt: Date | null;
	cancelReason: string | null;
	createdAt: Date;
	createdByUserId: string;
	plan: {
		id: string;
		name: string;
		durationDays: number;
		priceCents: number | null;
		description: string | null;
		isActive: boolean;
	};
	createdBy: {
		id: string;
		username: string;
	} | null;
};

export type MemberMembershipListRecord = {
	id: string;
	memberId: string;
	planId: string;
	startAt: Date;
	endAt: Date;
	cancelledAt: Date | null;
	createdAt: Date;
	plan: {
		name: string;
	};
};

export async function listPlans(params: {
	branchId: string;
	activeOnly?: boolean;
}): Promise<MembershipPlanRecord[]> {
	return prisma.membershipPlan.findMany({
		where: params.activeOnly ? { branchId: params.branchId, isActive: true } : { branchId: params.branchId },
		orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
		select: {
			id: true,
			name: true,
			branchId: true,
			durationDays: true,
			priceCents: true,
			description: true,
			isActive: true,
			createdAt: true,
			updatedAt: true
		}
	});
}

export async function getPlanById(
	branchId: string,
	planId: string
): Promise<MembershipPlanRecord | null> {
	return prisma.membershipPlan.findFirst({
		where: { id: planId, branchId },
		select: {
			id: true,
			name: true,
			branchId: true,
			durationDays: true,
			priceCents: true,
			description: true,
			isActive: true,
			createdAt: true,
			updatedAt: true
		}
	});
}

export async function createPlan(
	branchId: string,
	data: MembershipPlanCreateInput
): Promise<MembershipPlanRecord> {
	return prisma.membershipPlan.create({
		data: {
			name: data.name,
			branchId,
			durationDays: data.durationDays,
			priceCents: data.priceCents ?? null,
			description: data.description ?? null,
			isActive: data.isActive ?? true
		},
		select: {
			id: true,
			name: true,
			branchId: true,
			durationDays: true,
			priceCents: true,
			description: true,
			isActive: true,
			createdAt: true,
			updatedAt: true
		}
	});
}

export async function updatePlan(
	planId: string,
	data: MembershipPlanUpdateInput
): Promise<MembershipPlanRecord> {
	return prisma.membershipPlan.update({
		where: { id: planId },
		data: {
			name: data.name,
			durationDays: data.durationDays,
			priceCents: data.priceCents,
			description: data.description,
			isActive: data.isActive
		},
		select: {
			id: true,
			name: true,
			branchId: true,
			durationDays: true,
			priceCents: true,
			description: true,
			isActive: true,
			createdAt: true,
			updatedAt: true
		}
	});
}

export async function createMemberMembership(data: {
	memberId: string;
	planId: string;
	branchId: string;
	startAt: Date;
	endAt: Date;
	createdByUserId: string;
}): Promise<MemberMembershipRecord> {
	return prisma.memberMembership.create({
		data: {
			memberId: data.memberId,
			planId: data.planId,
			branchId: data.branchId,
			startAt: data.startAt,
			endAt: data.endAt,
			createdByUserId: data.createdByUserId
		},
		select: {
			id: true,
			memberId: true,
			planId: true,
			branchId: true,
			startAt: true,
			endAt: true,
			cancelledAt: true,
			cancelReason: true,
			createdAt: true,
			createdByUserId: true,
			plan: {
				select: {
					id: true,
					name: true,
					durationDays: true,
					priceCents: true,
					description: true,
					isActive: true
				}
			},
			createdBy: {
				select: {
					id: true,
					username: true
				}
			}
		}
	});
}

export async function listMemberMemberships(
	memberId: string,
	branchId: string,
	limit: number
): Promise<MemberMembershipRecord[]> {
	return prisma.memberMembership.findMany({
		where: { memberId, branchId },
		orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
		take: limit,
		select: {
			id: true,
			memberId: true,
			planId: true,
			branchId: true,
			startAt: true,
			endAt: true,
			cancelledAt: true,
			cancelReason: true,
			createdAt: true,
			createdByUserId: true,
			plan: {
				select: {
					id: true,
					name: true,
					durationDays: true,
					priceCents: true,
					description: true,
					isActive: true
				}
			},
			createdBy: {
				select: {
					id: true,
					username: true
				}
			}
		}
	});
}

export async function listAllMemberMemberships(
	memberId: string,
	branchId: string
): Promise<MemberMembershipRecord[]> {
	return prisma.memberMembership.findMany({
		where: { memberId, branchId },
		orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
		select: {
			id: true,
			memberId: true,
			planId: true,
			branchId: true,
			startAt: true,
			endAt: true,
			cancelledAt: true,
			cancelReason: true,
			createdAt: true,
			createdByUserId: true,
			plan: {
				select: {
					id: true,
					name: true,
					durationDays: true,
					priceCents: true,
					description: true,
					isActive: true
				}
			},
			createdBy: {
				select: {
					id: true,
					username: true
				}
			}
		}
	});
}

export async function listMembershipsForMembers(params: {
	branchId: string;
	memberIds: string[];
}): Promise<MemberMembershipListRecord[]> {
	if (!params.memberIds.length) {
		return [];
	}

	return prisma.memberMembership.findMany({
		where: {
			branchId: params.branchId,
			memberId: { in: params.memberIds }
		},
		select: {
			id: true,
			memberId: true,
			planId: true,
			startAt: true,
			endAt: true,
			cancelledAt: true,
			createdAt: true,
			plan: {
				select: {
					name: true
				}
			}
		}
	});
}

export async function getCurrentMemberMembership(
	memberId: string,
	branchId: string,
	atDate: Date
): Promise<MemberMembershipRecord | null> {
	return prisma.memberMembership.findFirst({
		where: {
			memberId,
			branchId,
			startAt: { lte: atDate },
			endAt: { gte: atDate },
			OR: [{ cancelledAt: null }, { cancelledAt: { gt: atDate } }]
		},
		orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
		select: {
			id: true,
			memberId: true,
			planId: true,
			branchId: true,
			startAt: true,
			endAt: true,
			cancelledAt: true,
			cancelReason: true,
			createdAt: true,
			createdByUserId: true,
			plan: {
				select: {
					id: true,
					name: true,
					durationDays: true,
					priceCents: true,
					description: true,
					isActive: true
				}
			},
			createdBy: {
				select: {
					id: true,
					username: true
				}
			}
		}
	});
}

export async function getMemberMembershipById(
	memberId: string,
	branchId: string,
	membershipId: string
): Promise<MemberMembershipRecord | null> {
	return prisma.memberMembership.findFirst({
		where: { id: membershipId, memberId, branchId },
		select: {
			id: true,
			memberId: true,
			planId: true,
			branchId: true,
			startAt: true,
			endAt: true,
			cancelledAt: true,
			cancelReason: true,
			createdAt: true,
			createdByUserId: true,
			plan: {
				select: {
					id: true,
					name: true,
					durationDays: true,
					priceCents: true,
					description: true,
					isActive: true
				}
			},
			createdBy: {
				select: {
					id: true,
					username: true
				}
			}
		}
	});
}

export async function cancelMemberMembership(
	membershipId: string,
	cancelledAt: Date,
	cancelReason: string | null
): Promise<MemberMembershipRecord> {
	return prisma.memberMembership.update({
		where: { id: membershipId },
		data: {
			cancelledAt,
			cancelReason: cancelReason ?? null
		},
		select: {
			id: true,
			memberId: true,
			planId: true,
			branchId: true,
			startAt: true,
			endAt: true,
			cancelledAt: true,
			createdAt: true,
			createdByUserId: true,
			plan: {
				select: {
					id: true,
					name: true,
					durationDays: true,
					priceCents: true,
					description: true,
					isActive: true
				}
			},
			createdBy: {
				select: {
					id: true,
					username: true
				}
			}
		}
	});
}
