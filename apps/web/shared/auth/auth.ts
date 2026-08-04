import NextAuth, { type NextAuthOptions, type User, type Session } from "next-auth";
import { type JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
// Mock Prisma adapter since dependencies cannot be installed
// import { PrismaAdapter } from "@next-auth/prisma-adapter";
// import prisma from "../database/client";
import { env } from "../config/env";
import { verifyPassword } from "./crypto"; // Placeholder for Argon2

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // Blocked by environment
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: Record<"email" | "password", string> | undefined) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
          // Fetch CSRF token from backend
          const csrfRes = await fetch(`${apiUrl}/auth/csrf`);
          const csrfData = await csrfRes.json();
          const backendCookies = csrfRes.headers.get('set-cookie');

          // csurf reads the token from the 'x-csrf-token' header
          const res = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-csrf-token': csrfData.csrfToken,
              ...(backendCookies ? { 'Cookie': backendCookies } : {})
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.role,
              organizationId: data.user.organizationId,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            } as any;
          }
        } catch (error) {
          console.error("Auth error:", error);
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        // Inject organizationId into JWT to ensure stateless tenant isolation
        // token.organizationId = (user as any).organizationId;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        // (session.user as any).id = token.id;
        // (session.user as any).organizationId = token.organizationId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login", // Redirect to login with error
  },
  secret: env.NEXTAUTH_SECRET,
};

// export default NextAuth(authOptions);
