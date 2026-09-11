import { PolicyConfig } from "./config";
import { PolicyDocumentData } from "./returns-refunds-policy";

export function getPrivacyPolicyData(config: PolicyConfig): PolicyDocumentData {
  return {
    title: "Privacy Policy",
    badge: "Legal & Data Protection",
    description:
      "Learn how Snail Studio collects, processes, secures, and protects customer information in accordance with applicable data protection regulations.",
    lastUpdated: config.effectiveDate,
    sections: [
      {
        id: "introduction",
        number: "01",
        title: "Introduction",
        content: [
          `Welcome to ${config.storeName} (operated by ${config.registeredBusinessName}). We respect your privacy and are committed to protecting your personal data.`,
          "This Privacy Policy describes how we collect, use, store, share, and protect your information when you visit our website, register an account, purchase luxury press-on nail sets, or interact with customer support.",
        ],
      },
      {
        id: "information-we-collect",
        number: "02",
        title: "Information We Collect",
        content: [
          "We collect personal information that you voluntarily provide to us when placing orders, creating an account, or communicating with us.",
          "We also automatically collect technical interaction logs and device telemetry to ensure seamless site functionality, security, and order processing.",
        ],
      },
      {
        id: "information-you-provide",
        number: "03",
        title: "Information You Provide",
        content: [
          "Contact & Profile Details: Name, email address, mobile phone number (+91), and account credentials.",
          "Delivery & Address Information: House/flat number, street address, landmark, city, state, and 6-digit Indian PIN code.",
          "Order & Customer Support History: Customized nail size preferences, order items, support communications, unboxing video clips for claim verification, and return requests.",
        ],
      },
      {
        id: "account-authentication",
        number: "04",
        title: "Account & Authentication Information",
        content: [
          "Authentication for our storefront is securely processed through Firebase Authentication.",
          "We do not store plain-text login passwords on our servers. Authentication tokens are securely managed via encrypted sessions.",
        ],
      },
      {
        id: "order-transaction",
        number: "05",
        title: "Order & Transaction Information",
        content: [
          "When you place an order, transaction details including order ID, purchased items, price breakdown, applied coupon discounts, and delivery timestamps are securely recorded in our database system.",
        ],
      },
      {
        id: "address-delivery",
        number: "06",
        title: "Address & Delivery Information",
        content: [
          "Your delivery addresses are validated to confirm accurate shipping serviceability.",
          "Saved delivery addresses are linked to your registered customer account for convenient reordering and account management.",
        ],
      },
      {
        id: "payment-information",
        number: "07",
        title: "Payment Information",
        content: [
          "All online payments are securely processed through Razorpay, a PCI-DSS compliant payment gateway.",
          `Snail Studio does NOT capture, store, or have access to your full credit card numbers, debit card PINs, UPI PINs, or net banking credentials. Razorpay handles payment authorization under bank-grade encryption.`,
        ],
        callout: {
          type: "important",
          title: "Bank-Grade Payment Security",
          text: "All payment transactions are encrypted end-to-end through Razorpay PCI-DSS compliant infrastructure.",
        },
      },
      {
        id: "how-we-use-information",
        number: "08",
        title: "How We Use Your Information",
        content: [
          "To process, fulfill, and ship your luxury press-on nail orders.",
          "To generate shipping labels and dispatch packages via courier partners.",
          "To send automated order confirmations, AWB tracking updates, and notifications via transactional email and messaging services.",
          "To verify return and replacement eligibility in case of damaged or incorrect shipments.",
          "To maintain site security, prevent fraud, and comply with applicable statutory obligations.",
        ],
      },
      {
        id: "shipping-providers",
        number: "09",
        title: "Shipping & Delivery Providers",
        content: [
          "We share recipient name, delivery address, contact phone number, and package specifications with our primary logistics partner, Delhivery, and trusted external courier services solely for package transit and delivery fulfillment.",
        ],
      },
      {
        id: "service-providers",
        number: "10",
        title: "Service Providers",
        content: [
          "We engage trusted third-party service providers to support our storefront operations, subject to strict data confidentiality requirements:",
          "• Secure Cloud Hosting & Infrastructure Partners",
          "• Media Content Storage & Delivery Networks",
          "• Identity & Authentication Security Services",
          "• Transactional Email & Messaging Partners",
          "• PCI-DSS Compliant Payment Processing Gateways",
        ],
      },
      {
        id: "cookies-analytics",
        number: "11",
        title: "Cookies & Similar Technologies",
        content: [
          "We use essential session cookies to keep you logged in, save items in your shopping bag, and remember checkout preferences.",
          "Standard analytical cookies may be used to analyze overall site traffic performance and improve user experience.",
        ],
      },
      {
        id: "communications",
        number: "12",
        title: "Communications",
        content: [
          `We may contact you regarding order confirmations, shipping updates, NDR (non-delivery report) resolution, or customer support responses via email (${config.supportEmail}) or phone/WhatsApp (${config.supportPhone}).`,
        ],
      },
      {
        id: "data-security",
        number: "13",
        title: "Data Security",
        content: [
          "We implement technical and organizational security measures—including SSL/TLS 256-bit encryption for data in transit, strict database access controls, and security auditing—to safeguard your personal data.",
        ],
      },
      {
        id: "data-retention",
        number: "14",
        title: "Data Retention",
        content: [
          "We retain your personal and order data only for as long as necessary to fulfill order promises, resolve claims, maintain accounting records, and legal tax compliance under Indian laws.",
        ],
      },
      {
        id: "your-rights",
        number: "15",
        title: "Your Rights",
        content: [
          `You have the right to access, review, update, or request deletion of your account profile data. You can manage addresses and personal details directly in your Account Dashboard or contact support at ${config.supportEmail}.`,
        ],
      },
      {
        id: "childrens-privacy",
        number: "16",
        title: "Children's Privacy",
        content: [
          "Our storefront is intended for general audiences. We do not knowingly collect personal data from individuals under 18 years of age without parental or guardian consent.",
        ],
      },
      {
        id: "third-party-links",
        number: "17",
        title: "Third-Party Links",
        content: [
          "Our website may contain links to social platforms (Instagram, Facebook). We are not responsible for the privacy practices of external websites.",
        ],
      },
      {
        id: "changes-to-policy",
        number: "18",
        title: "Changes to This Policy",
        content: [
          "We may update this Privacy Policy from time to time to reflect technological updates or legal requirements. The updated date at the top of this page will indicate when changes take effect.",
        ],
      },
      {
        id: "contact-us",
        number: "19",
        title: "Contact Us",
        content: [
          `If you have questions regarding this Privacy Policy or your personal data, please contact us:`,
          `Entity: ${config.registeredBusinessName}`,
          `Address: ${config.legalPhysicalAddress}`,
          `Email: ${config.supportEmail}`,
          `Phone / WhatsApp: ${config.supportPhone}`,
        ],
      },
    ],
  };
}
