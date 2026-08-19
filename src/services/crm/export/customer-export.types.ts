import { z } from "zod";

export interface CustomerExportField {
  key: string;
  label: string;
  group: string;
  description?: string;
  enabledByDefault?: boolean;
  sensitive?: boolean;
}

export interface CustomerFilterCondition {
  field: string;
  operator: string;
  value?: any;
}

export interface CustomerFilterGroup {
  operator: "AND" | "OR";
  conditions: CustomerFilterCondition[];
}

export interface CustomerSelection {
  mode: "all" | "filtered" | "selected";
  selectedIds?: string[];
}

export interface CustomerExportConfig {
  fields: string[];
  filters: CustomerFilterGroup;
  selection: CustomerSelection;
  format: "csv" | "xlsx";
}

// Zod Validation Schemas
export const CustomerFilterConditionSchema = z.object({
  field: z.string().min(1, "Field name is required"),
  operator: z.string().min(1, "Operator is required"),
  value: z.any().optional()
});

export const CustomerFilterGroupSchema = z.object({
  operator: z.enum(["AND", "OR"]),
  conditions: z.array(CustomerFilterConditionSchema)
});

export const CustomerSelectionSchema = z.object({
  mode: z.enum(["all", "filtered", "selected"]),
  selectedIds: z.array(z.string()).optional()
});

export const CustomerExportPreviewSchema = z.object({
  fields: z.array(z.string()).min(1, "At least one field must be selected"),
  filters: CustomerFilterGroupSchema,
  selection: CustomerSelectionSchema,
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  sort: z.object({
    field: z.string(),
    direction: z.enum(["asc", "desc"])
  }).optional(),
  search: z.string().optional()
});

export const CustomerExportRequestSchema = z.object({
  fields: z.array(z.string()).min(1, "At least one field must be selected"),
  filters: CustomerFilterGroupSchema,
  selection: CustomerSelectionSchema,
  format: z.enum(["csv", "xlsx"])
});
