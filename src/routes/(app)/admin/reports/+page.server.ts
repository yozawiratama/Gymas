import type { PageServerLoad } from './$types';
import { requirePermission } from '$lib/server/authz';

export const load: PageServerLoad = async (event) => {
	await requirePermission(event, 'admin.reports.view');

	return {};
};
