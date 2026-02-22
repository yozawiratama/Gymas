import type { RequestEvent } from '@sveltejs/kit';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding';
import { isProd } from '$lib/server/runtimeEnv';
import { getSessionCookieOptions, SESSION_LIFETIME_DAYS } from '$lib/server/sessionCookie';
import { sessionRepository } from '$lib/server/repositories/sessionRepository';
import type { SessionRecord } from '$lib/server/repositories/sessionRepository';

const DAY_IN_MS = 1000 * 60 * 60 * 24;
// Sessions live for 30 days and are renewed when within 15 days of expiry.
const SESSION_RENEW_WINDOW_DAYS = 15;
const SESSION_TOUCH_INTERVAL_MS = 1000 * 60 * 5;

// Cookie name: auth-session. Cookie value is a random token; the DB stores a SHA-256 hex hash.
export const sessionCookieName = 'auth-session';

export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	const token = encodeBase64url(bytes);
	return token;
}

function getSessionIdFromToken(token: string) {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export type SessionMetadata = {
	ipAddress?: string | null;
	userAgent?: string | null;
};

export async function createSession(token: string, userId: string, metadata: SessionMetadata = {}) {
	const sessionId = getSessionIdFromToken(token);
	const session: SessionRecord = {
		id: sessionId,
		userId,
		createdAt: new Date(),
		expiresAt: new Date(Date.now() + DAY_IN_MS * SESSION_LIFETIME_DAYS),
		lastSeenAt: new Date(),
		userAgent: metadata.userAgent ?? null,
		ipAddress: metadata.ipAddress ?? null
	};
	await sessionRepository.createSession(session);
	return session;
}

export async function validateSessionToken(token: string) {
	const sessionId = getSessionIdFromToken(token);
	const result = await sessionRepository.getSessionWithUser(sessionId);

	if (!result) {
		return { session: null, user: null };
	}
	const { session, user } = result;

	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await sessionRepository.deleteSession(session.id);
		return { session: null, user: null };
	}

	const now = Date.now();
	const renewSession = now >= session.expiresAt.getTime() - DAY_IN_MS * SESSION_RENEW_WINDOW_DAYS;
	const shouldTouch =
		!session.lastSeenAt || now - session.lastSeenAt.getTime() >= SESSION_TOUCH_INTERVAL_MS;

	if (renewSession || shouldTouch) {
		const nextExpiry = renewSession
			? new Date(now + DAY_IN_MS * SESSION_LIFETIME_DAYS)
			: undefined;
		const nextLastSeen = new Date(now);

		await sessionRepository.refreshSession(session.id, {
			expiresAt: nextExpiry,
			lastSeenAt: nextLastSeen
		});

		if (nextExpiry) {
			session.expiresAt = nextExpiry;
		}
		session.lastSeenAt = nextLastSeen;
	}

	return { session, user };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSessionToken(token: string) {
	const sessionId = getSessionIdFromToken(token);
	await sessionRepository.deleteSession(sessionId);
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
	const options = getSessionCookieOptions(!isProd());
	event.cookies.set(sessionCookieName, token, {
		...options,
		expires: expiresAt
	});
}

export function deleteSessionTokenCookie(event: RequestEvent) {
	event.cookies.delete(sessionCookieName, getSessionCookieOptions(!isProd()));
}
