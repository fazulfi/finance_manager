import { buttonVariants } from "@finance/ui";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AccountList } from "@/components/accounts/AccountList";

export const metadata: Metadata = {
  title: "Accounts",
  description: "Manage your financial accounts",
};

export default function AccountsPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Track balances and transfer funds securely.
          </p>
        </div>
        <Link href="/accounts/new" className={buttonVariants({ className: "gap-2" })}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New account
        </Link>
      </div>

      <AccountList />
    </div>
  );
}
