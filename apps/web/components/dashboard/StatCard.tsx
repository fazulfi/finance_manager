// apps/web/components/dashboard/StatCard.tsx
import { cn } from "@finance/utils";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import * as React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, trend, icon, className }: StatCardProps) {
  return (
    <div className={cn("rounded-xl bg-card p-6 shadow-sm border border-border", className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              {icon}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            {trend && (
              <div className="mt-2 flex items-center gap-1 text-xs font-medium">
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-rose-500" />
                )}
                <span className={trend.isPositive ? "text-emerald-500" : "text-rose-500"}>
                  {trend.value >= 0 ? "+" : ""}
                  {trend.value}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
