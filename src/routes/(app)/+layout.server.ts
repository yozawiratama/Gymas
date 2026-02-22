import type { LayoutServerLoad } from './$types';
import { canManageBranches, getActiveUser, requireUser } from '$lib/server/authz';
import { requireBranch } from '$lib/server/branchContext';
import { getBrandingSettings } from '$lib/server/services/appSettingService';
import { getBranchById, listBranches } from '$lib/server/services/branchService';
import { filterNavItems } from '$lib/nav';

export const load: LayoutServerLoad = async (event) => {
	await requireUser(event);

	const branchId = requireBranch(event);
	const parentData = await event.parent();
	const branding = parentData?.branding ?? (await getBrandingSettings(branchId));
	const viewer = await getActiveUser(event);
	const canSwitchBranch = viewer ? canManageBranches(viewer.permissions) : false;
	const [activeBranch, branches] = await Promise.all([
		getBranchById(branchId),
		canSwitchBranch ? listBranches({ activeOnly: true }) : Promise.resolve([])
	]);
	const navItems = filterNavItems(viewer?.permissions);

	return {
		branding,
		viewer: viewer
			? { id: viewer.id, username: viewer.username, role: viewer.role, roles: viewer.roles }
			: null,
		branch: activeBranch ? { id: activeBranch.id, name: activeBranch.name, code: activeBranch.code } : null,
		branches: branches.map((branch) => ({
			id: branch.id,
			name: branch.name,
			code: branch.code,
			isActive: branch.isActive
		})),
		canSwitchBranch,
		navItems
	};
};
