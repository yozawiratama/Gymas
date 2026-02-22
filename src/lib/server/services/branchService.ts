import { badRequest, conflict, notFound } from '$lib/server/httpErrors';
import { getRuntimeConfig } from '$lib/server/config';
import {
	createBranch as createBranchRecord,
	deleteBranch as deleteBranchRecord,
	findBranchByCode,
	findBranchById,
	listBranches as listBranchesRecord,
	updateBranch as updateBranchRecord,
	type BranchRecord
} from '$lib/server/repositories/branchRepository';

const DEFAULT_BRANCH_NAME = 'Main Branch';
const DEFAULT_BRANCH_CODE = 'MAIN';
const MAX_NAME_LENGTH = 80;
const MIN_NAME_LENGTH = 2;
const MAX_CODE_LENGTH = 24;
const MAX_ADDRESS_LENGTH = 200;

function normalizeName(raw: string): string {
	const value = raw.trim();
	if (!value) {
		throw badRequest('Branch name is required.', 'INVALID_INPUT');
	}
	if (value.length < MIN_NAME_LENGTH) {
		throw badRequest(
			`Branch name must be at least ${MIN_NAME_LENGTH} characters.`,
			'INVALID_INPUT'
		);
	}
	if (value.length > MAX_NAME_LENGTH) {
		throw badRequest(
			`Branch name must be ${MAX_NAME_LENGTH} characters or less.`,
			'INVALID_INPUT'
		);
	}
	return value;
}

function normalizeCode(raw?: string | null): string | null {
	if (raw === undefined || raw === null) return null;
	const value = raw.trim();
	if (!value) return null;
	if (value.length > MAX_CODE_LENGTH) {
		throw badRequest(`Branch code must be ${MAX_CODE_LENGTH} characters or less.`, 'INVALID_INPUT');
	}
	return value;
}

function normalizeAddress(raw?: string | null): string | null {
	if (raw === undefined || raw === null) return null;
	const value = raw.trim();
	if (!value) return null;
	if (value.length > MAX_ADDRESS_LENGTH) {
		throw badRequest(
			`Branch address must be ${MAX_ADDRESS_LENGTH} characters or less.`,
			'INVALID_INPUT'
		);
	}
	return value;
}

function isUniqueConstraintError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code?: string }).code === 'P2002'
	);
}

function isForeignKeyConstraintError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code?: string }).code === 'P2003'
	);
}

function resolveDefaultBranchCode(): string {
	try {
		const gymId = getRuntimeConfig().gymId.trim();
		if (gymId) {
			return gymId;
		}
	} catch {
		// Fall back when runtime config is unavailable (e.g. local scripts).
	}
	return DEFAULT_BRANCH_CODE;
}

export async function listBranches(options?: { activeOnly?: boolean }): Promise<BranchRecord[]> {
	return listBranchesRecord({ activeOnly: options?.activeOnly });
}

export async function getBranchById(id: string): Promise<BranchRecord | null> {
	const trimmed = id.trim();
	if (!trimmed) {
		throw badRequest('Branch id is required.', 'INVALID_INPUT');
	}
	return findBranchById(trimmed);
}

export async function ensureDefaultBranch(): Promise<BranchRecord> {
	const code = resolveDefaultBranchCode();
	const byCode = await findBranchByCode(code);
	if (byCode) {
		return byCode;
	}

	const existing = await listBranchesRecord({ activeOnly: true });
	if (existing.length > 0) {
		const candidate = existing[0];
		if (code && candidate.code !== code && candidate.code === DEFAULT_BRANCH_CODE) {
			try {
				return await updateBranchRecord(candidate.id, { code });
			} catch {
				return candidate;
			}
		}
		return candidate;
	}

	return createBranchRecord({
		name: DEFAULT_BRANCH_NAME,
		code,
		isActive: true
	});
}

export async function createBranch(input: {
	name: string;
	code?: string | null;
	address?: string | null;
	isActive?: boolean;
}): Promise<BranchRecord> {
	const name = normalizeName(input.name);
	const code = normalizeCode(input.code);
	const address = normalizeAddress(input.address);

	try {
		return await createBranchRecord({
			name,
			code,
			address,
			isActive: input.isActive ?? true
		});
	} catch (error) {
		if (isUniqueConstraintError(error)) {
			throw conflict('Branch code must be unique.', 'BRANCH_CODE_CONFLICT');
		}
		throw error;
	}
}

export async function updateBranch(
	branchId: string,
	input: {
		name?: string | null;
		code?: string | null;
		address?: string | null;
		isActive?: boolean | null;
	}
): Promise<BranchRecord> {
	const existing = await findBranchById(branchId);
	if (!existing) {
		throw notFound('Branch not found.', 'BRANCH_NOT_FOUND');
	}

	const name =
		input.name !== undefined && input.name !== null ? normalizeName(input.name) : existing.name;
	const code =
		input.code !== undefined ? normalizeCode(input.code) : existing.code;
	const address =
		input.address !== undefined ? normalizeAddress(input.address) : existing.address;
	const isActive = input.isActive ?? existing.isActive;

	try {
		return await updateBranchRecord(branchId, {
			name,
			code,
			address,
			isActive
		});
	} catch (error) {
		if (isUniqueConstraintError(error)) {
			throw conflict('Branch code must be unique.', 'BRANCH_CODE_CONFLICT');
		}
		throw error;
	}
}

export async function deleteBranch(branchId: string): Promise<void> {
	const existing = await findBranchById(branchId);
	if (!existing) {
		throw notFound('Branch not found.', 'BRANCH_NOT_FOUND');
	}

	try {
		await deleteBranchRecord(branchId);
	} catch (error) {
		if (isForeignKeyConstraintError(error)) {
			throw conflict('Branch cannot be deleted while it has data.', 'BRANCH_HAS_DATA');
		}
		throw error;
	}
}
