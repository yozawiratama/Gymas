import type { RequestHandler } from './$types';
import { getMediaFileById } from '$lib/server/services/mediaService';

const CACHE_CONTROL_HEADER = 'public, max-age=86400';

export const GET: RequestHandler = async ({ params }) => {
	const id = params.id;

	if (!id) {
		return new Response(null, { status: 404 });
	}

	try {
		const media = await getMediaFileById(id);
		if (!media) {
			return new Response(null, { status: 404 });
		}

		const body = new Uint8Array(media.data);
		return new Response(body, {
			status: 200,
			headers: {
				'Content-Type': media.mimeType,
				'Cache-Control': CACHE_CONTROL_HEADER
			}
		});
	} catch {
		return new Response(null, { status: 404 });
	}
};
