import { serverPrisma } from '$lib/server/db/server';

export type SessionRecord = {
	id: string;
	userId: string;
	createdAt: Date;
	expiresAt: Date;
	lastSeenAt: Date | null;
	userAgent: string | null;
	ipAddress: string | null;
};

export type UserRecord = {
	id: string;
	username: string;
};

export type SessionWithUser = {
	session: SessionRecord;
	user: UserRecord;
};

export type SessionRefresh = {
	expiresAt?: Date;
	lastSeenAt?: Date;
};

export interface SessionRepository {
	createSession(session: SessionRecord): Promise<void>;
	getSessionWithUser(sessionId: string): Promise<SessionWithUser | null>;
	refreshSession(sessionId: string, updates: SessionRefresh): Promise<void>;
	deleteSession(sessionId: string): Promise<void>;
	deleteUserSessions(userId: string): Promise<number>;
}

class PrismaSessionRepository implements SessionRepository {
	async createSession(session: SessionRecord): Promise<void> {
		await serverPrisma.session.create({
			data: {
				id: session.id,
				userId: session.userId,
				expiresAt: session.expiresAt,
				lastSeenAt: session.lastSeenAt ?? undefined,
				userAgent: session.userAgent ?? undefined,
				ipAddress: session.ipAddress ?? undefined
			}
		});
	}

	async getSessionWithUser(sessionId: string): Promise<SessionWithUser | null> {
		const record = await serverPrisma.session.findUnique({
			where: { id: sessionId },
			include: {
				user: {
					select: {
						id: true,
						username: true
					}
				}
			}
		});

		if (!record) return null;

		return {
			session: {
				id: record.id,
				userId: record.userId,
				createdAt: record.createdAt,
				expiresAt: record.expiresAt,
				lastSeenAt: record.lastSeenAt ?? null,
				userAgent: record.userAgent ?? null,
				ipAddress: record.ipAddress ?? null
			},
			user: record.user
		};
	}

	async refreshSession(sessionId: string, updates: SessionRefresh): Promise<void> {
		if (!updates.expiresAt && !updates.lastSeenAt) return;

		await serverPrisma.session.update({
			where: { id: sessionId },
			data: {
				expiresAt: updates.expiresAt,
				lastSeenAt: updates.lastSeenAt
			}
		});
	}

	async deleteSession(sessionId: string): Promise<void> {
		await serverPrisma.session.deleteMany({ where: { id: sessionId } });
	}

	async deleteUserSessions(userId: string): Promise<number> {
		const result = await serverPrisma.session.deleteMany({ where: { userId } });
		return result.count;
	}
}

export const sessionRepository: SessionRepository = new PrismaSessionRepository();
