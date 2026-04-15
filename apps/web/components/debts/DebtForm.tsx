"use client";

import { api } from "@finance/api/react";
import { DebtType, debtFormSchema } from "@finance/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@finance/ui";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cloneElement, isValidElement, type ReactElement, type ReactNode, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

type DebtTypeOption = Exclude<keyof typeof DebtType, `${number}`>;

type DebtFormValues = {
  name: string;
  type: DebtTypeOption;
  totalAmount: number;
  remaining: number;
  interestRate: number;
  minPayment: number;
  dueDate: string;
};

const DEBT_TYPE_OPTIONS = Object.keys(DebtType).filter((value) =>
  Number.isNaN(Number(value)),
) as DebtTypeOption[];

interface DebtFormProps {
  mode: "create" | "update";
  debt?: {
    id: string;
    name: string;
    type: string | DebtTypeOption;
    totalAmount: number;
    remaining: number;
    interestRate: number;
    minPayment: number;
    dueDate?: Date;
  };
  trigger: ReactNode;
}

function toDateInput(date?: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

function getFieldError(
  error: z.ZodError<z.infer<typeof debtFormSchema>>,
  field: keyof DebtFormValues,
): string | undefined {
  return error.issues.find((issue) => issue.path[0] === field)?.message;
}

export function DebtForm({ mode, debt, trigger }: DebtFormProps): React.JSX.Element {
  const router = useRouter();
  const utils = api.useContext();
  const [open, setOpen] = useState(false);
  const form = useForm<DebtFormValues>({
    defaultValues: {
      name: debt?.name ?? "",
      type: (debt?.type as DebtTypeOption) ?? "CREDIT_CARD",
      totalAmount: debt?.totalAmount ?? 0,
      remaining: debt?.remaining ?? 0,
      interestRate: debt?.interestRate ?? 0,
      minPayment: debt?.minPayment ?? 0,
      dueDate: toDateInput(debt?.dueDate),
    },
  });

  const createDebt = api.debt.create.useMutation({
    onSuccess: async () => {
      toast({ title: "Debt created", description: "Your debt has been added." });
      await Promise.all([utils.debt.list.invalidate(), utils.debt.getSummary.invalidate()]);
      setOpen(false);
      form.reset();
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Failed to create debt",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDebt = api.debt.update.useMutation({
    onSuccess: async () => {
      toast({ title: "Debt updated", description: "Your changes were saved." });
      await Promise.all([
        utils.debt.list.invalidate(),
        utils.debt.getSummary.invalidate(),
        debt ? utils.debt.getById.invalidate({ id: debt.id }) : Promise.resolve(),
      ]);
      setOpen(false);
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Failed to update debt",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isSubmitting = createDebt.isLoading || updateDebt.isLoading;
  const submitError = createDebt.error?.message ?? updateDebt.error?.message;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      form.reset({
        name: debt?.name ?? "",
        type: (debt?.type as DebtTypeOption) ?? "CREDIT_CARD",
        totalAmount: debt?.totalAmount ?? 0,
        remaining: debt?.remaining ?? 0,
        interestRate: debt?.interestRate ?? 0,
        minPayment: debt?.minPayment ?? 0,
        dueDate: toDateInput(debt?.dueDate),
      });
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();

    const parsed = debtFormSchema.safeParse({
      name: values.name,
      type: DebtType[values.type],
      totalAmount: values.totalAmount,
      remaining: values.remaining,
      interestRate: values.interestRate,
      minPayment: values.minPayment,
      dueDate: values.dueDate ? new Date(values.dueDate) : undefined,
    });

    if (!parsed.success) {
      for (const field of [
        "name",
        "type",
        "totalAmount",
        "remaining",
        "interestRate",
        "minPayment",
        "dueDate",
      ] as const) {
        const message = getFieldError(parsed.error, field);
        if (message) {
          form.setError(field, { message });
        }
      }
      return;
    }

    const payload = {
      name: values.name,
      type: values.type,
      totalAmount: values.totalAmount,
      remaining: values.remaining,
      interestRate: values.interestRate,
      minPayment: values.minPayment,
      ...(values.dueDate ? { dueDate: new Date(values.dueDate) } : {}),
    };

    if (mode === "create") {
      await createDebt.mutateAsync(payload);
      return;
    }

    if (!debt) {
      return;
    }

    await updateDebt.mutateAsync({
      id: debt.id,
      ...payload,
      dueDate: values.dueDate ? new Date(values.dueDate) : null,
    });
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isValidElement(trigger)
        ? cloneElement(trigger as ReactElement<{ onClick?: () => void }>, {
            onClick: () => setOpen(true),
          })
        : trigger}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add debt" : "Edit debt"}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          {submitError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="debt-name">Name</Label>
            <Input id="debt-name" disabled={isSubmitting} {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select debt type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEBT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.type && (
              <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="debt-total">Total amount</Label>
              <Input
                id="debt-total"
                type="number"
                step="0.01"
                min="0"
                disabled={isSubmitting}
                {...form.register("totalAmount", { valueAsNumber: true })}
              />
              {form.formState.errors.totalAmount && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.totalAmount.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="debt-remaining">Remaining</Label>
              <Input
                id="debt-remaining"
                type="number"
                step="0.01"
                min="0"
                disabled={isSubmitting}
                {...form.register("remaining", { valueAsNumber: true })}
              />
              {form.formState.errors.remaining && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.remaining.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="debt-interest">Interest rate (%)</Label>
              <Input
                id="debt-interest"
                type="number"
                step="0.01"
                min="0"
                disabled={isSubmitting}
                {...form.register("interestRate", { valueAsNumber: true })}
              />
              {form.formState.errors.interestRate && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.interestRate.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="debt-min-payment">Minimum payment</Label>
              <Input
                id="debt-min-payment"
                type="number"
                step="0.01"
                min="0"
                disabled={isSubmitting}
                {...form.register("minPayment", { valueAsNumber: true })}
              />
              {form.formState.errors.minPayment && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.minPayment.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="debt-due-date">Due date (optional)</Label>
            <Input
              id="debt-due-date"
              type="date"
              disabled={isSubmitting}
              {...form.register("dueDate")}
            />
            {form.formState.errors.dueDate && (
              <p className="text-xs text-destructive">{form.formState.errors.dueDate.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create debt" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
