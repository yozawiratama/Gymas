import { Prisma } from '$lib/server/db/prisma';
import type { Prisma as PrismaTypes } from '@prisma/client';
import { serverPrisma } from '$lib/server/db/server';
import { getLegacyRolePermissions } from '$lib/server/authz';
import { badRequest, conflict, notFound } from '$lib/server/httpErrors';
import { record as recordAudit } from '$lib/server/services/auditService';

const ROLE_NAME_MIN = 2;
const ROLE_NAME_MAX = 60;
const ROLE_DESC_MAX = 280;

export type AuditContext = {
	actorUserId?: string | null;
	ip?: string | null;
	userAgent?: string | null;
};

export type RoleListItem = {
	id: string;
	name: string;
	description: string | null;
	permissionCount: number;
	userCount: number;
};

export type PermissionListItem = {
	id: string;
	key: string;
	description: string | null;
};

export type RoleDetail = {
	id: string;
	name: string;
	description: string | null;
	permissionIds: string[];
	permissions: PermissionListItem[];
	users: {
		id: string;
		username: string;
		isActive: boolean;
	}[];
};

export type RoleOption = {
	id: string;
	name: string;
	description: string | null;
};

export type UserListItem = {
	id: string;
	username: string;
	isActive: boolean;
	legacyRole: string;
	roleIds: string[];
	roleNames: string[];
};

function normalizeRoleName(raw: string): string {
	const value = raw.trim();
	if (!value) {
		throw badRequest('Role name is required.', 'INVALID_INPUT');
	}
	if (value.length < ROLE_NAME_MIN) {
		throw badRequest(`Role name must be at least ${ROLE_NAME_MIN} characters.`, 'INVALID_INPUT');
	}
	if (value.length > ROLE_NAME_MAX) {
		throw badRequest(`Role name must be ${ROLE_NAME_MAX} characters or less.`, 'INVALID_INPUT');
	}
	return value;
}

function normalizeRoleDescription(raw?: string | null): string | null {
	if (!raw) return null;
	const value = raw.trim();
	if (!value) return null;
	if (value.length > ROLE_DESC_MAX) {
		throw badRequest(
			`Description must be ${ROLE_DESC_MAX} characters or less.`,
			'INVALID_INPUT'
		);
	}
	return value;
}

function normalizeIdList(values: unknown[]): string[] {
	const ids = values
		.filter((value): value is string => typeof value === 'string')
		.map((value) => value.trim())
		.filter(Boolean);
	return Array.from(new Set(ids));
}

export async function listRoles(search?: string | null): Promise<RoleListItem[]> {
	const where = search ? { name: { contains: search.trim() } } : {};
	const roles = await serverPrisma.role.findMany({
		where,
		orderBy: { name: 'asc' },
		include: {
			_count: {
				select: {
					permissions: true,
					users: true
				}
			}
		}
	});

	return roles.map((role) => ({
		id: role.id,
		name: role.name,
		description: role.description ?? null,
		permissionCount: role._count.permissions,
		userCount: role._count.users
	}));
}

export async function listRoleOptions(): Promise<RoleOption[]> {
	const roles = await serverPrisma.role.findMany({
		orderBy: { name: 'asc' },
		select: { id: true, name: true, description: true }
	});
	return roles.map((role) => ({
		id: role.id,
		name: role.name,
		description: role.description ?? null
	}));
}

export async function listPermissions(): Promise<PermissionListItem[]> {
	const permissions = await serverPrisma.permission.findMany({
		orderBy: { key: 'asc' },
		select: { id: true, key: true, description: true }
	});
	return permissions.map((permission) => ({
		id: permission.id,
		key: permission.key,
		description: permission.description ?? null
	}));
}

export async function getRoleDetail(roleId: string): Promise<RoleDetail | null> {
	const role = await serverPrisma.role.findUnique({
		where: { id: roleId },
		select: {
			id: true,
			name: true,
			description: true,
			permissions: {
				select: {
					permission: {
						select: { id: true, key: true, description: true }
					}
				}
			},
			users: {
				select: {
					user: {
						select: { id: true, username: true, isActive: true }
					}
				}
			}
		}
	});

	if (!role) return null;

	const permissions = role.permissions
		.map((entry) => entry.permission)
		.filter((permission): permission is PermissionListItem => Boolean(permission))
		.sort((a, b) => a.key.localeCompare(b.key));

	return {
		id: role.id,
		name: role.name,
		description: role.description ?? null,
		permissionIds: permissions.map((permission) => permission.id),
		permissions,
		users: role.users.map((entry) => ({
			id: entry.user.id,
			username: entry.user.username,
			isActive: entry.user.isActive
		}))
	};
}

export async function listUsers(search?: string | null): Promise<UserListItem[]> {
	const where = search ? { username: { contains: search.trim() } } : {};
	const users = await serverPrisma.user.findMany({
		where,
		orderBy: { username: 'asc' },
		select: {
			id: true,
			username: true,
			isActive: true,
			role: true,
			userRoles: {
				select: {
					role: {
						select: { id: true, name: true }
					}
				}
			}
		}
	});

	return users.map((user) => {
		const roleNames = user.userRoles
			.map((entry) => entry.role?.name)
			.filter((value): value is string => Boolean(value));
		const roleIds = user.userRoles
			.map((entry) => entry.role?.id)
			.filter((value): value is string => Boolean(value));

		return {
			id: user.id,
			username: user.username,
			isActive: user.isActive,
			legacyRole: user.role,
			roleIds,
			roleNames
		};
	});
}

export async function createRole(
	input: { name: string; description?: string | null },
	audit?: AuditContext
) {
	const name = normalizeRoleName(input.name);
	const description = normalizeRoleDescription(input.description ?? null);

	try {
		const role = await serverPrisma.role.create({
			data: {
				name,
				description
			}
		});

		await recordAudit({
			action: 'ROLE_CREATED',
			actorUserId: audit?.actorUserId ?? null,
			entityType: 'Role',
			entityId: role.id,
			meta: {
				name: role.name,
				description: role.description ?? null
			},
			ip: audit?.ip ?? null,
			userAgent: audit?.userAgent ?? null
		});

		return role;
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
			throw conflict('Role name already exists.', 'ROLE_NAME_EXISTS');
		}
		throw error;
	}
}

export async function updateRoleDescription(
	roleId: string,
	description: string | null | undefined,
	audit?: AuditContext
) {
	const role = await serverPrisma.role.findUnique({
		where: { id: roleId },
		select: { id: true, name: true, description: true }
	});

	if (!role) {
		throw notFound('Role not found.', 'ROLE_NOT_FOUND');
	}

	const nextDescription = normalizeRoleDescription(description ?? null);

	const updated = await serverPrisma.role.update({
		where: { id: roleId },
		data: {
			description: nextDescription
		}
	});

	await recordAudit({
		action: 'ROLE_UPDATED',
		actorUserId: audit?.actorUserId ?? null,
		entityType: 'Role',
		entityId: roleId,
		meta: {
			name: updated.name,
			description: updated.description ?? null
		},
		ip: audit?.ip ?? null,
		userAgent: audit?.userAgent ?? null
	});

	return updated;
}

export async function deleteRole(roleId: string, audit?: AuditContext) {
	const role = await serverPrisma.role.findUnique({
		where: { id: roleId },
		select: { id: true, name: true }
	});

	if (!role) {
		throw notFound('Role not found.', 'ROLE_NOT_FOUND');
	}

	const inUseCount = await serverPrisma.userRole.count({
		where: { roleId }
	});

	if (inUseCount > 0) {
		throw badRequest('Role is in use.', 'ROLE_IN_USE');
	}

	await serverPrisma.role.delete({ where: { id: roleId } });

	await recordAudit({
		action: 'ROLE_DELETED',
		actorUserId: audit?.actorUserId ?? null,
		entityType: 'Role',
		entityId: roleId,
		meta: {
			name: role.name
		},
		ip: audit?.ip ?? null,
		userAgent: audit?.userAgent ?? null
	});
}

export async function updateRolePermissions(input: {
	roleId: string;
	permissionIds: unknown[];
	audit?: AuditContext;
	guardUserId?: string | null;
}) {
	const role = await serverPrisma.role.findUnique({
		where: { id: input.roleId },
		select: {
			id: true,
			name: true,
			permissions: {
				select: { permissionId: true }
			}
		}
	});

	if (!role) {
		throw notFound('Role not found.', 'ROLE_NOT_FOUND');
	}

	const nextPermissionIds = normalizeIdList(input.permissionIds);

	let nextPermissionKeys = new Set<string>();
	if (nextPermissionIds.length > 0) {
		const records = await serverPrisma.permission.findMany({
			where: { id: { in: nextPermissionIds } },
			select: { id: true, key: true }
		});

		if (records.length !== nextPermissionIds.length) {
			throw badRequest('Unknown permission selected.', 'INVALID_PERMISSION');
		}

		nextPermissionKeys = new Set(records.map((record) => record.key));
	}

	const currentPermissionIds = new Set(role.permissions.map((entry) => entry.permissionId));
	const nextPermissionIdSet = new Set(nextPermissionIds);
	const toAdd = nextPermissionIds.filter((id) => !currentPermissionIds.has(id));
	const toRemove = Array.from(currentPermissionIds).filter((id) => !nextPermissionIdSet.has(id));

	if (input.guardUserId) {
		const assignment = await serverPrisma.userRole.findUnique({
			where: {
				userId_roleId: {
					userId: input.guardUserId,
					roleId: input.roleId
				}
			},
			select: { userId: true }
		});

		if (assignment) {
			const userRoles = await serverPrisma.userRole.findMany({
				where: { userId: input.guardUserId },
				select: { roleId: true }
			});
			const roleIds = userRoles.map((entry) => entry.roleId);
			const roles = await serverPrisma.role.findMany({
				where: { id: { in: roleIds } },
				select: {
					id: true,
					permissions: {
						select: {
							permission: { select: { key: true } }
						}
					}
				}
			});

			const permissionKeys = new Set<string>();
			for (const roleRecord of roles) {
				if (roleRecord.id === input.roleId) {
					nextPermissionKeys.forEach((key) => permissionKeys.add(key));
					continue;
				}
				for (const entry of roleRecord.permissions) {
					const key = entry.permission?.key;
					if (key) {
						permissionKeys.add(key);
					}
				}
			}

			if (!permissionKeys.has('admin.security.manage')) {
				throw badRequest('You cannot remove your own security access.', 'LOCKOUT');
			}
		}
	}

	const ops: PrismaTypes.PrismaPromise<unknown>[] = [];
	if (toRemove.length > 0) {
		ops.push(
			serverPrisma.rolePermission.deleteMany({
				where: {
					roleId: input.roleId,
					permissionId: { in: toRemove }
				}
			})
		);
	}
	if (toAdd.length > 0) {
		ops.push(
			serverPrisma.rolePermission.createMany({
				data: toAdd.map((permissionId) => ({
					roleId: input.roleId,
					permissionId
				})),
				skipDuplicates: true
			})
		);
	}
	if (ops.length > 0) {
		await serverPrisma.$transaction(ops);
	}

	const auditPermissionIds = Array.from(new Set([...toAdd, ...toRemove]));
	const auditPermissionRecords =
		auditPermissionIds.length > 0
			? await serverPrisma.permission.findMany({
					where: { id: { in: auditPermissionIds } },
					select: { id: true, key: true }
				})
			: [];
	const permissionKeyById = new Map(
		auditPermissionRecords.map((record) => [record.id, record.key])
	);

	await Promise.all([
		...toAdd.map((permissionId) =>
			recordAudit({
				action: 'ROLE_PERMISSION_GRANTED',
				actorUserId: input.audit?.actorUserId ?? null,
				entityType: 'Role',
				entityId: input.roleId,
				meta: {
					roleId: input.roleId,
					roleName: role.name,
					permissionId,
					permissionKey: permissionKeyById.get(permissionId) ?? null
				},
				ip: input.audit?.ip ?? null,
				userAgent: input.audit?.userAgent ?? null
			})
		),
		...toRemove.map((permissionId) =>
			recordAudit({
				action: 'ROLE_PERMISSION_REVOKED',
				actorUserId: input.audit?.actorUserId ?? null,
				entityType: 'Role',
				entityId: input.roleId,
				meta: {
					roleId: input.roleId,
					roleName: role.name,
					permissionId,
					permissionKey: permissionKeyById.get(permissionId) ?? null
				},
				ip: input.audit?.ip ?? null,
				userAgent: input.audit?.userAgent ?? null
			})
		)
	]);

	return {
		added: toAdd.length,
		removed: toRemove.length
	};
}

export async function updateUserRoles(input: {
	userId: string;
	roleIds: unknown[];
	audit?: AuditContext;
	guardUserId?: string | null;
}) {
	const user = await serverPrisma.user.findUnique({
		where: { id: input.userId },
		select: {
			id: true,
			username: true,
			role: true,
			userRoles: {
				select: {
					roleId: true
				}
			}
		}
	});

	if (!user) {
		throw notFound('User not found.', 'USER_NOT_FOUND');
	}

	const nextRoleIds = normalizeIdList(input.roleIds);
	const currentRoleIds = user.userRoles.map((entry) => entry.roleId);
	const nextRoleIdSet = new Set(nextRoleIds);
	const currentRoleIdSet = new Set(currentRoleIds);
	const toAdd = nextRoleIds.filter((id) => !currentRoleIdSet.has(id));
	const toRemove = currentRoleIds.filter((id) => !nextRoleIdSet.has(id));

	const allRoleIds = Array.from(new Set([...nextRoleIds, ...currentRoleIds]));
	const roleRecords =
		allRoleIds.length > 0
			? await serverPrisma.role.findMany({
					where: { id: { in: allRoleIds } },
					select: {
						id: true,
						name: true,
						permissions: {
							select: {
								permission: { select: { key: true } }
							}
						}
					}
				})
			: [];

	if (nextRoleIds.length > 0) {
		const foundNext = roleRecords.filter((record) => nextRoleIdSet.has(record.id));
		if (foundNext.length !== nextRoleIds.length) {
			throw badRequest('Unknown role selected.', 'INVALID_ROLE');
		}
	}

	const roleById = new Map(roleRecords.map((record) => [record.id, record]));

	if (input.guardUserId && input.guardUserId === user.id) {
		const permissionKeys = new Set<string>();

		if (nextRoleIds.length === 0) {
			const legacyPermissions = getLegacyRolePermissions(user.role);
			legacyPermissions.forEach((key) => permissionKeys.add(key));
		} else {
			for (const roleId of nextRoleIds) {
				const roleRecord = roleById.get(roleId);
				if (!roleRecord) continue;
				for (const entry of roleRecord.permissions) {
					const key = entry.permission?.key;
					if (key) {
						permissionKeys.add(key);
					}
				}
			}
		}

		if (!permissionKeys.has('admin.security.manage')) {
			throw badRequest('You cannot remove your own security access.', 'LOCKOUT');
		}
	}

	const ops: PrismaTypes.PrismaPromise<unknown>[] = [];
	if (toRemove.length > 0) {
		ops.push(
			serverPrisma.userRole.deleteMany({
				where: {
					userId: input.userId,
					roleId: { in: toRemove }
				}
			})
		);
	}
	if (toAdd.length > 0) {
		ops.push(
			serverPrisma.userRole.createMany({
				data: toAdd.map((roleId) => ({
					userId: input.userId,
					roleId
				})),
				skipDuplicates: true
			})
		);
	}
	if (ops.length > 0) {
		await serverPrisma.$transaction(ops);
	}

	await Promise.all([
		...toAdd.map((roleId) => {
			const roleName = roleById.get(roleId)?.name ?? null;
			return recordAudit({
				action: 'USER_ROLE_GRANTED',
				actorUserId: input.audit?.actorUserId ?? null,
				entityType: 'User',
				entityId: input.userId,
				meta: {
					userId: input.userId,
					username: user.username,
					roleId,
					roleName
				},
				ip: input.audit?.ip ?? null,
				userAgent: input.audit?.userAgent ?? null
			});
		}),
		...toRemove.map((roleId) => {
			const roleName = roleById.get(roleId)?.name ?? null;
			return recordAudit({
				action: 'USER_ROLE_REVOKED',
				actorUserId: input.audit?.actorUserId ?? null,
				entityType: 'User',
				entityId: input.userId,
				meta: {
					userId: input.userId,
					username: user.username,
					roleId,
					roleName
				},
				ip: input.audit?.ip ?? null,
				userAgent: input.audit?.userAgent ?? null
			});
		})
	]);

	return {
		added: toAdd.length,
		removed: toRemove.length
	};
}
