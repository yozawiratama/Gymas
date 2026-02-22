import type { PageServerLoad } from './$types';
import { renderMarkdown } from '$lib/server/markdown';
import { getPublishedSitePageBySlug } from '$lib/server/services/sitePageService';

export const load: PageServerLoad = async () => {
	const homePage = await getPublishedSitePageBySlug('home');
	return {
		homePage: homePage
			? {
					title: homePage.title,
					updatedAt: homePage.updatedAt
				}
			: null,
		homeHtml: homePage ? renderMarkdown(homePage.contentMarkdown) : null
	};
};
