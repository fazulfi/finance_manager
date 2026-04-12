"use client";

import * as React from "react";
import { useFormContext } from "./useFormContext";
import { cn } from "../../lib/utils";

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
