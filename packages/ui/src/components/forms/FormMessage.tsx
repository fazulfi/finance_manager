"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

import { useFormContext } from "./useFormContext";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { error } = useFormContext();

  return (
    <p ref={ref} className={cn("text-sm font-medium text-destructive", className)} {...props}>
      {error}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

export { FormMessage };
