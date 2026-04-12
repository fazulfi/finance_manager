"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@finance/api/react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  buttonVariants,
} from "@finance/ui";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const ACCOUNT_TYPE_OPTIONS = [
  "CHECKING",
  "SAVINGS",
  "CREDIT",
  "INVESTMENT",
  "CASH",
  "OTHER",
] as const;

const accountFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  type: z.enum(ACCOUNT_TYPE_OPTIONS),
  currency: z.string().min(1, "Currency is required").max(10, "Currency too long"),
  initialBalance: z.coerce.number().min(0, "Initial balance cannot be negative"),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface AccountFormProps {
  mode: "create" | "update";
  accountId?: string;
  initialValues?: {
    name?: string;
    description?: string | null;
    type?: (typeof ACCOUNT_TYPE_OPTIONS)[number];
    currency?: string;
    initialBalance?: number;
  };
  cancelHref: string;
}

export function AccountForm({
  mode,
  accountId,
  initialValues,
  cancelHref,
}: AccountFormProps): React.JSX.Element {
  const router = useRouter();
  const utils = api.useContext();
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      type: initialValues?.type ?? "CHECKING",
      currency: initialValues?.currency ?? "IDR",
      initialBalance: initialValues?.initialBalance ?? 0,
    },
  });

  const createAccount = api.account.create.useMutation({
    onSuccess: async (created) => {
      toast({ title: "Account created", description: `${created.name} is ready to use.` });
      await utils.account.list.invalidate();
      router.push(`/accounts/${created.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to create account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAccount = api.account.update.useMutation({
    onSuccess: async () => {
      toast({ title: "Account updated", description: "Your changes were saved." });
      if (accountId) {
        await utils.account.getById.invalidate({ id: accountId, page: 1, limit: 20 });
      }
      await utils.account.list.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Failed to update account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isSubmitting = createAccount.isLoading || updateAccount.isLoading;
  const submitError = createAccount.error?.message ?? updateAccount.error?.message;

  const onSubmit = (values: AccountFormValues) => {
    if (mode === "update") {
      if (!accountId) {
        return;
      }

      updateAccount.mutate({
        id: accountId,
        name: values.name,
        description: values.description || undefined,
        type: values.type,
      });
      return;
    }

    createAccount.mutate({
      name: values.name,
      description: values.description || undefined,
      type: values.type,
      currency: values.currency,
      initialBalance: values.initialBalance,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "Create account" : "Edit account"}</CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Add a new account to track your balances."
            : "Update account details."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          {submitError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="account-name">Name</Label>
            <Input id="account-name" {...form.register("name")} disabled={isSubmitting} />
            {form.formState.errors.name && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account-description">Description (optional)</Label>
            <textarea
              id="account-description"
              className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as AccountFormValues["type"])}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.type && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.type.message}
              </p>
            )}
          </div>

          {mode === "create" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="account-currency">Currency</Label>
                <Input
                  id="account-currency"
                  {...form.register("currency")}
                  disabled={isSubmitting}
                />
                {form.formState.errors.currency && (
                  <p className="text-xs font-medium text-destructive">
                    {form.formState.errors.currency.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="account-balance">Initial balance</Label>
                <Input
                  id="account-balance"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  {...form.register("initialBalance")}
                  disabled={isSubmitting}
                />
                {form.formState.errors.initialBalance && (
                  <p className="text-xs font-medium text-destructive">
                    {form.formState.errors.initialBalance.message}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Link
              href={cancelHref}
              className={buttonVariants({ variant: "outline", className: "pointer-events-auto" })}
            >
              Cancel
            </Link>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {mode === "create" ? "Create account" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
