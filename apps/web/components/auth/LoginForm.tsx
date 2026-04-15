"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@finance/ui";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import GoogleButton from "@/components/auth/GoogleButton";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        const raw = searchParams.get("callbackUrl") ?? "/dashboard";
        const callbackUrl =
          raw === "/"
            ? "/dashboard"
            : raw.startsWith("/") && !raw.startsWith("//")
              ? raw
              : "/dashboard";
        router.push(callbackUrl);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          <GoogleButton />

          {/* Divider */}
          <div className="relative flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
              or continue with email
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a
                  href="#"
                  className="text-xs text-primary underline-offset-4 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                >
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          <p>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary underline-offset-4 hover:underline transition-colors"
            >
              Create one free
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
