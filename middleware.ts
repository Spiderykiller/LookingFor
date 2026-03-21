// middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;

  const isPublicRoute =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/signup") ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/api/signup") ||
    nextUrl.pathname.startsWith("/api/login") ||
    nextUrl.pathname.startsWith("/api/auth/mobile") ||
    // Feed is public — anyone can browse intents (same as web app)
    nextUrl.pathname.startsWith("/api/feed") ||
    // Intents GET is public; POST will check session inside the route handler
    nextUrl.pathname.startsWith("/api/intents") ||
    // Communities browsing is public
    nextUrl.pathname.startsWith("/api/communities") ||
    // Conversations/unread need to not redirect (they handle auth internally)
    nextUrl.pathname.startsWith("/api/conversations");

  // If not logged in and trying to access a protected route → redirect to login
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // If already logged in and trying to access login/signup → redirect to home
  if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|google-icon.svg).*)",
  ],
};