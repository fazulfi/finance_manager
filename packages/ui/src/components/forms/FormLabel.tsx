"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

import { useFormField } from "./useFormField";

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
