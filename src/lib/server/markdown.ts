import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
	'p',
	'br',
	'strong',
	'em',
	'ul',
	'ol',
	'li',
	'a',
	'h1',
	'h2',
	'h3',
	'h4',
	'blockquote',
	'code',
	'pre',
	'hr'
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
	a: ['href', 'title']
};

export function renderMarkdown(markdown: string): string {
	const raw = marked.parse(markdown ?? '', { async: false });
	const html = typeof raw === 'string' ? raw : '';
	return sanitizeHtml(html, {
		allowedTags: ALLOWED_TAGS,
		allowedAttributes: ALLOWED_ATTRIBUTES,
		allowedSchemes: ['http', 'https', 'mailto', 'tel'],
		disallowedTagsMode: 'discard'
	});
}
