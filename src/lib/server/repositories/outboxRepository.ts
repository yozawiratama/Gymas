import { serverPrisma } from '$lib/server/db/server';
import type { LocalTxClient } from '$lib/server/db/localTx';
import type { Prisma } from '@prisma/client';

export type OutboxEventRow = {
	id: string;
	type: string;
	status: string;
	attempts: number;
	createdAt: Date;
	lastAttemptAt: Date | null;
	lastError: string | null;
};

export type OutboxSummary = {
	pending: number;
	inFlight: number;
	failed: number;
};

export type OutboxClaim = {
	id: string;
	type: string;
	payload: Prisma.JsonValue;
	idempotencyKey: string;
	status: string;
	attempts: number;
	createdAt: Date;
	lastAttemptAt: Date | null;
};

export type OutboxFailureRow = {
	id: string;
	type: string;
	status: string;
	attempts: number;
	createdAt: Date;
	lastAttemptAt: Date | null;
	lastError: string | null;
	updatedAt: Date;
};

const MAX_OUTBOX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 30_000;
const MAX_RETRY_DELAY_MS = 10 * 60_000;
const MAX_OUTBOX_ERROR_LENGTH = 500;

function formatOutboxError(error: unknown): string {
	if (error instanceof Error) {
		return error.message || 'Unknown error';
	}
	if (typeof error === 'string') {
		return error;
	}
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
}

function clampOutboxError(message: string): string {
	const trimmed = message.trim();
	if (trimmed.length <= MAX_OUTBOX_ERROR_LENGTH) {
		return trimmed;
	}
	return trimmed.slice(0, MAX_OUTBOX_ERROR_LENGTH);
}

function computeNextAttemptAt(attempts: number, now: Date): Date {
	const exponent = Math.max(0, attempts - 1);
	const delay = Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * 2 ** exponent);
	return new Date(now.getTime() + delay);
}

export async function appendOutboxEvent(
	tx: LocalTxClient,
	data: Prisma.OutboxEventUncheckedCreateInput
): Promise<void> {
	await tx.outboxEvent.create({
		data
	});
}

export async function getOutboxSummary(): Promise<OutboxSummary> {
	const [pending, inFlight, failed] = await Promise.all([
		serverPrisma.outboxEvent.count({ where: { status: 'PENDING' } }),
		serverPrisma.outboxEvent.count({ where: { status: 'SENDING' } }),
		serverPrisma.outboxEvent.count({ where: { status: 'FAILED' } })
	]);

	return { pending, inFlight, failed };
}

export async function getPendingCount(): Promise<number> {
	return serverPrisma.outboxEvent.count({ where: { status: 'PENDING' } });
}

export async function listRecentOutboxEvents(limit = 50): Promise<OutboxEventRow[]> {
	return serverPrisma.outboxEvent.findMany({
		orderBy: { createdAt: 'desc' },
		take: limit,
		select: {
			id: true,
			type: true,
			status: true,
			attempts: true,
			createdAt: true,
			lastAttemptAt: true,
			lastError: true
		}
	});
}

export async function listRecentFailedOutboxEvents(limit = 25): Promise<OutboxFailureRow[]> {
	return serverPrisma.outboxEvent.findMany({
		where: { status: 'FAILED' },
		orderBy: { updatedAt: 'desc' },
		take: limit,
		select: {
			id: true,
			type: true,
			status: true,
			attempts: true,
			createdAt: true,
			lastAttemptAt: true,
			lastError: true,
			updatedAt: true
		}
	});
}

export async function claimOutboxBatch(limit = 25): Promise<OutboxClaim[]> {
	if (limit <= 0) {
		return [];
	}

	const now = new Date();

	return serverPrisma.$transaction(async (tx) => {
		const candidates = await tx.outboxEvent.findMany({
			where: {
				status: 'PENDING',
				OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }]
			},
			orderBy: { createdAt: 'asc' },
			take: limit,
			select: { id: true }
		});

		if (candidates.length === 0) {
			return [];
		}

		const ids = candidates.map((candidate) => candidate.id);

		await tx.outboxEvent.updateMany({
			where: { id: { in: ids }, status: 'PENDING' },
			data: {
				status: 'SENDING',
				attempts: { increment: 1 },
				lastAttemptAt: now,
				nextAttemptAt: null,
				lastError: null
			}
		});

		return tx.outboxEvent.findMany({
			where: {
				id: { in: ids },
				status: 'SENDING',
				lastAttemptAt: now
			},
			orderBy: { createdAt: 'asc' },
			select: {
				id: true,
				type: true,
				payload: true,
				idempotencyKey: true,
				status: true,
				attempts: true,
				createdAt: true,
				lastAttemptAt: true
			}
		});
	});
}

export async function markOutboxSent(id: string): Promise<void> {
	await serverPrisma.outboxEvent.update({
		where: { id },
		data: {
			status: 'ACKED',
			lastError: null,
			nextAttemptAt: null
		}
	});
}

export async function markOutboxFailed(id: string, error: unknown): Promise<void> {
	const now = new Date();
	const lastError = clampOutboxError(formatOutboxError(error));

	await serverPrisma.$transaction(async (tx) => {
		const current = await tx.outboxEvent.findUnique({
			where: { id },
			select: { attempts: true }
		});

		if (!current) {
			return;
		}

		const shouldRetry = current.attempts < MAX_OUTBOX_RETRIES;

		await tx.outboxEvent.update({
			where: { id },
			data: {
				status: shouldRetry ? 'PENDING' : 'FAILED',
				lastError,
				lastAttemptAt: now,
				nextAttemptAt: shouldRetry ? computeNextAttemptAt(current.attempts, now) : null
			}
		});
	});
}
