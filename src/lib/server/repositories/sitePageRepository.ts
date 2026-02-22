import { serverPrisma } from '$lib/server/db/server';

export type SitePageRecord = {
	id: string;
	slug: string;
	title: string;
	contentMarkdown: string;
	published: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export async function listSitePages(): Promise<SitePageRecord[]> {
	return serverPrisma.sitePage.findMany({
		orderBy: {
			slug: 'asc'
		}
	});
}

export async function findSitePageBySlug(slug: string): Promise<SitePageRecord | null> {
	const trimmed = slug.trim();
	if (!trimmed) {
		return null;
	}
	return serverPrisma.sitePage.findUnique({
		where: { slug: trimmed }
	});
}

export async function updateSitePageBySlug(
	slug: string,
	data: {
		title: string;
		contentMarkdown: string;
		published?: boolean;
	}
): Promise<SitePageRecord> {
	return serverPrisma.sitePage.update({
		where: { slug },
		data
	});
}
