"use client";

import React from "react";
import { FormProvider, UseFormReturn, FieldValues, SubmitHandler } from "react-hook-form";
import { cn } from "@/lib/utils";

export interface FormProps<TFieldValues extends FieldValues = FieldValues> {
  /**
   * The active React Hook Form instance returned by useForm()
   */
  methods: UseFormReturn<TFieldValues>;
  /**
   * Submission handler function
   */
  onSubmit: SubmitHandler<TFieldValues>;
  /**
   * Custom Tailwind classes for the form element
   */
  className?: string;
  /**
   * Inner form child inputs
   */
  children: React.ReactNode;
  /**
   * Optional custom id
   */
  id?: string;
}

/**
 * Reusable Form wrapper that binds the React Hook Form context.
 * Standardizes submission lifecycle and styling.
 */
export function Form<TFieldValues extends FieldValues = FieldValues>({
  methods,
  onSubmit,
  className,
  children,
  id,
}: FormProps<TFieldValues>) {
  const handleSubmit = methods.handleSubmit((data) => {
    return onSubmit(data);
  });

  return (
    <FormProvider {...methods}>
      <form
        id={id}
        onSubmit={handleSubmit}
        className={cn("space-y-6 w-full", className)}
        noValidate
      >
        {children}
      </form>
    </FormProvider>
  );
}
