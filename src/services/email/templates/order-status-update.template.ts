/**
 * Order Status Update HTML email template
 */
interface OrderStatusUpdateParams {
  customerName: string;
  orderId: string;
  newStatus: string; // 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  statusNotes?: string | null;
  updatedAt: Date;
}

export function getOrderStatusUpdateTemplate(params: OrderStatusUpdateParams): string {
  const currentYear = new Date().getFullYear();
  
  const statusLabels: Record<string, string> = {
    pending: "Pending Payment",
    paid: "Paid & Confirmed",
    processing: "Handcrafting Nails",
    shipped: "Shipped & In Transit",
    delivered: "Delivered",
    cancelled: "Order Cancelled",
    refunded: "Refunded"
  };

  const statusText = statusLabels[params.newStatus.toLowerCase()] || params.newStatus;
  
  // Progress Bar styling helper
  const getProgressStyles = (targetStatuses: string[]) => {
    const active = targetStatuses.includes(params.newStatus.toLowerCase());
    return {
      circle: active 
        ? "background: linear-gradient(135deg, #ec4899, #be185d); color: #ffffff;" 
        : "background-color: #e5e7eb; color: #9ca3af;",
      line: active
        ? "background: linear-gradient(90deg, #ec4899, #be185d);"
        : "background-color: #e5e7eb;",
      text: active
        ? "color: #be185d; font-weight: 600;"
        : "color: #9ca3af; font-weight: normal;"
    };
  };

  const paidProg = getProgressStyles(["paid", "processing", "shipped", "delivered"]);
  const procProg = getProgressStyles(["processing", "shipped", "delivered"]);
  const shipProg = getProgressStyles(["shipped", "delivered"]);
  const delvProg = getProgressStyles(["delivered"]);

  // Build the visual status timeline HTML
  let timelineHtml = "";
  const isCancelledOrRefunded = ["cancelled", "refunded"].includes(params.newStatus.toLowerCase());

  if (isCancelledOrRefunded) {
    timelineHtml = `
      <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 30px;">
        <span style="display: inline-block; padding: 6px 14px; background-color: #fee2e2; color: #ef4444; border-radius: 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
          ${statusText}
        </span>
        <p style="font-size: 13px; line-height: 1.5; color: #7f1d1d; margin: 0;">
          This order has transitioned to <strong>${statusText}</strong>. If this was unexpected, please contact support.
        </p>
      </div>
    `;
  } else {
    timelineHtml = `
      <div style="margin-bottom: 35px; padding: 20px 10px; background-color: #fdf8f8; border: 1px solid rgba(244, 114, 182, 0.1); border-radius: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <!-- Paid Circle -->
            <td style="width: 20%; text-align: center; vertical-align: middle;">
              <div style="width: 28px; height: 28px; line-height: 28px; border-radius: 50%; display: inline-block; font-size: 11px; font-weight: bold; ${paidProg.circle}">✓</div>
            </td>
            <!-- Line 1 -->
            <td style="width: 20%; vertical-align: middle; padding: 0 4px;">
              <div style="height: 4px; border-radius: 2px; ${procProg.line}"></div>
            </td>
            <!-- Processing Circle -->
            <td style="width: 20%; text-align: center; vertical-align: middle;">
              <div style="width: 28px; height: 28px; line-height: 28px; border-radius: 50%; display: inline-block; font-size: 11px; font-weight: bold; ${procProg.circle}">⚙</div>
            </td>
            <!-- Line 2 -->
            <td style="width: 20%; vertical-align: middle; padding: 0 4px;">
              <div style="height: 4px; border-radius: 2px; ${shipProg.line}"></div>
            </td>
            <!-- Shipped Circle -->
            <td style="width: 20%; text-align: center; vertical-align: middle;">
              <div style="width: 28px; height: 28px; line-height: 28px; border-radius: 50%; display: inline-block; font-size: 11px; font-weight: bold; ${shipProg.circle}">🚚</div>
            </td>
            <!-- Line 3 -->
            <td style="width: 20%; vertical-align: middle; padding: 0 4px;">
              <div style="height: 4px; border-radius: 2px; ${delvProg.line}"></div>
            </td>
            <!-- Delivered Circle -->
            <td style="width: 20%; text-align: center; vertical-align: middle;">
              <div style="width: 28px; height: 28px; line-height: 28px; border-radius: 50%; display: inline-block; font-size: 11px; font-weight: bold; ${delvProg.circle}">🎁</div>
            </td>
          </tr>
          <tr>
            <!-- Labels -->
            <td style="text-align: center; padding-top: 10px; font-size: 10px; ${paidProg.text}">Paid</td>
            <td></td>
            <td style="text-align: center; padding-top: 10px; font-size: 10px; ${procProg.text}">Processing</td>
            <td></td>
            <td style="text-align: center; padding-top: 10px; font-size: 10px; ${shipProg.text}">Shipped</td>
            <td></td>
            <td style="text-align: center; padding-top: 10px; font-size: 10px; ${delvProg.text}">Delivered</td>
          </tr>
        </table>
      </div>
    `;
  }

  const notesHtml = params.statusNotes 
    ? `
      <div style="background-color: #faf6f6; border-left: 4px solid #be185d; border-radius: 4px 16px 16px 4px; padding: 20px; margin-bottom: 30px;">
        <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #be185d; display: block; margin-bottom: 6px; letter-spacing: 0.05em;">Status Note / Comments</span>
        <p style="font-size: 13px; line-height: 1.6; color: #555555; margin: 0; white-space: pre-wrap;">${params.statusNotes}</p>
      </div>
    `
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Update | Snail Studio</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #faf6f6;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #333333;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #faf6f6;
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
      box-shadow: 0 10px 30px rgba(188, 142, 142, 0.08);
      border: 1px solid rgba(226, 203, 203, 0.3);
    }
    .header-band {
      height: 6px;
      background: linear-gradient(90deg, #ec4899, #db2777, #be185d);
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
      background: linear-gradient(135deg, #ec4899, #be185d);
      border-radius: 14px;
      color: #ffffff;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      box-shadow: 0 4px 10px rgba(236, 72, 153, 0.2);
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
      color: #be185d;
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
    .meta-card {
      background-color: #fdf8f8;
      border: 1px dashed rgba(244, 114, 182, 0.3);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .meta-detail {
      font-size: 13px;
      color: #555555;
      line-height: 1.5;
      margin: 4px 0;
    }
    .meta-detail strong {
      color: #1e1b1b;
    }
    .btn-container {
      text-align: center;
      margin: 30px 0;
    }
    .btn {
      display: inline-block;
      padding: 14px 30px;
      background: linear-gradient(135deg, #ec4899, #be185d);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 14px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      box-shadow: 0 5px 15px rgba(236, 72, 153, 0.2);
    }
    .footer {
      padding: 30px;
      background-color: #fdfbfb;
      border-top: 1px solid #f5ebeb;
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
          <h1>Order Status Update</h1>
          <p class="intro-p">Hi ${params.customerName}, the status of your order <strong>${params.orderId}</strong> has been updated.</p>
          
          ${timelineHtml}
          ${notesHtml}

          <div class="meta-card">
            <div class="meta-detail"><strong>Order ID:</strong> ${params.orderId}</div>
            <div class="meta-detail"><strong>New Status:</strong> ${statusText}</div>
            <div class="meta-detail"><strong>Last Updated:</strong> ${params.updatedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at ${params.updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>

          <div class="btn-container">
            <a href="http://localhost:3000/shop/orders/${params.orderId}" class="btn">View Order Dashboard</a>
          </div>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p class="footer-text">&copy; ${currentYear} Snail Studio. All rights reserved.</p>
          <p class="footer-text" style="margin-top: 5px;">This is a transactional store email. If you have questions about your shipment, contact us at hello@snailstudio.com.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;
}
