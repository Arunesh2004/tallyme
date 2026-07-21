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

        // DB fetch for user placeholder
        // const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        // if (!user) return null;

        // const isValid = await verifyPassword(user.passwordHash, credentials.password);
        // if (!isValid) return null;
        
        // Write AuditLog for Login Event (Mocked)
        // await auditService.log(user.id, "LOGIN_SUCCESS", ...);

        // return { id: user.id, email: user.email, organizationId: user.organizationId };
        return null; // Mock return
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
