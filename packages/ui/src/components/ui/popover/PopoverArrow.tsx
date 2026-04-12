import * as React from "react";
import { cn } from "../../../lib/utils";

export interface PopoverArrowProps extends React.RefAttributes<HTMLDivElement> {
  className?: string;
}

export const PopoverArrow = React.forwardRef<HTMLDivElement, PopoverArrowProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("h-4 w-4 relative", "[&>path]:size-4 [&>path]:fill-popover", className)}
      {...props}
    />
  ),
);
PopoverArrow.displayName = "PopoverArrow";
