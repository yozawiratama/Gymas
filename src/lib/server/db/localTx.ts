import { serverPrisma } from '$lib/server/db/server';
import type { OutboxStatus, Prisma } from '$lib/server/db/prisma-server';

export type LocalTxClient = Prisma.TransactionClient;

export type OutboxEventInput = {
	type: string;
	payload: Prisma.InputJsonValue;
	idempotencyKey: string;
	status?: OutboxStatus;
	attempts?: number;
	nextAttemptAt?: Date | null;
	lastAttemptAt?: Date | null;
	lastError?: string | null;
};

type LocalOutboxMutationResult<T> = {
	result: T;
	outbox: OutboxEventInput | null;
};

export async function localTxWithOutbox<T>(
	work: (tx: LocalTxClient) => Promise<LocalOutboxMutationResult<T>>
): Promise<T> {
	return serverPrisma.$transaction(async (tx) => {
		const { result, outbox } = await work(tx);

		if (outbox) {
			if (!outbox.type || !outbox.idempotencyKey) {
				throw new Error('Outbox event requires a type and idempotencyKey.');
			}

			await tx.outboxEvent.create({
				data: {
					type: outbox.type,
					payload: outbox.payload,
					idempotencyKey: outbox.idempotencyKey,
					status: outbox.status,
					attempts: outbox.attempts,
					nextAttemptAt: outbox.nextAttemptAt ?? null,
					lastAttemptAt: outbox.lastAttemptAt ?? null,
					lastError: outbox.lastError ?? null
				}
			});
		}

		return result;
	});
}
