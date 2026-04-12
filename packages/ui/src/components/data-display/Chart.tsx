"use client";

import * as React from "react";

export interface ChartProps {
  children: React.ReactNode;
}

const Chart = React.forwardRef<HTMLDivElement, ChartProps>(({ children }, ref) => {
  const hasChildren = React.useMemo(() => {
    return React.Children.count(children) > 0;
  }, [children]);

  return (
    <div ref={ref} className="w-full h-full relative">
      {hasChildren ? (
        children
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      )}
    </div>
  );
});
Chart.displayName = "Chart";

export { Chart };
