import Link from "next/link";
import { Banknote, Building2, CreditCard, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@finance/utils";
import { Button, Card, CardContent, CardHeader, CardTitle, buttonVariants } from "@finance/ui";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

const ACCOUNT_TYPE_ICONS = {
  CHECKING: Building2,
  SAVINGS: Wallet,
  CREDIT: CreditCard,
  INVESTMENT: Banknote,
  CASH: Wallet,
  OTHER: Banknote,
} as const;

interface AccountCardProps {
  account: {
    id: string;
    name: string;
    description: string | null;
    type: keyof typeof ACCOUNT_TYPE_ICONS;
    balance: number;
    currency: string;
  };
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

function formatBalance(value: number, currency: string): string {
  try {
    const locale = currency === "IDR" ? "id-ID" : "en-US";
    return formatCurrency(value, currency, locale);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function AccountCard({
  account,
  onDelete,
  isDeleting = false,
}: AccountCardProps): React.JSX.Element {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const Icon = ACCOUNT_TYPE_ICONS[account.type] ?? Banknote;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{account.name}</CardTitle>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {account.type}
            </p>
          </div>
          <div className="rounded-full bg-muted p-2">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-mono text-2xl font-semibold tabular-nums">
          {formatBalance(account.balance, account.currency)}
        </p>
        {account.description && (
          <p className="text-sm text-muted-foreground">{account.description}</p>
        )}

        <div className="flex items-center gap-2">
          <Link
            href={`/accounts/${account.id}`}
            className={buttonVariants({ size: "sm", className: "flex-1" })}
          >
            View details
          </Link>
          {onDelete && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setConfirmOpen(true)}
              disabled={isDeleting}
              aria-label={`Delete ${account.name}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardContent>
      {onDelete && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Delete ${account.name}?`}
          description="This action will archive the account from active lists. You cannot undo this from this screen."
          confirmLabel="Delete account"
          destructive={true}
          loading={isDeleting}
          onConfirm={() => onDelete(account.id)}
        />
      )}
    </Card>
  );
}
