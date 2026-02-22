import { env } from '$env/dynamic/private';

type AttemptState = {
	count: number;
	resetAt: number;
};

const ipAttempts = new Map<string, AttemptState>();
const userAttempts = new Map<string, AttemptState>();
const ipUserAttempts = new Map<string, AttemptState>();

const DEFAULT_WINDOW_MINUTES = 10;
const DEFAULT_MAX_ATTEMPTS = 8;

function readPositiveInt(value: string | undefined, fallback: number): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.floor(parsed);
}

function getWindowMs(): number {
	const minutes = readPositiveInt(env.AUTH_LOGIN_WINDOW_MINUTES, DEFAULT_WINDOW_MINUTES);
	return minutes * 60 * 1000;
}

function getMaxAttempts(): number {
	return readPositiveInt(env.AUTH_LOGIN_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS);
}

function normalizeUsername(username: string): string {
	return username.trim().toLowerCase();
}

function getState(
	map: Map<string, AttemptState>,
	key: string,
	now: number,
	windowMs: number
): AttemptState {
	const current = map.get(key);
	if (!current || now >= current.resetAt) {
		const next = { count: 0, resetAt: now + windowMs };
		map.set(key, next);
		return next;
	}
	return current;
}

function incrementAttempt(map: Map<string, AttemptState>, key: string, now: number, windowMs: number) {
	const state = getState(map, key, now, windowMs);
	state.count += 1;
	map.set(key, state);
}

function clearAttempt(map: Map<string, AttemptState>, key: string | null) {
	if (!key) return;
	map.delete(key);
}

export type ThrottleDecision = {
	allowed: boolean;
	retryAfterMs: number | null;
};

export function checkLoginThrottle(ipAddress: string | null, username: string | null): ThrottleDecision {
	const now = Date.now();
	const windowMs = getWindowMs();
	const maxAttempts = getMaxAttempts();

	const ipKey = ipAddress?.trim() ? ipAddress.trim() : null;
	const userKey = username?.trim() ? normalizeUsername(username) : null;

	const ipState = ipKey ? getState(ipAttempts, ipKey, now, windowMs) : null;
	const userState = userKey ? getState(userAttempts, userKey, now, windowMs) : null;
	const ipUserKey = ipKey && userKey ? `${ipKey}:${userKey}` : null;
	const ipUserState = ipUserKey ? getState(ipUserAttempts, ipUserKey, now, windowMs) : null;

	const ipBlocked = Boolean(ipState && ipState.count >= maxAttempts);
	const userBlocked = Boolean(userState && userState.count >= maxAttempts);
	const ipUserBlocked = Boolean(ipUserState && ipUserState.count >= maxAttempts);

	if (!ipBlocked && !userBlocked && !ipUserBlocked) {
		return { allowed: true, retryAfterMs: null };
	}

	const retryAfterMs = Math.max(
		ipBlocked && ipState ? ipState.resetAt - now : 0,
		userBlocked && userState ? userState.resetAt - now : 0,
		ipUserBlocked && ipUserState ? ipUserState.resetAt - now : 0
	);

	return {
		allowed: false,
		retryAfterMs: Math.max(0, retryAfterMs)
	};
}

export function recordLoginFailure(ipAddress: string | null, username: string | null) {
	const now = Date.now();
	const windowMs = getWindowMs();

	const ipKey = ipAddress?.trim() ? ipAddress.trim() : null;
	const userKey = username?.trim() ? normalizeUsername(username) : null;
	const ipUserKey = ipKey && userKey ? `${ipKey}:${userKey}` : null;

	if (ipKey) {
		incrementAttempt(ipAttempts, ipKey, now, windowMs);
	}

	if (userKey) {
		incrementAttempt(userAttempts, userKey, now, windowMs);
	}

	if (ipUserKey) {
		incrementAttempt(ipUserAttempts, ipUserKey, now, windowMs);
	}
}

export function clearLoginFailures(ipAddress: string | null, username: string | null) {
	const ipKey = ipAddress?.trim() ? ipAddress.trim() : null;
	const userKey = username?.trim() ? normalizeUsername(username) : null;
	const ipUserKey = ipKey && userKey ? `${ipKey}:${userKey}` : null;

	clearAttempt(ipAttempts, ipKey);
	clearAttempt(userAttempts, userKey);
	clearAttempt(ipUserAttempts, ipUserKey);
}
