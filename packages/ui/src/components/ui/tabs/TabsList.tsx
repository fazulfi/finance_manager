import { List as RadixList } from "@radix-ui/react-tabs";
import * as React from "react";

export type TabsListProps = React.ComponentProps<typeof RadixList>;

const TabsList = React.forwardRef<React.ElementRef<typeof RadixList>, TabsListProps>(
  ({ className, ...props }, ref) => (
    <RadixList
      ref={ref}
      className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className || ""}`}
      {...props}
    />
  ),
);
TabsList.displayName = RadixList.displayName || "TabsList";

export { TabsList };
