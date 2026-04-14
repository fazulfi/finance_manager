"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { api } from "@finance/api/react";
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
  Switch,
  Textarea,
  toast,
} from "@finance/ui";
import { Loader2 } from "lucide-react";

import {
  asNumber,
  asString,
  formatTypeLabel,
  INVESTMENT_TYPE_OPTIONS,
  type InvestmentItem,
  type SupportedInvestmentType,
} from "@/components/investments/types";

interface InvestmentFormValues {
  type: SupportedInvestmentType;
  name: string;
  notes?: string;

  quantity?: number;
  purchasePrice?: number;
  currentPrice?: number;
  coinGeckoId?: string;
  fetchCryptoFromApi?: boolean;

  units?: number;
  purchaseNav?: number;
  currentNav?: number;

  grams?: number;
  purchasePricePerGram?: number;
  currentPricePerGram?: number;
  fetchGoldFromApi?: boolean;

  principal?: number;
  annualInterestRate?: number;
  startDate?: string;
  maturityDate?: string;
  depositCurrentValue?: number;

  p2pCurrentValue?: number;
  expectedAnnualReturn?: number;
}

interface InvestmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: InvestmentItem | undefined;
  onSuccess?: () => void;
}

function toDateInputValue(raw: unknown): string | undefined {
  const value = asString(raw);
  if (!value) return undefined;
  return value.slice(0, 10);
}

function createDefaultValues(investment?: InvestmentItem): InvestmentFormValues {
  if (!investment) {
    return {
      type: "CRYPTO",
      name: "",
      fetchCryptoFromApi: false,
      fetchGoldFromApi: false,
    };
  }

  const metadata = investment.metadata;
  const derivedUnitCost = investment.amount > 0 ? investment.cost / investment.amount : 0;
  const derivedCurrentUnit = investment.amount > 0 ? investment.currentValue / investment.amount : 0;

  return {
    type: (INVESTMENT_TYPE_OPTIONS.some((option) => option.value === investment.type)
      ? investment.type
      : "CRYPTO") as SupportedInvestmentType,
    name: investment.name,
    notes: investment.notes ?? "",

    quantity: asNumber(metadata.quantity, investment.amount),
    purchasePrice: asNumber(metadata.purchasePrice, derivedUnitCost),
    currentPrice: asNumber(metadata.currentPrice, derivedCurrentUnit),
    coinGeckoId: asString(metadata.coinGeckoId) ?? "",

    units: asNumber(metadata.units, investment.amount),
    purchaseNav: asNumber(metadata.purchaseNav, derivedUnitCost),
    currentNav: asNumber(metadata.currentNav, derivedCurrentUnit),

    grams: asNumber(metadata.grams, investment.amount),
    purchasePricePerGram: asNumber(metadata.purchasePricePerGram, derivedUnitCost),
    currentPricePerGram: asNumber(metadata.currentPricePerGram, derivedCurrentUnit),

    principal: asNumber(metadata.principal, investment.cost),
    annualInterestRate: asNumber(metadata.annualInterestRate, 0),
    startDate: toDateInputValue(metadata.startDate) ?? "",
    maturityDate: toDateInputValue(metadata.maturityDate) ?? "",
    depositCurrentValue: investment.currentValue,

    p2pCurrentValue: investment.currentValue,
    expectedAnnualReturn: asNumber(metadata.expectedAnnualReturn, 0),
    fetchCryptoFromApi: false,
    fetchGoldFromApi: false,
  };
}

export function InvestmentForm({ open, onOpenChange, investment, onSuccess }: InvestmentFormProps) {
  const utils = api.useContext();
  const isEdit = Boolean(investment);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm<InvestmentFormValues>({
    defaultValues: createDefaultValues(investment),
  });

  const type = watch("type");

  useEffect(() => {
    reset(createDefaultValues(investment));
  }, [investment, reset]);

  const createCrypto = api.investment.createCrypto.useMutation();
  const updateCrypto = api.investment.updateCrypto.useMutation();
  const createMutualFund = api.investment.createMutualFund.useMutation();
  const updateMutualFund = api.investment.updateMutualFund.useMutation();
  const createGold = api.investment.createGold.useMutation();
  const updateGold = api.investment.updateGold.useMutation();
  const createDeposit = api.investment.createDeposit.useMutation();
  const updateDeposit = api.investment.updateDeposit.useMutation();
  const createP2P = api.investment.createP2P.useMutation();
  const updateP2P = api.investment.updateP2P.useMutation();

  const onMutationSuccess = async (message: string) => {
    await Promise.all([
      utils.investment.list.invalidate(),
      utils.investment.getSummary.invalidate(),
      utils.investment.getOverview.invalidate(),
    ]);

    toast({ title: message });
    onOpenChange(false);
    onSuccess?.();
  };

  const onSubmit = async (values: InvestmentFormValues) => {
    try {
      if (!values.name?.trim()) {
        toast({ title: "Name is required", variant: "destructive" });
        return;
      }

      if (type === "CRYPTO") {
        if (!values.quantity || !values.purchasePrice) {
          toast({
            title: "Missing fields",
            description: "Quantity and purchase price are required.",
            variant: "destructive",
          });
          return;
        }

        if (isEdit && investment) {
          await updateCrypto.mutateAsync({
            id: investment.id,
            name: values.name,
            quantity: values.quantity,
            purchasePrice: values.purchasePrice,
            currentPrice: values.currentPrice,
            coinGeckoId: values.coinGeckoId?.trim() || undefined,
            fetchFromApi: values.fetchCryptoFromApi,
            notes: values.notes?.trim() || undefined,
          });
          await onMutationSuccess("Crypto investment updated");
          return;
        }

        await createCrypto.mutateAsync({
          name: values.name,
          quantity: values.quantity,
          purchasePrice: values.purchasePrice,
          currentPrice: values.currentPrice,
          coinGeckoId: values.coinGeckoId?.trim() || undefined,
          fetchFromApi: values.fetchCryptoFromApi,
          notes: values.notes?.trim() || undefined,
        });
        await onMutationSuccess("Crypto investment added");
        return;
      }

      if (type === "MUTUAL_FUND") {
        if (!values.units || !values.purchaseNav) {
          toast({
            title: "Missing fields",
            description: "Units and purchase NAV are required.",
            variant: "destructive",
          });
          return;
        }

        if (isEdit && investment) {
          await updateMutualFund.mutateAsync({
            id: investment.id,
            name: values.name,
            units: values.units,
            purchaseNav: values.purchaseNav,
            currentNav: values.currentNav,
            notes: values.notes?.trim() || undefined,
          });
          await onMutationSuccess("Mutual fund updated");
          return;
        }

        await createMutualFund.mutateAsync({
          name: values.name,
          units: values.units,
          purchaseNav: values.purchaseNav,
          currentNav: values.currentNav,
          notes: values.notes?.trim() || undefined,
        });
        await onMutationSuccess("Mutual fund added");
        return;
      }

      if (type === "GOLD") {
        if (!values.grams || !values.purchasePricePerGram) {
          toast({
            title: "Missing fields",
            description: "Gold grams and purchase price per gram are required.",
            variant: "destructive",
          });
          return;
        }

        if (isEdit && investment) {
          await updateGold.mutateAsync({
            id: investment.id,
            name: values.name,
            grams: values.grams,
            purchasePricePerGram: values.purchasePricePerGram,
            currentPricePerGram: values.currentPricePerGram,
            fetchFromApi: values.fetchGoldFromApi,
            notes: values.notes?.trim() || undefined,
          });
          await onMutationSuccess("Gold investment updated");
          return;
        }

        await createGold.mutateAsync({
          name: values.name,
          grams: values.grams,
          purchasePricePerGram: values.purchasePricePerGram,
          currentPricePerGram: values.currentPricePerGram,
          fetchFromApi: values.fetchGoldFromApi,
          notes: values.notes?.trim() || undefined,
        });
        await onMutationSuccess("Gold investment added");
        return;
      }

      if (type === "DEPOSIT") {
        if (!values.principal || values.annualInterestRate === undefined || !values.startDate) {
          toast({
            title: "Missing fields",
            description: "Principal, annual interest rate, and start date are required.",
            variant: "destructive",
          });
          return;
        }

        if (isEdit && investment) {
          await updateDeposit.mutateAsync({
            id: investment.id,
            name: values.name,
            principal: values.principal,
            annualInterestRate: values.annualInterestRate,
            startDate: new Date(values.startDate),
            maturityDate: values.maturityDate ? new Date(values.maturityDate) : undefined,
            currentValue: values.depositCurrentValue,
            notes: values.notes?.trim() || undefined,
          });
          await onMutationSuccess("Deposit updated");
          return;
        }

        await createDeposit.mutateAsync({
          name: values.name,
          principal: values.principal,
          annualInterestRate: values.annualInterestRate,
          startDate: new Date(values.startDate),
          maturityDate: values.maturityDate ? new Date(values.maturityDate) : undefined,
          currentValue: values.depositCurrentValue,
          notes: values.notes?.trim() || undefined,
        });
        await onMutationSuccess("Deposit added");
        return;
      }

      if (!values.principal) {
        toast({
          title: "Missing fields",
          description: "Principal is required for P2P lending.",
          variant: "destructive",
        });
        return;
      }

      if (isEdit && investment) {
        await updateP2P.mutateAsync({
          id: investment.id,
          name: values.name,
          principal: values.principal,
          currentValue: values.p2pCurrentValue,
          expectedAnnualReturn: values.expectedAnnualReturn,
          notes: values.notes?.trim() || undefined,
        });
        await onMutationSuccess("P2P lending updated");
        return;
      }

      await createP2P.mutateAsync({
        name: values.name,
        principal: values.principal,
        currentValue: values.p2pCurrentValue,
        expectedAnnualReturn: values.expectedAnnualReturn,
        notes: values.notes?.trim() || undefined,
      });
      await onMutationSuccess("P2P lending added");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save investment";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Investment" : "Add Investment"}
            {isEdit && investment ? `: ${formatTypeLabel(investment.type)}` : ""}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="type">Investment Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setValue("type", value as SupportedInvestmentType)}
              disabled={isEdit}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {INVESTMENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="My investment" {...register("name")} />
          </div>

          {type === "CRYPTO" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" step="any" min="0" {...register("quantity", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="purchasePrice">Purchase Price</Label>
                  <Input id="purchasePrice" type="number" step="any" min="0" {...register("purchasePrice", { valueAsNumber: true })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPrice">Current Price (optional)</Label>
                  <Input id="currentPrice" type="number" step="any" min="0" {...register("currentPrice", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coinGeckoId">CoinGecko ID (optional)</Label>
                  <Input id="coinGeckoId" placeholder="bitcoin" {...register("coinGeckoId")} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Fetch current price from CoinGecko</p>
                  <p className="text-xs text-muted-foreground">Uses API at save time instead of manual current price.</p>
                </div>
                <Switch
                  checked={Boolean(watch("fetchCryptoFromApi"))}
                  onCheckedChange={(checked) => setValue("fetchCryptoFromApi", checked)}
                />
              </div>
            </>
          )}

          {type === "MUTUAL_FUND" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="units">Units</Label>
                <Input id="units" type="number" step="any" min="0" {...register("units", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purchaseNav">Purchase NAV</Label>
                <Input id="purchaseNav" type="number" step="any" min="0" {...register("purchaseNav", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currentNav">Current NAV (optional)</Label>
                <Input id="currentNav" type="number" step="any" min="0" {...register("currentNav", { valueAsNumber: true })} />
              </div>
            </div>
          )}

          {type === "GOLD" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="grams">Weight (grams)</Label>
                  <Input id="grams" type="number" step="any" min="0" {...register("grams", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="purchasePricePerGram">Purchase Price / Gram</Label>
                  <Input
                    id="purchasePricePerGram"
                    type="number"
                    step="any"
                    min="0"
                    {...register("purchasePricePerGram", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currentPricePerGram">Current Price / Gram (optional)</Label>
                <Input
                  id="currentPricePerGram"
                  type="number"
                  step="any"
                  min="0"
                  {...register("currentPricePerGram", { valueAsNumber: true })}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Fetch market gold price</p>
                  <p className="text-xs text-muted-foreground">Uses API at save time (USD per gram).</p>
                </div>
                <Switch
                  checked={Boolean(watch("fetchGoldFromApi"))}
                  onCheckedChange={(checked) => setValue("fetchGoldFromApi", checked)}
                />
              </div>
            </>
          )}

          {type === "DEPOSIT" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="principal">Principal</Label>
                  <Input id="principal" type="number" step="any" min="0" {...register("principal", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="annualInterestRate">Annual Interest Rate (%)</Label>
                  <Input
                    id="annualInterestRate"
                    type="number"
                    step="any"
                    min="0"
                    {...register("annualInterestRate", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" {...register("startDate")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maturityDate">Maturity Date (optional)</Label>
                  <Input id="maturityDate" type="date" {...register("maturityDate")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="depositCurrentValue">Current Value (optional manual override)</Label>
                <Input
                  id="depositCurrentValue"
                  type="number"
                  step="any"
                  min="0"
                  {...register("depositCurrentValue", { valueAsNumber: true })}
                />
              </div>
            </>
          )}

          {type === "P2P_LENDING" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="principal">Principal</Label>
                  <Input id="principal" type="number" step="any" min="0" {...register("principal", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p2pCurrentValue">Current Value (optional)</Label>
                  <Input
                    id="p2pCurrentValue"
                    type="number"
                    step="any"
                    min="0"
                    {...register("p2pCurrentValue", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expectedAnnualReturn">Expected Annual Return % (optional)</Label>
                <Input
                  id="expectedAnnualReturn"
                  type="number"
                  step="any"
                  min="0"
                  {...register("expectedAnnualReturn", { valueAsNumber: true })}
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" rows={3} placeholder="Any details about this investment" {...register("notes")} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update" : "Add Investment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
