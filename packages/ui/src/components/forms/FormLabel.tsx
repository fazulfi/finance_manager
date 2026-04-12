"use client";

import * as React from "react";
import { useFormField } from "./useFormField";
import { cn } from "../../lib/utils";

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, required, ...props }, ref) => {
    const { error } = useFormField();

    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          error && "text-destructive",
          className,
        )}
        {...props}
      />
    );
  },
);
FormLabel.displayName = "FormLabel";

export { FormLabel };
