"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@finance/api/react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  toast,
  buttonVariants,
} from "@finance/ui";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { AccountForm } from "@/components/accounts/AccountForm";
import { TransferDialog } from "@/components/accounts/TransferDialog";

interface AccountDetailPageProps {
  params: {
    id: string;
  };
}

const DETAIL_INPUT = (id: string) => ({ id, page: 1, limit: 20 }) as const;

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function AccountDetailPage({ params }: AccountDetailPageProps): React.JSX.Element {
  const router = useRouter();
  const detailQuery = api.account.getById.useQuery(DETAIL_INPUT(params.id));
  const accountsQuery = api.account.list.useQuery({ page: 1, limit: 100 });

  const deleteMutation = api.account.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Account deleted", description: "The account was removed successfully." });
      router.push("/accounts");
    },
    onError: (error) => {
      toast({
        title: "Failed to delete account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-5 w-5 text-destructive" aria-hidden="true" />
          <p className="text-sm text-destructive">
            {detailQuery.error?.message ?? "Account not found"}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="outline" type="button" onClick={() => detailQuery.refetch()}>
              Try again
            </Button>
            <Link href="/accounts" className={buttonVariants()}>
              Back to accounts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { account, transactions } = detailQuery.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Link href="/accounts" className={buttonVariants({ variant: "outline", className: "gap-2" })}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to accounts
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle>{account.name}</CardTitle>
            <CardDescription>{account.type}</CardDescription>
          </div>
          <TransferDialog
            accountId={account.id}
            accountName={account.name}
            accountBalance={account.balance}
            currency={account.currency}
            accounts={accountsQuery.data?.items ?? []}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-mono text-3xl font-semibold tabular-nums">
            {formatMoney(account.balance, account.currency)}
          </p>
          {account.description && (
            <p className="text-sm text-muted-foreground">{account.description}</p>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={deleteMutation.isLoading}
              onClick={() => deleteMutation.mutate({ id: account.id })}
              className="text-destructive"
            >
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>

      <AccountForm
        mode="update"
        accountId={account.id}
        cancelHref="/accounts"
        initialValues={{
          name: account.name,
          description: account.description,
          type: account.type,
          currency: account.currency,
          initialBalance: account.initialBalance,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
          <CardDescription>Latest activity for this account.</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.items.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No transactions yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {transactions.items.map((transaction) => {
                const isIncomingTransfer =
                  transaction.type === "TRANSFER" && transaction.transferTo === account.id;
                const isIncome = transaction.type === "INCOME" || isIncomingTransfer;
                const sign = isIncome ? "+" : "-";
                return (
                  <li
                    key={transaction.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{transaction.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString()} • {transaction.type}
                      </p>
                    </div>
                    <p className="font-mono text-sm font-semibold tabular-nums">
                      {sign}
                      {formatMoney(transaction.amount, transaction.currency)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
