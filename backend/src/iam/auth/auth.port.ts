// The authenticated user shape and the session contract that the iam module
// guarantees to its consumers. Feature modules import the `AuthUser` type only
// — they do not depend on Better Auth or any concrete auth implementation.
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface AuthSession {
  user: AuthUser;
  session: { id: string; userId: string; expiresAt: Date };
}

export const AUTH_PORT = Symbol('AUTH_PORT');

export interface AuthPort {
  getSession(headers: Record<string, unknown>): Promise<AuthSession | null>;
}
