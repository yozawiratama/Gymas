import { badRequest } from '$lib/server/httpErrors';
import {
	findSitePageBySlug,
	listSitePages as listSitePagesRecord,
	updateSitePageBySlug,
	type SitePageRecord
} from '$lib/server/repositories/sitePageRepository';

export const SITE_PAGE_SLUGS = ['home', 'about', 'contact-us'] as const;
export type SitePageSlug = (typeof SITE_PAGE_SLUGS)[number];

export const MAX_SITE_PAGE_TITLE_LENGTH = 120;
export const MAX_SITE_PAGE_CONTENT_LENGTH = 10000;

export function resolveSitePageSlug(value: string): SitePageSlug {
	const normalized = value.trim().toLowerCase();
	if (!normalized) {
		throw badRequest('Page selection is required.', 'INVALID_INPUT');
	}
	if (SITE_PAGE_SLUGS.includes(normalized as SitePageSlug)) {
		return normalized as SitePageSlug;
	}
	throw badRequest('Invalid page selection.', 'INVALID_INPUT');
}

export async function listSitePages(): Promise<SitePageRecord[]> {
	return listSitePagesRecord();
}

export async function getSitePageBySlug(slug: SitePageSlug): Promise<SitePageRecord | null> {
	return findSitePageBySlug(slug);
}

export async function getPublishedSitePageBySlug(
	slug: SitePageSlug
): Promise<SitePageRecord | null> {
	const page = await findSitePageBySlug(slug);
	if (!page || !page.published) {
		return null;
	}
	return page;
}

export async function updateSitePage(
	slug: SitePageSlug,
	input: { title: string; contentMarkdown: string; published?: boolean }
): Promise<SitePageRecord> {
	return updateSitePageBySlug(slug, {
		title: input.title,
		contentMarkdown: input.contentMarkdown,
		published: input.published
	});
}
