import { PolicyConfig } from "./config";

export interface PolicySectionData {
  id: string;
  number: string;
  title: string;
  content: string[];
  callout?: {
    type: "info" | "warning" | "important";
    title: string;
    text: string;
  };
}

export interface PolicyDocumentData {
  title: string;
  badge: string;
  description: string;
  lastUpdated: string;
  sections: PolicySectionData[];
}

export function getReturnsRefundsPolicyData(config: PolicyConfig): PolicyDocumentData {
  return {
    title: "Returns, Refunds & Exchanges Policy",
    badge: "Client Service Policy",
    description:
      "Understand our detailed return, refund, exchange, and cancellation terms for handcrafted press-on nail sets.",
    lastUpdated: config.effectiveDate,
    sections: [
      {
        id: "overview",
        number: "01",
        title: "Overview & Hygiene Standards",
        content: [
          `At ${config.storeName} (operated by ${config.registeredBusinessName}), each set of press-on nails is handcrafted with precision using premium nail gel products.`,
          "Because press-on nails are personal care products worn directly on natural nails, strict hygiene standards apply to protect all customers.",
        ],
      },
      {
        id: "damaged-defective-incorrect",
        number: "02",
        title: "Damaged, Defective or Incorrect Items",
        content: [
          "We take utmost care in packaging your orders safely. However, if your package arrives damaged in transit, with defective items, or containing an incorrect product, we offer an immediate replacement.",
          "To be eligible for a replacement or resolution for transit damage/defects:",
          "• You must record a clear, continuous unboxing video showing the sealed package, shipping label, opening of the parcel, and the damaged item.",
          "• You must contact support within 48 hours of delivery with your order ID and the unboxing video.",
        ],
        callout: {
          type: "important",
          title: "Unboxing Video Required",
          text: "A clear unboxing video recorded at the time of opening the parcel within 48 hours of delivery is mandatory for transit damage or missing item claims.",
        },
      },
      {
        id: "customer-sizing-responsibility",
        number: "03",
        title: "Nail Sizing Responsibility",
        content: [
          "Customers are responsible for selecting their correct nail sizes during order placement using our Sizing Guide.",
          "Our full set packages include 24 nails across 10 to 12 sizes to ensure a versatile fit for most finger sizes.",
          "If a customer selects incorrect custom sizes, the customer remains responsible for sizing choices. However, eligible unused items may be considered for return or size exchange subject to our evaluation and return shipping conditions.",
        ],
      },
      {
        id: "change-of-mind-returns",
        number: "04",
        title: "Change of Mind Returns (7-Day Window)",
        content: [
          "Change of mind return requests may be considered within 7 calendar days from the date of delivery, subject to strict verification.",
          "To qualify for a change of mind return:",
          "• The press-on nail set must be completely unused, unworn, un-glued, and in its original pristine condition.",
          "• All original packaging, adhesive tabs, prep kit accessories, and protective seals must be intact.",
          "• The return request must be submitted through your Account Orders page or customer support within 7 days of delivery.",
        ],
        callout: {
          type: "warning",
          title: "7-Day Return Eligibility",
          text: "Used, worn, altered, or unsealed press-on nails cannot be returned due to hygiene restrictions.",
        },
      },
      {
        id: "return-shipping-costs",
        number: "05",
        title: "Return & Replacement Shipping Costs",
        content: [
          "For customer-initiated returns or size exchanges (including change of mind or customer sizing adjustments), the customer is responsible for bearing the applicable return and replacement shipping costs.",
          "For confirmed store errors, defective products, or transit damage verified by unboxing proof, Snail Studio will arrange free pickup or cover re-shipment costs.",
        ],
      },
      {
        id: "return-approval-inspection",
        number: "06",
        title: "Return Approval & Physical Inspection",
        content: [
          "All return or exchange requests must be pre-approved by our support team before returning the product.",
          "Once the returned parcel arrives at our studio, our quality control team will conduct a thorough physical inspection.",
          "If the inspection confirms the product is worn, missing components, or damaged by customer misuse, the return request will be rejected and returned to the customer at customer expense.",
        ],
      },
      {
        id: "refund-process",
        number: "07",
        title: "Refund Process & Method",
        content: [
          "Upon physical inspection and approval of an eligible return, refunds will be initiated to your original payment method via Razorpay within 3 to 5 business days.",
          "Depending on your financial institution or UPI provider, the credited amount will reflect in your account within 5 to 7 business days following processing.",
        ],
      },
      {
        id: "order-cancellation",
        number: "08",
        title: "Order Cancellation Policy",
        content: [
          "Order cancellations are allowed ONLY before courier pickup and shipment creation.",
          "Once a shipping AWB has been generated and handed over to Delhivery or courier partners, the order is treated as shipped and cannot be cancelled. In such cases, it must be handled under our standard return policy after delivery.",
        ],
        callout: {
          type: "info",
          title: "Cancellation Window",
          text: "Orders can only be cancelled while in processing status before courier handover.",
        },
      },
      {
        id: "order-changes",
        number: "09",
        title: "Order Changes & Address Updates",
        content: [
          "Address changes or order modifications can be made while the order is in processing state.",
          "Once a shipment tracking AWB is generated and locked with the courier service provider, delivery addresses cannot be modified.",
        ],
      },
      {
        id: "incorrect-address-rto",
        number: "10",
        title: "Incorrect Address & Return to Origin (RTO)",
        content: [
          "If a package is returned to origin (RTO) due to an incorrect address provided by the customer, unreachability during delivery attempts, or parcel refusal by recipient:",
          "• Re-shipping charges will apply to re-dispatch the package to a verified correct address.",
          "• For un-contactable orders, a shipping & handling fee will be deducted prior to any store credit resolution.",
        ],
      },
      {
        id: "lost-stolen-packages",
        number: "11",
        title: "Lost or Delivered-but-Missing Packages",
        content: [
          "If tracking indicates your package was delivered but you cannot locate it, please notify us within 48 hours.",
          "We will file an official courier investigation ticket with Delhivery. Resolution or replacement re-shipments will be processed once courier verification is complete.",
        ],
      },
      {
        id: "delivery-delays",
        number: "12",
        title: "Delivery Delays & Force Majeure",
        content: [
          "Estimated delivery timelines are provided in good faith. However, unexpected logistics delays caused by extreme weather, regional disruptions, courier operational spikes, or political curfews are outside our direct control.",
        ],
      },
      {
        id: "colour-handcrafting-differences",
        number: "13",
        title: "Product Visual & Colour Variations",
        content: [
          "Each nail set is individually handcrafted by gel artists. Slight variations in art placement or minor colour tone differences may occur due to screen display calibrations and handcrafting uniqueness. These minor variations are part of handmade artisanal charm and are not considered defects.",
        ],
      },
      {
        id: "application-wear-time",
        number: "14",
        title: "Application & Wear-Time Expectations",
        content: [
          "Wear time varies depending on natural nail preparation, oil levels, lifestyle, and chosen adhesive:",
          "• Adhesive Tabs: 1 to 3 days (ideal for temporary/weekend wear).",
          "• Liquid Nail Glue: 1 to 3 weeks (requires proper nail buffing and dehydrating prep).",
          "Premature detachment resulting from improper nail prep, heavy water exposure immediately after application, or forced removal is not covered as a product defect.",
        ],
      },
      {
        id: "statutory-consumer-rights",
        number: "15",
        title: "Indian Consumer Protection Rights",
        content: [
          "Nothing in this policy limits or excludes your statutory consumer protection rights guaranteed under the Consumer Protection Act, 2019 and relevant Indian e-commerce regulations.",
        ],
      },
      {
        id: "support-contact",
        number: "16",
        title: "How to File a Return or Exchange Claim",
        content: [
          `To submit a return, exchange, or damage claim, please log in to your Customer Account to initiate a request, or reach out to our client support team:`,
          `Email: ${config.supportEmail}`,
          `Phone / WhatsApp: ${config.supportPhone}`,
          `Registered Entity: ${config.registeredBusinessName}`,
          `Physical Address: ${config.legalPhysicalAddress}`,
        ],
      },
    ],
  };
}
