import * as React from "react";

import { cn } from "../../lib/utils";

export interface ResizablePanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

const ResizablePanelGroup = React.forwardRef<HTMLDivElement, ResizablePanelGroupProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex h-full w-full", className)} {...props}>
        {children}
      </div>
    );
  },
);
ResizablePanelGroup.displayName = "ResizablePanelGroup";

export { ResizablePanelGroup };
