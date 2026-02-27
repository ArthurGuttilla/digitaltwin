/**
 * Full NextAuth config — Node.js runtime only.
 * Extends authConfig with the DB-backed authorize() function.
 * Do NOT import this from middleware.ts (Edge runtime).
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyUser } from "@/lib/users";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email    = credentials?.email    as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        return await verifyUser(email, password);
      },
    }),
  ],
});
