import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type * as PrismaTypes from '$lib/server/db/prisma-server';

const require = createRequire(import.meta.url);
const prisma = require(resolve(process.cwd(), 'src/lib/server/db/prisma-server')) as Record<
	string,
	unknown
>;

export const Prisma = prisma.Prisma as typeof PrismaTypes.Prisma;
export const PrismaClient = prisma.PrismaClient as typeof PrismaTypes.PrismaClient;

export const LegacyUserRole = prisma.LegacyUserRole as typeof PrismaTypes.LegacyUserRole;
export const MemberStatus = prisma.MemberStatus as typeof PrismaTypes.MemberStatus;
export const PaymentMethod = prisma.PaymentMethod as typeof PrismaTypes.PaymentMethod;
export const PaymentStatus = prisma.PaymentStatus as typeof PrismaTypes.PaymentStatus;
export const AttendanceSource = prisma.AttendanceSource as typeof PrismaTypes.AttendanceSource;
export const OutboxStatus = prisma.OutboxStatus as typeof PrismaTypes.OutboxStatus;
export const ProcessedEventStatus =
	prisma.ProcessedEventStatus as typeof PrismaTypes.ProcessedEventStatus;
