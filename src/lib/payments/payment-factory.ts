import { PaymentProvider } from "./payment-provider";
import { RazorpayProvider } from "./providers/razorpay.provider";
import { MockGateway } from "./gateways/mock-gateway";
import { RazorpayGateway } from "./gateways/razorpay-gateway";

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER || "razorpay";
  const gatewayType = process.env.PAYMENT_GATEWAY || "mock";

  if (provider === "razorpay") {
    const gateway = gatewayType === "razorpay"
      ? new RazorpayGateway()
      : new MockGateway();
    return new RazorpayProvider(gateway);
  }

  throw new Error(`Unsupported payment provider configuration: provider=${provider}, gateway=${gatewayType}`);
}
