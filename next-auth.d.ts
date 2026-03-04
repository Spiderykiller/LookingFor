import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    } & DefaultSession["user"]; // keeps image, email optional safety from NextAuth default
  }

  interface User {
    id: string;
    name?: string;
    email?: string;
    avatar?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    avatar?: string;
  }
}