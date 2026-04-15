import { Toaster } from "@finance/ui";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { Providers } from "./providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Finance Manager Pro",
    template: "%s | Finance Manager Pro",
  },
  description:
    "Take control of your personal finances. Track spending, plan budgets, monitor investments, and achieve your savings goals — all in one place.",
  keywords: [
    "personal finance",
    "budget tracker",
    "expense tracking",
    "investment portfolio",
    "savings goals",
    "debt management",
    "financial planning",
  ],
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
