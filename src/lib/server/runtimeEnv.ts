import { env } from '$env/dynamic/private';

export type RuntimeEnvInfo = {
	appEnv: string | null;
	nodeEnv: string | null;
};

export function getAppEnv(): string {
	return env.APP_ENV ?? env.NODE_ENV ?? process.env.NODE_ENV ?? 'development';
}

export function isProd(): boolean {
	return getAppEnv() === 'production';
}

export function getRuntimeEnvInfo(): RuntimeEnvInfo {
	return {
		appEnv: env.APP_ENV ?? null,
		nodeEnv: env.NODE_ENV ?? process.env.NODE_ENV ?? null
	};
}
