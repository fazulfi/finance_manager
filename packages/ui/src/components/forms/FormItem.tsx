"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {}

const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("relative space-y-0.5", className)} {...props} />
));
FormItem.displayName = "FormItem";

export { FormItem };
