"use client";

// apps/web/app/(dashboard)/transactions/new/page.tsx
import Link from "next/link";
import { QuickAddSheet } from "@/components/transactions/QuickAddSheet";
import { Button } from "@finance/ui";
import { ArrowLeft } from "lucide-react";

export default function NewTransactionPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/transactions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Add Transaction</h1>
          <p className="text-sm text-muted-foreground mt-1">Create a new transaction</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <QuickAddSheet open={true} onOpenChange={(open) => !open && window.history.back()} />
      </div>
    </div>
  );
}
