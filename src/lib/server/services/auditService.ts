import { Prisma as PrismaValue } from '$lib/server/db/prisma';
import type { Prisma as PrismaTypes } from '@prisma/client';
import { logger } from '$lib/server/logger';
import {
	createAuditLog,
	listAuditLogs as fetchAuditLogs,
	type AuditLogListRow
} from '$lib/server/repositories/auditRepository';

const MAX_ACTION_LENGTH = 80;
const MAX_ENTITY_LENGTH = 120;
const MAX_IP_LENGTH = 64;
const MAX_USER_AGENT_LENGTH = 240;
const MAX_META_STRING_LENGTH = 200;
const MAX_META_KEYS = 30;
const MAX_META_ARRAY = 30;
const MAX_META_DEPTH = 4;
const MAX_META_JSON_CHARS = 2000;

export type AuditAction =
	| 'LOGIN_SUCCESS'
	| 'LOGIN_FAILED'
	| 'LOGIN_FAILURE'
	| 'LOGOUT'
	| 'PLAN_CREATED'
	| 'PLAN_UPDATED'
	| 'MEMBERSHIP_ASSIGNED'
	| 'MEMBERSHIP_CANCELLED'
	| 'MEMBERSHIP_PLAN_TOGGLED'
	| 'PAYMENT_CREATED'
	| 'PAYMENT_VOIDED'
	| 'MEMBER_UPDATED'
	| 'TRAINER_CREATED'
	| 'TRAINER_UPDATED'
	| 'TRAINER_TOGGLED'
	| 'SETTINGS_UPDATED'
	| 'ROLE_CREATED'
	| 'ROLE_UPDATED'
	| 'ROLE_DELETED'
	| 'ROLE_PERMISSION_GRANTED'
	| 'ROLE_PERMISSION_REVOKED'
	| 'USER_ROLE_GRANTED'
	| 'USER_ROLE_REVOKED'
	| 'SYNC_PUSH_ACCEPTED'
	| 'SYNC_PUSH_REJECTED';

export type AuditLogInput = {
	action: AuditAction;
	actorUserId?: string | null;
	entityType?: string | null;
	entityId?: string | null;
	meta?: Record<string, unknown> | null;
	ip?: string | null;
	userAgent?: string | null;
};

export type AuditLogListPage = {
	rows: AuditLogListRow[];
	pagination: {
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	};
};

function clampString(value: string | null | undefined, max: number): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function sanitizeMetaValue(value: unknown, depth: number): PrismaTypes.InputJsonValue | null {
	if (depth > MAX_META_DEPTH) {
		return null;
	}

	if (value === null || value === undefined) {
		return null;
	}

	if (typeof value === 'string') {
		return clampString(value, MAX_META_STRING_LENGTH) ?? '';
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (Array.isArray(value)) {
		return value.slice(0, MAX_META_ARRAY).map((entry) => sanitizeMetaValue(entry, depth + 1));
	}

	if (typeof value === 'object') {
		const entries = Object.entries(value).slice(0, MAX_META_KEYS);
		const sanitized: Record<string, PrismaTypes.InputJsonValue | null> = {};
		for (const [key, entry] of entries) {
			const safeKey = clampString(key, 64) ?? 'key';
			sanitized[safeKey] = sanitizeMetaValue(entry, depth + 1);
		}
		return sanitized;
	}

	return clampString(String(value), MAX_META_STRING_LENGTH) ?? '';
}

function sanitizeMeta(
	meta: Record<string, unknown> | null | undefined
): PrismaTypes.InputJsonValue | PrismaTypes.NullableJsonNullValueInput | null {
	if (!meta) return null;

	try {
		const sanitized = sanitizeMetaValue(meta, 0);
		if (sanitized === null) {
			return PrismaValue.DbNull;
		}
		const serialized = JSON.stringify(sanitized);
		if (serialized.length <= MAX_META_JSON_CHARS) {
			return sanitized;
		}
		return {
			truncated: true,
			preview: serialized.slice(0, MAX_META_JSON_CHARS)
		};
	} catch {
		return { truncated: true };
	}
}

export async function record(entry: AuditLogInput): Promise<void> {
	const action = clampString(entry.action, MAX_ACTION_LENGTH);
	if (!action) {
		return;
	}

	const payload = {
		action,
		actorUserId: clampString(entry.actorUserId ?? null, MAX_ENTITY_LENGTH),
		entityType: clampString(entry.entityType ?? null, MAX_ENTITY_LENGTH),
		entityId: clampString(entry.entityId ?? null, MAX_ENTITY_LENGTH),
		metaJson: sanitizeMeta(entry.meta ?? null),
		ip: clampString(entry.ip ?? null, MAX_IP_LENGTH),
		userAgent: clampString(entry.userAgent ?? null, MAX_USER_AGENT_LENGTH)
	};

	try {
		await createAuditLog(payload);
	} catch (error) {
		logger.warn('Audit log write failed', {
			action,
			error
		});
	}
}

function ensurePositiveInt(value: number, fallback: number): number {
	if (!Number.isFinite(value) || value <= 0) {
		return fallback;
	}
	return Math.floor(value);
}

export async function listAuditLogs(input: {
	action?: string | null;
	page: number;
	pageSize: number;
}): Promise<AuditLogListPage> {
	const pageSize = Math.min(ensurePositiveInt(input.pageSize, 25), 100);
	const requestedPage = ensurePositiveInt(input.page, 1);
	const action = clampString(input.action ?? null, MAX_ACTION_LENGTH);

	const initial = await fetchAuditLogs({
		action: action ?? null,
		skip: (requestedPage - 1) * pageSize,
		take: pageSize
	});

	const totalPages = Math.max(1, Math.ceil(initial.total / pageSize));
	const safePage =
		initial.total === 0 ? 1 : Math.min(Math.max(requestedPage, 1), totalPages);

	if (safePage === requestedPage) {
		return {
			rows: initial.rows,
			pagination: {
				total: initial.total,
				page: safePage,
				pageSize,
				totalPages
			}
		};
	}

	const adjusted = await fetchAuditLogs({
		action: action ?? null,
		skip: (safePage - 1) * pageSize,
		take: pageSize
	});

	return {
		rows: adjusted.rows,
		pagination: {
			total: initial.total,
			page: safePage,
			pageSize,
			totalPages
		}
	};
}
