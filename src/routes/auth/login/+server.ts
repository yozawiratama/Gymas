import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { serverPrisma } from '$lib/server/db/server';
import { createSession, generateSessionToken, setSessionTokenCookie } from '$lib/server/auth';
import { checkLoginThrottle, clearLoginFailures, recordLoginFailure } from '$lib/server/authThrottle';
import { logAuthEvent } from '$lib/server/auditAuth';
import { badRequest, isAppError, tooManyRequests, unauthorized } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { retryAfterSeconds } from '$lib/server/rateLimit';
import { getRequestIp } from '$lib/server/requestIp';
import { parseString } from '$lib/server/validation';

const hashUsername = (value: string) =>
	createHash('sha256').update(value, 'utf8').digest('hex');

export const POST: RequestHandler = async (event) => {
	const route = event.route?.id ?? event.url.pathname;
	let retryAfter: number | null = null;

	try {
		let payload: unknown;
		try {
			payload = await event.request.json();
		} catch {
			throw badRequest('Request body must be valid JSON.', 'INVALID_JSON');
		}

		const USERNAME_MAX = 128;
		const PASSWORD_MAX = 256;

		const username = parseString(payload as Record<string, unknown>, 'username', {
			trim: true,
			required: false,
			label: 'Username'
		});
		const password = parseString(payload as Record<string, unknown>, 'password', {
			required: false,
			label: 'Password'
		});

		const normalizedUsername = username.trim();
		const ipAddress = getRequestIp(event);
		const userAgent = event.request.headers.get('user-agent');
		const usernameHash = normalizedUsername ? hashUsername(normalizedUsername) : null;

		const recordLoginFailureAudit = async (reason: string, actorUserId?: string | null) => {
			const meta: Record<string, unknown> = { reason };
			if (usernameHash) {
				meta.usernameHash = usernameHash;
			}
			await logAuthEvent({
				type: 'LOGIN_FAILED',
				userId: actorUserId ?? null,
				meta,
				ip: ipAddress,
				userAgent
			});
		};

		const throttle = checkLoginThrottle(ipAddress, normalizedUsername || null);
		if (!throttle.allowed) {
			retryAfter = retryAfterSeconds(throttle.retryAfterMs, 60);
			await recordLoginFailureAudit('too_many_attempts');
			throw tooManyRequests('Too many login attempts.', 'TOO_MANY_ATTEMPTS');
		}

		if (!normalizedUsername || !password) {
			throw badRequest('Invalid credentials.', 'INVALID_INPUT');
		}

		if (normalizedUsername.length > USERNAME_MAX || password.length > PASSWORD_MAX) {
			throw badRequest('Invalid credentials.', 'INVALID_INPUT');
		}

		const user = await serverPrisma.user.findUnique({
			where: { username: normalizedUsername },
			select: { id: true, username: true, passwordHash: true, role: true, isActive: true }
		});

		if (!user || !user.isActive) {
			await serverPrisma.loginHistory.create({
				data: {
					userId: user?.id ?? null,
					usernameAttempt: normalizedUsername,
					ipAddress: ipAddress ?? undefined,
					userAgent: userAgent ?? undefined,
					success: false
				}
			});
			recordLoginFailure(ipAddress, normalizedUsername);
			await recordLoginFailureAudit('invalid_credentials', user?.id ?? null);
			throw unauthorized('Invalid credentials.', 'INVALID_CREDENTIALS');
		}

		const passwordOk = await bcrypt.compare(password, user.passwordHash);
		if (!passwordOk) {
			await serverPrisma.loginHistory.create({
				data: {
					userId: user.id,
					usernameAttempt: normalizedUsername,
					ipAddress: ipAddress ?? undefined,
					userAgent: userAgent ?? undefined,
					success: false
				}
			});
			recordLoginFailure(ipAddress, normalizedUsername);
			await recordLoginFailureAudit('invalid_credentials', user.id);
			throw unauthorized('Invalid credentials.', 'INVALID_CREDENTIALS');
		}

		const token = generateSessionToken();
		const session = await createSession(token, user.id, {
			ipAddress,
			userAgent
		});
		setSessionTokenCookie(event, token, session.expiresAt);

		await serverPrisma.loginHistory.create({
			data: {
				userId: user.id,
				usernameAttempt: user.username,
				ipAddress: ipAddress ?? undefined,
				userAgent: userAgent ?? undefined,
				success: true
			}
		});
		clearLoginFailures(ipAddress, normalizedUsername);

		await logAuthEvent({
			type: 'LOGIN_SUCCESS',
			userId: user.id,
			meta: usernameHash ? { usernameHash } : null,
			ip: ipAddress,
			userAgent
		});

		logger.info('Login succeeded', {
			route,
			requestId: event.locals.requestId,
			userId: user.id
		});

		return json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
	} catch (err) {
		if (isAppError(err)) {
			const headers: Record<string, string> = {};
			if (err.code === 'TOO_MANY_ATTEMPTS') {
				const retryAfterHeader = retryAfter ?? 60;
				headers['Retry-After'] = String(retryAfterHeader);
			}

			logger.warn('Login failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});

			return json(
				{ error: { code: err.code, message: err.publicMessage } },
				{ status: err.status, headers }
			);
		}

		logger.error('Login request failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		return json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
			{ status: 500 }
		);
	}
};
