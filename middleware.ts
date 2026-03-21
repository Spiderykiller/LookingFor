// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export default async function middleware(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") ?? "";

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();

    if (token) {
      // Convert mobile Bearer token → authjs session cookie
      // so all downstream API routes see a normal next-auth session
      const newHeaders = new Headers(req.headers);
      newHeaders.set(
        "Cookie",
        `__Secure-authjs.session-token=${token}; authjs.session-token=${token}`,
      );
      newHeaders.delete("Authorization");

      const newReq = new NextRequest(req.url, {
        method:  req.method,
        headers: newHeaders,
        body:    ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
        // @ts-ignore
        duplex: "half",
      });

      // @ts-ignore
      return (auth as any)(newReq);
    }
  }

  // @ts-ignore
  return (auth as any)(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|google-icon.svg).*)"],
};