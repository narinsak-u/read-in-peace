import { createAuthClient } from 'better-auth/vue';

export const authClient = createAuthClient();

export const { signOut, useSession } = authClient;
