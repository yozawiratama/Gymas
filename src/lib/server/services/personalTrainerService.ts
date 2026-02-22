import { can, type PermissionSubject } from '$lib/server/authz';
import { badRequest, forbidden, notFound } from '$lib/server/httpErrors';
import {
	createTrainer as createTrainerRecord,
	getTrainerById as fetchTrainerById,
	listTrainers as fetchTrainers,
	setTrainerActive as setTrainerActiveRecord,
	updateTrainer as updateTrainerRecord,
	type PersonalTrainerListRow,
	type PersonalTrainerRecord,
	type PersonalTrainerUpdateInput
} from '$lib/server/repositories/personalTrainerRepository';
import { record as recordAudit } from '$lib/server/services/auditService';

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 120;
const MAX_DISPLAY_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 40;
const MAX_EMAIL_LENGTH = 254;
const MAX_BIO_LENGTH = 2000;
const MAX_SPECIALTY_LENGTH = 120;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PersonalTrainerCreateData = {
	fullName: string;
	displayName?: string | null;
	phone?: string | null;
	email?: string | null;
	bio?: string | null;
	specialty?: string | null;
	photoMediaId?: string | null;
};

export type PersonalTrainerUpdateData = {
	fullName?: string;
	displayName?: string | null;
	phone?: string | null;
	email?: string | null;
	bio?: string | null;
	specialty?: string | null;
	photoMediaId?: string | null;
};

export type PersonalTrainerListPage = {
	rows: PersonalTrainerListRow[];
	pagination: {
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	};
};

function ensurePositiveInt(value: number | undefined, fallback: number): number {
	const normalized = typeof value === 'number' ? value : Number.NaN;
	if (!Number.isFinite(normalized) || normalized <= 0) {
		return fallback;
	}
	return Math.floor(normalized);
}

function normalizeRequiredName(raw: string): string {
	if (typeof raw !== 'string') {
		throw badRequest('Full name is required.', 'INVALID_INPUT');
	}
	const value = raw.trim();
	if (!value) {
		throw badRequest('Full name is required.', 'INVALID_INPUT');
	}
	if (value.length < MIN_NAME_LENGTH) {
		throw badRequest(
			`Full name must be at least ${MIN_NAME_LENGTH} characters.`,
			'INVALID_INPUT'
		);
	}
	if (value.length > MAX_NAME_LENGTH) {
		throw badRequest(`Full name must be ${MAX_NAME_LENGTH} characters or less.`, 'INVALID_INPUT');
	}
	return value;
}

function normalizeOptionalText(
	raw: string | null | undefined,
	label: string,
	max: number
): string | null {
	if (raw === undefined || raw === null) {
		return null;
	}
	if (typeof raw !== 'string') {
		throw badRequest(`${label} must be a string.`, 'INVALID_INPUT');
	}
	const value = raw.trim();
	if (!value) {
		return null;
	}
	if (value.length > max) {
		throw badRequest(`${label} must be ${max} characters or less.`, 'INVALID_INPUT');
	}
	return value;
}

function normalizeEmail(raw: string | null | undefined): string | null {
	if (raw === undefined || raw === null) {
		return null;
	}
	if (typeof raw !== 'string') {
		throw badRequest('Email must be a string.', 'INVALID_INPUT');
	}
	const value = raw.trim();
	if (!value) {
		return null;
	}
	if (value.length > MAX_EMAIL_LENGTH) {
		throw badRequest(`Email must be ${MAX_EMAIL_LENGTH} characters or less.`, 'INVALID_INPUT');
	}
	if (!EMAIL_PATTERN.test(value)) {
		throw badRequest('Email must be a valid email address.', 'INVALID_INPUT');
	}
	return value;
}

function normalizeOptionalId(raw: string | null | undefined): string | null {
	if (raw === undefined || raw === null) {
		return null;
	}
	if (typeof raw !== 'string') {
		throw badRequest('Photo media id must be a string.', 'INVALID_INPUT');
	}
	const value = raw.trim();
	return value ? value : null;
}

function requirePermission(permissions: PermissionSubject, action: 'trainers.view' | 'trainers.manage') {
	if (!can(permissions, action)) {
		throw forbidden('Forbidden.', 'FORBIDDEN');
	}
}

function normalizeId(raw: string, label: string): string {
	if (typeof raw !== 'string') {
		throw badRequest(`${label} is required.`, 'INVALID_INPUT');
	}
	const value = raw.trim();
	if (!value) {
		throw badRequest(`${label} is required.`, 'INVALID_INPUT');
	}
	return value;
}

function buildUpdateData(input: PersonalTrainerUpdateData): {
	data: PersonalTrainerUpdateInput;
	changedFields: string[];
} {
	const data: PersonalTrainerUpdateInput = {};
	const changedFields: string[] = [];

	if (input.fullName !== undefined) {
		data.fullName = normalizeRequiredName(input.fullName);
		changedFields.push('fullName');
	}
	if (input.displayName !== undefined) {
		data.displayName = normalizeOptionalText(
			input.displayName,
			'Display name',
			MAX_DISPLAY_NAME_LENGTH
		);
		changedFields.push('displayName');
	}
	if (input.phone !== undefined) {
		data.phone = normalizeOptionalText(input.phone, 'Phone', MAX_PHONE_LENGTH);
		changedFields.push('phone');
	}
	if (input.email !== undefined) {
		data.email = normalizeEmail(input.email);
		changedFields.push('email');
	}
	if (input.bio !== undefined) {
		data.bio = normalizeOptionalText(input.bio, 'Bio', MAX_BIO_LENGTH);
		changedFields.push('bio');
	}
	if (input.specialty !== undefined) {
		data.specialty = normalizeOptionalText(
			input.specialty,
			'Specialty',
			MAX_SPECIALTY_LENGTH
		);
		changedFields.push('specialty');
	}
	if (input.photoMediaId !== undefined) {
		data.photoMediaId = normalizeOptionalId(input.photoMediaId);
		changedFields.push('photoMediaId');
	}

	return { data, changedFields };
}

export async function listTrainers(input: {
	branchId: string;
	permissions: PermissionSubject;
	q?: string | null;
	activeOnly?: boolean;
	page?: number;
	pageSize?: number;
}): Promise<PersonalTrainerListPage> {
	requirePermission(input.permissions, 'trainers.view');

	const query = input.q?.trim() ?? '';
	const pageSize = Math.min(
		ensurePositiveInt(input.pageSize, DEFAULT_PAGE_SIZE),
		MAX_PAGE_SIZE
	);
	const requestedPage = ensurePositiveInt(input.page, 1);

	const initial = await fetchTrainers({
		branchId: input.branchId,
		q: query ? query : null,
		activeOnly: input.activeOnly ?? false,
		page: requestedPage,
		pageSize
	});

	const totalPages = Math.max(1, Math.ceil(initial.total / pageSize));
	const safePage =
		initial.total === 0 ? 1 : Math.min(Math.max(requestedPage, 1), totalPages);

	let rows = initial.rows;
	if (safePage !== requestedPage) {
		const adjusted = await fetchTrainers({
			branchId: input.branchId,
			q: query ? query : null,
			activeOnly: input.activeOnly ?? false,
			page: safePage,
			pageSize
		});
		rows = adjusted.rows;
	}

	return {
		rows,
		pagination: {
			total: initial.total,
			page: safePage,
			pageSize,
			totalPages
		}
	};
}

export async function getTrainerById(input: {
	branchId: string;
	permissions: PermissionSubject;
	id: string;
}): Promise<PersonalTrainerRecord> {
	requirePermission(input.permissions, 'trainers.view');

	const trainerId = normalizeId(input.id, 'Trainer id');
	const trainer = await fetchTrainerById(input.branchId, trainerId);
	if (!trainer) {
		throw notFound('Trainer not found.', 'TRAINER_NOT_FOUND');
	}
	return trainer;
}

export async function createTrainer(input: {
	branchId: string;
	permissions: PermissionSubject;
	actorUserId: string;
	data: PersonalTrainerCreateData;
}): Promise<PersonalTrainerRecord> {
	requirePermission(input.permissions, 'trainers.manage');

	const branchId = normalizeId(input.branchId, 'Branch id');
	const actorUserId = normalizeId(input.actorUserId, 'Actor user id');

	const payload = {
		fullName: normalizeRequiredName(input.data.fullName),
		displayName: normalizeOptionalText(
			input.data.displayName,
			'Display name',
			MAX_DISPLAY_NAME_LENGTH
		),
		phone: normalizeOptionalText(input.data.phone, 'Phone', MAX_PHONE_LENGTH),
		email: normalizeEmail(input.data.email),
		bio: normalizeOptionalText(input.data.bio, 'Bio', MAX_BIO_LENGTH),
		specialty: normalizeOptionalText(input.data.specialty, 'Specialty', MAX_SPECIALTY_LENGTH),
		photoMediaId: normalizeOptionalId(input.data.photoMediaId)
	};

	const trainer = await createTrainerRecord({
		branchId,
		createdByUserId: actorUserId,
		...payload
	});

	await recordAudit({
		action: 'TRAINER_CREATED',
		actorUserId,
		entityType: 'PersonalTrainer',
		entityId: trainer.id
	});

	return trainer;
}

export async function updateTrainer(input: {
	branchId: string;
	permissions: PermissionSubject;
	actorUserId: string;
	id: string;
	data: PersonalTrainerUpdateData;
}): Promise<PersonalTrainerRecord> {
	requirePermission(input.permissions, 'trainers.manage');

	const branchId = normalizeId(input.branchId, 'Branch id');
	const actorUserId = normalizeId(input.actorUserId, 'Actor user id');
	const trainerId = normalizeId(input.id, 'Trainer id');

	const { data, changedFields } = buildUpdateData(input.data);
	if (changedFields.length === 0) {
		throw badRequest('No trainer updates provided.', 'INVALID_INPUT');
	}

	const trainer = await updateTrainerRecord(branchId, trainerId, data);
	if (!trainer) {
		throw notFound('Trainer not found.', 'TRAINER_NOT_FOUND');
	}

	await recordAudit({
		action: 'TRAINER_UPDATED',
		actorUserId,
		entityType: 'PersonalTrainer',
		entityId: trainer.id,
		meta: {
			changedFields
		}
	});

	return trainer;
}

export async function setTrainerActive(input: {
	branchId: string;
	permissions: PermissionSubject;
	actorUserId: string;
	id: string;
	isActive: boolean;
}): Promise<PersonalTrainerRecord> {
	requirePermission(input.permissions, 'trainers.manage');

	const branchId = normalizeId(input.branchId, 'Branch id');
	const actorUserId = normalizeId(input.actorUserId, 'Actor user id');
	const trainerId = normalizeId(input.id, 'Trainer id');

	if (typeof input.isActive !== 'boolean') {
		throw badRequest('Active flag must be a boolean.', 'INVALID_INPUT');
	}

	const trainer = await setTrainerActiveRecord(branchId, trainerId, input.isActive);
	if (!trainer) {
		throw notFound('Trainer not found.', 'TRAINER_NOT_FOUND');
	}

	await recordAudit({
		action: 'TRAINER_TOGGLED',
		actorUserId,
		entityType: 'PersonalTrainer',
		entityId: trainer.id,
		meta: {
			isActive: input.isActive
		}
	});

	return trainer;
}
