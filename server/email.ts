interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailConfig {
  apiKey?: string;
  fromEmail: string;
  fromName: string;
}

const config: EmailConfig = {
  apiKey: process.env.SENDGRID_API_KEY,
  fromEmail: process.env.EMAIL_FROM || 'noreply@quoteus.ca',
  fromName: process.env.EMAIL_FROM_NAME || 'QuoteUs.ca'
};

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!config.apiKey) {
    console.log('[Email] No API key configured - email notification logged but not sent:');
    console.log(`  To: ${options.to}`);
    console.log(`  Subject: ${options.subject}`);
    return false;
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: config.fromEmail, name: config.fromName },
        subject: options.subject,
        content: [
          { type: 'text/html', value: options.html },
          ...(options.text ? [{ type: 'text/plain', value: options.text }] : [])
        ]
      })
    });

    if (response.ok || response.status === 202) {
      console.log(`[Email] Sent successfully to ${options.to}`);
      return true;
    } else {
      const error = await response.text();
      console.error(`[Email] Failed to send: ${error}`);
      return false;
    }
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    return false;
  }
}

export function generateNewLeadEmail(leadData: {
  clientName: string;
  type: string;
  email: string;
  phone?: string;
  source?: string;
}): { subject: string; html: string } {
  return {
    subject: `New ${leadData.type} Insurance Lead - ${leadData.clientName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">QuoteUs.ca</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">New Lead Received</h2>
          <p style="color: #4b5563;">A new insurance lead has been submitted and requires your attention.</p>
          
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 120px;">Client Name:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">${leadData.clientName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Insurance Type:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">${leadData.type}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                <td style="padding: 8px 0; color: #1f2937;">${leadData.email}</td>
              </tr>
              ${leadData.phone ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
                <td style="padding: 8px 0; color: #1f2937;">${leadData.phone}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Source:</td>
                <td style="padding: 8px 0; color: #1f2937;">${leadData.source || 'Website'}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #4b5563;">Please log in to the CRM to view full details and follow up with this lead.</p>
          
          <a href="https://quoteus.ca/admin" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View in CRM</a>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>This is an automated notification from QuoteUs.ca</p>
        </div>
      </div>
    `
  };
}

export function generateAssignmentEmail(data: {
  brokerName: string;
  clientName: string;
  type: string;
  email: string;
  phone?: string;
  assignedBy: string;
}): { subject: string; html: string } {
  return {
    subject: `Lead Assigned: ${data.clientName} - ${data.type} Insurance`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">QuoteUs.ca</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">Lead Assigned to You</h2>
          <p style="color: #4b5563;">Hi ${data.brokerName},</p>
          <p style="color: #4b5563;">A new lead has been assigned to you by ${data.assignedBy}.</p>
          
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 120px;">Client Name:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">${data.clientName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Insurance Type:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">${data.type}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                <td style="padding: 8px 0; color: #1f2937;">${data.email}</td>
              </tr>
              ${data.phone ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
                <td style="padding: 8px 0; color: #1f2937;">${data.phone}</td>
              </tr>` : ''}
            </table>
          </div>
          
          <p style="color: #4b5563;">Please follow up with this client as soon as possible.</p>
          
          <a href="https://quoteus.ca/admin" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Lead Details</a>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>This is an automated notification from QuoteUs.ca</p>
        </div>
      </div>
    `
  };
}

export function generateStatusChangeEmail(data: {
  clientName: string;
  type: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  brokerEmail?: string;
}): { subject: string; html: string } {
  return {
    subject: `Status Update: ${data.clientName} - ${data.oldStatus} → ${data.newStatus}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">QuoteUs.ca</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">Lead Status Updated</h2>
          <p style="color: #4b5563;">A lead status has been changed by ${data.changedBy}.</p>
          
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 120px;">Client:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">${data.clientName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Type:</td>
                <td style="padding: 8px 0; color: #1f2937;">${data.type}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Previous Status:</td>
                <td style="padding: 8px 0; color: #6b7280;">${data.oldStatus}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">New Status:</td>
                <td style="padding: 8px 0; color: #16a34a; font-weight: bold;">${data.newStatus}</td>
              </tr>
            </table>
          </div>
          
          <a href="https://quoteus.ca/admin" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View in CRM</a>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>This is an automated notification from QuoteUs.ca</p>
        </div>
      </div>
    `
  };
}

export function generateAdminNotificationEmail(data: {
  clientName: string;
  type: string;
  email: string;
  phone?: string;
}): { subject: string; html: string } {
  return generateNewLeadEmail(data);
}
