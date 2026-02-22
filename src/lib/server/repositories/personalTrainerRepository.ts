import { serverPrisma } from '$lib/server/db/server';
import type { Prisma } from '@prisma/client';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export type PersonalTrainerListRow = {
	id: string;
	fullName: string;
	displayName: string | null;
	specialty: string | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
	photoMediaId: string | null;
};

export type PersonalTrainerListResult = {
	total: number;
	rows: PersonalTrainerListRow[];
};

export type PersonalTrainerRecord = {
	id: string;
	branchId: string;
	fullName: string;
	displayName: string | null;
	phone: string | null;
	email: string | null;
	bio: string | null;
	specialty: string | null;
	photoMediaId: string | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
	createdByUserId: string | null;
};

export type PersonalTrainerCreateInput = {
	branchId: string;
	fullName: string;
	displayName?: string | null;
	phone?: string | null;
	email?: string | null;
	bio?: string | null;
	specialty?: string | null;
	photoMediaId?: string | null;
	createdByUserId?: string | null;
	isActive?: boolean;
};

export type PersonalTrainerUpdateInput = {
	fullName?: string;
	displayName?: string | null;
	phone?: string | null;
	email?: string | null;
	bio?: string | null;
	specialty?: string | null;
	photoMediaId?: string | null;
};

function ensurePositiveInt(value: number | undefined, fallback: number): number {
	const normalized = typeof value === 'number' ? value : Number.NaN;
	if (!Number.isFinite(normalized) || normalized <= 0) {
		return fallback;
	}
	return Math.floor(normalized);
}

function buildTrainerWhere(params: {
	branchId: string;
	q?: string | null;
	activeOnly?: boolean;
}): Prisma.PersonalTrainerWhereInput {
	const filters: Prisma.PersonalTrainerWhereInput[] = [{ branchId: params.branchId }];

	if (params.activeOnly) {
		filters.push({ isActive: true });
	}

	const query = params.q?.trim();
	if (query) {
		filters.push({
			OR: [
				{ fullName: { contains: query } },
				{ displayName: { contains: query } }
			]
		});
	}

	if (filters.length === 1) {
		return filters[0];
	}

	return { AND: filters };
}

const TRAINER_DETAIL_SELECT = {
	id: true,
	branchId: true,
	fullName: true,
	displayName: true,
	phone: true,
	email: true,
	bio: true,
	specialty: true,
	photoMediaId: true,
	isActive: true,
	createdAt: true,
	updatedAt: true,
	createdByUserId: true
} satisfies Prisma.PersonalTrainerSelect;

const TRAINER_LIST_SELECT = {
	id: true,
	fullName: true,
	displayName: true,
	specialty: true,
	isActive: true,
	createdAt: true,
	updatedAt: true,
	photoMediaId: true
} satisfies Prisma.PersonalTrainerSelect;

export async function listTrainers(params: {
	branchId: string;
	q?: string | null;
	activeOnly?: boolean;
	page?: number;
	pageSize?: number;
}): Promise<PersonalTrainerListResult> {
	const pageSize = Math.min(
		ensurePositiveInt(params.pageSize, DEFAULT_PAGE_SIZE),
		MAX_PAGE_SIZE
	);
	const page = ensurePositiveInt(params.page, 1);
	const where = buildTrainerWhere({
		branchId: params.branchId,
		q: params.q ?? null,
		activeOnly: params.activeOnly ?? false
	});
	const skip = (page - 1) * pageSize;

	const [total, rows] = await Promise.all([
		serverPrisma.personalTrainer.count({ where }),
		serverPrisma.personalTrainer.findMany({
			where,
			orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
			skip,
			take: pageSize,
			select: TRAINER_LIST_SELECT
		})
	]);

	return { total, rows };
}

export async function getTrainerById(
	branchId: string,
	trainerId: string
): Promise<PersonalTrainerRecord | null> {
	return serverPrisma.personalTrainer.findFirst({
		where: { id: trainerId, branchId },
		select: TRAINER_DETAIL_SELECT
	});
}

export async function createTrainer(
	data: PersonalTrainerCreateInput
): Promise<PersonalTrainerRecord> {
	return serverPrisma.personalTrainer.create({
		data: {
			branchId: data.branchId,
			fullName: data.fullName,
			displayName: data.displayName ?? null,
			phone: data.phone ?? null,
			email: data.email ?? null,
			bio: data.bio ?? null,
			specialty: data.specialty ?? null,
			photoMediaId: data.photoMediaId ?? null,
			isActive: data.isActive ?? true,
			createdByUserId: data.createdByUserId ?? null
		},
		select: TRAINER_DETAIL_SELECT
	});
}

export async function updateTrainer(
	branchId: string,
	trainerId: string,
	data: PersonalTrainerUpdateInput
): Promise<PersonalTrainerRecord | null> {
	const updated = await serverPrisma.personalTrainer.updateMany({
		where: { id: trainerId, branchId },
		data
	});

	if (updated.count === 0) {
		return null;
	}

	return serverPrisma.personalTrainer.findFirst({
		where: { id: trainerId, branchId },
		select: TRAINER_DETAIL_SELECT
	});
}

export async function setTrainerActive(
	branchId: string,
	trainerId: string,
	isActive: boolean
): Promise<PersonalTrainerRecord | null> {
	const updated = await serverPrisma.personalTrainer.updateMany({
		where: { id: trainerId, branchId },
		data: { isActive }
	});

	if (updated.count === 0) {
		return null;
	}

	return serverPrisma.personalTrainer.findFirst({
		where: { id: trainerId, branchId },
		select: TRAINER_DETAIL_SELECT
	});
}
