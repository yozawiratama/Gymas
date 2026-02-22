import { record as recordAudit } from '$lib/server/services/auditService';

export type AuthAuditType = 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT';

type AuthAuditInput = {
	type: AuthAuditType;
	userId?: string | null;
	ip?: string | null;
	userAgent?: string | null;
	meta?: Record<string, unknown> | null;
};

export async function logAuthEvent(input: AuthAuditInput): Promise<void> {
	try {
		await recordAudit({
			action: input.type,
			actorUserId: input.userId ?? null,
			meta: input.meta ?? null,
			ip: input.ip ?? null,
			userAgent: input.userAgent ?? null
		});
	} catch {
		// Auth flows should not fail because audit logging failed.
	}
}
