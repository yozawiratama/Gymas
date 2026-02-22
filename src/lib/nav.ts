export type NavItem = {
	label: string;
	href: string;
	requiredPermissions?: string[];
	section?: string;
	matchPrefix?: string;
};

export const NAV_ITEMS: NavItem[] = [
	{
		label: 'Attendance',
		href: '/attendance/check-in',
		matchPrefix: '/attendance',
		requiredPermissions: ['attendance.checkin']
	},
	{
		label: 'Payments',
		href: '/payments',
		matchPrefix: '/payments',
		requiredPermissions: ['payments.manage', 'payments.view']
	},
	{
		label: 'Members',
		href: '/members',
		matchPrefix: '/members',
		requiredPermissions: ['members.read', 'members.view']
	},
	{
		label: 'Trainers',
		href: '/admin/trainers',
		matchPrefix: '/admin/trainers',
		requiredPermissions: ['trainers.view'],
		section: 'admin'
	},
	{
		label: 'Settings',
		href: '/admin/settings/branding',
		matchPrefix: '/admin/settings',
		requiredPermissions: ['admin.settings.manage', 'settings.view'],
		section: 'admin'
	},
	{
		label: 'Branches',
		href: '/admin/branches',
		matchPrefix: '/admin/branches',
		requiredPermissions: ['admin.settings.manage', 'settings.view'],
		section: 'admin'
	},
	{
		label: 'Security',
		href: '/admin/security/roles',
		matchPrefix: '/admin/security',
		requiredPermissions: ['admin.security.manage'],
		section: 'admin'
	},
	{
		label: 'Reports',
		href: '/admin/reports',
		matchPrefix: '/admin/reports',
		requiredPermissions: ['admin.reports.view', 'reports.view'],
		section: 'admin'
	},
	{
		label: 'Ops',
		href: '/admin/ops/sync',
		matchPrefix: '/admin/ops',
		requiredPermissions: ['admin.ops.manage', 'ops.view'],
		section: 'admin'
	}
];

export function filterNavItems(permissions: Iterable<string> | null | undefined): NavItem[] {
	const permissionSet = permissions instanceof Set ? permissions : new Set(permissions ?? []);
	return NAV_ITEMS.filter((item) => {
		const required = item.requiredPermissions ?? [];
		if (required.length === 0) return true;
		return required.some((permission) => permissionSet.has(permission));
	});
}
