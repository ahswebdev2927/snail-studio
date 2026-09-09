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

import { getSiteUrl } from "@/lib/seo";

export interface ShipmentUpdateParams {
  customerName: string;
  orderId: string;
  status: string; // 'created' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'ndr' | 'rto'
  previousStatus?: string | null;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  estimatedDeliveryAt?: Date | null;
  statusNotes?: string | null;
  updatedAt: Date;
}

const statusLabels: Record<string, string> = {
  placed: "Order Placed",
  confirmed: "Confirmed",
  processing: "Processing",
  created: "Ready to Ship",
  manifested: "Ready to Ship",
  ready_to_ship: "Ready to Ship",
  picked_up: "Picked Up",
  shipped: "In Transit",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  ndr: "Delivery Exception",
  rto: "Return to Origin",
};

const defaultPreviousStatusMap: Record<string, string> = {
  created: "Processing",
  ready_to_ship: "Processing",
  in_transit: "Processing",
  out_for_delivery: "In Transit",
  delivered: "Out for Delivery",
  ndr: "Out for Delivery",
  rto: "In Transit",
};

function formatStatus(statusStr: string): string {
  const normalized = statusStr.toLowerCase();
  return statusLabels[normalized] || statusStr;
}

export function getShipmentUpdateTemplate(params: ShipmentUpdateParams): string {
  const currentYear = new Date().getFullYear();
  const baseUrl = getSiteUrl().replace(/\/$/, "");

  const nextStage = formatStatus(params.status);
  const prevStage = params.previousStatus
    ? formatStatus(params.previousStatus)
    : defaultPreviousStatusMap[params.status.toLowerCase()] || "Processing";

  const trackingLink = params.trackingUrl || `${baseUrl}/track?trackingNumber=${encodeURIComponent(params.trackingNumber)}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shipment Update | Snail Studio</title>
</head>
<body style="margin:0; padding:24px; background-color:#FAFAFA; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1A1A1A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px; margin:0 auto; background-color:#FFFFFF; border:1px solid #E5E5E5; border-radius:12px; overflow:hidden;">
    <tr>
      <td style="padding:28px 24px; text-align:center; border-bottom:1px solid #F0F0F0;">
        <div style="font-family:Georgia, serif; font-size:20px; font-weight:600; color:#1A1A1A; letter-spacing:0.04em;">Snail Studio</div>
        <div style="font-size:11px; color:#888888; text-transform:uppercase; letter-spacing:0.12em; margin-top:3px;">Shipment Update</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <p style="font-size:14px; margin:0 0 16px 0; color:#333333; line-height:1.5;">
          Hi <strong>${params.customerName}</strong>, your order <strong>#${params.orderId}</strong> has been updated:
        </p>

        <!-- Minimal Stage Transition Box -->
        <div style="background-color:#F9F9FB; border:1px solid #EAEAEF; border-radius:8px; padding:16px; text-align:center; margin-bottom:20px;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#777777; margin-bottom:6px;">Status Progression</div>
          <div style="font-size:15px; font-weight:600; color:#1A1A1A;">
            <span style="color:#666666;">${prevStage}</span>
            <span style="color:#A95423; margin:0 8px;">&rarr;</span>
            <span style="color:#A95423;">${nextStage}</span>
          </div>
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px; color:#555555; margin-bottom:20px; line-height:1.6;">
          <tr>
            <td style="padding:4px 0; color:#888888;">Courier Partner:</td>
            <td style="padding:4px 0; text-align:right; font-weight:500; color:#1A1A1A;">${params.carrier}</td>
          </tr>
          <tr>
            <td style="padding:4px 0; color:#888888;">Tracking Number:</td>
            <td style="padding:4px 0; text-align:right; font-weight:500; color:#1A1A1A;">${params.trackingNumber}</td>
          </tr>
        </table>

        <!-- Tracking CTA -->
        <div style="text-align:center; margin-top:24px; margin-bottom:8px;">
          <a href="${trackingLink}" style="display:inline-block; background-color:#1A1A1A; color:#FFFFFF; text-decoration:none; padding:12px 24px; border-radius:6px; font-size:13px; font-weight:600; letter-spacing:0.02em;">Track Package</a>
        </div>
        <div style="text-align:center; margin-top:8px; font-size:11px; color:#888888; word-break:break-all;">
          ${trackingLink}
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px; background-color:#FAFAFA; border-top:1px solid #F0F0F0; text-align:center; font-size:11px; color:#888888;">
        &copy; ${currentYear} Snail Studio. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

