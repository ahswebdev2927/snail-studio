import { z } from "zod";

export const RETURN_REASONS = [
  'Damaged',
  'Defective',
  'Wrong Item',
  'Wrong Size',
  'Change of Mind',
  'Different Preference',
  'Other'
] as const;

export type ReturnReason = typeof RETURN_REASONS[number];
export type ReturnRequestType = 'RETURN' | 'REPLACEMENT';
export type ReturnRequestStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
export type PaymentResponsibility = 'NONE' | 'CUSTOMER_PAYS' | 'STORE_PAYS';
export type PaymentStatus = 'NOT_REQUIRED' | 'PENDING' | 'PAID';

export const createReturnRequestSchema = z.object({
  orderItemId: z.string().min(1, "Order item ID is required"),
  type: z.enum(["RETURN", "REPLACEMENT"]),
  reason: z.enum(RETURN_REASONS, {
    message: "Invalid return reason selected",
  }),
  customerNotes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional().or(z.literal("")),
  replacementProductId: z.string().optional().or(z.literal("")),
  replacementVariantId: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.type === "REPLACEMENT" && !data.replacementVariantId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Replacement variant selection is required for replacement requests",
      path: ["replacementVariantId"],
    });
  }
});

export type CreateReturnRequestInput = z.infer<typeof createReturnRequestSchema>;

export const PAYMENT_METHODS = [
  'UPI',
  'BANK_TRANSFER',
  'CASH',
  'RAZORPAY',
  'OTHER'
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const approveReturnRequestSchema = z.object({
  paymentResponsibility: z.enum(["NONE", "CUSTOMER_PAYS", "STORE_PAYS"], {
    message: "Payment responsibility selection is required",
  }),
  paymentAmount: z.number().nonnegative("Payment amount must be zero or positive").optional().default(0),
  adminNotes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional().or(z.literal("")),
});

export const rejectReturnRequestSchema = z.object({
  adminNotes: z
    .string()
    .trim()
    .min(1, "Admin rejection notes are required")
    .max(1000, "Notes cannot exceed 1000 characters"),
});

export const recordReturnPaymentSchema = z.object({
  paymentAmount: z.number().positive("Payment amount must be greater than zero"),
  paymentMethod: z.enum(PAYMENT_METHODS, {
    message: "Valid payment method selection is required",
  }),
  paymentReference: z.string().trim().min(1, "Payment reference / transaction ID is required"),
  paymentNotes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional().or(z.literal("")),
});

export type ApproveReturnRequestInput = z.infer<typeof approveReturnRequestSchema>;
export type RejectReturnRequestInput = z.infer<typeof rejectReturnRequestSchema>;
export type RecordReturnPaymentInput = z.infer<typeof recordReturnPaymentSchema>;


