declare module 'sanitize-html' {
	type SanitizeHtmlOptions = {
		allowedTags?: string[];
		allowedAttributes?: Record<string, string[]>;
		allowedSchemes?: string[];
		disallowedTagsMode?: string;
	};

	type SanitizeHtml = (html: string, options?: SanitizeHtmlOptions) => string;

	const sanitizeHtml: SanitizeHtml;
	export default sanitizeHtml;
}
