import { getRuntimeConfig } from '$lib/server/config';

export type DatabaseConfig = {
	databaseUrl: string;
};

export function getDatabaseConfig(): DatabaseConfig {
	const { databaseUrl } = getRuntimeConfig();
	return { databaseUrl };
}

export { serverPrisma } from './server';
