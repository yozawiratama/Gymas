import { serverPrisma } from '$lib/server/db/server';

export type BranchRecord = {
	id: string;
	name: string;
	code: string | null;
	address: string | null;
	isActive: boolean;
	createdAt: Date;
};

const DEFAULT_SELECT = {
	id: true,
	name: true,
	code: true,
	address: true,
	isActive: true,
	createdAt: true
} as const;

export async function listBranches(params?: { activeOnly?: boolean }): Promise<BranchRecord[]> {
	return serverPrisma.branch.findMany({
		where: params?.activeOnly ? { isActive: true } : undefined,
		orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
		select: DEFAULT_SELECT
	});
}

export async function findBranchById(id: string): Promise<BranchRecord | null> {
	return serverPrisma.branch.findUnique({
		where: { id },
		select: DEFAULT_SELECT
	});
}

export async function findBranchByCode(code: string): Promise<BranchRecord | null> {
	return serverPrisma.branch.findUnique({
		where: { code },
		select: DEFAULT_SELECT
	});
}

export async function createBranch(data: {
	name: string;
	code?: string | null;
	address?: string | null;
	isActive?: boolean;
}): Promise<BranchRecord> {
	return serverPrisma.branch.create({
		data: {
			name: data.name,
			code: data.code ?? null,
			address: data.address ?? null,
			isActive: data.isActive ?? true
		},
		select: DEFAULT_SELECT
	});
}

export async function updateBranch(
	id: string,
	data: {
		name?: string;
		code?: string | null;
		address?: string | null;
		isActive?: boolean;
	}
): Promise<BranchRecord> {
	return serverPrisma.branch.update({
		where: { id },
		data: {
			name: data.name,
			code: data.code ?? undefined,
			address: data.address ?? undefined,
			isActive: data.isActive
		},
		select: DEFAULT_SELECT
	});
}

export async function deleteBranch(id: string): Promise<void> {
	await serverPrisma.branch.delete({ where: { id } });
}
