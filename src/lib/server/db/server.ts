import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { isProd } from '$lib/server/runtimeEnv';
import type { PrismaClient as PrismaClientType } from '$lib/server/db/prisma-server';

const require = createRequire(import.meta.url);
type PrismaModule = {
	PrismaClient: new () => PrismaClientType;
};

const prisma = require(resolve(process.cwd(), 'src/lib/server/db/prisma-server')) as PrismaModule;

type ServerPrismaClient = PrismaClientType;

const globalForServerPrisma = globalThis as typeof globalThis & {
	serverPrisma?: ServerPrismaClient;
};

export const serverPrisma = globalForServerPrisma.serverPrisma ?? new prisma.PrismaClient();

if (!isProd()) {
	globalForServerPrisma.serverPrisma = serverPrisma;
}
