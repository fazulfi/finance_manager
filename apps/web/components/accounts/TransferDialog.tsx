"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@finance/api/react";
import { transferFormSchema } from "@finance/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
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
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

const LIST_INPUT = { page: 1, limit: 20 } as const;

type TransferFormValues = z.infer<typeof transferFormSchema>;

interface TransferDialogProps {
  accountId: string;
  accountName: string;
  accountBalance: number;
  currency: string;
  accounts: Array<{ id: string; name: string; currency: string }>;
}

export function TransferDialog({
  accountId,
  accountName,
  accountBalance,
  currency,
  accounts,
}: TransferDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const utils = api.useContext();

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      fromAccountId: accountId,
      toAccountId: "",
      amount: 0,
      description: "",
    },
  });

  const eligibleDestinations = accounts.filter(
    (item) => item.id !== accountId && item.currency === currency,
  );

  const transferMutation = api.account.transfer.useMutation({
    onMutate: async (values) => {
      const fromInput = { id: values.fromAccountId, page: 1, limit: 20 } as const;
      const toInput = { id: values.toAccountId, page: 1, limit: 20 } as const;

      await Promise.all([
        utils.account.list.cancel(LIST_INPUT),
        utils.account.getById.cancel(fromInput),
        utils.account.getById.cancel(toInput),
      ]);

      const previousList = utils.account.list.getData(LIST_INPUT);
      const previousFrom = utils.account.getById.getData(fromInput);
      const previousTo = utils.account.getById.getData(toInput);

      utils.account.list.setData(LIST_INPUT, (old) => {
        if (!old) {
          return old;
        }

        return {
          ...old,
          items: old.items.map((item) => {
            if (item.id === values.fromAccountId) {
              return { ...item, balance: item.balance - values.amount };
            }
            if (item.id === values.toAccountId) {
              return { ...item, balance: item.balance + values.amount };
            }
            return item;
          }),
        };
      });

      utils.account.getById.setData(fromInput, (old) =>
        old
          ? {
              ...old,
              account: {
                ...old.account,
                balance: old.account.balance - values.amount,
              },
            }
          : old,
      );

      utils.account.getById.setData(toInput, (old) =>
        old
          ? {
              ...old,
              account: {
                ...old.account,
                balance: old.account.balance + values.amount,
              },
            }
          : old,
      );

      return { previousList, previousFrom, previousTo, fromInput, toInput };
    },
    onError: (error, _values, context) => {
      toast({
        title: "Transfer failed",
        description: error.message,
        variant: "destructive",
      });

      if (!context) {
        return;
      }

      utils.account.list.setData(LIST_INPUT, context.previousList);
      utils.account.getById.setData(context.fromInput, context.previousFrom);
      utils.account.getById.setData(context.toInput, context.previousTo);
    },
    onSuccess: () => {
      toast({ title: "Transfer completed", description: "Account balances have been updated." });
      setOpen(false);
      form.reset({ fromAccountId: accountId, toAccountId: "", amount: 0, description: "" });
    },
    onSettled: async (_data, _error, values) => {
      await utils.account.list.invalidate(LIST_INPUT);
      if (values) {
        await Promise.all([
          utils.account.getById.invalidate({ id: values.fromAccountId, page: 1, limit: 20 }),
          utils.account.getById.invalidate({ id: values.toAccountId, page: 1, limit: 20 }),
        ]);
      }
    },
  });

  const transferError = transferMutation.error?.message;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        Transfer funds
      </Button>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer from {accountName}</DialogTitle>
            <DialogDescription>
              Available balance:{" "}
              {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
                accountBalance,
              )}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => transferMutation.mutate(values))}
          >
            {transferError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {transferError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="from-account">From account</Label>
              <Input id="from-account" value={accountName} readOnly disabled />
            </div>

            <div className="space-y-1.5">
              <Label>To account</Label>
              <Controller
                control={form.control}
                name="toAccountId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleDestinations.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.toAccountId && (
                <p className="text-xs font-medium text-destructive">
                  {form.formState.errors.toAccountId.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="transfer-amount">Amount</Label>
              <Input
                id="transfer-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-xs font-medium text-destructive">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="transfer-description">Description (optional)</Label>
              <Input id="transfer-description" {...form.register("description")} />
              {form.formState.errors.description && (
                <p className="text-xs font-medium text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={transferMutation.isLoading || eligibleDestinations.length === 0}
              >
                {transferMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
