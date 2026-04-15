import * as React from "react";

import { cn } from "../../../lib/utils";

// Note: DropdownMenuShortcut not available in @radix-ui/react-dropdown-menu@2.1.16
// Will be available in future versions
interface DropdownMenuShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {}

const DropdownMenuShortcut = React.forwardRef<HTMLSpanElement, DropdownMenuShortcutProps>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
        {...props}
      />
    );
  },
);
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export { DropdownMenuShortcut };
