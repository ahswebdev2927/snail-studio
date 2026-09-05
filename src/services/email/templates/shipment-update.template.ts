import { getAbsoluteUrl } from "@/lib/seo";

export interface ShipmentUpdateParams {
  customerName: string;
  orderId: string;
  status: string; // 'created' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'ndr' | 'rto'
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  estimatedDeliveryAt?: Date | null;
  statusNotes?: string | null;
  updatedAt: Date;
}

export function getShipmentUpdateTemplate(params: ShipmentUpdateParams): string {
  const currentYear = new Date().getFullYear();

  const statusLabels: Record<string, string> = {
    created: "Shipment Manifested",
    in_transit: "Shipped & In Transit",
    out_for_delivery: "Out for Delivery Today",
    delivered: "Delivered Successfully",
    ndr: "Delivery Attempt Exception",
    rto: "Return to Origin Initiated",
  };

  const statusTitle = statusLabels[params.status.toLowerCase()] || params.status;
  const trackingLink = params.trackingUrl || getAbsoluteUrl(`/track?trackingNumber=${encodeURIComponent(params.trackingNumber)}`);

  const formattedEstDate = params.estimatedDeliveryAt
    ? params.estimatedDeliveryAt.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "4–5 Business Days";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shipment Update | Snail Studio</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FEFFF6;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #222222;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #FEFFF6;
      padding-bottom: 40px;
      padding-top: 40px;
    }
    .main-table {
      background-color: #FFFFFF;
      margin: 0 auto;
      width: 100%;
      max-width: 600px;
      border-spacing: 0;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(169, 84, 35, 0.08);
      border: 1px solid #E7DDD7;
    }
    .header-band {
      height: 6px;
      background: #A95423;
    }
    .header {
      padding: 35px 30px 20px 30px;
      text-align: center;
    }
    .logo-container {
      display: inline-block;
      width: 48px;
      height: 48px;
      line-height: 48px;
      background: #A95423;
      border-radius: 14px;
      color: #ffffff;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      box-shadow: 0 4px 10px rgba(169, 84, 35, 0.2);
    }
    .brand-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: #222222;
      margin-top: 15px;
      margin-bottom: 5px;
    }
    .brand-tagline {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #A95423;
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
      color: #000000;
      margin-top: 0;
      margin-bottom: 10px;
      text-align: center;
    }
    .intro-p {
      font-size: 14px;
      line-height: 1.6;
      color: #4A4A4A;
      margin-top: 0;
      margin-bottom: 25px;
      text-align: center;
    }
    .status-badge-card {
      background-color: #FEFFF6;
      border: 1px solid #E7DDD7;
      border-radius: 16px;
      padding: 16px;
      text-align: center;
      margin-bottom: 25px;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      background-color: #A95423;
      color: #FFFFFF;
      border-radius: 50px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .meta-card {
      background-color: #FEFFF6;
      border: 1px dashed #E7DDD7;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .meta-detail {
      font-size: 13px;
      color: #666666;
      line-height: 1.6;
      margin: 5px 0;
    }
    .meta-detail strong {
      color: #222222;
    }
    .btn-container {
      text-align: center;
      margin: 30px 0;
    }
    .btn {
      display: inline-block;
      padding: 14px 30px;
      background: #A95423;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 14px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      box-shadow: 0 5px 15px rgba(169, 84, 35, 0.2);
    }
    .footer {
      padding: 30px;
      background-color: #FEFFF6;
      border-top: 1px solid #E7DDD7;
      text-align: center;
    }
    .footer-text {
      font-size: 11px;
      color: #666666;
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
          <h1>Shipment Update</h1>
          <p class="intro-p">Hi ${params.customerName}, your luxury press-on nail order <strong>#${params.orderId}</strong> has an active shipping update.</p>

          <div class="status-badge-card">
            <span class="status-badge">${statusTitle}</span>
            ${params.statusNotes ? `<p style="font-size: 12px; color: #4A4A4A; margin-top: 10px; margin-bottom: 0;">${params.statusNotes}</p>` : ""}
          </div>

          <div class="meta-card">
            <div class="meta-detail"><strong>Courier Partner:</strong> ${params.carrier}</div>
            <div class="meta-detail"><strong>Tracking / Waybill #:</strong> ${params.trackingNumber}</div>
            <div class="meta-detail"><strong>Estimated Delivery:</strong> ${formattedEstDate}</div>
            <div class="meta-detail"><strong>Last Updated:</strong> ${params.updatedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} at ${params.updatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
          </div>

          <div class="btn-container">
            <a href="${trackingLink}" class="btn">Track Shipment Live</a>
          </div>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p class="footer-text">&copy; ${currentYear} Snail Studio. All rights reserved.</p>
          <p class="footer-text" style="margin-top: 5px;">If you have any questions regarding your delivery, reply to this email or contact support.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;
}
