// apps/web/components/transactions/QuickAddSheet.tsx
"use client";

import { useToast } from "@finance/ui";
import { transactionRouter } from "@finance/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TransactionForm } from "./TransactionForm";

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddSheet({ open, onOpenChange }: QuickAddSheetProps): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: unknown) => {
    setIsSubmitting(true);
    try {
      const api = transactionRouter.createCaller({ headers: new Headers() });

      // Build create input from form values
      const createInput = {
        accountId: values.accountId,
        date: new Date(values.date),
        amount: parseFloat(values.amount),
        currency: values.currency || "IDR",
        type: values.type,
        category: values.category,
        subcategory: values.subcategory,
        project: values.project,
        tags: values.tags || [],
        description: values.description,
        transferTo: values.transferTo,
        isRecurring: values.isRecurring || false,
      };

      await api.create(createInput);
      toast({
        title: "Transaction created",
        description: "Your transaction has been added successfully",
        variant: "default",
      });

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Transaction creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TransactionForm
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleSubmit}
      initialValues={undefined}
      compact={true}
    />
  );
}
