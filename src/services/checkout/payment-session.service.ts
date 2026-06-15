import { createPaymentSession } from "../payments/payment.service";
import { PaymentSession } from "@/lib/payments/types";

/**
 * Initiates a payment session for an order, delegating to the payment service layer.
 * 
 * @param orderId The internal order ID.
 * @param tx Optional transaction client.
 * @returns The created payment session.
 */
export async function initiatePaymentSession(orderId: string, tx?: any): Promise<PaymentSession> {
  return createPaymentSession(orderId, tx);
}
