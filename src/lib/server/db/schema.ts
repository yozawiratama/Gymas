// Placeholder types for auth/session code until repositories are wired to Prisma.

export type Session = {
	id: string;
	userId: string;
	expiresAt: Date;
};

export type User = {
	id: string;
	username: string;
};
