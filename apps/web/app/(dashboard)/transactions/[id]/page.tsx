"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@finance/api/react";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Button, Skeleton, toast } from "@finance/ui";
import { AlertCircle, ArrowLeft } from "lucide-react";

interface TransactionDetailPageProps {
  params: {
    id: string;
  };
}

type SupportedCurrency = "IDR" | "USD" | "EUR" | "SGD" | "JPY";

export default function TransactionDetailPage({
  params,
}: TransactionDetailPageProps): React.JSX.Element {
  const router = useRouter();
  const transactionQuery = api.transaction.getById.useQuery({ id: params.id });
  const accountsQuery = api.account.list.useQuery({ page: 1, limit: 100 });

  const updateTransaction = api.transaction.update.useMutation({
    onSuccess: () => {
      toast({ title: "Transaction updated", description: "Changes saved." });
      router.push("/transactions");
    },
    onError: (error) => {
      toast({
        title: "Failed to update transaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (transactionQuery.isLoading || accountsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-[540px] w-full" />
      </div>
    );
  }

  if (transactionQuery.isError || !transactionQuery.data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
        <AlertCircle className="mx-auto mb-3 h-5 w-5 text-destructive" aria-hidden="true" />
        <p className="text-sm text-destructive">
          {transactionQuery.error?.message ?? "Transaction not found"}
        </p>
      </div>
    );
  }

  const transaction = transactionQuery.data;
  const accountName =
    accountsQuery.data?.items.find((account) => account.id === transaction.accountId)?.name ??
    "Selected account";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/transactions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Transaction</h1>
          <p className="mt-1 text-sm text-muted-foreground">View and edit transaction details</p>
        </div>
      </div>

      <TransactionForm
        open={true}
        onOpenChange={(open) => {
          if (!open) router.back();
        }}
        onSubmit={async (values) => {
          await updateTransaction.mutateAsync({
            id: params.id,
            date: new Date(values.date),
            amount: values.amount,
            currency: values.currency,
            type: values.type,
            category: values.category,
            subcategory: values.subcategory,
            project: values.project,
            tags: values.tags ?? [],
            description: values.description,
            transferTo: values.transferTo?.value,
            isRecurring: values.isRecurring,
            recurringRule: values.recurringRule,
          });
        }}
        initialValues={{
          accountId: {
            value: transaction.accountId,
            label: accountName,
          },
          date: transaction.date.toISOString(),
          amount: transaction.amount,
          currency: transaction.currency as SupportedCurrency,
          type: transaction.type,
          category: transaction.category,
          project: transaction.project,
          tags: transaction.tags,
          isRecurring: transaction.isRecurring,
          ...(transaction.subcategory ? { subcategory: transaction.subcategory } : {}),
          ...(transaction.description ? { description: transaction.description } : {}),
          ...(transaction.transferTo
            ? {
                transferTo: {
                  value: transaction.transferTo,
                  label: transaction.transferTo,
                },
              }
            : {}),
          ...(transaction.recurringRule ? { recurringRule: transaction.recurringRule } : {}),
        }}
        compact={false}
      />
    </div>
  );
}
