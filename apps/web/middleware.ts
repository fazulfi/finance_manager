// apps/web/middleware.ts
// Route protection via NextAuth v5 auth() middleware.
// Unauthenticated requests to protected routes are redirected to /login.
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all routes EXCEPT:
     * - /login, /signup        (auth pages — public)
     * - /api/auth/**           (NextAuth internal routes)
     * - /api/register          (public registration endpoint)
     * - /_next/static          (Next.js build artifacts)
     * - /_next/image           (Next.js image optimization)
     * - /favicon.ico           (static file)
     * - /robots.txt            (static file)
     */
    "/((?!login|signup|api/auth|api/register|_next/static|_next/image|favicon\\.ico|robots\\.txt).*)",
  ],
};
