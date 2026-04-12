"use client";

import * as React from "react";
import { useFormContext } from "./useFormContext";
import { cn } from "../../lib/utils";

export interface FormControlProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(
  ({ className, children, ...props }, ref) => {
    const { fieldId, error } = useFormContext();

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        <div id={fieldId || "field"}>{children}</div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);
FormControl.displayName = "FormControl";

export { FormControl };
