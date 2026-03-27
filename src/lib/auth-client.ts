import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

/**
 * Better Auth admin plugin APIs (available via authClient.admin.*):
 *
 * - authClient.admin.listUsers({ query: { limit, offset, searchField, searchValue } })
 *   Lists users with pagination and search. Returns { users, total }.
 *
 * - authClient.admin.setRole({ userId, role })
 *   Updates a user's role. Roles: user, staff, manager, admin, super_admin.
 *
 * - authClient.admin.banUser({ userId, banReason?, banExpiresIn? })
 *   Bans a user (optionally with reason and expiry).
 *
 * - authClient.admin.unbanUser({ userId })
 *   Removes a ban from a user.
 *
 * - authClient.admin.removeUser({ userId })
 *   Permanently deletes a user account.
 *
 * These APIs are available for wiring to a user management dashboard page
 * when one is built. The admin plugin is already configured on both server
 * (src/lib/auth.ts) and client (this file). The server-side DAL
 * (src/lib/dal/users.ts) currently uses direct Drizzle queries for
 * user listing; admin APIs above are the canonical way to do mutations.
 */

