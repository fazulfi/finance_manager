import Link from "next/link";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export default function HomePage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="mx-auto w-full max-w-4xl text-center">
        {/* Eyebrow label */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Personal Finance Dashboard
          </span>
        </div>

        {/* Main headline */}
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
          Take Control of <span className="text-primary">Your Finances</span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          Track spending, plan budgets, and achieve your financial goals — all in one place.
        </p>

        {/* Feature badges */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm">
            <span aria-hidden="true">📊</span>
            Budget Tracking
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm">
            <span aria-hidden="true">💰</span>
            Investment Portfolio
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm">
            <span aria-hidden="true">🎯</span>
            Savings Goals
          </span>
        </div>

        {/* CTA group */}
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Get Started
          </Link>
          <p className="text-sm text-muted-foreground">
            Free to use.{" "}
            <span className="font-medium text-foreground">No credit card required.</span>
          </p>
        </div>
      </div>
    </main>
  );
}
