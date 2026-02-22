import type { RequestHandler } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requirePermission, requireUser } from '$lib/server/authz';
import { setActiveBranchId } from '$lib/server/branchContext';
import { getBranchById } from '$lib/server/services/branchService';
import { parseString } from '$lib/server/validation';

export const POST: RequestHandler = async (event) => {
	await requireUser(event, { redirectToLogin: false });
	await requirePermission(event, 'admin.access', { redirectToLogin: false });
	await requirePermission(event, 'settings.edit', { redirectToLogin: false });

	const data = await event.request.formData();
	const branchId = parseString(data, 'branchId', {
		trim: true,
		max: 64,
		label: 'Branch'
	});

	const branch = await getBranchById(branchId);
	if (!branch || !branch.isActive) {
		throw error(400, 'Branch is invalid or inactive.');
	}

	setActiveBranchId(event, branch.id);

	throw redirect(303, event.request.headers.get('referer') ?? '/');
};
