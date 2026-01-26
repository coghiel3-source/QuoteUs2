import nodemailer from 'nodemailer';
import { storage } from './storage';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  useSsl: boolean;
}

let cachedSmtpSettings: SmtpSettings | null = null;
let lastSettingsCheck = 0;
const SETTINGS_CACHE_TTL = 60000; // 1 minute

async function getSmtpSettings(): Promise<SmtpSettings | null> {
  const now = Date.now();
  if (cachedSmtpSettings && (now - lastSettingsCheck) < SETTINGS_CACHE_TTL) {
    return cachedSmtpSettings;
  }

  try {
    const setting = await storage.getSetting("smtp_settings");
    if (!setting) {
      return null;
    }
    cachedSmtpSettings = JSON.parse(setting.value);
    lastSettingsCheck = now;
    return cachedSmtpSettings;
  } catch (error) {
    console.error('[Email] Failed to load SMTP settings:', error);
    return null;
  }
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const smtpSettings = await getSmtpSettings();
  
  if (!smtpSettings) {
    console.log('[Email] No SMTP settings configured - email notification logged but not sent:');
    console.log(`  To: ${options.to}`);
    console.log(`  Subject: ${options.subject}`);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.useSsl && smtpSettings.port === 465,
      auth: {
        user: smtpSettings.username,
        pass: smtpSettings.password,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || undefined,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Sent successfully to ${options.to} - MessageId: ${info.messageId}`);
    return true;
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

export function generateThankYouEmail(data: {
  clientName: string;
  type: string;
}): { subject: string; html: string } {
  return {
    subject: `Thank You for Your ${data.type} Insurance Quote Request - QuoteUs.ca`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">QuoteUs.ca</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">Thank You, ${data.clientName}!</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            We have received your ${data.type} insurance quote request and appreciate you choosing QuoteUs.ca.
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            One of our licensed insurance brokers will review your information and contact you shortly to discuss your options and provide you with competitive quotes.
          </p>
          
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <p style="color: #1f2937; margin: 0; font-weight: bold;">What happens next?</p>
            <ul style="color: #4b5563; margin-top: 10px; padding-left: 20px;">
              <li>A broker will review your quote request</li>
              <li>You'll receive a call or email within 1-2 business days</li>
              <li>We'll help you find the best coverage at competitive rates</li>
            </ul>
          </div>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            If you have any immediate questions, please don't hesitate to contact us.
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 20px;">
            Best regards,<br>
            <strong>The QuoteUs.ca Team</strong>
          </p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>QuoteUs.ca - Your Trusted Ontario Insurance Partner</p>
        </div>
      </div>
    `
  };
}
