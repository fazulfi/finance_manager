import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Finance Manager Pro account to access your dashboard.",
};

function LoginFormSkeleton() {
  return <div className="w-full max-w-sm mx-auto h-96 animate-pulse rounded-lg bg-muted" />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
