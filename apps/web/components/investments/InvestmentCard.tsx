"use client";

import { useState } from "react";
import { api } from "@finance/api/react";
import { Button, Card, CardContent, Input, toast } from "@finance/ui";
import { Edit2, Trash2 } from "lucide-react";

import { formatCurrency, formatTypeLabel, type InvestmentItem } from "@/components/investments/types";

interface InvestmentCardProps {
  investment: InvestmentItem;
  onEdit: (item: InvestmentItem) => void;
  onChanged?: () => void;
}

export function InvestmentCard({ investment, onEdit, onChanged }: InvestmentCardProps) {
  const [currentValueInput, setCurrentValueInput] = useState(investment.currentValue.toString());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const utils = api.useContext();

  const updateCurrentValue = api.investment.updateCurrentValue.useMutation({
    onSuccess: () => {
      toast({ title: "Investment updated" });
      utils.investment.list.invalidate();
      utils.investment.getSummary.invalidate();
      utils.investment.getOverview.invalidate();
      onChanged?.();
    },
    onError: (error) => toast({ title: "Update failed", description: error.message, variant: "destructive" }),
  });

  const deleteInvestment = api.investment.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Investment deleted" });
      utils.investment.list.invalidate();
      utils.investment.getSummary.invalidate();
      utils.investment.getOverview.invalidate();
      onChanged?.();
    },
    onError: (error) => toast({ title: "Delete failed", description: error.message, variant: "destructive" }),
  });

  const isGain = investment.gain >= 0;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{formatTypeLabel(investment.type)}</p>
            <h3 className="text-base font-semibold">{investment.name}</h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => onEdit(investment)}
              aria-label="Edit investment"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete investment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1 text-xs">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deleteInvestment.isLoading}
                  onClick={() => deleteInvestment.mutate({ id: investment.id })}
                >
                  Delete
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Cost</p>
            <p className="font-medium tabular-nums">{formatCurrency(investment.cost)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Current Value</p>
            <p className="font-medium tabular-nums">{formatCurrency(investment.currentValue)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Gain/Loss</p>
            <p className={`font-semibold tabular-nums ${isGain ? "text-emerald-600" : "text-rose-600"}`}>
              {isGain ? "+" : ""}
              {formatCurrency(investment.gain)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">ROI</p>
            <p className={`font-semibold tabular-nums ${isGain ? "text-emerald-600" : "text-rose-600"}`}>
              {isGain ? "+" : ""}
              {investment.roiPercent.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="space-y-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">Manual current value update</p>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              value={currentValueInput}
              onChange={(event) => setCurrentValueInput(event.target.value)}
              placeholder="Enter current value"
            />
            <Button
              variant="outline"
              disabled={updateCurrentValue.isLoading}
              onClick={() => {
                const parsedValue = Number(currentValueInput);
                if (!Number.isFinite(parsedValue) || parsedValue < 0) {
                  toast({
                    title: "Invalid value",
                    description: "Current value must be a non-negative number.",
                    variant: "destructive",
                  });
                  return;
                }

                updateCurrentValue.mutate({
                  id: investment.id,
                  currentValue: parsedValue,
                });
              }}
            >
              Update
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
