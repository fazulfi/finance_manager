"use client";

import type { DashboardAnalyticsAI } from "@finance/types";

interface AnomalyDetectionProps {
  anomalies: DashboardAnalyticsAI["anomalies"];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function AnomalyDetection({ anomalies }: AnomalyDetectionProps): React.JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground">Anomaly Detection</h3>
      {anomalies.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No unusual large expenses detected.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {anomalies.slice(0, 5).map((item) => (
            <div key={`${item.id ?? item.date}-${item.amount}`} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{item.category}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.severity === "HIGH"
                      ? "bg-rose-100 text-rose-700"
                      : item.severity === "MEDIUM"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {item.severity}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(item.date).toLocaleDateString()} - {formatCurrency(item.amount)} (expected up to{" "}
                {formatCurrency(item.expectedRangeMax)})
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
