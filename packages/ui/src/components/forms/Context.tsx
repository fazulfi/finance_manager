"use client";

import { createContext, useContext, type ReactNode } from "react";

// Type definitions for form context values
export interface FormContextValue {
  fieldId: string | null;
  error: string | null;
}

// Default context value
const defaultContext: FormContextValue = {
  fieldId: null,
  error: null,
};

/**
 * FormContext provides shared form state management across all form fields.
 * Parent form components provide context, child field components consume it.
 */
export const FormContext = createContext<FormContextValue>(defaultContext);

/**
 * Provider for the form context.
 * @param children - Child components to render within the form context
 */
export const FormProvider = ({ children }: { children: ReactNode }) => {
  return <FormContext.Provider value={defaultContext}>{children}</FormContext.Provider>;
};

/**
 * Hook to access form context value.
 * @throws Error if used outside FormProvider
 */
export const useFormContext = () => {
  const context = useContext(FormContext);
  return context;
};
