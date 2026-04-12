"use client";

import { useState, type Dispatch, type SetStateAction } from "react";

/**
 * FormState represents the current state of a form.
 * Shared across all fields in the same form.
 */
export interface FormState {
  fieldId: string | null;
  error: string | null;
}

export type { Dispatch, SetStateAction };

/**
 * Initial form state.
 */
export const initialFormState: FormState = {
  fieldId: null,
  error: null,
};

/**
 * Hook to manage form state.
 *
 * @param initialState - Initial form state (defaults to initialFormState)
 * @returns A tuple of [state, setState] where state is the current form state
 *
 * @example
 * ```tsx
 * const [formState, setFormState] = useFormState();
 * ```
 */
export const useFormState = (
  initialState: FormState = initialFormState,
): [FormState, Dispatch<SetStateAction<FormState>>] => {
  return useState<FormState>(initialState);
};
