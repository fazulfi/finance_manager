// apps/web/app/(dashboard)/transactions/[id]/page.tsx
import Link from "next/link";
import { transactionRouter } from "@finance/api";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Button } from "@finance/ui";
import { ArrowLeft } from "lucide-react";

interface TransactionDetailPageProps {
  params: {
    id: string;
  };
}

async function getTransaction(id: string) {
  const api = transactionRouter.createCaller({ headers: new Headers() });
  return await api.getById({ id });
}

export default async function TransactionDetailPage({
  params,
}: TransactionDetailPageProps): Promise<React.JSX.Element> {
  const transaction = await getTransaction(params.id);

  const initialValues = {
    accountId: {
      value: transaction.accountId,
      label: transaction.account.name,
    },
    date: transaction.date.toISOString(),
    amount: transaction.amount,
    currency: transaction.currency,
    type: transaction.type,
    category: transaction.category,
    subcategory: transaction.subcategory,
    project: transaction.project,
    tags: transaction.tags,
    description: transaction.description,
    transferTo: transaction.transferTo
      ? {
          value: transaction.transferTo,
          label: "",
        }
      : undefined,
    isRecurring: transaction.isRecurring,
    recurringRule: transaction.recurringRule,
  };

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
          <p className="text-sm text-muted-foreground mt-1">View and edit transaction details</p>
        </div>
      </div>

      <TransactionForm
        open={true}
        onOpenChange={() => window.history.back()}
        onSubmit={async (values) => {
          // Update transaction
          const api = transactionRouter.createCaller({ headers: new Headers() });

          await api.update({
            id: params.id,
            date: new Date(values.date),
            amount: values.amount,
            currency: values.currency,
            type: values.type,
            category: values.category,
            subcategory: values.subcategory,
            project: values.project,
            tags: values.tags || [],
            description: values.description,
            transferTo: values.transferTo?.value || undefined,
            isRecurring: values.isRecurring,
            recurringRule: values.recurringRule,
          });

          window.location.href = "/transactions";
        }}
        initialValues={initialValues}
        compact={false}
      />
    </div>
  );
}
