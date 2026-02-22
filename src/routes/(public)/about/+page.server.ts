import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { renderMarkdown } from '$lib/server/markdown';
import { getPublishedSitePageBySlug } from '$lib/server/services/sitePageService';

export const load: PageServerLoad = async () => {
	const page = await getPublishedSitePageBySlug('about');
	if (!page) {
		throw error(404, 'Page not found.');
	}

	return {
		page: {
			title: page.title,
			updatedAt: page.updatedAt
		},
		html: renderMarkdown(page.contentMarkdown)
	};
};
