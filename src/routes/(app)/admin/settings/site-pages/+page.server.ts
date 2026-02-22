import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/authz';
import { badRequest, isAppError, notFound } from '$lib/server/httpErrors';
import { logger } from '$lib/server/logger';
import { renderMarkdown } from '$lib/server/markdown';
import {
	MAX_SITE_PAGE_CONTENT_LENGTH,
	MAX_SITE_PAGE_TITLE_LENGTH,
	SITE_PAGE_SLUGS,
	getSitePageBySlug,
	listSitePages,
	resolveSitePageSlug,
	updateSitePage
} from '$lib/server/services/sitePageService';
import { parseString } from '$lib/server/validation';

export const load: PageServerLoad = async (event) => {
	const route = event.route?.id ?? event.url.pathname;

	try {
		await requirePermission(event, 'admin.settings.manage');

		const pages = (await listSitePages()).filter((page) =>
			SITE_PAGE_SLUGS.includes(page.slug as (typeof SITE_PAGE_SLUGS)[number])
		);
		const fallbackSlug = pages[0]?.slug ?? 'about';
		const requestedSlug = event.url.searchParams.get('slug');
		const normalizedSlug = requestedSlug ? requestedSlug.trim().toLowerCase() : '';
		const selectedSlug = SITE_PAGE_SLUGS.includes(
			normalizedSlug as (typeof SITE_PAGE_SLUGS)[number]
		)
			? (normalizedSlug as (typeof SITE_PAGE_SLUGS)[number])
			: resolveSitePageSlug(fallbackSlug);
		const page =
			pages.find((item) => item.slug === selectedSlug) ??
			(await getSitePageBySlug(selectedSlug));

		if (!page) {
			throw notFound('Site page not found.', 'SITE_PAGE_NOT_FOUND');
		}

		return {
			pages,
			page,
			previewHtml: renderMarkdown(page.contentMarkdown)
		};
	} catch (err) {
		if (isAppError(err)) {
			logger.warn('Site page load failed', {
				route,
				requestId: event.locals.requestId,
				errorCode: err.code
			});
			throw error(err.status, err.publicMessage);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Site page load failed', {
			route,
			requestId: event.locals.requestId,
			error: err
		});
		throw error(500, 'Something went wrong.');
	}
};

export const actions: Actions = {
	save: async (event) => {
		const route = event.route?.id ?? event.url.pathname;

		try {
			const user = await requirePermission(event, 'admin.settings.manage');
			const data = await event.request.formData();

			const slug = resolveSitePageSlug(
				parseString(data, 'slug', { trim: true, label: 'Page' })
			);
			const title = parseString(data, 'title', {
				trim: true,
				min: 1,
				max: MAX_SITE_PAGE_TITLE_LENGTH,
				label: 'Title'
			});
			const contentMarkdown = parseString(data, 'contentMarkdown', {
				max: MAX_SITE_PAGE_CONTENT_LENGTH,
				label: 'Content'
			});
			if (!contentMarkdown.trim()) {
				throw badRequest('Content is required.');
			}

			const existing = await getSitePageBySlug(slug);
			if (!existing) {
				return fail(404, { success: false, message: 'Site page not found.' });
			}

			const page = await updateSitePage(slug, {
				title,
				contentMarkdown,
				published: existing.published
			});
			const pages = (await listSitePages()).filter((page) =>
				SITE_PAGE_SLUGS.includes(page.slug as (typeof SITE_PAGE_SLUGS)[number])
			);

			logger.info('Site page updated', {
				route,
				requestId: event.locals.requestId,
				userId: user.id,
				slug
			});

			return {
				success: true,
				action: 'save',
				page,
				pages,
				previewHtml: renderMarkdown(page.contentMarkdown)
			};
		} catch (err) {
			if (isAppError(err)) {
				logger.warn('Site page validation failed', {
					route,
					requestId: event.locals.requestId,
					errorCode: err.code
				});
				return fail(err.status, { success: false, message: err.publicMessage });
			}

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('Site page update failed', {
				route,
				requestId: event.locals.requestId,
				error: err
			});
			return fail(500, { success: false, message: 'Something went wrong.' });
		}
	}
};
