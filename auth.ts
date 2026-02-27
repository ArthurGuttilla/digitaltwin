import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyUser } from "@/lib/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
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
  callbacks: {
    jwt({ token, user }) {
      // Persist name + id into the JWT on first sign-in
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
});
