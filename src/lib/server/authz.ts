import type { RequestEvent } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import { forbidden } from '$lib/server/httpErrors';
import { serverPrisma } from '$lib/server/db/server';
import type { LegacyUserRole } from '$lib/server/db/prisma-server';

export type Role = LegacyUserRole;
export type PermissionKey = string;
export type PermissionSet = Set<string>;

export type ActiveUser = {
	id: string;
	username: string;
	role: Role;
	isActive: boolean;
	roles: string[];
	permissions: PermissionSet;
};

export type RequireUserOptions = {
	redirectToLogin?: boolean;
};

export type PermissionSubject =
	| PermissionSet
	| string[]
	| Role
	| ActiveUser
	| null
	| undefined;

const LEGACY_PERMISSION_KEYS: PermissionKey[] = [
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

const ALL_LEGACY_PERMISSIONS = new Set(LEGACY_PERMISSION_KEYS);

const LEGACY_ROLE_PERMISSIONS: Record<LegacyUserRole, Set<PermissionKey>> = {
	SUPER_ADMIN: ALL_LEGACY_PERMISSIONS,
	OWNER: ALL_LEGACY_PERMISSIONS,
	ADMIN: ALL_LEGACY_PERMISSIONS,
	STAFF: new Set([
		'attendance.checkin',
		'members.view',
		'payments.view',
		'trainers.view',
		'members.read',
		'payments.manage'
	]),
	FRONTDESK: new Set([
		'admin.access',
		'admin.reports.view',
		'attendance.checkin',
		'members.view',
		'members.create',
		'members.read',
		'members.write',
		'payments.manage',
		'payments.view',
		'payments.create'
	])
};

function getPermissionsForRole(role: Role | null | undefined): Set<PermissionKey> {
	if (!role) return new Set();
	return LEGACY_ROLE_PERMISSIONS[role] ?? new Set();
}

export function getLegacyRolePermissions(role: Role | null | undefined): Set<PermissionKey> {
	return new Set(getPermissionsForRole(role));
}

function isPermissionSet(value: PermissionSubject): value is PermissionSet {
	return value instanceof Set;
}

function isPermissionArray(value: PermissionSubject): value is string[] {
	return Array.isArray(value);
}

function resolvePermissionSet(subject: PermissionSubject): PermissionSet {
	if (!subject) return new Set();
	if (isPermissionSet(subject)) return subject;
	if (isPermissionArray(subject)) return new Set(subject);
	if (typeof subject === 'string') return getPermissionsForRole(subject as Role);
	if (typeof subject === 'object' && 'permissions' in subject) {
		const perms = subject.permissions;
		return perms instanceof Set ? perms : new Set(perms ?? []);
	}
	return new Set();
}

export function can(subject: PermissionSubject, action: PermissionKey): boolean {
	const permissions = resolvePermissionSet(subject);
	return permissions.has(action);
}

export function require(subject: PermissionSubject, action: PermissionKey) {
	if (!can(subject, action)) {
		throw forbidden('Forbidden.', 'FORBIDDEN');
	}
}

export function canViewMemberNotes(subject: PermissionSubject): boolean {
	return can(subject, 'members.notes.view');
}

export function canViewPaymentDetails(subject: PermissionSubject): boolean {
	return can(subject, 'payments.view');
}

export function canRecordPayments(subject: PermissionSubject): boolean {
	return can(subject, 'payments.create');
}

export function canVoidPayments(subject: PermissionSubject): boolean {
	return can(subject, 'payments.void');
}

export function canAccessMembers(subject: PermissionSubject): boolean {
	return can(subject, 'members.view') || can(subject, 'members.read');
}

export function canAccessTrainers(subject: PermissionSubject): boolean {
	return can(subject, 'trainers.view');
}

export function canAccessPayments(subject: PermissionSubject): boolean {
	return can(subject, 'payments.view') || can(subject, 'payments.manage');
}

export function canAccessSettings(subject: PermissionSubject): boolean {
	return can(subject, 'settings.view') || can(subject, 'admin.settings.manage');
}

export function canAccessReports(subject: PermissionSubject): boolean {
	return can(subject, 'reports.view') || can(subject, 'admin.reports.view');
}

export function canAccessOps(subject: PermissionSubject): boolean {
	return can(subject, 'ops.view') || can(subject, 'admin.ops.manage');
}

export function canAccessAttendance(subject: PermissionSubject): boolean {
	return can(subject, 'attendance.checkin');
}

export function canManageBranches(subject: PermissionSubject): boolean {
	return can(subject, 'settings.edit') || can(subject, 'admin.settings.manage');
}

export async function getUserWithRolesAndPermissions(userId: string): Promise<ActiveUser | null> {
	const user = await serverPrisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			username: true,
			role: true,
			isActive: true,
			userRoles: {
				select: {
					role: {
						select: {
							name: true,
							permissions: {
								select: {
									permission: {
										select: { key: true }
									}
								}
							}
						}
					}
				}
			}
		}
	});

	if (!user) return null;

	const roles: string[] = [];
	const permissions = new Set<PermissionKey>();

	for (const userRole of user.userRoles) {
		const role = userRole.role;
		if (!role) continue;
		roles.push(role.name);
		for (const permission of role.permissions) {
			const key = permission.permission?.key;
			if (key) {
				permissions.add(key);
			}
		}
	}

	if (roles.length === 0) {
		const fallback = getPermissionsForRole(user.role);
		fallback.forEach((key) => permissions.add(key));
		roles.push(user.role);
	}

	return {
		id: user.id,
		username: user.username,
		role: user.role,
		isActive: user.isActive,
		roles,
		permissions
	};
}

export async function getActiveUser(event: RequestEvent): Promise<ActiveUser | null> {
	const sessionUser = event.locals.user;
	if (!sessionUser) return null;
	if (event.locals.userIsActive === false) return null;

	return {
		id: sessionUser.id,
		username: sessionUser.username,
		role: event.locals.legacyRole ?? 'STAFF',
		isActive: event.locals.userIsActive ?? true,
		roles: event.locals.roles ?? [],
		permissions: event.locals.permissions ?? new Set()
	};
}

function buildLoginRedirect(event: RequestEvent): string {
	const next = `${event.url.pathname}${event.url.search}`;
	return `/auth/login?next=${encodeURIComponent(next)}`;
}

export async function requireUser(
	event: RequestEvent,
	options: RequireUserOptions = {}
): Promise<ActiveUser> {
	const sessionUser = event.locals.user;
	if (!sessionUser) {
		if (options.redirectToLogin ?? true) {
			throw redirect(303, buildLoginRedirect(event));
		}
		throw error(401, 'Unauthorized');
	}

	if (event.locals.userIsActive === false) {
		throw error(403, 'Forbidden');
	}

	return {
		id: sessionUser.id,
		username: sessionUser.username,
		role: event.locals.legacyRole ?? 'STAFF',
		isActive: event.locals.userIsActive ?? true,
		roles: event.locals.roles ?? [],
		permissions: event.locals.permissions ?? new Set()
	};
}

export async function requireActiveUser(event: RequestEvent) {
	return requireUser(event);
}

export async function requirePermission(
	event: RequestEvent,
	action: PermissionKey,
	options: RequireUserOptions = {}
) {
	const user = await requireUser(event, options);
	if (!can(user.permissions, action)) {
		throw error(403, 'Forbidden');
	}
	return user;
}

export async function requireAnyPermission(
	event: RequestEvent,
	actions: PermissionKey[],
	options: RequireUserOptions = {}
) {
	const user = await requireUser(event, options);
	const allowed = actions.some((action) => can(user.permissions, action));
	if (!allowed) {
		throw error(403, 'Forbidden');
	}
	return user;
}
