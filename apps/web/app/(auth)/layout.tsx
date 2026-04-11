import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      {/* Background radial flourish */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.08),transparent)]"
        aria-hidden="true"
      />

      {/* Brand header */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          {/* BarChart2 inline SVG — server-safe, no lucide import needed */}
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-primary-foreground"
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-foreground">
          Finance Manager Pro
        </span>
      </div>

      {/* Auth card slot */}
      <main className="w-full">{children}</main>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <p>
          © 2026 Finance Manager Pro <span aria-hidden="true">·</span>{" "}
          <a
            href="#"
            className="underline-offset-4 hover:text-foreground hover:underline transition-colors"
          >
            Privacy Policy
          </a>{" "}
          <span aria-hidden="true">·</span>{" "}
          <a
            href="#"
            className="underline-offset-4 hover:text-foreground hover:underline transition-colors"
          >
            Terms of Service
          </a>
        </p>
      </footer>
    </div>
  );
}
