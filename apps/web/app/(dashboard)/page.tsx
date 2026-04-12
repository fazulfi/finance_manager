// apps/web/app/(dashboard)/page.tsx
// Sample protected dashboard page to test middleware protection
// NextAuth v5 integration with Server Component pattern

import type { Metadata } from "next";
import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@finance/ui";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Welcome to your Finance Manager Pro dashboard",
};

export default async function DashboardPage() {
  // Get session from NextAuth v5 auth() function
  const session = await auth();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Welcome back, {session?.user?.name || session?.user?.email}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* AUTHENTICATED STATE - User is logged in */}
          {session?.user && (
            <>
              {/* Welcome Section */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Logged in as{" "}
                  <span className="font-medium text-foreground">{session.user.email}</span> • User
                  ID: <span className="font-mono text-muted-foreground">{session.user.id}</span>
                </p>
              </div>

              {/* User Info Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="mb-2 text-sm font-medium">Email</h3>
                  <p className="text-sm">{session.user.email}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="mb-2 text-sm font-medium">User ID</h3>
                  <p className="text-sm font-mono text-muted-foreground">{session.user.id}</p>
                </div>
              </div>

              {/* User Name (if available) */}
              {session.user.name && (
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="mb-2 text-sm font-medium">Name</h3>
                  <p className="text-sm">{session.user.name}</p>
                </div>
              )}

              {/* Testing Links */}
              <div className="flex flex-wrap gap-4 pt-2">
                <a
                  href="/login"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2"
                >
                  Login
                </a>
                <a
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2"
                >
                  Sign up
                </a>
              </div>
            </>
          )}

          {/* UNAUTHENTICATED STATE - User is not logged in */}
          {!session && (
            <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center p-12">
              {/* Icon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <AlertCircle className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">You must be logged in to view this page</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Please sign in to access your dashboard and manage your finances.
                </p>
              </div>

              {/* CTA Link */}
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2"
              >
                Sign in to continue
              </a>

              {/* Alternative: Sign up */}
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-primary underline-offset-4 hover:underline transition-colors"
                >
                  Create one free
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
