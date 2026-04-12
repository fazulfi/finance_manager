"use client";

import { useContext } from "react";
import { FormContext, useFormContext as useFormContextImpl } from "./Context";

/**
 * Hook to access form context value.
 * Must be used within a FormProvider.
 *
 * @returns The form context value { fieldId, error }
 * @throws Error if used outside FormProvider
 */
export const useFormContext = () => {
  const context = useContext(FormContext);
  return context;
};
