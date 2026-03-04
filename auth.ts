import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { sql } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
  },

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
          // ✅ Find by email only — no provider filter
          // This supports users who registered locally OR linked Google later
          const users = await sql`
            SELECT * FROM users
            WHERE email = ${credentials.email}
            LIMIT 1
          `;

          const user = users[0];

          // No user found
          if (!user) return null;

          // User exists but has no password (Google-only account)
          // Guide them to use Google sign-in instead
          if (!user.password) {
            console.warn(`[auth] Email login attempted on Google-only account: ${credentials.email}`);
            return null;
          }

          // Verify password
          const isValid = await compare(
            String(credentials.password),
            String(user.password)
          );
          if (!isValid) return null;

          return {
            id:     String(user.id),
            name:   user.username,
            email:  user.email,
            image:  user.avatar_url ?? null,
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
      // Credentials sign-in — authorize() already handled it
      if (account?.provider === "credentials") return true;

      if (account?.provider === "google") {
        try {
          // 1️⃣ Check if this exact Google account already exists
          const existing = await sql`
            SELECT id FROM users
            WHERE provider_account_id = ${account.providerAccountId}
            LIMIT 1
          `;

          // Already linked — nothing to do
          if (existing[0]) return true;

          // 2️⃣ Check if someone registered with this email via credentials
          const emailMatch = await sql`
            SELECT id, password FROM users
            WHERE email = ${user.email}
            LIMIT 1
          `;

          if (emailMatch[0]) {
            // ✅ Email exists — link Google account ID but DO NOT touch:
            //    - provider (keep 'local' so email/password still works)
            //    - password (never overwrite)
            //    - username (user set it themselves)
            await sql`
              UPDATE users
              SET provider_account_id = ${account.providerAccountId},
                  avatar_url = COALESCE(avatar_url, ${user.image ?? null})
              WHERE email = ${user.email}
            `;
          } else {
            // 3️⃣ Brand new user via Google — create account
            await sql`
              INSERT INTO users (username, email, provider, provider_account_id, avatar_url)
              VALUES (
                ${user.name ?? user.email},
                ${user.email},
                'google',
                ${account.providerAccountId},
                ${user.image ?? null}
              )
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
      // On first sign-in, `user` is populated — persist id into token
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      try {
        // Always fetch fresh user data from DB so session stays in sync
        const users = await sql`
          SELECT id, username, avatar_url FROM users
          WHERE email = ${session.user?.email}
          LIMIT 1
        `;

        const user = users[0];
        if (user) {
          session.user.id     = String(user.id);
          session.user.name   = user.username;
          session.user.image  = user.avatar_url ?? null;
        }
      } catch (err) {
        console.error("[auth] session callback error:", err);
      }

      return session;
    },
  },

  secret: process.env.AUTH_SECRET,
});