"use client";

import * as React from "react";
import { FormContext } from "./Context";

interface FormProps {
  children: React.ReactNode;
}

/**
 * FormProvider provides the form context to all form fields within.
 * Must wrap all form field components.
 *
 * @param children - Child components to render within the form context
 *
 * @example
 * ```tsx
 * <FormProvider>
 *   <FormField name="email" />
 *   <FormField name="password" />
 * </FormProvider>
 * ```
 */
export const Form = React.forwardRef<HTMLDivElement, FormProps>(({ children }, ref) => (
  <div ref={ref}>
    <FormContext.Provider value={{ fieldId: null, error: null }}>{children}</FormContext.Provider>
  </div>
));
Form.displayName = "Form";
