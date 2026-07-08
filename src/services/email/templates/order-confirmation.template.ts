/**
 * Order Confirmation HTML email template
 */
interface OrderConfirmationParams {
  customerName: string;
  orderId: string;
  items: {
    productName: string;
    variantName: string;
    quantity: number;
    price: number; // in paise
  }[];
  subtotal: number; // in paise
  tax: number; // in paise
  shipping: number; // in paise
  discount: number; // in paise
  total: number; // in paise
  shippingAddress: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export function getOrderConfirmationTemplate(params: OrderConfirmationParams): string {
  const currentYear = new Date().getFullYear();
  
  const formatPrice = (amount: number) => {
    return (amount / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    });
  };

  const itemsListHtml = params.items.map(item => `
    <tr style="border-bottom: 1px solid #ebdcd5;">
      <td style="padding: 15px 0; font-size: 13px; color: #1e1b1b; line-height: 1.5;">
        <span style="font-weight: 600; display: block;">${item.productName}</span>
        <span style="font-size: 11px; color: #A85328; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500;">${item.variantName}</span>
      </td>
      <td style="padding: 15px 0; text-align: center; font-size: 13px; color: #555555;">x ${item.quantity}</td>
      <td style="padding: 15px 0; text-align: right; font-size: 13px; font-weight: 600; color: #1e1b1b;">${formatPrice(item.price * item.quantity)}</td>
    </tr>
  `).join("");

  const addressLine2Html = params.shippingAddress.addressLine2 
    ? `<div style="font-size: 13px; color: #555555; margin-bottom: 3px;">${params.shippingAddress.addressLine2}</div>` 
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmed | Snail Studio</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FFF3EA;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #333333;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #FFF3EA;
      padding-bottom: 40px;
      padding-top: 40px;
    }
    .main-table {
      background-color: #ffffff;
      margin: 0 auto;
      width: 100%;
      max-width: 600px;
      border-spacing: 0;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(168, 83, 40, 0.08);
      border: 1px solid rgba(212, 125, 106, 0.3);
    }
    .header-band {
      height: 6px;
      background: linear-gradient(90deg, #D47D6A, #A85328);
    }
    .header {
      padding: 40px 30px 20px 30px;
      text-align: center;
    }
    .logo-container {
      display: inline-block;
      width: 48px;
      height: 48px;
      line-height: 48px;
      background: linear-gradient(135deg, #D47D6A, #A85328);
      border-radius: 14px;
      color: #ffffff;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      box-shadow: 0 4px 10px rgba(168, 83, 40, 0.2);
    }
    .brand-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: #1e1b1b;
      margin-top: 15px;
      margin-bottom: 5px;
    }
    .brand-tagline {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #A85328;
      font-weight: 600;
      margin: 0;
    }
    .content {
      padding: 20px 30px 40px 30px;
    }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24px;
      font-weight: 500;
      color: #1e1b1b;
      margin-top: 0;
      margin-bottom: 10px;
      text-align: center;
    }
    .intro-p {
      font-size: 14px;
      line-height: 1.6;
      color: #555555;
      margin-top: 0;
      margin-bottom: 30px;
      text-align: center;
    }
    .order-meta-box {
      background-color: #FFF8F4;
      border: 1px solid rgba(168, 83, 40, 0.2);
      border-radius: 16px;
      padding: 15px 20px;
      margin-bottom: 30px;
    }
    .order-meta-table {
      width: 100%;
      border-collapse: collapse;
    }
    .order-meta-table td {
      font-size: 12px;
      color: #555555;
      padding: 4px 0;
    }
    .order-meta-table td strong {
      color: #1e1b1b;
    }
    .section-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 16px;
      font-weight: 600;
      color: #1e1b1b;
      margin-bottom: 15px;
      margin-top: 0;
      border-bottom: 1px solid #ebdcd5;
      padding-bottom: 8px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #A85328;
      padding-bottom: 10px;
      border-bottom: 2px solid #ebdcd5;
      font-weight: 700;
    }
    .pricing-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .pricing-table td {
      padding: 6px 0;
      font-size: 13px;
      color: #555555;
    }
    .pricing-table .total-row td {
      border-top: 2px solid #ebdcd5;
      padding-top: 15px;
      font-size: 16px;
      font-weight: bold;
      color: #A85328;
    }
    .grid-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .grid-col {
      width: 50%;
      vertical-align: top;
      padding-right: 15px;
    }
    .address-card {
      background-color: #FFF8F4;
      border: 1px solid #ebdcd5;
      border-radius: 16px;
      padding: 18px;
      min-height: 120px;
    }
    .btn-container {
      text-align: center;
      margin: 30px 0;
    }
    .btn {
      display: inline-block;
      padding: 14px 30px;
      background: linear-gradient(135deg, #D47D6A, #A85328);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 14px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      box-shadow: 0 5px 15px rgba(168, 83, 40, 0.2);
    }
    .footer {
      padding: 30px;
      background-color: #FFF8F4;
      border-top: 1px solid #ebdcd5;
      text-align: center;
    }
    .footer-text {
      font-size: 11px;
      color: #8c8585;
      line-height: 1.5;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main-table">
      <tr>
        <td class="header-band"></td>
      </tr>
      <tr>
        <td class="header">
          <div class="logo-container">S</div>
          <h2 class="brand-name">Snail Studio</h2>
          <p class="brand-tagline">Press-On Nails Luxury</p>
        </td>
      </tr>
      <tr>
        <td class="content">
          <h1>Thank You For Your Order!</h1>
          <p class="intro-p">Hi ${params.customerName}, we have received your payment and are now preparing your order. You will receive another notification once your items ship.</p>
          
          <div class="order-meta-box">
            <table class="order-meta-table">
              <tr>
                <td>Order ID: <strong>${params.orderId}</strong></td>
                <td style="text-align: right;">Date: <strong>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></td>
              </tr>
              <tr>
                <td>Status: <strong>Paid / Processing</strong></td>
                <td style="text-align: right;">Method: <strong>Online Gateway</strong></td>
              </tr>
            </table>
          </div>

          <h3 class="section-title">Order Items</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left;">Item</th>
                <th style="text-align: center; width: 60px;">Qty</th>
                <th style="text-align: right; width: 100px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHtml}
            </tbody>
          </table>

          <table class="pricing-table">
            <tr>
              <td>Subtotal</td>
              <td style="text-align: right; font-weight: 500;">${formatPrice(params.subtotal)}</td>
            </tr>
            ${params.tax > 0 ? `
            <tr>
              <td>GST (Tax)</td>
              <td style="text-align: right; font-weight: 500;">${formatPrice(params.tax)}</td>
            </tr>` : ''}
            ${params.shipping > 0 ? `
            <tr>
              <td>Shipping</td>
              <td style="text-align: right; font-weight: 500;">${formatPrice(params.shipping)}</td>
            </tr>` : `
            <tr>
              <td>Shipping</td>
              <td style="text-align: right; color: #9EE493; font-weight: 500;">FREE</td>
            </tr>`}
            ${params.discount > 0 ? `
            <tr>
              <td style="color: #A85328;">Discount</td>
              <td style="text-align: right; color: #A85328; font-weight: 500;">-${formatPrice(params.discount)}</td>
            </tr>` : ''}
            <tr class="total-row">
              <td>Grand Total</td>
              <td style="text-align: right;">${formatPrice(params.total)}</td>
            </tr>
          </table>

          <h3 class="section-title">Delivery Details</h3>
          <table class="grid-table">
            <tr>
              <td class="grid-col">
                <div class="address-card">
                  <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #A85328; margin-bottom: 8px;">Shipping Address</div>
                  <div style="font-size: 13px; font-weight: 600; color: #1e1b1b; margin-bottom: 4px;">${params.shippingAddress.name}</div>
                  <div style="font-size: 13px; color: #555555; margin-bottom: 3px;">${params.shippingAddress.addressLine1}</div>
                  ${addressLine2Html}
                  <div style="font-size: 13px; color: #555555; margin-bottom: 3px;">${params.shippingAddress.city}, ${params.shippingAddress.state} - ${params.shippingAddress.postalCode}</div>
                  <div style="font-size: 13px; color: #555555; margin-bottom: 6px;">${params.shippingAddress.country}</div>
                  <div style="font-size: 12px; color: #8c8585;">Phone: ${params.shippingAddress.phone}</div>
                </div>
              </td>
              <td class="grid-col" style="padding-right: 0;">
                <div class="address-card">
                  <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #A85328; margin-bottom: 8px;">What's Next?</div>
                  <p style="font-size: 12px; line-height: 1.5; color: #555555; margin: 0 0 10px 0;">Our artists are handcrafting your nails. Orders usually take 2-3 business days to prepare before shipping.</p>
                  <p style="font-size: 12px; line-height: 1.5; color: #555555; margin: 0;">You can check your order tracking status anytime via the button below.</p>
                </div>
              </td>
            </tr>
          </table>

          <div class="btn-container">
            <a href="http://localhost:3000/shop/orders/${params.orderId}" class="btn">Track Your Order</a>
          </div>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p class="footer-text">&copy; ${currentYear} Snail Studio. All rights reserved.</p>
          <p class="footer-text" style="margin-top: 5px;">Need help? Email us at hello@snailstudio.com or reply to this message.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;
}
