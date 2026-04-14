"use client";

import { api } from "@finance/api/react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, toast } from "@finance/ui";
import { BellRing, RefreshCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

interface PriceAlertProps {
  preselectedStockId?: string | null;
}

export function PriceAlert({ preselectedStockId = null }: PriceAlertProps): React.JSX.Element {
  const [selectedStockId, setSelectedStockId] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const utils = api.useContext();

  useEffect(() => {
    if (preselectedStockId) {
      setSelectedStockId(preselectedStockId);
    }
  }, [preselectedStockId]);

  const watchlistQuery = api.stock.getWatchlist.useQuery({ page: 1, limit: 100 });
  const alertsQuery = api.stock.getAlerts.useQuery({ page: 1, limit: 100 });
  const checkAlertsQuery = api.stock.checkAlerts.useQuery(undefined, {
    enabled: false,
    refetchOnWindowFocus: false,
  });

  const createAlert = api.stock.createAlert.useMutation({
    onSuccess: async () => {
      toast({
        title: "Alert tersimpan",
        description: "Price alert berhasil dibuat atau diperbarui.",
      });
      setTargetPrice("");
      await utils.stock.getAlerts.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Gagal membuat alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAlert = api.stock.deleteAlert.useMutation({
    onSuccess: async () => {
      toast({
        title: "Alert dihapus",
        description: "Price alert berhasil dihapus.",
      });
      await utils.stock.getAlerts.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Gagal menghapus alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const runCheckAlerts = useCallback(async () => {
    if (isChecking) {
      return;
    }

    setIsChecking(true);
    try {
      const result = await checkAlertsQuery.refetch();
      const payload = result.data;

      if (payload && payload.count > 0) {
        payload.triggeredAlerts.forEach((triggered) => {
          toast({
            title: `Alert terpenuhi: ${triggered.ticker}`,
            description: `Harga ${idrFormatter.format(triggered.currentPrice)} sudah melewati target ${idrFormatter.format(triggered.targetPrice)}.`,
          });
        });

        await Promise.all([utils.stock.getAlerts.invalidate(), utils.stock.getWatchlist.invalidate()]);
      }
    } finally {
      setIsChecking(false);
    }
  }, [checkAlertsQuery, isChecking, utils.stock.getAlerts, utils.stock.getWatchlist]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void runCheckAlerts();
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [runCheckAlerts]);

  const watchlist = useMemo(() => watchlistQuery.data?.items ?? [], [watchlistQuery.data?.items]);
  const alerts = useMemo(() => alertsQuery.data?.items ?? [], [alertsQuery.data?.items]);
  const selectedStock = useMemo(
    () => watchlist.find((item) => item.stock.id === selectedStockId)?.stock,
    [selectedStockId, watchlist],
  );
  const selectedStockInfoQuery = api.stock.getInfo.useQuery(
    { ticker: selectedStock?.ticker ?? "BBCA" },
    {
      enabled: Boolean(selectedStock?.ticker),
      refetchOnWindowFocus: false,
    },
  );

  const submitDisabled =
    createAlert.isLoading ||
    !selectedStockId ||
    targetPrice.trim() === "" ||
    Number.isNaN(Number(targetPrice)) ||
    Number(targetPrice) <= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Alerts</CardTitle>
        <CardDescription>
          Buat notifikasi ketika harga saham menyentuh target yang kamu tentukan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <label htmlFor="stock-alert-select" className="text-sm font-medium">
            Pilih saham
          </label>
          <select
            id="stock-alert-select"
            value={selectedStockId}
            onChange={(event) => setSelectedStockId(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Pilih saham dari watchlist</option>
            {watchlist.map((item) => (
              <option key={item.id} value={item.stock.id}>
                {item.stock.ticker} - {item.stock.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label htmlFor="target-price-input" className="text-sm font-medium">
            Target harga (IDR)
          </label>
          <Input
            id="target-price-input"
            type="number"
            min={1}
            step="1"
            value={targetPrice}
            onChange={(event) => setTargetPrice(event.target.value)}
            placeholder="Contoh: 12000"
          />
        </div>

        {selectedStockInfoQuery.data && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-semibold">
              {selectedStockInfoQuery.data.ticker} - {selectedStockInfoQuery.data.name}
            </p>
            <p className="text-xs text-muted-foreground">
              Sector: {selectedStockInfoQuery.data.sector} • Last price:{" "}
              {idrFormatter.format(selectedStockInfoQuery.data.lastPrice)} •{" "}
              {selectedStockInfoQuery.data.changePercent >= 0 ? "+" : ""}
              {selectedStockInfoQuery.data.changePercent.toFixed(2)}%
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="gap-2"
            disabled={submitDisabled}
            onClick={() =>
              createAlert.mutate({
                stockId: selectedStockId,
                targetPrice: Number(targetPrice),
              })
            }
          >
            <BellRing className="h-4 w-4" />
            Simpan Alert
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => void runCheckAlerts()}
            disabled={isChecking}
          >
            <RefreshCcw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
            Cek Sekarang
          </Button>
        </div>

        {alertsQuery.isError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Gagal memuat daftar alert. {alertsQuery.error.message}
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="text-sm font-medium">Belum ada alert aktif.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tambahkan target harga agar sistem memberi notifikasi saat harga tercapai.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const distance = alert.targetPrice - alert.stock.lastPrice;
              const distancePercent =
                alert.stock.lastPrice > 0 ? (distance / alert.stock.lastPrice) * 100 : 0;

              return (
                <div
                  key={alert.id}
                  className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold">{alert.stock.ticker}</p>
                    <p className="text-xs text-muted-foreground">
                      Harga saat ini: {idrFormatter.format(alert.stock.lastPrice)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Target: {idrFormatter.format(alert.targetPrice)} ({distancePercent >= 0 ? "+" : ""}
                      {distancePercent.toFixed(2)}%)
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1 text-destructive"
                    disabled={deleteAlert.isLoading}
                    onClick={() => deleteAlert.mutate({ alertId: alert.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
