export const SESSION_LIFETIME_DAYS = 30;
const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_LIFETIME_DAYS * 24 * 60 * 60;

export type SessionCookieOptions = {
	path: string;
	httpOnly: boolean;
	secure: boolean;
	sameSite: 'lax';
	maxAge: number;
};

export function getSessionCookieOptions(dev: boolean): SessionCookieOptions {
	return {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: SESSION_COOKIE_MAX_AGE_SECONDS
	};
}
