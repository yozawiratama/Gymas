import { env as publicEnv } from '$env/dynamic/public';
import { error, type Handle } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';
import { getUserWithRolesAndPermissions, requirePermission } from '$lib/server/authz';
import { branchCookieName, getActiveBranchId, setActiveBranchId } from '$lib/server/branchContext';
import { assertProductionEnv } from '$lib/server/config';
import { logInfo } from '$lib/server/logger';
import { getRequestIp } from '$lib/server/requestIp';

function resolveRequestId(request: Request): string {
	const header = request.headers.get('x-request-id');
	if (header) {
		const trimmed = header.trim();
		if (trimmed && trimmed.length <= 128) {
			return trimmed;
		}
	}

	if (globalThis.crypto?.randomUUID) {
		return globalThis.crypto.randomUUID();
	}

	const random = Math.random().toString(36).slice(2, 10);
	return `req_${Date.now().toString(36)}_${random}`;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function nowMs(): number {
	if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
		return performance.now();
	}
	return Date.now();
}

function requestWantsHtml(request: Request): boolean {
	const accept = request.headers.get('accept');
	return Boolean(accept && accept.includes('text/html'));
}

function isEndpointRequest(request: Request, pathname: string): boolean {
	const method = request.method.toUpperCase();
	if (method !== 'GET') {
		return true;
	}
	return pathname.endsWith('.csv');
}

function enforceOrigin(event: { request: Request; url: URL }) {
	const method = event.request.method.toUpperCase();
	if (SAFE_METHODS.has(method)) return;

	const origin = event.request.headers.get('origin');
	if (origin) {
		const trimmedOrigin = origin.trim();
		const host = event.request.headers.get('host');
		const hostOrigin = host ? `${event.url.protocol}//${host}` : event.url.origin;
		const allowedOrigins = new Set<string>([event.url.origin, hostOrigin]);
		const configuredOrigin = publicEnv.PUBLIC_APP_ORIGIN?.trim();
		if (configuredOrigin) {
			try {
				allowedOrigins.add(new URL(configuredOrigin).origin);
			} catch {
				// Ignore invalid PUBLIC_APP_ORIGIN values.
			}
		}

		let allowed = false;
		if (trimmedOrigin) {
			try {
				allowed = allowedOrigins.has(new URL(trimmedOrigin).origin);
			} catch {
				allowed = false;
			}
		}

		if (!allowed) {
			throw error(403, 'Forbidden');
		}
		return;
	}

	const fetchSite = event.request.headers.get('sec-fetch-site');
	if (fetchSite && fetchSite.toLowerCase() === 'cross-site') {
		throw error(403, 'Forbidden');
	}
}

const handleAuth: Handle = async ({ event, resolve }) => {
	const startedAt = nowMs();
	const requestId = resolveRequestId(event.request);
	event.locals.requestId = requestId;
	let status = 500;

	try {
		assertProductionEnv();
		enforceOrigin(event);

		const sessionToken = event.cookies.get(auth.sessionCookieName);

		event.locals.roles = [];
		event.locals.permissions = new Set();
		event.locals.userIsActive = null;
		event.locals.legacyRole = null;

		if (!sessionToken) {
			// locals.user and locals.session are set here for downstream authz checks.
			event.locals.user = null;
			event.locals.session = null;
		}

		if (sessionToken) {
			const { session, user } = await auth.validateSessionToken(sessionToken);

			if (session) {
				auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
			} else {
				auth.deleteSessionTokenCookie(event);
			}

			event.locals.user = user;
			event.locals.session = session;
		}

		if (event.locals.user) {
			const authzUser = await getUserWithRolesAndPermissions(event.locals.user.id);
			if (authzUser) {
				event.locals.roles = authzUser.roles;
				event.locals.permissions = authzUser.permissions;
				event.locals.userIsActive = authzUser.isActive;
				event.locals.legacyRole = authzUser.role;
			} else {
				event.locals.userIsActive = false;
			}
		}

		const activeBranchId = await getActiveBranchId(event);
		event.locals.branchId = activeBranchId;
		const cookieBranchId = event.cookies.get(branchCookieName);
		if (activeBranchId && cookieBranchId !== activeBranchId) {
			setActiveBranchId(event, activeBranchId);
		}

		const path = event.url.pathname;
		const redirectToLogin =
			requestWantsHtml(event.request) && !isEndpointRequest(event.request, path);
		if (path.startsWith('/admin')) {
			await requirePermission(event, 'admin.access', { redirectToLogin });
			if (path.startsWith('/admin/settings')) {
				await requirePermission(event, 'admin.settings.manage', { redirectToLogin });
			}
			if (path.startsWith('/admin/security')) {
				await requirePermission(event, 'admin.security.manage', { redirectToLogin });
			}
			if (path.startsWith('/admin/ops')) {
				await requirePermission(event, 'admin.ops.manage', { redirectToLogin });
			}
			if (path.startsWith('/admin/reports')) {
				await requirePermission(event, 'admin.reports.view', { redirectToLogin });
			}
		}
		if (path.startsWith('/debug')) {
			await requirePermission(event, 'debug.access', { redirectToLogin });
		}

		const response = await resolve(event);
		status = response.status;
		response.headers.set('X-Request-Id', requestId);
		return response;
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			const errStatus = (err as { status?: unknown }).status;
			if (typeof errStatus === 'number') {
				status = errStatus;
			}
		}
		throw err;
	} finally {
		const durationMs = Math.max(0, Math.round(nowMs() - startedAt));
		logInfo({
			message: 'Request completed',
			requestId,
			method: event.request.method,
			path: event.url.pathname,
			status,
			durationMs,
			userId: event.locals.user?.id ?? null,
			ip: getRequestIp(event)
		});
	}
};

export const handle: Handle = handleAuth;
