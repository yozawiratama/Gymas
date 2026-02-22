import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultBranchCode = (process.env.GYM_ID ?? 'MAIN').trim() || 'MAIN';
const defaultBranchName = 'Main Branch';

async function ensureDefaultBranch() {
	let branch = null;

	if (defaultBranchCode) {
		branch = await prisma.branch.findUnique({ where: { code: defaultBranchCode } });
	}

	if (!branch) {
		const first = await prisma.branch.findFirst({ orderBy: { createdAt: 'asc' } });
		if (first) {
			if (defaultBranchCode && first.code !== defaultBranchCode) {
				try {
					branch = await prisma.branch.update({
						where: { id: first.id },
						data: { code: defaultBranchCode }
					});
				} catch {
					branch = first;
				}
			} else {
				branch = first;
			}
		}
	}

	if (!branch) {
		branch = await prisma.branch.create({
			data: {
				name: defaultBranchName,
				code: defaultBranchCode || null,
				isActive: true
			}
		});
	}

	return branch;
}

const branch = await ensureDefaultBranch();

await Promise.all([
	prisma.$executeRaw`UPDATE Member SET branchId = ${branch.id} WHERE branchId IS NULL`,
	prisma.$executeRaw`UPDATE Attendance SET branchId = ${branch.id} WHERE branchId IS NULL`,
	prisma.$executeRaw`UPDATE Payment SET branchId = ${branch.id} WHERE branchId IS NULL`,
	prisma.$executeRaw`UPDATE Media SET branchId = ${branch.id} WHERE branchId IS NULL`,
	prisma.$executeRaw`UPDATE AppSetting SET branchId = ${branch.id} WHERE branchId IS NULL`,
	prisma.$executeRaw`UPDATE MembershipPlan SET branchId = ${branch.id} WHERE branchId IS NULL`,
	prisma.$executeRaw`UPDATE MemberMembership SET branchId = ${branch.id} WHERE branchId IS NULL`
]);

console.log(`Backfilled branchId using default branch ${branch.id} (${branch.code ?? 'no-code'}).`);

await prisma.$disconnect();
