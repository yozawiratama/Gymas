import { serverPrisma } from '$lib/server/db/server';
import type { Prisma } from '$lib/server/db/prisma-server';

export type AuditLogCreateInput = {
	action: string;
	actorUserId?: string | null;
	entityType?: string | null;
	entityId?: string | null;
	metaJson?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | null;
	ip?: string | null;
	userAgent?: string | null;
};

export type AuditLogListRow = {
	id: string;
	action: string;
	actorUserId: string | null;
	actorUsername: string | null;
	entityType: string | null;
	entityId: string | null;
	metaJson: Prisma.JsonValue | null;
	ip: string | null;
	userAgent: string | null;
	createdAt: Date;
};

export type AuditLogListResult = {
	total: number;
	rows: AuditLogListRow[];
};

export async function createAuditLog(data: AuditLogCreateInput): Promise<void> {
	await serverPrisma.auditLog.create({
		data: {
			action: data.action,
			actorUserId: data.actorUserId ?? null,
			entityType: data.entityType ?? null,
			entityId: data.entityId ?? null,
			metaJson: data.metaJson ?? undefined,
			ip: data.ip ?? null,
			userAgent: data.userAgent ?? null
		},
		select: { id: true }
	});
}

export async function listAuditLogs(params: {
	action?: string | null;
	skip: number;
	take: number;
}): Promise<AuditLogListResult> {
	const where: Prisma.AuditLogWhereInput = params.action ? { action: params.action } : {};

	const [total, rows] = await Promise.all([
		serverPrisma.auditLog.count({ where }),
		serverPrisma.auditLog.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip: params.skip,
			take: params.take,
			select: {
				id: true,
				action: true,
				actorUserId: true,
				actorUser: {
					select: {
						id: true,
						username: true
					}
				},
				entityType: true,
				entityId: true,
				metaJson: true,
				ip: true,
				userAgent: true,
				createdAt: true
			}
		})
	]);

	return {
		total,
		rows: rows.map((row) => ({
			id: row.id,
			action: row.action,
			actorUserId: row.actorUserId ?? null,
			actorUsername: row.actorUser?.username ?? null,
			entityType: row.entityType ?? null,
			entityId: row.entityId ?? null,
			metaJson: row.metaJson ?? null,
			ip: row.ip ?? null,
			userAgent: row.userAgent ?? null,
			createdAt: row.createdAt
		}))
	};
}
