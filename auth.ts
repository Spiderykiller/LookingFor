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
          const users = await sql`
            SELECT * FROM users
            WHERE email = ${credentials.email}
            LIMIT 1
          `;

          const user = users[0];
          if (!user) return null;

          if (!user.password) {
            console.warn(`[auth] Email login attempted on Google-only account: ${credentials.email}`);
            return null;
          }

          const isValid = await compare(
            String(credentials.password),
            String(user.password)
          );
          if (!isValid) return null;

          return {
            id:    String(user.id),
            name:  user.username,
            email: user.email,
            image: null, // never put avatar in JWT — fetch via /api/profile instead
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
            SELECT id FROM users
            WHERE provider_account_id = ${account.providerAccountId}
            LIMIT 1
          `;
          if (existing[0]) return true;

          const emailMatch = await sql`
            SELECT id, password FROM users
            WHERE email = ${user.email}
            LIMIT 1
          `;

          if (emailMatch[0]) {
            await sql`
              UPDATE users
              SET provider_account_id = ${account.providerAccountId},
                  avatar_url = COALESCE(avatar_url, ${user.image ?? null})
              WHERE email = ${user.email}
            `;
          } else {
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
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      try {
        // Fetch fresh username and id — but NOT avatar_url
        // Storing base64 avatars in the JWT causes tokens >13KB which breaks
        // Vercel's edge proxy (header size limit ~8KB)
        const users = await sql`
          SELECT id, username FROM users
          WHERE email = ${session.user?.email}
          LIMIT 1
        `;

        const user = users[0];
        if (user) {
          session.user.id    = String(user.id);
          session.user.name  = user.username;
          // image intentionally omitted — load via /api/profile/[id] when needed
        }
      } catch (err) {
        console.error("[auth] session callback error:", err);
      }

      return session;
    },
  },

  secret: process.env.AUTH_SECRET,
});