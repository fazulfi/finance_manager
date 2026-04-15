// apps/web/middleware.ts
// Route protection via NextAuth v5 auth() middleware.
// Unauthenticated requests to protected routes are redirected to /login.
import { NextResponse } from "next/server";

import { auth } from "@/auth";

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    const callbackPath = req.nextUrl.pathname === "/" ? "/dashboard" : req.nextUrl.pathname;
    loginUrl.searchParams.set("callbackUrl", callbackPath);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!login|signup|api/auth|api/register|_next/static|_next/image|favicon\\.ico|robots\\.txt).*)",
  ],
};
