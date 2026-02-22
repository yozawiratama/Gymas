import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/lib/server/db/prisma-server/index.js';

const prisma = new PrismaClient();

const username = (process.env.SUPERADMIN_USERNAME ?? 'superadmin').trim();
const password = process.env.SUPERADMIN_PASSWORD ?? 'ChangeMe123!';

if (!username) {
	throw new Error('SUPERADMIN_USERNAME is required to seed the SUPER_ADMIN user.');
}
if (!password) {
	throw new Error('SUPERADMIN_PASSWORD is required to seed the SUPER_ADMIN user.');
}

const passwordHash = await bcrypt.hash(password, 12);

const adminUser = await prisma.user.upsert({
	where: { username },
	update: {
		passwordHash,
		role: 'SUPER_ADMIN',
		isActive: true
	},
	create: {
		username,
		passwordHash,
		role: 'SUPER_ADMIN',
		isActive: true
	}
});

const permissionKeys = [
	'admin.access',
	'admin.settings.manage',
	'admin.security.manage',
	'admin.ops.manage',
	'admin.reports.view',
	'admin.reports.export',
	'debug.access',
	'members.read',
	'members.write',
	'attendance.checkin',
	'payments.manage',
	'members.view',
	'members.create',
	'members.edit',
	'memberships.cancel',
	'members.archive',
	'members.notes.view',
	'trainers.view',
	'trainers.manage',
	'payments.view',
	'payments.create',
	'payments.void',
	'settings.view',
	'settings.edit',
	'reports.view',
	'ops.view',
	'sync.push'
];

const permissions = await Promise.all(
	permissionKeys.map((key) =>
		prisma.permission.upsert({
			where: { key },
			update: {},
			create: { key }
		})
	)
);
const permissionByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));

const roleNames = ['ADMIN', 'FRONT_DESK'];
const roles = await Promise.all(
	roleNames.map((name) =>
		prisma.role.upsert({
			where: { name },
			update: {},
			create: { name }
		})
	)
);
const roleByName = new Map(roles.map((role) => [role.name, role.id]));

const adminPermissionKeys = permissionKeys;
const frontDeskPermissionKeys = [
	'admin.access',
	'members.read',
	'members.write',
	'attendance.checkin',
	'payments.manage',
	'admin.reports.view',
	'members.view',
	'members.create',
	'members.edit',
	'payments.view',
	'payments.create',
	'reports.view'
];

const adminRoleId = roleByName.get('ADMIN');
if (adminRoleId) {
	await prisma.rolePermission.createMany({
		data: adminPermissionKeys
			.map((key) => permissionByKey.get(key))
			.filter(Boolean)
			.map((permissionId) => ({
				roleId: adminRoleId,
				permissionId
			})),
		skipDuplicates: true
	});
}

const frontDeskRoleId = roleByName.get('FRONT_DESK');
if (frontDeskRoleId) {
	await prisma.rolePermission.createMany({
		data: frontDeskPermissionKeys
			.map((key) => permissionByKey.get(key))
			.filter(Boolean)
			.map((permissionId) => ({
				roleId: frontDeskRoleId,
				permissionId
			})),
		skipDuplicates: true
	});
}

if (adminRoleId) {
	await prisma.userRole.upsert({
		where: {
			userId_roleId: {
				userId: adminUser.id,
				roleId: adminRoleId
			}
		},
		update: {},
		create: {
			userId: adminUser.id,
			roleId: adminRoleId
		}
	});
}

const defaultBranchCode = (process.env.GYM_ID ?? 'MAIN').trim() || 'MAIN';

let branch = await prisma.branch.findUnique({
	where: { code: defaultBranchCode }
});

if (!branch) {
	branch = await prisma.branch.create({
		data: {
			name: 'Main Branch',
			code: defaultBranchCode,
			isActive: true
		}
	});
}

if (branch) {
	const brandingCompany = await prisma.appSetting.findUnique({
		where: {
			branchId_key: {
				branchId: branch.id,
				key: 'branding.companyName'
			}
		}
	});
	const defaultCompanyName = brandingCompany?.value?.trim() || 'Gymas';

	const companySettings = [
		{ key: 'company.companyName', value: defaultCompanyName },
		{ key: 'company.tagline', value: '' },
		{ key: 'company.address', value: '' },
		{ key: 'company.phone', value: '+1 555 010 0000' },
		{ key: 'company.whatsapp', value: '' },
		{ key: 'company.email', value: 'hello@gymas.com' },
		{ key: 'company.instagramUrl', value: '' },
		{ key: 'company.facebookUrl', value: '' },
		{ key: 'company.websiteUrl', value: '' },
		{ key: 'company.googleMapsUrl', value: '' },
		{ key: 'company.businessHours', value: '' }
	];

	await Promise.all(
		companySettings.map((setting) =>
			prisma.appSetting.upsert({
				where: {
					branchId_key: {
						branchId: branch.id,
						key: setting.key
					}
				},
				update: {},
				create: {
					branchId: branch.id,
					key: setting.key,
					value: setting.value
				}
			})
		)
	);
}

const sitePages = [
	{
		slug: 'home',
		title: 'Welcome to Gymas',
		contentMarkdown:
			'Gymas helps you manage members, payments, and daily operations with confidence.'
	},
	{
		slug: 'about',
		title: 'About Gymas',
		contentMarkdown:
			'We built Gymas to simplify gym operations, from member check-ins to revenue reports.\n\nOur goal is to give staff the tools they need to deliver a great experience every day.'
	},
	{
		slug: 'contact-us',
		title: 'Contact Gymas',
		contentMarkdown:
			'Have questions or need a demo? Reach us any time.\n\n- Email: [hello@gymas.com](mailto:hello@gymas.com)\n- Phone: +1 (555) 010-0000'
	}
];

await Promise.all(
	sitePages.map((page) =>
		prisma.sitePage.upsert({
			where: { slug: page.slug },
			update: {},
			create: {
				slug: page.slug,
				title: page.title,
				contentMarkdown: page.contentMarkdown,
				published: true
			}
		})
	)
);

console.log(
	'Seeded SUPER_ADMIN user, RBAC roles/permissions, default Branch, and public Site Pages in MySQL database.'
);

await prisma.$disconnect();
