import * as React from "react";
import { Root } from "@radix-ui/react-separator";
import { cn } from "../../../lib/utils";

const Separator = React.forwardRef<
  React.ElementRef<typeof Root>,
  React.ComponentPropsWithoutRef<typeof Root>
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
  <Root
    ref={ref}
    orientation={orientation}
    decorative={decorative}
    className={cn(
      "shrink-0 bg-muted",
      orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
    )}
    {...props}
  />
));
Separator.displayName = "Separator";

export { Separator };
