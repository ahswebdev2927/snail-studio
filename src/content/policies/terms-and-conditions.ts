import { PolicyConfig } from "./config";
import { PolicyDocumentData } from "./returns-refunds-policy";

export function getTermsAndConditionsData(config: PolicyConfig): PolicyDocumentData {
  return {
    title: "Terms & Conditions",
    badge: "Terms of Service",
    description:
      "Please read these Terms & Conditions carefully before using the Snail Studio website, creating an account, or purchasing luxury press-on nail products.",
    lastUpdated: config.effectiveDate,
    sections: [
      {
        id: "introduction",
        number: "01",
        title: "Introduction",
        content: [
          `These Terms & Conditions ("Terms") govern your access to and use of the website ${config.siteUrl} operated by ${config.registeredBusinessName} ("${config.storeName}", "we", "us", or "our").`,
          "By accessing our site, registering an account, or placing an order, you agree to be bound by these Terms and our Privacy Policy, Shipping Policy, and Returns & Refunds Policy.",
        ],
      },
      {
        id: "eligibility",
        number: "02",
        title: "Eligibility",
        content: [
          "By using our website, you represent and warrant that you are at least 18 years old or visiting under the supervision of a parent or guardian, and possess legal capacity to enter into binding agreements.",
        ],
      },
      {
        id: "account-registration",
        number: "03",
        title: "Account Registration",
        content: [
          "You may create an account to access order tracking, address management, and wishlist features. You are responsible for maintaining the confidentiality of your account credentials.",
        ],
      },
      {
        id: "products-information",
        number: "04",
        title: "Products & Product Information",
        content: [
          "Our press-on nail sets are handcrafted. We make every effort to display product colors, shapes, lengths, and finishes accurately. Minor artisanal variations may occur.",
        ],
      },
      {
        id: "nail-size-selection",
        number: "05",
        title: "Nail Size Selection",
        content: [
          "Customers are responsible for selecting appropriate nail sizing using our Sizing Guide. Standard sets include 24 nails across 10–12 sizes.",
        ],
      },
      {
        id: "pricing",
        number: "06",
        title: "Pricing",
        content: [
          "All prices are listed in Indian Rupees (₹ / INR) and are inclusive of applicable taxes unless stated otherwise. Prices are subject to change without prior notice.",
        ],
      },
      {
        id: "orders",
        number: "07",
        title: "Orders",
        content: [
          "Placing an order constitutes an offer to purchase. We reserve the right to decline or cancel orders in cases of stock unavailability, pricing errors, or fraud suspicion.",
        ],
      },
      {
        id: "payment",
        number: "08",
        title: "Payment",
        content: [
          "Payments are processed securely via Razorpay. We accept UPI, debit cards, credit cards, and net banking.",
        ],
      },
      {
        id: "order-confirmation",
        number: "09",
        title: "Order Confirmation",
        content: [
          "Upon successful payment authorization, an order confirmation email and invoice receipt will be sent to your registered email address.",
        ],
      },
      {
        id: "order-changes",
        number: "10",
        title: "Order Changes",
        content: [
          "Address updates or order adjustments can be requested prior to courier AWB generation.",
        ],
      },
      {
        id: "cancellation",
        number: "11",
        title: "Cancellation",
        content: [
          "Orders may be cancelled before shipment dispatch. Once handed over to courier providers, cancellations are governed by our Returns & Refunds Policy.",
        ],
      },
      {
        id: "shipping-delivery",
        number: "12",
        title: "Shipping & Delivery",
        content: [
          "Shipping dispatch and delivery timelines are subject to courier serviceability. Detailed shipping terms are available on our Shipping Policy page.",
        ],
      },
      {
        id: "returns-exchanges",
        number: "13",
        title: "Returns & Exchanges",
        content: [
          "Returns, replacements, and exchanges are governed strictly by our Returns, Refunds & Exchanges Policy.",
        ],
      },
      {
        id: "refunds",
        number: "14",
        title: "Refunds",
        content: [
          "Approved refunds are processed back to the original payment method after inspection of returned items.",
        ],
      },
      {
        id: "customer-responsibilities",
        number: "15",
        title: "Customer Responsibilities",
        content: [
          "Customers must provide accurate contact details, complete delivery addresses, and inspect packages upon arrival.",
        ],
      },
      {
        id: "product-use-application",
        number: "16",
        title: "Product Use & Application",
        content: [
          "Customers should follow application instructions carefully. Snail Studio is not liable for improper nail prep or misuse.",
        ],
      },
      {
        id: "intellectual-property",
        number: "17",
        title: "Intellectual Property",
        content: [
          `All website content, logos, imagery, nail designs, text, graphics, and code are the exclusive property of ${config.registeredBusinessName} and protected by copyright laws.`,
        ],
      },
      {
        id: "website-use",
        number: "18",
        title: "Website Use",
        content: [
          "You agree not to misuse the website, introduce malicious software, or attempt unauthorized access to server infrastructure.",
        ],
      },
      {
        id: "third-party-services",
        number: "19",
        title: "Third-Party Services",
        content: [
          "Our storefront integrates services from trusted third-party partners for payment processing, logistics fulfillment, authentication, and content delivery.",
        ],
      },
      {
        id: "limitation-of-liability",
        number: "20",
        title: "Limitation of Liability",
        content: [
          `To the maximum extent permitted by applicable Indian law, ${config.registeredBusinessName} shall not be liable for indirect, incidental, or consequential damages.`,
        ],
      },
      {
        id: "force-majeure",
        number: "21",
        title: "Force Majeure",
        content: [
          "We are not responsible for delays or failure to perform obligations resulting from events beyond reasonable control (natural disasters, curfews, courier strikes).",
        ],
      },
      {
        id: "governing-law",
        number: "22",
        title: "Governing Law & Jurisdiction",
        content: [
          "These Terms are governed by and construed in accordance with the laws of India. Any legal disputes shall be subject to the exclusive jurisdiction of the competent courts in India.",
        ],
      },
      {
        id: "consumer-rights",
        number: "23",
        title: "Consumer Rights",
        content: [
          "Nothing in these Terms restricts statutory consumer rights provided under the Consumer Protection Act, 2019.",
        ],
      },
      {
        id: "changes-to-terms",
        number: "24",
        title: "Changes to Terms",
        content: [
          "We reserve the right to modify these Terms at any time. Continued use of the website following changes constitutes acceptance of modified Terms.",
        ],
      },
      {
        id: "contact-us",
        number: "25",
        title: "Contact Us",
        content: [
          `For questions regarding these Terms & Conditions, please contact us:`,
          `Entity: ${config.registeredBusinessName}`,
          `Address: ${config.legalPhysicalAddress}`,
          `Email: ${config.supportEmail}`,
          `Phone: ${config.supportPhone}`,
        ],
      },
    ],
  };
}
