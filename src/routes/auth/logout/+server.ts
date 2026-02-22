import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { deleteSessionTokenCookie, invalidateSessionToken, sessionCookieName } from '$lib/server/auth';
import { logAuthEvent } from '$lib/server/auditAuth';
import { getRequestIp } from '$lib/server/requestIp';

export const POST: RequestHandler = async (event) => {
	const token = event.cookies.get(sessionCookieName);
	const actorUserId = event.locals.user?.id ?? null;
	const ipAddress = getRequestIp(event);
	const userAgent = event.request.headers.get('user-agent');

	if (token) {
		await invalidateSessionToken(token);
		deleteSessionTokenCookie(event);
	}

	if (token || actorUserId) {
		await logAuthEvent({
			type: 'LOGOUT',
			userId: actorUserId,
			ip: ipAddress,
			userAgent
		});
	}

	return json({ ok: true });
};
