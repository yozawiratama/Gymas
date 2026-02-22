import type { LayoutServerLoad } from './$types';
import { getBrandingSettings, getCompanySettings } from '$lib/server/services/appSettingService';
import { requireBranch } from '$lib/server/branchContext';

export const load: LayoutServerLoad = async (event) => {
	const branchId = requireBranch(event);
	const branding = await getBrandingSettings(branchId);
	const company = await getCompanySettings(branchId, { fallbackCompanyName: branding.companyName });

	return { branding, company };
};
