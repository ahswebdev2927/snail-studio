"use client";

import React, { createContext, useContext } from "react";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export interface FormFieldContextValue {
  name: string;
  id: string;
  errorId: string;
  descriptionId: string;
}

export const FormFieldContext = createContext<FormFieldContextValue | null>(null);

/**
 * Custom hook to consume form field state (errors, dirty, invalid).
 * Designed for input wrappers nested inside FormField.
 */
export function useFormField() {
  const context = useContext(FormFieldContext);
  if (!context) {
    throw new Error("useFormField must be used within a FormField component");
  }
  const { name, id, errorId, descriptionId } = context;
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(name, formState);

  return {
    name,
    id,
    errorId,
    descriptionId,
    ...fieldState,
  };
}

export interface FormFieldProps {
  /**
   * Field path string matching Zod schema keys (supports nested paths like "address.city")
   */
  name: string;
  /**
   * Optional field label text
   */
  label?: string;
  /**
   * Optional inline descriptive hint text
   */
  description?: string;
  /**
   * Render asterisk indicator next to label
   */
  required?: boolean;
  /**
   * Container wrapper class styling override
   */
  className?: string;
  /**
   * Input primitive child
   */
  children: React.ReactNode;
}

/**
 * Form field wrap that manages validation displays, accessibility attributes (ARIA),
 * required state labels, and binds inputs to React Hook Form contexts.
 */
export function FormField({
  name,
  label,
  description,
  required,
  className,
  children,
}: FormFieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  const { formState: { errors } } = useFormContext();

  // Helper to extract nested error fields (e.g. variants.0.name)
  const getNestedError = (obj: any, path: string) => {
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
  };
  const error = getNestedError(errors, name);
  const errorMessage = error?.message?.toString();

  return (
    <FormFieldContext.Provider value={{ name, id, errorId, descriptionId }}>
      <div className={cn("space-y-1.5 w-full", className)}>
        {label && (
          <label
            htmlFor={id}
            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-0.5 select-none"
          >
            {label}
            {required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
          </label>
        )}

        {children}

        {description && !errorMessage && (
          <p
            id={descriptionId}
            className="text-[10px] text-muted-foreground/75 font-light"
          >
            {description}
          </p>
        )}

        {errorMessage && (
          <p
            id={errorId}
            role="alert"
            className="text-xs text-rose-500 dark:text-rose-400 font-medium flex items-center gap-1.5 mt-1 select-none animate-in fade-in duration-200"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {errorMessage}
          </p>
        )}
      </div>
    </FormFieldContext.Provider>
  );
}
