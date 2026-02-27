/**
 * Edge-compatible NextAuth config.
 * Must NOT import any Node.js-only modules (better-sqlite3, fs, etc.)
 * This is shared between middleware.ts and auth.ts.
 */

import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" as const },
  providers: [
    // Credentials listed so NextAuth recognizes the provider.
    // The actual authorize() with DB access lives in auth.ts (Node.js only).
    Credentials({}),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id)   session.user.id   = token.id   as string;
      if (token.name) session.user.name = token.name as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
