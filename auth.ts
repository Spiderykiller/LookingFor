import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },

  pages: { signIn: "/login" },

  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        try {
          const users = await sql`
            SELECT * FROM users WHERE email = ${credentials.email} LIMIT 1
          `;
          const user = users[0];
          if (!user) return null;
          if (!user.password) return null;
          const isValid = await compare(String(credentials.password), String(user.password));
          if (!isValid) return null;
          return {
            id:    String(user.id),
            name:  user.username,
            email: user.email,
            image: null, // never put avatar in JWT — it causes token bloat
          };
        } catch (err) {
          console.error("[auth] authorize error:", err);
          return null;
        }
      },
    }),

    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;
      if (account?.provider === "google") {
        try {
          const existing = await sql`
            SELECT id FROM users WHERE provider_account_id = ${account.providerAccountId} LIMIT 1
          `;
          if (existing[0]) return true;
          const emailMatch = await sql`
            SELECT id FROM users WHERE email = ${user.email} LIMIT 1
          `;
          if (emailMatch[0]) {
            await sql`
              UPDATE users SET provider_account_id = ${account.providerAccountId},
              avatar_url = COALESCE(avatar_url, ${user.image ?? null})
              WHERE email = ${user.email}
            `;
          } else {
            await sql`
              INSERT INTO users (username, email, provider, provider_account_id, avatar_url)
              VALUES (${user.name ?? user.email}, ${user.email}, 'google',
                      ${account.providerAccountId}, ${user.image ?? null})
            `;
          }
          return true;
        } catch (err) {
          console.error("[auth] Google signIn error:", err);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },

    async session({ session, token }) {
      try {
        // Only fetch id + username — never avatar_url (causes JWT bloat > Vercel limit)
        const users = await sql`
          SELECT id, username FROM users WHERE email = ${session.user?.email} LIMIT 1
        `;
        const user = users[0];
        if (user) {
          session.user.id   = String(user.id);
          session.user.name = user.username;
        }
      } catch (err) {
        console.error("[auth] session callback error:", err);
      }
      return session;
    },

    // ── Route protection ──────────────────────────────────────────
    // Runs after middleware injects the Bearer token as a cookie,
    // so session is populated for mobile requests too.
    async authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;

      const isPublic =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/signup") ||
        nextUrl.pathname.startsWith("/api/auth") ||
        nextUrl.pathname.startsWith("/api/signup") ||
        nextUrl.pathname.startsWith("/api/login") ||
        nextUrl.pathname.startsWith("/api/auth/mobile") ||
        nextUrl.pathname.startsWith("/api/feed") ||
        nextUrl.pathname.startsWith("/api/intents") ||
        nextUrl.pathname.startsWith("/api/responses") ||
        nextUrl.pathname.startsWith("/api/communities") ||
        nextUrl.pathname.startsWith("/api/conversations") ||
        nextUrl.pathname.startsWith("/api/notifications");

      if (!isLoggedIn && !isPublic) {
        return NextResponse.redirect(new URL("/login", nextUrl));
      }

      if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/signup")) {
        return NextResponse.redirect(new URL("/", nextUrl));
      }

      return true;
    },
  },
  secret: process.env.AUTH_SECRET,
});