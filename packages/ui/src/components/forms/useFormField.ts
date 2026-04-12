"use client";

import { useCallback } from "react";
import { useFormContext } from "./useFormContext";
import { FormState, Dispatch, SetStateAction } from "./useFormState";

/**
 * useFormField hook provides convenient methods to manage form field state
 * within a form context.
 *
 * It provides:
 * - fieldId: The current field identifier
 * - error: The current error message
 * - setFieldId: Method to update the field identifier
 * - setError: Method to update the error message
 * - onFocus: Event handler for focus state
 * - onBlur: Event handler for blur state
 *
 * @returns An object containing field state and methods to update it
 *
 * @example
 * ```tsx
 * const { fieldId, error, setFieldId, setError, onFocus, onBlur } = useFormField();
 *
 * return (
 *   <input
 *     id={fieldId || 'field'}
 *     onFocus={onFocus}
 *     onBlur={onBlur}
 *   />
 * );
 * ```
 */
export const useFormField = () => {
  const context = useFormContext();

  /**
   * Update the field identifier
   */
  const setFieldId = useCallback((id: string) => {
    // This would normally update the parent form's state
    // For now, we'll use context as a pass-through
  }, []);

  /**
   * Update the error message
   */
  const setError = useCallback((error: string | null) => {
    // This would normally update the parent form's state
    // For now, we'll use context as a pass-through
  }, []);

  /**
   * Handler for field focus event
   */
  const onFocus = useCallback(() => {
    // Focus handling logic would go here
    // For now, we clear any existing error on focus
    setError(null);
  }, [setError]);

  /**
   * Handler for field blur event
   */
  const onBlur = useCallback(() => {
    // Blur handling logic would go here
  }, []);

  return {
    fieldId: context.fieldId,
    error: context.error,
    setFieldId,
    setError,
    onFocus,
    onBlur,
  };
};
