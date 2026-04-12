import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronUp } from "lucide-react";
import { cn } from "../../../lib/utils";

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex items-center justify-center rounded-sm h-6 text-muted-foreground cursor-default transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground",
      className,
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

export { SelectScrollUpButton };
