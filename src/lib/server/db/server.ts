import { isProd } from '$lib/server/runtimeEnv';
import { PrismaClient } from '@prisma/client';

type ServerPrismaClient = PrismaClient;

const globalForServerPrisma = globalThis as typeof globalThis & {
	serverPrisma?: ServerPrismaClient;
};

export const serverPrisma = globalForServerPrisma.serverPrisma ?? new PrismaClient();

if (!isProd()) {
	globalForServerPrisma.serverPrisma = serverPrisma;
}
