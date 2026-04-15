"use client";

import { api } from "@finance/api/react";
import type { PortfolioHolding } from "@finance/types";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const stockFormSchema = z.object({
  ticker: z.string().min(1, "Ticker is required").max(20).toUpperCase(),
  name: z.string().min(1, "Name is required").max(200),
  exchange: z.enum(["NYSE", "NASDAQ", "LSE", "OTHER"]),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  avgBuyPrice: z.coerce.number().positive("Buy price must be positive"),
});

type StockFormValues = z.infer<typeof stockFormSchema>;

interface StockFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass holding to edit an existing position */
  holding: PortfolioHolding | undefined;
  onSuccess?: () => void;
}

const EXCHANGE_OPTIONS = [
  { value: "OTHER", label: "IDX (Indonesia)" },
  { value: "NYSE", label: "NYSE" },
  { value: "NASDAQ", label: "NASDAQ" },
  { value: "LSE", label: "LSE" },
] as const;

export function StockForm({ open, onOpenChange, holding, onSuccess }: StockFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const utils = api.useContext();
  const isEdit = !!holding;

  const { data: searchResults, isFetching: isSearching } = api.stock.search.useQuery(
    { searchQuery, limit: 10 },
    { enabled: searchQuery.length >= 2, keepPreviousData: true },
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StockFormValues>({
    resolver: zodResolver(stockFormSchema),
    defaultValues: holding
      ? {
          ticker: holding.ticker,
          name: holding.name,
          exchange: holding.exchange as StockFormValues["exchange"],
          quantity: holding.quantity,
          avgBuyPrice: holding.avgBuyPrice,
        }
      : { exchange: "OTHER" },
  });

  const createHolding = api.stock.create.useMutation({
    onSuccess: () => {
      toast({ title: "Holding added", description: `${watch("ticker")} added to portfolio.` });
      utils.stock.getPortfolioValue.invalidate();
      utils.stock.list.invalidate();
      reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateHolding = api.stock.update.useMutation({
    onSuccess: () => {
      toast({ title: "Holding updated" });
      utils.stock.getPortfolioValue.invalidate();
      utils.stock.list.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const onSubmit = async (data: StockFormValues) => {
    if (isEdit && holding) {
      await updateHolding.mutateAsync({
        id: holding.id,
        quantity: data.quantity,
        avgBuyPrice: data.avgBuyPrice,
      });
    } else {
      await createHolding.mutateAsync(data);
    }
  };

  const selectResult = (ticker: string, name: string, exchange: string) => {
    setValue("ticker", ticker.replace(".JK", "").toUpperCase());
    setValue("name", name);
    // Map exchange strings to our enum
    const exchangeMap: Record<string, StockFormValues["exchange"]> = {
      NYQ: "NYSE",
      NMS: "NASDAQ",
      LSE: "LSE",
    };
    setValue("exchange", exchangeMap[exchange] ?? "OTHER");
    setSearchQuery("");
    setShowResults(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Holding" : "Add Stock Holding"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Yahoo Finance search — only for create mode */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Search Stock</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ticker or company name..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(true);
                  }}
                  onFocus={() => setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 150)}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {showResults && searchResults && searchResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-w-sm bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((r) => (
                    <button
                      key={r.ticker}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between items-center"
                      onMouseDown={() => selectResult(r.ticker, r.name, r.exchange)}
                    >
                      <span>
                        <span className="font-medium">{r.ticker}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{r.name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {r.exchange}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ticker */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ticker">Ticker</Label>
              <Input
                id="ticker"
                placeholder="BBCA"
                {...register("ticker")}
                disabled={isEdit}
                className="uppercase"
              />
              {errors.ticker && <p className="text-xs text-destructive">{errors.ticker.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exchange">Exchange</Label>
              <Select
                defaultValue={holding?.exchange ?? "OTHER"}
                onValueChange={(v) => setValue("exchange", v as StockFormValues["exchange"])}
                disabled={isEdit}
              >
                <SelectTrigger id="exchange">
                  <SelectValue placeholder="Exchange" />
                </SelectTrigger>
                <SelectContent>
                  {EXCHANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Name */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Company Name</Label>
              <Input id="name" placeholder="Bank Central Asia Tbk" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          )}

          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Quantity (shares)</Label>
              <Input
                id="quantity"
                type="number"
                step="1"
                min="1"
                placeholder="100"
                {...register("quantity")}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avgBuyPrice">Avg Buy Price (IDR)</Label>
              <Input
                id="avgBuyPrice"
                type="number"
                step="1"
                min="1"
                placeholder="9500"
                {...register("avgBuyPrice")}
              />
              {errors.avgBuyPrice && (
                <p className="text-xs text-destructive">{errors.avgBuyPrice.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update" : "Add Holding"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
