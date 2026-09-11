import { PolicyConfig } from "./config";
import { PolicyDocumentData } from "./returns-refunds-policy";

export function getShippingPolicyData(config: PolicyConfig): PolicyDocumentData {
  return {
    title: "Shipping Policy",
    badge: "Delivery & Fulfillment",
    description:
      "Information regarding order dispatch, shipping fees, courier partners, tracking, and delivery timelines across India.",
    lastUpdated: config.effectiveDate,
    sections: [
      {
        id: "shipping-overview",
        number: "01",
        title: "Shipping Overview",
        content: [
          `At ${config.storeName} (operated by ${config.registeredBusinessName}), we craft each press-on set to order and ship packages securely across India using top logistics partners.`,
        ],
      },
      {
        id: "where-we-ship",
        number: "02",
        title: "Where We Ship",
        content: [
          "We currently ship packages to serviceable PIN codes across India. International shipping options are currently not supported.",
        ],
      },
      {
        id: "order-processing",
        number: "03",
        title: "Order Processing & Dispatch Timelines",
        content: [
          "Handcrafted nail sets are processed and dispatched within 24 to 48 business hours after order confirmation.",
          "Orders placed on Sundays or gazetted public holidays are processed on the next business day.",
        ],
      },
      {
        id: "shipping-charges",
        number: "04",
        title: "Shipping Charges & Rate Calculation",
        content: [
          "Shipping fees are calculated during checkout based on your delivery PIN code serviceability, package weight, and order value:",
          "• Primary Courier Serviceable Areas: Real-time live shipping rates and eligible free shipping promotions are automatically calculated via our courier partner API during checkout.",
          "• Special & Non-Standard Serviceability Areas: For PIN codes outside automated primary courier networks, shipping costs are applied using specialized manual courier rates to ensure secure, door-to-door delivery.",
          "• Free Shipping Eligibility: Promotional free shipping offers (e.g., free standard shipping on eligible orders above threshold) are automatically applied at checkout when conditions are met.",
        ],
        callout: {
          type: "info",
          title: "Live Rate Calculation",
          text: "Simply enter your 6-digit delivery PIN code at checkout to calculate exact live shipping rates and delivery options for your location.",
        },
      },
      {
        id: "estimated-delivery",
        number: "05",
        title: "Estimated Delivery Timelines",
        content: [
          "• Metro Cities: 2 to 4 business days after dispatch.",
          "• Non-Metro & Rest of India: 4 to 7 business days after dispatch.",
          "• Remote / Special PIN Codes: 5 to 9 business days after dispatch.",
        ],
      },
      {
        id: "delivery-address",
        number: "06",
        title: "Delivery Address Requirements",
        content: [
          "Please ensure full address details including house/flat number, building name, street, landmark, city, state, and a valid 6-digit Indian PIN code are accurately provided.",
        ],
      },
      {
        id: "address-changes",
        number: "07",
        title: "Address Changes",
        content: [
          "Address updates are permitted only while the order is in processing state prior to AWB assignment.",
        ],
      },
      {
        id: "shipment-creation",
        number: "08",
        title: "Shipment Creation & AWB Generation",
        content: [
          "Once your package is packed, an Air Waybill (AWB) tracking code is assigned and linked to your order.",
        ],
      },
      {
        id: "tracking",
        number: "09",
        title: "Tracking Your Order",
        content: [
          "You will receive an automated email and SMS notification containing your tracking number and direct tracking URL once dispatched.",
          "You can also track your shipment live on our website under Account > Orders > Track Order.",
        ],
      },
      {
        id: "delhivery-shipments",
        number: "10",
        title: "Delhivery Shipments (Primary Partner)",
        content: [
          "Delhivery is our primary express courier partner. Delhivery tracking status updates sync automatically with your order timeline.",
        ],
      },
      {
        id: "external-courier-shipments",
        number: "11",
        title: "External Courier Shipments",
        content: [
          "For locations not served by Delhivery, we utilize reliable alternative external courier services (e.g. DTDC, BlueDart, India Post).",
        ],
      },
      {
        id: "delivery-delays",
        number: "12",
        title: "Delivery Delays",
        content: [
          "Delivery delays may occasionally occur due to severe weather events, national holidays, courier hubs, or regional transport curfews.",
        ],
      },
      {
        id: "ndr-failed-delivery",
        number: "13",
        title: "Failed Delivery & Non-Delivery Reports (NDR)",
        content: [
          "If a delivery attempt fails because the recipient was unavailable, phone unreachable, or address incomplete, Delhivery makes up to 3 re-attempts.",
          "Our support team reviews NDR alerts to assist with re-attempt coordination.",
        ],
      },
      {
        id: "return-to-origin",
        number: "14",
        title: "Return to Origin (RTO)",
        content: [
          "If all delivery attempts fail, the package is marked as Return to Origin (RTO) and returned to our studio.",
          "Re-shipping fees will apply to re-send an RTO package to a corrected address.",
        ],
      },
      {
        id: "incorrect-address",
        number: "15",
        title: "Incorrect Address Submissions",
        content: [
          "Snail Studio is not liable for failed deliveries resulting from invalid or incomplete addresses entered by the customer.",
        ],
      },
      {
        id: "refused-unclaimed-packages",
        number: "16",
        title: "Refused / Unclaimed Packages",
        content: [
          "If a customer refuses delivery upon courier arrival without valid justification, return shipping costs will be deducted from any eligible store credit.",
        ],
      },
      {
        id: "lost-missing-packages",
        number: "17",
        title: "Lost or Missing Packages",
        content: [
          "If a parcel is declared lost by the courier partner, we will immediately process a replacement shipment at no additional cost.",
        ],
      },
      {
        id: "contact-us",
        number: "18",
        title: "Contact Logistics Support",
        content: [
          `For questions about shipping or tracking, please reach out to our team:`,
          `Email: ${config.supportEmail}`,
          `Phone / WhatsApp: ${config.supportPhone}`,
          `Entity: ${config.registeredBusinessName}`,
          `Address: ${config.legalPhysicalAddress}`,
        ],
      },
    ],
  };
}
