import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "../../../lib/utils";

const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger> & {
    asChild?: boolean;
  }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : DropdownMenuPrimitive.Trigger;
  return <Comp ref={ref} className={cn("inline-flex", className)} {...props} />;
});
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;

export { DropdownMenuTrigger };
