/**
 * SMTP connection test HTML email template
 */
export function getTestEmailTemplate(senderEmail: string): string {
  const currentYear = new Date().getFullYear();
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SMTP Connection Test | Snail Studio</title>
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
    .card {
      background-color: #FFF8F4;
      border: 1px dashed #D47D6A;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 30px;
      text-align: left;
    }
    .card-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #A85328;
      margin-bottom: 12px;
      display: block;
    }
    .card-detail {
      font-size: 13px;
      color: #444444;
      line-height: 1.5;
      margin: 4px 0;
    }
    .card-detail strong {
      color: #1e1b1b;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background-color: #F6C8BB;
      color: #A85328;
      border-radius: 50px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 10px;
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
          <h1>SMTP Settings Verified!</h1>
          <p>Congratulations! You have successfully configured and verified your SMTP connection settings. Snail Studio is now ready to transmit elegant transactional notifications to your customers.</p>
          
          <div class="card">
            <span class="card-title">Configuration Details</span>
            <div class="card-detail"><strong>Status:</strong> Connected Successfully</div>
            <div class="card-detail"><strong>Sender Account:</strong> ${senderEmail}</div>
            <div class="card-detail"><strong>Verification Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC</div>
            <div class="card-detail"><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</div>
            <center>
              <span class="badge">Connection Active</span>
            </center>
          </div>
          
          <p style="margin-bottom: 0; font-size: 12px; color: #8c8585;">You can close this window. This is a system-generated message to verify your settings.</p>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p class="footer-text">&copy; ${currentYear} Snail Studio. All rights reserved.</p>
          <p class="footer-text" style="margin-top: 5px;">Elegant handcrafted press-on nails delivered to your doorstep.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;
}
