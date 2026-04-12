import * as React from "react";
import { Trigger as RadixTrigger } from "@radix-ui/react-tabs";

export type TabsTriggerProps = React.ComponentProps<typeof RadixTrigger>;

const TabsTrigger = React.forwardRef<React.ElementRef<typeof RadixTrigger>, TabsTriggerProps>(
  ({ className, ...props }, ref) => (
    <RadixTrigger
      ref={ref}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm ${className || ""}`}
      {...props}
    />
  ),
);
TabsTrigger.displayName = RadixTrigger.displayName || "TabsTrigger";

export { TabsTrigger };
