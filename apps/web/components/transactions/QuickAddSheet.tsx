// apps/web/components/transactions/QuickAddSheet.tsx
"use client";

import { useToast } from "@finance/ui";
import { api } from "@finance/api/react";
import { useRouter } from "next/navigation";
import { TransactionForm, type TransactionFormValues } from "./TransactionForm";

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddSheet({ open, onOpenChange }: QuickAddSheetProps): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const createTransaction = api.transaction.create.useMutation({
    onSuccess: () => {
      toast({ title: "Transaction created", description: "Transaction added successfully." });
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = async (values: TransactionFormValues) => {
    await createTransaction.mutateAsync({
      accountId: values.accountId.value,
      date: new Date(values.date),
      amount: values.amount,
      currency: values.currency,
      type: values.type,
      category: values.category,
      tags: values.tags ?? [],
      isRecurring: values.isRecurring ?? false,
      ...(values.subcategory && { subcategory: values.subcategory }),
      ...(values.project && { project: values.project }),
      ...(values.description && { description: values.description }),
      ...(values.transferTo && { transferTo: values.transferTo.value }),
      ...(values.recurringRule && { recurringRule: values.recurringRule }),
    } as any);
  };

  return (
    <TransactionForm
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleSubmit}
      compact={true}
    />
  );
}
