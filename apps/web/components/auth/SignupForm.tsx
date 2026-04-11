"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2 } from "lucide-react";
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
import GoogleButton from "@/components/auth/GoogleButton";

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);
    setFieldErrors({});

    // Client-side validation
    const errors: { email?: string; password?: string } = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (!password || password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const body: { email: string; password: string; name?: string } = {
        email,
        password,
      };
      const trimmedName = name.trim();
      if (trimmedName) {
        body.name = trimmedName;
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        setGlobalError("An account with this email already exists. Try signing in instead.");
        return;
      }
      if (!res.ok) {
        setGlobalError("Something went wrong. Please try again.");
        return;
      }

      // Auto sign-in after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Registered but auto-login failed — send to login page
        router.push("/login?registered=true");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setGlobalError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Create your account</CardTitle>
          <CardDescription>Start managing your finances — free forever</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {globalError && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{globalError}</p>
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
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                name="name"
                placeholder="Alex Johnson"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Optional — used to personalize your dashboard
              </p>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-email">Email address</Label>
              <Input
                id="signup-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                {...(fieldErrors.email
                  ? {
                      "aria-describedby": "email-error",
                      "aria-invalid": true as const,
                    }
                  : {})}
                required
              />
              {fieldErrors.email && (
                <p id="email-error" role="alert" className="text-xs text-destructive font-medium">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                name="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                {...(fieldErrors.password
                  ? { "aria-describedby": "password-error", "aria-invalid": true as const }
                  : { "aria-describedby": "password-hint" })}
                required
              />
              {fieldErrors.password ? (
                <p
                  id="password-error"
                  role="alert"
                  className="text-xs text-destructive font-medium"
                >
                  {fieldErrors.password}
                </p>
              ) : (
                <p id="password-hint" className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              )}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full gap-2 mt-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </Button>

            <p className="mt-3 text-center text-xs text-muted-foreground leading-relaxed">
              By creating an account, you agree to our{" "}
              <a
                href="#"
                className="underline underline-offset-4 hover:text-foreground transition-colors"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="underline underline-offset-4 hover:text-foreground transition-colors"
              >
                Privacy Policy
              </a>
              .
            </p>
          </form>
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          <p>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
