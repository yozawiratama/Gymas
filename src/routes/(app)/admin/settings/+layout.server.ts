import type { LayoutServerLoad } from './$types';
import { requirePermission } from '$lib/server/authz';

export const load: LayoutServerLoad = async (event) => {
	await requirePermission(event, 'admin.settings.manage');
	return {};
};
