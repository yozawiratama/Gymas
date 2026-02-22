import { serverPrisma } from '$lib/server/db/server';

const prismaUnsafe = serverPrisma as typeof serverPrisma & {
	processedEvent: {
		findMany: (args: unknown) => Promise<any[]>;
		count: (args: unknown) => Promise<number>;
	};
};

export async function listRecentProcessedEvents(limit = 50, eventType?: string) {
	return prismaUnsafe.processedEvent.findMany({
		where: eventType ? { eventType } : undefined,
		orderBy: { processedAt: 'desc' },
		take: limit
	});
}

export async function countProcessedEventsSince(since: Date) {
	return prismaUnsafe.processedEvent.count({
		where: { processedAt: { gte: since } }
	});
}
