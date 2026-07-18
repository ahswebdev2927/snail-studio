/**
 * Premium HTML templates for Security and Access Management emails
 */

export function getOtpEmailTemplate(otp: string): string {
  const currentYear = new Date().getFullYear();
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Verification Code | Snail Studio</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FFF3EA;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #333333;
      -webkit-font-smoothing: antialiased;
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
      padding: 20px 40px 40px 40px;
      text-align: center;
    }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24px;
      font-weight: 500;
      color: #1e1b1b;
      margin-top: 0;
      margin-bottom: 15px;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #555555;
      margin-top: 0;
      margin-bottom: 25px;
    }
    .otp-box {
      font-family: monospace;
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 0.25em;
      color: #A85328;
      background-color: #FFF8F4;
      border: 1px solid rgba(212, 125, 106, 0.4);
      border-radius: 16px;
      padding: 16px 24px;
      display: inline-block;
      margin: 15px auto;
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
          <h1>Verification Code</h1>
          <p>You have requested to perform a sensitive action on the Snail Studio Admin Panel. Please use the following One-Time Password (OTP) to authorize this action. This code is valid for 5 minutes.</p>
          
          <div class="otp-box">${otp}</div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #8c8585;">If you did not initiate this request, please contact security immediately.</p>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p class="footer-text">&copy; ${currentYear} Snail Studio. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;
}

export function getPrivilegedActionEmailTemplate(
  adminName: string,
  actionName: string,
  targetName: string,
  ipAddress: string,
  browser: string
): string {
  const currentYear = new Date().getFullYear();
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert: Privileged Action Completed | Snail Studio</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FFF3EA;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #333333;
      -webkit-font-smoothing: antialiased;
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
      padding: 20px 40px 40px 40px;
    }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22px;
      font-weight: 500;
      color: #1e1b1b;
      margin-top: 0;
      margin-bottom: 15px;
      text-align: center;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #555555;
      margin-top: 0;
      margin-bottom: 25px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 13px;
    }
    .details-table td {
      padding: 10px;
      border-bottom: 1px solid #FFF3EA;
    }
    .details-table td.label {
      font-weight: bold;
      color: #A85328;
      width: 130px;
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
          <h1>Security Notification: Privileged Action Completed</h1>
          <p>Hi ${adminName},</p>
          <p>This email is to confirm that a privileged/sensitive action has been successfully executed on your administrative account. Details are below:</p>
          
          <table class="details-table">
            <tr>
              <td class="label">Action:</td>
              <td><strong>${actionName}</strong></td>
            </tr>
            <tr>
              <td class="label">Target:</td>
              <td>${targetName || "N/A"}</td>
            </tr>
            <tr>
              <td class="label">IP Address:</td>
              <td>${ipAddress}</td>
            </tr>
            <tr>
              <td class="label">Browser:</td>
              <td>${browser}</td>
            </tr>
            <tr>
              <td class="label">Timestamp:</td>
              <td>${new Date().toLocaleString()}</td>
            </tr>
          </table>
          
          <p style="margin-top: 25px; font-size: 13px; color: #d32f2f; background-color: #ffebee; padding: 12px; border-radius: 8px; border-left: 4px solid #d32f2f;">
            <strong>Important:</strong> If you did not perform this action, please alert the system administrator and revoke your session immediately.
          </p>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p class="footer-text">&copy; ${currentYear} Snail Studio. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;
}

export function getRoleChangeEmailTemplate(
  userName: string,
  prevRole: string,
  newRole: string
): string {
  const currentYear = new Date().getFullYear();
  const isPromoted = newRole === "admin";
  const titleText = isPromoted ? "Admin Privileges Granted" : "Admin Privileges Revoked";
  const bodyText = isPromoted
    ? "We are writing to notify you that your Snail Studio account role has been updated. You have been promoted to <strong>Admin</strong>. You now have full access to the administration dashboard and management systems."
    : "We are writing to notify you that your Snail Studio account role has been updated. You have been changed to <strong>Customer</strong>. Your access to administrative panels and tools has been revoked.";
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Role Updated | Snail Studio</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FFF3EA;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #333333;
      -webkit-font-smoothing: antialiased;
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
      padding: 20px 40px 40px 40px;
    }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22px;
      font-weight: 500;
      color: #1e1b1b;
      margin-top: 0;
      margin-bottom: 15px;
      text-align: center;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #555555;
      margin-top: 0;
      margin-bottom: 25px;
    }
    .badge-container {
      text-align: center;
      margin: 20px 0;
    }
    .badge {
      display: inline-block;
      padding: 8px 20px;
      background-color: ${isPromoted ? "#e8f5e9" : "#ffebee"};
      color: ${isPromoted ? "#2e7d32" : "#c62828"};
      border-radius: 50px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border: 1px solid ${isPromoted ? "#a5d6a7" : "#ef9a9a"};
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
          <h1>${titleText}</h1>
          <p>Hi ${userName},</p>
          <p>${bodyText}</p>
          
          <div class="badge-container">
            <span class="badge">${newRole.toUpperCase()}</span>
          </div>
          
          <p style="margin-top: 25px; font-size: 13px; color: #555555;">
            If you have any questions or did not expect this adjustment, please contact security immediately.
          </p>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p class="footer-text">&copy; ${currentYear} Snail Studio. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;
}
