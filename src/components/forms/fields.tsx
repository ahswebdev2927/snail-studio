"use client";

import React, { useState, useRef, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { useFormField } from "./form-field";
import { Select, SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { UploadCloud, X, FileIcon, Film, Loader2 } from "lucide-react";

// ==========================================
// 1. INPUT FIELD
// ==========================================
export interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ leftIcon, rightIcon, className, type = "text", ...props }, ref) => {
    const { register } = useFormContext();
    const { id, errorId, descriptionId, error, name } = useFormField();
    const registered = register(name);

    return (
      <div className="relative w-full">
        {leftIcon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0 select-none flex items-center justify-center">
            {leftIcon}
          </span>
        )}
        <input
          id={id}
          type={type}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : descriptionId}
          className={cn(
            "w-full py-2.5 border border-border bg-secondary/20 text-foreground text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none font-sans",
            leftIcon ? "pl-10" : "px-4",
            rightIcon ? "pr-10" : "px-4",
            error && "border-rose-500 focus:ring-rose-500 focus:border-rose-500",
            className
          )}
          {...registered}
          ref={(e) => {
            registered.ref(e);
            if (typeof ref === "function") ref(e);
            else if (ref) ref.current = e;
          }}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0 select-none flex items-center justify-center">
            {rightIcon}
          </span>
        )}
      </div>
    );
  }
);
InputField.displayName = "InputField";

// ==========================================
// 2. TEXTAREA FIELD
// ==========================================
export interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxLength?: number;
  showCharCount?: boolean;
}

export const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ maxLength, showCharCount = false, className, ...props }, ref) => {
    const { register, watch } = useFormContext();
    const { id, errorId, descriptionId, error, name } = useFormField();
    const registered = register(name);
    const value = watch(name) || "";

    return (
      <div className="relative w-full">
        <textarea
          id={id}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : descriptionId}
          className={cn(
            "w-full px-4 py-2.5 border border-border bg-secondary/20 text-foreground text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none resize-none leading-relaxed font-sans",
            error && "border-rose-500 focus:ring-rose-500 focus:border-rose-500",
            className
          )}
          {...registered}
          ref={(e) => {
            registered.ref(e);
            if (typeof ref === "function") ref(e);
            else if (ref) ref.current = e;
          }}
          {...props}
        />
        {showCharCount && maxLength && (
          <div className="flex justify-end text-[9px] text-muted-foreground/60 font-mono mt-0.5 select-none">
            {value.length}/{maxLength}
          </div>
        )}
      </div>
    );
  }
);
TextareaField.displayName = "TextareaField";

// ==========================================
// 3. SELECT FIELD
// ==========================================
export interface SelectFieldProps {
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  className?: string;
  triggerClassName?: string;
  popoverClassName?: string;
}

export function SelectField({
  options,
  placeholder,
  label,
  disabled,
  leftIcon,
  className,
  triggerClassName,
  popoverClassName,
}: SelectFieldProps) {
  const { control } = useFormContext();
  const { name, error } = useFormField();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Select
          options={options}
          value={field.value}
          onChange={field.onChange}
          placeholder={placeholder}
          label={label}
          disabled={disabled}
          leftIcon={leftIcon}
          className={className}
          triggerClassName={cn(
            error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/30",
            triggerClassName
          )}
          popoverClassName={popoverClassName}
        />
      )}
    />
  );
}

// ==========================================
// 4. CHECKBOX FIELD
// ==========================================
export interface CheckboxFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const CheckboxField = React.forwardRef<HTMLInputElement, CheckboxFieldProps>(
  ({ label, className, ...props }, ref) => {
    const { register } = useFormContext();
    const { id, errorId, descriptionId, error, name } = useFormField();
    const registered = register(name);

    return (
      <label className="flex items-start gap-3 text-xs font-light text-muted-foreground select-none cursor-pointer group w-full py-1">
        <input
          id={id}
          type="checkbox"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : descriptionId}
          className={cn(
            "mt-0.5 w-4.5 h-4.5 accent-primary rounded border-border transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
            className
          )}
          {...registered}
          ref={(e) => {
            registered.ref(e);
            if (typeof ref === "function") ref(e);
            else if (ref) ref.current = e;
          }}
          {...props}
        />
        <span className="leading-normal group-hover:text-foreground transition-colors">
          {label}
        </span>
      </label>
    );
  }
);
CheckboxField.displayName = "CheckboxField";

// ==========================================
// 5. SWITCH FIELD
// ==========================================
export interface SwitchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const SwitchField = React.forwardRef<HTMLInputElement, SwitchFieldProps>(
  ({ label, className, ...props }, ref) => {
    const { register } = useFormContext();
    const { id, errorId, descriptionId, error, name } = useFormField();
    const registered = register(name);

    return (
      <label className="flex items-center justify-between gap-3 text-xs font-light text-muted-foreground select-none cursor-pointer group w-full py-1">
        {label && <span className="leading-normal group-hover:text-foreground transition-colors">{label}</span>}
        <div className="relative inline-block w-8 h-5 shrink-0 align-middle select-none">
          <input
            id={id}
            type="checkbox"
            aria-invalid={!!error}
            aria-describedby={error ? errorId : descriptionId}
            className="peer absolute opacity-0 w-0 h-0"
            {...registered}
            ref={(e) => {
              registered.ref(e);
              if (typeof ref === "function") ref(e);
              else if (ref) ref.current = e;
            }}
            {...props}
          />
          <span
            className={cn(
              "absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-secondary border border-border/80 rounded-full transition-all duration-300 peer-checked:bg-primary peer-checked:border-primary/80 after:content-[''] after:absolute after:left-[2px] after:top-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all after:duration-300 peer-checked:after:translate-x-3 focus-visible:ring-1 focus-visible:ring-primary",
              error && "border-rose-500",
              className
            )}
          />
        </div>
      </label>
    );
  }
);
SwitchField.displayName = "SwitchField";

// ==========================================
// 6. RADIO GROUP FIELD
// ==========================================
export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioFieldProps {
  options: RadioOption[];
  className?: string;
  itemClassName?: string;
}

export function RadioField({ options, className, itemClassName }: RadioFieldProps) {
  const { register } = useFormContext();
  const { errorId, descriptionId, error, name } = useFormField();

  return (
    <div className={cn("flex flex-col gap-2", className)} role="radiogroup">
      {options.map((option, idx) => (
        <label
          key={option.value}
          className={cn(
            "flex items-center gap-2.5 text-xs font-light text-muted-foreground select-none cursor-pointer group",
            option.disabled && "opacity-50 pointer-events-none",
            itemClassName
          )}
        >
          <input
            type="radio"
            value={option.value}
            disabled={option.disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : descriptionId}
            className="w-4 h-4 accent-primary cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            {...register(name)}
          />
          <span className="leading-normal group-hover:text-foreground transition-colors">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

// ==========================================
// 7. FILE & IMAGE UPLOAD FIELD
// ==========================================
export interface FileUploadFieldProps {
  accept?: string;
  /**
   * Maximum image file size (defaults to 8MB)
   */
  maxImageSizeMB?: number;
  /**
   * Maximum video file size (defaults to 35MB)
   */
  maxVideoSizeMB?: number;
  multiple?: boolean;
  className?: string;
  /**
   * Display visual preview grid for images/videos
   */
  showPreview?: boolean;
}

export function FileUploadField({
  accept = "image/*,video/*",
  maxImageSizeMB = 8,
  maxVideoSizeMB = 35,
  multiple = false,
  className,
  showPreview = true,
}: FileUploadFieldProps) {
  const { control, setError, clearErrors } = useFormContext();
  const { name, id, errorId, descriptionId, error } = useFormField();
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const sizeMB = file.size / (1024 * 1024);

    if (isImage && sizeMB > maxImageSizeMB) {
      setError(name, {
        type: "manual",
        message: `Image "${file.name}" exceeds the ${maxImageSizeMB}MB limit.`,
      });
      return false;
    }

    if (isVideo && sizeMB > maxVideoSizeMB) {
      setError(name, {
        type: "manual",
        message: `Video "${file.name}" exceeds the ${maxVideoSizeMB}MB limit.`,
      });
      return false;
    }

    if (!isImage && !isVideo) {
      // General limit fallback
      const fallbackLimit = Math.max(maxImageSizeMB, maxVideoSizeMB);
      if (sizeMB > fallbackLimit) {
        setError(name, {
          type: "manual",
          message: `File "${file.name}" exceeds the ${fallbackLimit}MB limit.`,
        });
        return false;
      }
    }

    return true;
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const files: File[] = Array.isArray(field.value)
          ? field.value
          : field.value
          ? [field.value]
          : [];

        const handleFiles = (incomingFiles: FileList | null) => {
          if (!incomingFiles) return;
          clearErrors(name);

          const validFiles: File[] = [];
          for (let i = 0; i < incomingFiles.length; i++) {
            const file = incomingFiles[i];
            if (validateFile(file)) {
              validFiles.push(file);
            } else {
              // Stop parsing on first error
              return;
            }
          }

          if (validFiles.length > 0) {
            if (multiple) {
              field.onChange([...files, ...validFiles]);
            } else {
              field.onChange(validFiles[0]);
            }
          }
        };

        const handleDrag = (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
          } else if (e.type === "dragleave") {
            setDragActive(false);
          }
        };

        const handleDrop = (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
          }
        };

        const handleRemove = (indexToRemove: number) => {
          clearErrors(name);
          if (multiple) {
            const updated = files.filter((_, idx) => idx !== indexToRemove);
            field.onChange(updated.length > 0 ? updated : null);
          } else {
            field.onChange(null);
          }
        };

        return (
          <div className="space-y-3 w-full">
            {/* Drop Zone Box */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border border-dashed border-border hover:border-primary/60 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 bg-secondary/10 hover:bg-secondary/15 select-none relative",
                dragActive && "border-primary bg-primary/5 ring-1 ring-primary/30",
                error && "border-rose-500 bg-rose-500/5",
                className
              )}
            >
              <input
                id={id}
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={(e) => handleFiles(e.target.files)}
                aria-invalid={!!error}
                aria-describedby={error ? errorId : descriptionId}
                className="hidden"
              />
              <UploadCloud className={cn("w-7 h-7 text-muted-foreground/80 mb-2 transition-transform duration-200", dragActive && "scale-110 text-primary")} />
              <span className="text-[11px] font-semibold text-foreground">
                Drag & Drop or Click to Upload
              </span>
              <span className="text-[9px] text-muted-foreground/75 font-light mt-1 max-w-[200px]">
                Supports Images (max {maxImageSizeMB}MB) or Videos (max {maxVideoSizeMB}MB)
              </span>
            </div>

            {/* Selected File Previews Grid */}
            {showPreview && files.length > 0 && (
              <div className="flex flex-wrap gap-3 animate-in fade-in duration-200">
                {files.map((file, idx) => {
                  const isImage = file.type.startsWith("image/");
                  const isVideo = file.type.startsWith("video/");
                  const previewUrl = isImage ? URL.createObjectURL(file) : null;

                  return (
                    <div
                      key={`${file.name}-${idx}`}
                      className="relative w-18 h-18 rounded-xl overflow-hidden border border-border bg-card flex items-center justify-center group shadow-xs shrink-0"
                    >
                      {isImage && previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previewUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                          onLoad={() => URL.revokeObjectURL(previewUrl)}
                        />
                      ) : isVideo ? (
                        <Film className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <FileIcon className="w-5 h-5 text-muted-foreground" />
                      )}

                      {/* File Name tooltip / label */}
                      <span className="absolute bottom-0 inset-x-0 bg-background/80 text-[8px] text-foreground font-light text-center py-0.5 truncate px-1 select-none">
                        {file.name}
                      </span>

                      {/* Delete Action Trigger */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(idx);
                        }}
                        className="absolute -top-1 -right-1 p-1 bg-background border border-border rounded-full shadow-md text-muted-foreground hover:text-rose-500 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
