// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: import('$lib/server/auth').SessionValidationResult['user'];
			session: import('$lib/server/auth').SessionValidationResult['session'];
			roles: string[];
			permissions: Set<string>;
			userIsActive: boolean | null;
			legacyRole: import('$lib/server/db/prisma-server').LegacyUserRole | null;
			requestId?: string;
			branchId: string | null;
		}

		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
