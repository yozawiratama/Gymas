import { env } from '$env/dynamic/private';

const SYNC_SECRET_HEADER = 'x-sync-secret';

function timingSafeEqualString(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i += 1) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

export type SyncSecretValidation = {
	ok: boolean;
};

export function validateSyncSharedSecret(request: Request): SyncSecretValidation {
	const expected = env.SYNC_SHARED_SECRET;
	const provided = request.headers.get(SYNC_SECRET_HEADER);

	if (!expected || !provided) {
		return { ok: false };
	}

	return { ok: timingSafeEqualString(expected, provided) };
}

export function getSyncSecretHeaderName(): string {
	return SYNC_SECRET_HEADER;
}
