import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertQuoteSchema, insertActivitySchema } from "@shared/schema";
import { z } from "zod";
import { sendEmail, generateNewLeadEmail, generateAssignmentEmail, generateStatusChangeEmail, generateThankYouEmail, clearSmtpCache, generatePasswordResetEmail } from "./email";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "client", "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const adUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `ad-${uniqueSuffix}${ext}`);
  },
});

const adUpload = multer({
  storage: adUploadStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image and video files are allowed"));
  },
});

// Default lead costs by type (fallback if not set in database)
const DEFAULT_LEAD_COSTS: Record<string, number> = {
  "Auto": 10,
  "Home": 15,
  "Tenant": 5,
  "Business": 20,
  "Life": 12,
  "Travel": 3,
  "Pet": 5,
  "General": 8,
};

// Get lead costs from database or use defaults
async function getLeadCosts(): Promise<Record<string, number>> {
  const storedCosts = await storage.getSetting("lead_costs");
  if (storedCosts) {
    try {
      return JSON.parse(storedCosts);
    } catch {
      return DEFAULT_LEAD_COSTS;
    }
  }
  return DEFAULT_LEAD_COSTS;
}

// Credit package options
const CREDIT_PACKAGES = [
  { amount: 25, label: "$25" },
  { amount: 50, label: "$50" },
  { amount: 100, label: "$100" },
  { amount: 150, label: "$150" },
  { amount: 200, label: "$200" },
  { amount: 250, label: "$250" },
];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ===== USER / AUTH ROUTES =====
  
  // Login (simple auth - checks if user exists by email)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, role } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Simple role check (in production, use proper password auth)
      if (role && user.role !== role) {
        return res.status(403).json({ error: "Invalid role" });
      }
      
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Request password reset
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If an account exists with that email, a reset link will be sent." });
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      await storage.setResetToken(user.id, resetToken, resetExpiry);
      
      // Send password reset email
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DEPLOYMENT_URL || "http://localhost:5000";
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
      
      const emailContent = generatePasswordResetEmail(user.name, resetLink);
      const sent = await sendEmail({ to: user.email, subject: emailContent.subject, html: emailContent.html });
      
      if (sent) {
        console.log(`[Password Reset] Reset email sent to ${user.email}`);
      } else {
        console.log(`[Password Reset] Failed to send reset email to ${user.email}`);
      }
      
      res.json({ message: "If an account exists with that email, a reset link will be sent." });
    } catch (error: any) {
      console.error("[Password Reset] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Verify reset token
  app.get("/api/auth/verify-reset-token", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== "string") {
        return res.status(400).json({ valid: false, error: "Token is required" });
      }
      
      const user = await storage.getUserByResetToken(token);
      
      if (!user || !user.resetTokenExpiry) {
        return res.json({ valid: false, error: "Invalid or expired token" });
      }
      
      if (new Date() > user.resetTokenExpiry) {
        await storage.clearResetToken(user.id);
        return res.json({ valid: false, error: "Token has expired" });
      }
      
      res.json({ valid: true, email: user.email });
    } catch (error: any) {
      res.status(500).json({ valid: false, error: error.message });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      
      const user = await storage.getUserByResetToken(token);
      
      if (!user || !user.resetTokenExpiry) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }
      
      if (new Date() > user.resetTokenExpiry) {
        await storage.clearResetToken(user.id);
        return res.status(400).json({ error: "Token has expired" });
      }
      
      // Update password and clear token
      await storage.updatePassword(user.id, password);
      await storage.clearResetToken(user.id);
      
      console.log(`[Password Reset] Password updated for ${user.email}`);
      
      res.json({ message: "Password has been reset successfully" });
    } catch (error: any) {
      console.error("[Password Reset] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Register/Create User
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get single user
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update user (requires actorId for authorization)
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const { actorId, ...updateData } = req.body;
      
      // Require actorId for authorization
      if (!actorId) {
        return res.status(401).json({ error: "Actor ID is required for authentication" });
      }
      
      // Verify actor has permission to manage brokers
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
        return res.status(403).json({ error: "Only admin/manager can update users" });
      }
      
      // Check manager permissions
      if (actor.role === "manager") {
        const hasPermission = await checkPermission(actorId, "manageBrokers");
        if (!hasPermission) {
          return res.status(403).json({ error: "You don't have permission to manage brokers" });
        }
      }
      
      const user = await storage.updateUser(req.params.id, updateData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // ===== QUOTE / LEAD ROUTES =====
  
  // Create quote/lead
  app.post("/api/quotes", async (req, res) => {
    try {
      const quoteData = insertQuoteSchema.parse(req.body);
      const quote = await storage.createQuote(quoteData);
      
      // Create initial activity log
      await storage.createActivity({
        quoteId: quote.id,
        type: "system",
        content: `Lead created via ${quote.source}`,
        author: "System",
      });
      
      // Send notification email to admin
      const adminEmail = generateNewLeadEmail({
        clientName: quote.clientName,
        type: quote.type,
        email: quote.email || '',
        phone: quote.phone || undefined,
        source: quote.source || 'Website'
      });
      
      // Get notification email from settings, default to info@quoteus.ca
      const notificationEmail = await storage.getSetting("notification_email") || "info@quoteus.ca";
      
      console.log(`[Email] Attempting to send admin notification to ${notificationEmail}`);
      sendEmail({
        to: notificationEmail,
        subject: adminEmail.subject,
        html: adminEmail.html
      }).catch(err => console.error('[Email] Admin notification error:', err));
      
      // Send thank you email to client
      if (quote.email) {
        const thankYouEmail = generateThankYouEmail({
          clientName: quote.clientName,
          type: quote.type
        });
        sendEmail({
          to: quote.email,
          subject: thankYouEmail.subject,
          html: thankYouEmail.html
        }).catch(err => console.error('[Email] Thank you email error:', err));
      }
      
      res.status(201).json(quote);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get all quotes
  app.get("/api/quotes", async (req, res) => {
    try {
      const quotes = await storage.getAllQuotes();
      res.json(quotes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get single quote
  app.get("/api/quotes/:id", async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update quote
  app.patch("/api/quotes/:id", async (req, res) => {
    try {
      const existingQuote = await storage.getQuote(req.params.id);
      if (!existingQuote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      const quote = await storage.updateQuote(req.params.id, req.body);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      // Check for assignment change
      if (req.body.assignedTo && req.body.assignedTo !== existingQuote.assignedTo) {
        const broker = await storage.getUser(req.body.assignedTo);
        if (broker && broker.email) {
          const assignmentEmail = generateAssignmentEmail({
            brokerName: broker.name,
            clientName: quote.clientName,
            type: quote.type,
            email: quote.email || '',
            phone: quote.phone || undefined,
            assignedBy: req.body.assignedBy || 'Admin'
          });
          sendEmail({
            to: broker.email,
            subject: assignmentEmail.subject,
            html: assignmentEmail.html
          }).catch(err => console.error('[Email] Assignment notification error:', err));
        }
      }
      
      // Check for status change
      if (req.body.status && req.body.status !== existingQuote.status) {
        // Notify assigned broker if exists
        if (quote.assignedTo) {
          const broker = await storage.getUser(quote.assignedTo);
          if (broker && broker.email) {
            const statusEmail = generateStatusChangeEmail({
              clientName: quote.clientName,
              type: quote.type,
              oldStatus: existingQuote.status,
              newStatus: req.body.status,
              changedBy: req.body.changedBy || 'Admin'
            });
            sendEmail({
              to: broker.email,
              subject: statusEmail.subject,
              html: statusEmail.html
            }).catch(err => console.error('[Email] Status change notification error:', err));
          }
        }
      }
      
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Delete quote
  app.delete("/api/quotes/:id", async (req, res) => {
    try {
      const success = await storage.deleteQuote(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send lead details to assigned broker via email
  app.post("/api/leads/:id/send-to-broker", async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Lead not found" });
      }

      if (!quote.assignedTo) {
        return res.status(400).json({ error: "Lead is not assigned to a broker" });
      }

      const broker = await storage.getUser(quote.assignedTo);
      if (!broker) {
        return res.status(404).json({ error: "Assigned broker not found" });
      }

      if (!broker.email) {
        return res.status(400).json({ error: "Broker does not have an email address" });
      }

      // Generate lead details email
      const leadDetails = quote.details as Record<string, any> || {};
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">QuoteUs.ca</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #1f2937; margin-top: 0;">Lead Details - ${quote.type} Insurance</h2>
            <p style="color: #4b5563;">You have been assigned a new lead. Here are the complete details:</p>
            
            <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb; width: 140px;"><strong>Client Name:</strong></td>
                  <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${quote.clientName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;"><strong>Insurance Type:</strong></td>
                  <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${quote.type}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
                  <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${quote.email || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;"><strong>Phone:</strong></td>
                  <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${quote.phone || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;"><strong>Postal Code:</strong></td>
                  <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${quote.postalCode || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;"><strong>Status:</strong></td>
                  <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${quote.status}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;"><strong>Priority:</strong></td>
                  <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${quote.priority || 'Medium'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280;"><strong>Source:</strong></td>
                  <td style="padding: 10px 0; color: #1f2937;">${quote.source || 'Website'}</td>
                </tr>
              </table>
            </div>

            ${Object.keys(leadDetails).length > 0 ? `
              <h3 style="color: #1f2937; margin-top: 30px;">Additional Details</h3>
              <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <pre style="white-space: pre-wrap; word-wrap: break-word; font-family: monospace; font-size: 12px; color: #4b5563; margin: 0;">${JSON.stringify(leadDetails, null, 2)}</pre>
              </div>
            ` : ''}
            
            <p style="color: #4b5563; font-size: 14px; margin-top: 20px;">
              Please contact the client at your earliest convenience.
            </p>
            
            <p style="color: #4b5563; font-size: 14px; margin-top: 20px;">
              Best regards,<br>
              <strong>QuoteUs.ca Management</strong>
            </p>
          </div>
          <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>QuoteUs.ca - Your Trusted Ontario Insurance Partner</p>
          </div>
        </div>
      `;

      await sendEmail({
        to: broker.email,
        subject: `Lead Assignment: ${quote.clientName} - ${quote.type} Insurance`,
        html: emailHtml
      });

      // Log the activity
      await storage.createActivity({
        quoteId: quote.id,
        type: "email_sent",
        content: `Lead details emailed to broker ${broker.name}`,
        author: "System",
      });

      res.json({ success: true, message: "Email sent to broker" });
    } catch (error: any) {
      console.error('[Email] Send to broker error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ===== CONTACT FORM ROUTE =====
  
  // Handle contact form submissions
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, category, message } = req.body;
      
      if (!name || !email || !category || !message) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      const categoryLabels: Record<string, string> = {
        auto: "Auto Insurance",
        home: "Home Insurance",
        tenant: "Tenant Insurance",
        travel: "Travel Insurance",
        life: "Life Insurance",
        business: "Business Insurance",
        mortgage: "Mortgage",
        compare: "Compare Quotes",
        advertisement: "Advertisement Inquiry",
        other: "Other",
      };
      
      const categoryLabel = categoryLabels[category] || category;
      
      const emailContent = {
        subject: `[QuoteUs.ca Contact] ${categoryLabel} - ${name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Category:</strong> ${categoryLabel}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
        text: `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}\nCategory: ${categoryLabel}\nMessage:\n${message}`,
      };
      
      // Try to send email
      const sent = await sendEmail({ to: "info@quoteus.ca", subject: emailContent.subject, html: emailContent.html });
      
      if (!sent) {
        console.log('[Contact] Email not sent (SMTP not configured), but form submitted successfully');
      }
      
      res.json({ success: true, message: "Contact form submitted successfully" });
    } catch (error: any) {
      console.error('[Contact] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // ===== ACTIVITY ROUTES =====
  
  // Get activities for a quote
  app.get("/api/quotes/:id/activities", async (req, res) => {
    try {
      const activities = await storage.getActivitiesForQuote(req.params.id);
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create activity
  app.post("/api/activities", async (req, res) => {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(activityData);
      res.status(201).json(activity);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // ===== CREDIT & PAYMENT ROUTES =====
  
  // Get Stripe publishable key
  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get credit packages
  app.get("/api/credits/packages", async (req, res) => {
    res.json({ packages: CREDIT_PACKAGES });
  });

  // Get lead pricing
  app.get("/api/credits/lead-costs", async (req, res) => {
    const costs = await getLeadCosts();
    res.json({ costs });
  });

  // Admin: Update default lead costs
  app.post("/api/admin/lead-costs", async (req, res) => {
    try {
      const { costs, actorId } = req.body;
      
      if (!costs || typeof costs !== 'object') {
        return res.status(400).json({ error: "Costs object is required" });
      }
      
      // Require actor ID for authorization
      if (!actorId) {
        return res.status(401).json({ error: "Actor ID is required for authentication" });
      }
      
      // Verify actor is admin or manager with editLeadCosts permission
      const actor = await storage.getUser(actorId);
      if (!actor) {
        return res.status(403).json({ error: "User not found" });
      }
      if (actor.role === "manager") {
        const hasEditPermission = await checkPermission(actorId, "editLeadCosts");
        if (!hasEditPermission) {
          return res.status(403).json({ error: "You don't have permission to edit lead costs" });
        }
      } else if (actor.role !== "admin") {
        return res.status(403).json({ error: "Only admin/manager can update lead costs" });
      }
      
      // Validate all costs are non-negative numbers
      for (const [type, cost] of Object.entries(costs)) {
        const numCost = Number(cost);
        if (isNaN(numCost) || numCost < 0) {
          return res.status(400).json({ error: `Invalid cost for ${type}: must be $0 or higher` });
        }
      }
      
      // Save to database
      await storage.setSetting("lead_costs", JSON.stringify(costs), actorId);
      
      res.json({ success: true, costs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Test SMTP connection
  app.post("/api/admin/smtp/test", async (req, res) => {
    try {
      const { host, port, username, password, fromEmail, fromName, useSsl, actorId } = req.body;
      
      if (!actorId) {
        return res.status(401).json({ error: "Actor ID is required" });
      }
      
      const actor = await storage.getUser(actorId);
      if (!actor || actor.role !== "admin") {
        return res.status(403).json({ error: "Only admin can configure SMTP" });
      }
      
      if (!host || !username) {
        return res.status(400).json({ error: "Host and username are required" });
      }
      
      // Get existing settings to use stored password if not provided
      let testPassword = password;
      if (!testPassword) {
        const existingSettingValue = await storage.getSetting("smtp_settings");
        if (existingSettingValue) {
          try {
            const existing = JSON.parse(existingSettingValue);
            testPassword = existing.password || "";
          } catch (e) {}
        }
      }
      
      if (!testPassword) {
        return res.status(400).json({ error: "Password is required" });
      }
      
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: host,
        port: port || 587,
        secure: useSsl && port === 465,
        auth: {
          user: username,
          pass: testPassword,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      await transporter.verify();
      res.json({ success: true, message: "SMTP connection successful" });
    } catch (error: any) {
      console.error('[SMTP Test] Error:', error);
      res.status(400).json({ error: `SMTP connection failed: ${error.message}` });
    }
  });

  // Admin: Save SMTP settings
  app.post("/api/admin/smtp/save", async (req, res) => {
    try {
      const { host, port, username, password, fromEmail, fromName, useSsl, actorId } = req.body;
      console.log('[SMTP Save] Request received:', { host, port, username, hasPassword: !!password, actorId });
      
      if (!actorId) {
        console.log('[SMTP Save] No actorId provided');
        return res.status(401).json({ error: "Actor ID is required" });
      }
      
      const actor = await storage.getUser(actorId);
      console.log('[SMTP Save] Actor lookup:', { found: !!actor, role: actor?.role });
      if (!actor || actor.role !== "admin") {
        return res.status(403).json({ error: "Only admin can configure SMTP" });
      }
      
      if (!host || !username) {
        return res.status(400).json({ error: "Host and username are required" });
      }
      
      // Get existing settings to preserve password if not provided
      const existingSettingValue = await storage.getSetting("smtp_settings");
      let existingPassword = "";
      if (existingSettingValue) {
        try {
          const existing = JSON.parse(existingSettingValue);
          existingPassword = existing.password || "";
        } catch (e) {}
      }
      
      // Use new password if provided, otherwise keep existing
      const finalPassword = password || existingPassword;
      
      if (!finalPassword) {
        return res.status(400).json({ error: "Password is required for initial setup" });
      }
      
      // Save SMTP settings to database (password should be encrypted in production)
      const smtpSettings = {
        host,
        port: port || 587,
        username,
        password: finalPassword, // In production, encrypt this
        fromEmail: fromEmail || username,
        fromName: fromName || "QuoteUs.ca",
        useSsl: useSsl !== false
      };
      
      console.log('[SMTP Save] Saving to database...');
      await storage.setSetting("smtp_settings", JSON.stringify(smtpSettings), actorId);
      console.log('[SMTP Save] Settings saved successfully');
      
      // Clear the email cache so new settings are used immediately
      clearSmtpCache();
      
      res.json({ success: true, message: "SMTP settings saved" });
    } catch (error: any) {
      console.error('[SMTP Save] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Helper function to get manager permissions from settings
  async function getManagerPermissions() {
    const settingValue = await storage.getSetting("manager_permissions");
    if (!settingValue) {
      return {
        viewLeads: true,
        assignLeads: true,
        manageBrokers: false,
        viewCredits: true,
        adjustBalances: false,
        viewSettings: false,
      };
    }
    return JSON.parse(settingValue);
  }

  // Helper function to check if user has permission
  async function checkPermission(userId: string, permission: string): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'manager') {
      const userPermissions = user.permissions as Record<string, boolean> | null;
      if (userPermissions) {
        return userPermissions[permission] === true;
      }
      const globalPermissions = await getManagerPermissions();
      return globalPermissions[permission] === true;
    }
    return false;
  }

  // Admin: Get manager permissions (accessible to admin and manager)
  app.get("/api/admin/manager-permissions", async (req, res) => {
    try {
      const permissions = await getManagerPermissions();
      res.json({ permissions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Save manager permissions (admin only)
  app.post("/api/admin/manager-permissions", async (req, res) => {
    try {
      const { permissions, actorId } = req.body;
      
      // Verify actor is admin
      if (actorId) {
        const actor = await storage.getUser(actorId);
        if (!actor || actor.role !== 'admin') {
          return res.status(403).json({ error: "Only admins can modify manager permissions" });
        }
      }
      
      await storage.setSetting("manager_permissions", JSON.stringify(permissions));
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Manager Permissions Save] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Get SMTP settings (without password)
  app.get("/api/admin/smtp/settings", async (req, res) => {
    try {
      const settingValue = await storage.getSetting("smtp_settings");
      if (!settingValue) {
        return res.json({ configured: false });
      }
      
      const settings = JSON.parse(settingValue);
      // Don't return the password, but indicate if one is set
      res.json({
        configured: true,
        host: settings.host,
        port: settings.port,
        username: settings.username,
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
        useSsl: settings.useSsl,
        hasPassword: !!settings.password
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Send test email
  app.post("/api/admin/smtp/send-test", async (req, res) => {
    try {
      const { toEmail, actorId } = req.body;
      
      if (!actorId) {
        return res.status(401).json({ error: "Actor ID is required" });
      }
      
      const actor = await storage.getUser(actorId);
      if (!actor || actor.role !== "admin") {
        return res.status(403).json({ error: "Only admin can send test emails" });
      }
      
      if (!toEmail) {
        return res.status(400).json({ error: "Email address is required" });
      }
      
      console.log(`[Email Test] Sending test email to ${toEmail}`);
      
      const result = await sendEmail({
        to: toEmail,
        subject: "QuoteUs.ca - Test Email",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Email Test Successful!</h2>
            <p>This is a test email from QuoteUs.ca to verify your SMTP settings are working correctly.</p>
            <p>If you received this email, your email configuration is properly set up.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">Sent from QuoteUs.ca CRM System</p>
          </div>
        `
      });
      
      if (result) {
        res.json({ success: true, message: "Test email sent successfully!" });
      } else {
        res.status(400).json({ error: "Failed to send test email. Please check your SMTP settings." });
      }
    } catch (error: any) {
      console.error('[Email Test] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Get a setting value
  app.get("/api/admin/settings/:key", async (req, res) => {
    try {
      const value = await storage.getSetting(req.params.key);
      res.json({ value: value || null });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Save a setting value
  app.post("/api/admin/settings/:key", async (req, res) => {
    try {
      const { value, actorId } = req.body;
      
      if (!actorId) {
        return res.status(401).json({ error: "Actor ID is required" });
      }
      
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
        return res.status(403).json({ error: "Only admin/manager can modify settings" });
      }
      
      await storage.setSetting(req.params.key, value, actorId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user balance - accessible by user themselves or admin/manager
  app.get("/api/users/:id/balance", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ balance: user.balance });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user transactions - accessible by user themselves or admin/manager
  app.get("/api/users/:id/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsForUser(req.params.id);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create checkout session for credit purchase
  // Only brokers can purchase credits
  app.post("/api/credits/checkout", async (req, res) => {
    try {
      const { userId, amount } = req.body;
      
      if (!userId || !amount) {
        return res.status(400).json({ error: "User ID and amount are required" });
      }
      
      const validAmounts = CREDIT_PACKAGES.map(p => p.amount);
      if (!validAmounts.includes(amount)) {
        return res.status(400).json({ error: "Invalid credit amount. Valid amounts: " + validAmounts.join(", ") });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Only brokers can purchase credits
      if (user.role !== "broker") {
        return res.status(403).json({ error: "Only brokers can purchase credits" });
      }
      
      const stripe = await getUncachableStripeClient();
      
      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId: user.id },
        });
        await storage.updateUser(user.id, { stripeCustomerId: customer.id } as any);
        customerId = customer.id;
      }
      
      // Create checkout session
      const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';
        
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'cad',
            product_data: {
              name: `Lead Credits - $${amount}`,
              description: `Purchase $${amount} in lead credits for QuoteUs.ca`,
            },
            unit_amount: amount * 100, // Convert to cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/broker/credits?success=true&amount=${amount}`,
        cancel_url: `${baseUrl}/broker/credits?canceled=true`,
        metadata: {
          userId: user.id,
          creditAmount: amount.toString(),
          type: 'credit_purchase',
        },
      });
      
      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error('[Checkout] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Handle successful payment (called after Stripe redirects back)
  app.post("/api/credits/confirm", async (req, res) => {
    try {
      const { sessionId, userId } = req.body;
      
      if (!sessionId || !userId) {
        return res.status(400).json({ error: "Session ID and user ID required" });
      }
      
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status !== 'paid') {
        return res.status(400).json({ error: "Payment not completed" });
      }
      
      // Check if already processed
      const metadata = session.metadata;
      if (!metadata?.userId || metadata.userId !== userId) {
        return res.status(400).json({ error: "Invalid session" });
      }
      
      const amount = metadata.creditAmount;
      
      // Credit the user's balance
      const result = await storage.creditBalance(
        userId,
        amount,
        "credit_purchase",
        `Purchased $${amount} in credits via Stripe`,
        { stripePaymentId: session.payment_intent as string }
      );
      
      res.json({ 
        success: true, 
        newBalance: result.user.balance,
        transaction: result.transaction 
      });
    } catch (error: any) {
      console.error('[Credit Confirm] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Manual credit adjustment
  // Only admin/manager can adjust credits
  app.post("/api/admin/credits/adjust", async (req, res) => {
    try {
      const { userId, amount, reason, actorId, actorName } = req.body;
      
      if (!userId || !amount || !reason) {
        return res.status(400).json({ error: "User ID, amount, and reason are required" });
      }
      
      // Require actor ID for authorization
      if (!actorId) {
        return res.status(401).json({ error: "Actor ID is required for authentication" });
      }
      
      // Verify actor is admin/manager
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
        return res.status(403).json({ error: "Only admin/manager can adjust credits" });
      }
      
      // Check manager permissions
      if (actor.role === "manager") {
        const hasPermission = await checkPermission(actorId, "adjustBalances");
        if (!hasPermission) {
          return res.status(403).json({ error: "You don't have permission to adjust credit balances" });
        }
      }
      
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount)) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      
      const type = numAmount >= 0 ? "manual_credit" : "adjustment";
      const result = await storage.creditBalance(
        userId,
        Math.abs(numAmount).toFixed(2),
        type,
        `Manual ${numAmount >= 0 ? 'credit' : 'debit'}: ${reason}`,
        { actorId, actorName, reason }
      );
      
      res.json({ 
        success: true, 
        newBalance: result.user.balance,
        transaction: result.transaction 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all transactions (admin)
  app.get("/api/admin/transactions", async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Update broker lead cost override
  // Only admin/manager can update broker lead costs
  app.post("/api/admin/broker-lead-cost", async (req, res) => {
    try {
      const { brokerId, leadCost, actorId } = req.body;
      
      if (!brokerId) {
        return res.status(400).json({ error: "Broker ID is required" });
      }
      
      // Require actor ID for authorization
      if (!actorId) {
        return res.status(401).json({ error: "Actor ID is required for authentication" });
      }
      
      // Verify actor is admin/manager
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
        return res.status(403).json({ error: "Only admin/manager can update broker lead costs" });
      }
      
      // Verify target is a broker
      const broker = await storage.getUser(brokerId);
      if (!broker) {
        return res.status(404).json({ error: "Broker not found" });
      }
      if (broker.role !== "broker") {
        return res.status(400).json({ error: "Can only set lead costs for brokers" });
      }
      
      // Validate lead cost (null to clear, or a number >= 0)
      let costValue: string | null = null;
      if (leadCost !== null && leadCost !== undefined && leadCost !== "") {
        const numCost = parseFloat(leadCost);
        if (isNaN(numCost) || numCost < 0) {
          return res.status(400).json({ error: "Lead cost must be $0 or higher" });
        }
        costValue = numCost.toFixed(2);
      }
      
      // Update broker's lead cost override
      const updatedUser = await storage.updateUser(brokerId, { 
        leadCostOverride: costValue 
      } as any);
      
      res.json({ 
        success: true, 
        broker: updatedUser 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Broker Profile: Update tier, preferred insurance types, demographics
  app.post("/api/admin/broker-profile", async (req, res) => {
    try {
      const { brokerId, brokerTier, preferredInsuranceTypes, preferredDemographics, actorId } = req.body;
      if (!actorId) return res.status(401).json({ error: "Actor ID is required" });
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
        return res.status(403).json({ error: "Only admin/manager can update broker profiles" });
      }
      if (!brokerId) return res.status(400).json({ error: "Broker ID is required" });
      const broker = await storage.getUser(brokerId);
      if (!broker || broker.role !== "broker") {
        return res.status(404).json({ error: "Broker not found" });
      }
      const updateData: any = {};
      if (brokerTier !== undefined) updateData.brokerTier = brokerTier || null;
      if (preferredInsuranceTypes !== undefined) updateData.preferredInsuranceTypes = preferredInsuranceTypes;
      if (preferredDemographics !== undefined) updateData.preferredDemographics = preferredDemographics;
      const updated = await storage.updateUser(brokerId, updateData);
      res.json({ success: true, broker: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Broker Notes: Get notes for a broker (admin/manager only)
  app.get("/api/admin/broker-notes/:brokerId", async (req, res) => {
    try {
      const { brokerId } = req.params;
      const actorId = req.query.actorId as string;
      if (!actorId) return res.status(401).json({ error: "Actor ID is required" });
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
        return res.status(403).json({ error: "Only admin/manager can view broker notes" });
      }
      const notes = await storage.getBrokerNotes(brokerId);
      res.json(notes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Broker Notes: Add a note (admin/manager only)
  app.post("/api/admin/broker-notes", async (req, res) => {
    try {
      const { brokerId, content, actorId, authorName } = req.body;
      if (!actorId) return res.status(401).json({ error: "Actor ID is required" });
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
        return res.status(403).json({ error: "Only admin/manager can add broker notes" });
      }
      if (!brokerId || !content) {
        return res.status(400).json({ error: "Broker ID and content are required" });
      }
      const note = await storage.createBrokerNote({
        brokerId,
        authorId: actorId,
        authorName: authorName || actor.name,
        content,
      });
      res.json(note);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Broker Notes: Delete a note (admin/manager only)
  app.delete("/api/admin/broker-notes/:noteId", async (req, res) => {
    try {
      const { noteId } = req.params;
      const actorId = req.query.actorId as string;
      if (!actorId) return res.status(401).json({ error: "Actor ID is required" });
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
        return res.status(403).json({ error: "Only admin/manager can delete broker notes" });
      }
      const deleted = await storage.deleteBrokerNote(noteId);
      res.json({ success: deleted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Broker Stats: Get win rate and lead performance (admin/manager only)
  app.get("/api/admin/broker-stats/:brokerId", async (req, res) => {
    try {
      const { brokerId } = req.params;
      const actorId = req.query.actorId as string;
      if (!actorId) return res.status(401).json({ error: "Actor ID is required" });
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
        return res.status(403).json({ error: "Only admin/manager can view broker stats" });
      }
      const allQuotes = await storage.getAllQuotes();
      const brokerQuotes = allQuotes.filter(q => q.assignedTo === brokerId);
      const totalAssigned = brokerQuotes.length;
      const bound = brokerQuotes.filter(q => q.status === "Bound").length;
      const quoted = brokerQuotes.filter(q => q.status === "Quoted").length;
      const lost = brokerQuotes.filter(q => q.status === "Lost").length;
      const closed = brokerQuotes.filter(q => q.status === "Closed").length;
      const contacted = brokerQuotes.filter(q => q.status === "Contacted").length;
      const followUp = brokerQuotes.filter(q => q.status === "Follow-Up").length;
      const newLeads = brokerQuotes.filter(q => q.status === "New").length;
      const winRate = totalAssigned > 0 ? ((bound / totalAssigned) * 100).toFixed(1) : "0.0";
      const byType: Record<string, number> = {};
      brokerQuotes.forEach(q => {
        byType[q.type] = (byType[q.type] || 0) + 1;
      });
      res.json({
        totalAssigned,
        bound,
        quoted,
        lost,
        closed,
        contacted,
        followUp,
        newLeads,
        winRate,
        byType,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Assign lead to broker (with balance deduction)
  // Only admin/manager can assign leads
  app.post("/api/leads/assign", async (req, res) => {
    try {
      const { quoteId, brokerId, actorId, actorName } = req.body;
      
      if (!quoteId || !brokerId) {
        return res.status(400).json({ error: "Quote ID and broker ID are required" });
      }
      
      // Require actor ID for authorization
      if (!actorId) {
        return res.status(401).json({ error: "Actor ID is required for authentication" });
      }
      
      // Verify actor has permission to assign leads
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
        return res.status(403).json({ error: "Only admin/manager can assign leads" });
      }
      
      // Check manager permissions
      if (actor.role === "manager") {
        const hasPermission = await checkPermission(actorId, "assignLeads");
        if (!hasPermission) {
          return res.status(403).json({ error: "You don't have permission to assign leads" });
        }
      }
      
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      // IDEMPOTENCY CHECK: Prevent double-deduction if already assigned to this broker
      if (quote.assignedTo === brokerId) {
        return res.json({ 
          success: true, 
          message: "Lead already assigned to this broker",
          newBalance: (await storage.getUser(brokerId))?.balance,
          leadCost: 0,
          alreadyAssigned: true
        });
      }
      
      // Get current lead costs from database
      const currentLeadCosts = await getLeadCosts();
      
      // Validate lead type
      const validTypes = Object.keys(currentLeadCosts);
      if (!validTypes.includes(quote.type)) {
        return res.status(400).json({ error: "Invalid lead type" });
      }
      
      const broker = await storage.getUser(brokerId);
      if (!broker) {
        return res.status(404).json({ error: "Broker not found" });
      }
      
      // Verify target is a broker
      if (broker.role !== "broker") {
        return res.status(400).json({ error: "Can only assign leads to brokers" });
      }
      
      // Check if broker is paused
      if (broker.status === "paused") {
        return res.status(400).json({ error: "Cannot assign leads to paused brokers" });
      }
      
      // Check if broker is in an active pause period
      const now = new Date();
      if (broker.pauseStartDate && broker.pauseEndDate) {
        const startDate = new Date(broker.pauseStartDate);
        const endDate = new Date(broker.pauseEndDate);
        if (now >= startDate && now <= endDate) {
          return res.status(400).json({ error: "Cannot assign leads to brokers during their pause period" });
        }
      } else if (broker.pauseStartDate && !broker.pauseEndDate) {
        const startDate = new Date(broker.pauseStartDate);
        if (now >= startDate) {
          return res.status(400).json({ error: "Cannot assign leads to paused brokers" });
        }
      }
      
      // Get lead cost - use broker's override if set, otherwise default
      const defaultCost = currentLeadCosts[quote.type] || currentLeadCosts["General"];
      const leadCost = broker.leadCostOverride !== null && broker.leadCostOverride !== undefined
        ? parseFloat(broker.leadCostOverride)
        : defaultCost;
      
      // Deduct from broker's balance
      const debitResult = await storage.debitBalance(
        brokerId,
        leadCost.toFixed(2),
        `Lead assigned: ${quote.type} - ${quote.clientName} (${quote.quoteNumber})`,
        { quoteId, actorId, actorName }
      );
      
      if (!debitResult) {
        return res.status(400).json({ 
          error: "Insufficient balance", 
          required: leadCost,
          currentBalance: broker.balance 
        });
      }
      
      // Update quote assignment - SERVER IS THE AUTHORITATIVE SOURCE
      const updatedQuote = await storage.updateQuote(quoteId, { assignedTo: brokerId } as any);
      
      // Create activity
      await storage.createActivity({
        quoteId,
        type: "assignment",
        content: `Lead assigned to ${broker.name} ($${leadCost} deducted)`,
        author: actorName || "System",
      });
      
      // Send assignment email
      if (broker.email) {
        const assignmentEmail = generateAssignmentEmail({
          brokerName: broker.name,
          clientName: quote.clientName,
          type: quote.type,
          email: quote.email || '',
          phone: quote.phone || undefined,
          assignedBy: actorName || 'Admin'
        });
        sendEmail({
          to: broker.email,
          subject: assignmentEmail.subject,
          html: assignmentEmail.html
        }).catch(err => console.error('[Email] Assignment notification error:', err));
      }
      
      res.json({ 
        success: true, 
        newBalance: debitResult.user.balance,
        transaction: debitResult.transaction,
        leadCost,
        quote: updatedQuote
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== ADVERTISEMENT ROUTES ==========
  
  // Get all advertisements (admin)
  app.get("/api/admin/advertisements", async (req, res) => {
    try {
      const ads = await storage.getAllAdvertisements();
      res.json(ads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single advertisement
  app.get("/api/admin/advertisements/:id", async (req, res) => {
    try {
      const ad = await storage.getAdvertisement(req.params.id);
      if (!ad) {
        return res.status(404).json({ error: "Advertisement not found" });
      }
      res.json(ad);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create advertisement
  app.post("/api/admin/advertisements", async (req, res) => {
    try {
      const { name, mediaType, mediaUrl, linkUrl, openInPopup, targetPages, status, startDate, endDate, priority, createdBy } = req.body;
      
      if (!name || !mediaUrl) {
        return res.status(400).json({ error: "Name and media URL are required" });
      }
      
      const ad = await storage.createAdvertisement({
        name,
        mediaType: mediaType || "image",
        mediaUrl,
        linkUrl: linkUrl || null,
        openInPopup: openInPopup || false,
        targetPages: targetPages || [],
        status: status || "active",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        priority: priority || 1,
        createdBy: createdBy || null,
      });
      
      res.status(201).json(ad);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update advertisement
  app.patch("/api/admin/advertisements/:id", async (req, res) => {
    try {
      const updates: any = {};
      const fields = ["name", "mediaType", "mediaUrl", "linkUrl", "openInPopup", "targetPages", "status", "startDate", "endDate", "priority"];
      
      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === "startDate" || field === "endDate") {
            updates[field] = req.body[field] ? new Date(req.body[field]) : null;
          } else {
            updates[field] = req.body[field];
          }
        }
      });
      
      const ad = await storage.updateAdvertisement(req.params.id, updates);
      if (!ad) {
        return res.status(404).json({ error: "Advertisement not found" });
      }
      res.json(ad);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete advertisement
  app.delete("/api/admin/advertisements/:id", async (req, res) => {
    try {
      await storage.deleteAdvertisement(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Public: Get active ads for a page
  app.get("/api/ads/:page", async (req, res) => {
    try {
      const ads = await storage.getActiveAdsForPage(req.params.page);
      res.json(ads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Track ad impression
  app.post("/api/ads/:id/impression", async (req, res) => {
    try {
      await storage.incrementAdImpression(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Track ad click
  app.post("/api/ads/:id/click", async (req, res) => {
    try {
      await storage.incrementAdClick(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // File upload for advertisements
  app.post("/api/admin/advertisements/upload", adUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl, filename: req.file.filename });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get ad by preview token (public - for customer approval)
  app.get("/api/advertisements/preview/:token", async (req, res) => {
    try {
      const ad = await storage.getAdvertisementByPreviewToken(req.params.token);
      if (!ad) {
        return res.status(404).json({ error: "Advertisement not found" });
      }
      res.json(ad);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update ad approval status (public - for customer approval)
  app.post("/api/advertisements/preview/:token/approve", async (req, res) => {
    try {
      const { approved } = req.body;
      const ad = await storage.getAdvertisementByPreviewToken(req.params.token);
      if (!ad) {
        return res.status(404).json({ error: "Advertisement not found" });
      }
      
      const updatedAd = await storage.updateAdvertisement(ad.id, {
        approvalStatus: approved ? "approved" : "rejected",
        status: approved ? "active" : "paused",
      });
      
      res.json(updatedAd);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get ads per slot setting (public)
  app.get("/api/settings/ads-per-slot", async (req, res) => {
    try {
      const value = await storage.getSetting("ads_per_slot");
      const parsed = value ? parseInt(value) : 1;
      const clamped = isNaN(parsed) ? 1 : Math.max(1, Math.min(3, parsed));
      res.json({ value: clamped });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get social media settings (public)
  app.get("/api/settings/social-media", async (req, res) => {
    try {
      const value = await storage.getSetting("social_media");
      if (value) {
        res.json(JSON.parse(value));
      } else {
        res.json({
          facebook: "https://www.facebook.com/people/QuoteUsca/100064074608534/",
          instagram: "https://www.instagram.com/quoteus.ca/",
          twitter: "",
          linkedin: "",
          youtube: "",
          tiktok: "",
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get custom CSS (public)
  app.get("/api/settings/custom-css", async (req, res) => {
    try {
      const value = await storage.getSetting("custom_css");
      res.json({ value: value || "" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get active ad(s) for page (used by AdPlacement component)
  app.get("/api/advertisements/active", async (req, res) => {
    try {
      const page = req.query.page as string;
      const limit = parseInt(req.query.limit as string) || 1;
      if (!page) {
        return res.status(400).json({ error: "Page parameter required" });
      }
      const ads = await storage.getActiveAdsForPage(page);
      if (ads.length === 0) {
        return res.json(limit === 1 ? null : []);
      }
      // Return multiple ads based on limit or single ad for backwards compatibility
      if (limit === 1) {
        res.json(ads[0]);
      } else {
        res.json(ads.slice(0, Math.min(limit, 3)));
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Track impression for ad
  app.post("/api/advertisements/:id/impression", async (req, res) => {
    try {
      await storage.incrementAdImpression(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Track click for ad
  app.post("/api/advertisements/:id/click", async (req, res) => {
    try {
      await storage.incrementAdClick(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== PARTNER REDIRECTS ==============
  
  // Get all partner redirects (admin only)
  app.get("/api/admin/redirects", async (req, res) => {
    try {
      const redirects = await storage.getAllPartnerRedirects();
      res.json(redirects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create partner redirect (admin only)
  app.post("/api/admin/redirects", async (req, res) => {
    try {
      const { quoteType, redirectUrl, isActive, description } = req.body;
      if (!quoteType || !redirectUrl) {
        return res.status(400).json({ error: "Quote type and redirect URL are required" });
      }
      const redirect = await storage.createPartnerRedirect({
        quoteType,
        redirectUrl,
        isActive: isActive !== false,
        description: description || null,
      });
      res.json(redirect);
    } catch (error: any) {
      if (error.message?.includes("unique constraint")) {
        return res.status(400).json({ error: "A redirect for this quote type already exists" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Update partner redirect (admin only)
  app.put("/api/admin/redirects/:id", async (req, res) => {
    try {
      const redirect = await storage.updatePartnerRedirect(req.params.id, req.body);
      if (!redirect) {
        return res.status(404).json({ error: "Redirect not found" });
      }
      res.json(redirect);
    } catch (error: any) {
      if (error.message?.includes("unique constraint")) {
        return res.status(400).json({ error: "A redirect for this quote type already exists" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Delete partner redirect (admin only)
  app.delete("/api/admin/redirects/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePartnerRedirect(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Redirect not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/email-report", async (req, res) => {
    try {
      const { subject, body, to, actorId } = req.body;
      if (!actorId) {
        return res.status(401).json({ error: "Actor ID is required for authentication" });
      }
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
        return res.status(403).json({ error: "Only admin/manager can send reports" });
      }
      if (!subject || !body || !to) {
        return res.status(400).json({ error: "Missing required fields: subject, body, to" });
      }
      const html = `<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">QuoteUs.ca Report</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">${subject}</p>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.6; color: #334155;">${body}</pre>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">Generated by QuoteUs.ca on ${new Date().toLocaleDateString()}</p>
        </div>
      </div>`;
      const sent = await sendEmail({ to, subject, html });
      if (sent) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to send email. Check SMTP configuration." });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Public: Get redirect URL for a quote type (used after quote submission)
  app.get("/api/redirects/:quoteType", async (req, res) => {
    try {
      const redirect = await storage.getPartnerRedirectByQuoteType(req.params.quoteType);
      if (!redirect) {
        return res.json({ redirectUrl: null });
      }
      res.json({ redirectUrl: redirect.redirectUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
