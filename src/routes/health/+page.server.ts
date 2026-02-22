import type { PageServerLoad } from './$types';
import { getEnvStatus, getOptionalEnv, getRuntimeConfig } from '$lib/server/config';
import { version } from '$app/environment';

export const load: PageServerLoad = async () => {
	const envStatus = getEnvStatus();
	const optionalEnv = getOptionalEnv();
	let configError: string | null = null;

	try {
		getRuntimeConfig();
	} catch (error) {
		configError = error instanceof Error ? error.message : 'Unknown configuration error';
	}

	const runtime = process.release?.name ?? 'unknown';

	return {
		build: {
			version: version ?? 'unknown',
			nodeVersion: process.versions.node,
			runtime,
			nodeEnv: optionalEnv.nodeEnv,
			appEnv: optionalEnv.appEnv
		},
		envStatus,
		configError,
		expectedAdapter: 'adapter-node',
		nodeRuntime: runtime === 'node'
	};
};
