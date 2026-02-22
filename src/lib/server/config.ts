import { env } from '$env/dynamic/private';
import { getAppEnv as resolveAppEnv, getRuntimeEnvInfo, isProd } from '$lib/server/runtimeEnv';

const REQUIRED_ENV = ['DATABASE_URL', 'DEVICE_ID', 'GYM_ID'] as const;
const PROD_REQUIRED_ENV = ['SYNC_SHARED_SECRET'] as const;

export type RequiredEnvKey = (typeof REQUIRED_ENV)[number];
export type ProdRequiredEnvKey = (typeof PROD_REQUIRED_ENV)[number];

export type RuntimeConfig = {
	databaseUrl: string;
	deviceId: string;
	gymId: string;
	appEnv: string;
};

export type EnvStatus = {
	key: RequiredEnvKey;
	present: boolean;
	masked: string;
};

function requireEnv(key: RequiredEnvKey): string {
	const value = env[key];
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value;
}

let productionEnvChecked = false;

export function assertProductionEnv(): void {
	if (productionEnvChecked) {
		return;
	}

	if (!isProd()) {
		productionEnvChecked = true;
		return;
	}

	for (const key of PROD_REQUIRED_ENV) {
		const value = env[key];
		if (!value) {
			throw new Error(`Missing required environment variable in production: ${key}`);
		}
	}

	productionEnvChecked = true;
}

function maskValue(value: string): string {
	const length = value.length;
	const masked = '*'.repeat(Math.min(length, 8));
	return `${masked} (len ${length})`;
}

export function getRuntimeConfig(): RuntimeConfig {
	assertProductionEnv();
	return {
		databaseUrl: requireEnv('DATABASE_URL'),
		deviceId: requireEnv('DEVICE_ID'),
		gymId: requireEnv('GYM_ID'),
		appEnv: getAppEnv()
	};
}

export function getEnvStatus(): EnvStatus[] {
	return REQUIRED_ENV.map((key) => {
		const value = env[key];
		return {
			key,
			present: Boolean(value),
			masked: value ? maskValue(value) : 'missing'
		};
	});
}

export function getRequiredEnvKeys(): string[] {
	return isProd() ? [...REQUIRED_ENV, ...PROD_REQUIRED_ENV] : [...REQUIRED_ENV];
}

export function getMissingEnvKeys(): string[] {
	return getRequiredEnvKeys().filter((key) => !env[key]);
}

export function getOptionalEnv() {
	return getRuntimeEnvInfo();
}

export function getAppEnv(): string {
	return resolveAppEnv();
}

export function isProductionEnv(): boolean {
	return isProd();
}
