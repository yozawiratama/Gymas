import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { isProd } from '$lib/server/runtimeEnv';
import { ensureDefaultBranch, getBranchById } from '$lib/server/services/branchService';

const BRANCH_COOKIE_NAME = 'branch_id';
const BRANCH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function getActiveBranchId(event: RequestEvent): Promise<string | null> {
	const cookieValue = event.cookies.get(BRANCH_COOKIE_NAME);

	if (cookieValue) {
		const branch = await getBranchById(cookieValue);
		if (branch?.isActive) {
			return branch.id;
		}
	}

	const fallback = await ensureDefaultBranch();
	return fallback.id;
}

export function setActiveBranchId(event: RequestEvent, branchId: string) {
	event.cookies.set(BRANCH_COOKIE_NAME, branchId, {
		path: '/',
		httpOnly: true,
		secure: isProd(),
		sameSite: 'lax',
		maxAge: BRANCH_COOKIE_MAX_AGE_SECONDS
	});
}

export function requireBranch(event: RequestEvent): string {
	const branchId = event.locals.branchId;
	if (!branchId) {
		throw error(500, 'Branch context is required.');
	}
	return branchId;
}

export const branchCookieName = BRANCH_COOKIE_NAME;
