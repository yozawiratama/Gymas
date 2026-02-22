import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const parentData = await event.parent();
	return {
		branding: parentData?.branding ?? null,
		company: parentData?.company ?? null
	};
};
