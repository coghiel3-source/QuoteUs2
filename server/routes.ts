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
import bcrypt from "bcryptjs";

function safeUser(user: any): any {
  if (!user) return user;
  const { password, resetToken, resetTokenExpiry, ...safe } = user;
  return safe;
}

function safeUsers(users: any[]): any[] {
  return users.map(safeUser);
}

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

const binderUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const binderDir = path.join(uploadDir, "binders");
    if (!fs.existsSync(binderDir)) {
      fs.mkdirSync(binderDir, { recursive: true });
    }
    cb(null, binderDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `binder-${uniqueSuffix}${ext}`);
  },
});

const binderUpload = multer({
  storage: binderUploadStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error("Only PDF, Word documents, and image files are allowed"));
  },
});

const repDocUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const repDocDir = path.join(uploadDir, "rep-docs");
    if (!fs.existsSync(repDocDir)) {
      fs.mkdirSync(repDocDir, { recursive: true });
    }
    cb(null, repDocDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const repDocUpload = multer({
  storage: repDocUploadStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|heic|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) return cb(null, true);
    cb(new Error("Only PDF, Word, and image files are allowed"));
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
  "Mortgage": 10,
  "Rent Guarantee": 8,
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
  
  // Login (checks email + password)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, role, password } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (role && user.role !== role) {
        return res.status(403).json({ error: "Invalid role" });
      }

      if (password && user.password) {
        const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
        if (isHashed) {
          const valid = await bcrypt.compare(password, user.password);
          if (!valid) {
            return res.status(401).json({ error: "Invalid password" });
          }
        } else {
          if (password !== user.password) {
            return res.status(401).json({ error: "Invalid password" });
          }
        }
      }
      
      res.json(safeUser(user));
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
      
      // Update password (hashed) and clear token
      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updatePassword(user.id, hashedPassword);
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
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      if (userData.role === "partner" && userData.status === "active" && !userData.partnerAccountNumber) {
        userData.partnerAccountNumber = await storage.getNextPartnerAccountNumber();
      }
      const user = await storage.createUser(userData);
      res.status(201).json(safeUser(user));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      if (error.message?.includes("duplicate key") || error.message?.includes("unique constraint")) {
        const existingUsers = await storage.getAllUsers();
        const existing = existingUsers.find((u: any) => u.email === req.body.email);
        if (existing) {
          return res.status(200).json(safeUser(existing));
        }
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(safeUsers(users));
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
      res.json(safeUser(user));
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
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
        return res.status(403).json({ error: "Only admin/manager can update users" });
      }
      
      // Check manager permissions
      if (actor.role === "manager" || actor.role === "partner") {
        const hasPermission = await checkPermission(actorId, "manageBrokers");
        if (!hasPermission) {
          return res.status(403).json({ error: "You don't have permission to manage brokers" });
        }
      }
      
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }
      // Auto-assign partner account number when a partner is approved/activated
      if (updateData.status === "active") {
        const targetUser = await storage.getUser(req.params.id);
        if (targetUser && targetUser.role === "partner" && !targetUser.partnerAccountNumber) {
          updateData.partnerAccountNumber = await storage.getNextPartnerAccountNumber();
        }
      }
      const user = await storage.updateUser(req.params.id, updateData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(safeUser(user));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update rep RG permissions
  app.patch("/api/admin/users/:id/rg-permissions", async (req, res) => {
    try {
      const { actorId, rgPermissions, viewCommission } = req.body;
      if (!actorId) return res.status(401).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId);
      if (!actor || !["admin", "manager", "partner"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      const target = await storage.getUser(req.params.id);
      if (!target) return res.status(404).json({ error: "User not found" });
      if (target.role !== "rep") return res.status(400).json({ error: "Only rep users have RG permissions" });
      const existingPerms = (target.permissions as any) || {};
      const permUpdates: any = { ...existingPerms, rg: rgPermissions };
      if (viewCommission !== undefined) permUpdates.viewCommission = viewCommission;
      const updated = await storage.updateUser(req.params.id, { permissions: permUpdates } as any);
      res.json(safeUser(updated));
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

      // Auto-assign if referenceId matches a broker or referral partner
      let finalQuote = quote;
      if (quote.referenceId) {
        const allUsers = await storage.getAllUsers();
        const matchingBroker = allUsers.find(
          (u) => u.role === "broker" && u.status === "active" && u.referenceId && u.referenceId.toUpperCase() === quote.referenceId!.toUpperCase()
        );
        if (matchingBroker) {
          const updated = await storage.updateQuote(quote.id, { assignedTo: matchingBroker.id, assignedAt: new Date() } as any);
          if (updated) finalQuote = updated;
          await storage.createActivity({
            quoteId: quote.id,
            type: "assignment",
            content: `Lead auto-assigned to ${matchingBroker.name} via Reference ID ${quote.referenceId}`,
            author: "System",
          });
        } else {
          const matchingPartner = await storage.getReferralPartnerByReferenceId(quote.referenceId);
          if (matchingPartner && matchingPartner.status === "active") {
            await storage.createActivity({
              quoteId: quote.id,
              type: "system",
              content: `Lead linked to referral partner ${matchingPartner.contactName} via Reference ID ${matchingPartner.referenceId}`,
              author: "System",
            });
          }
        }
      }
      
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
      
      res.status(201).json(finalQuote);
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
  
  // ===== BINDER MANAGEMENT =====

  app.post("/api/leads/:id/request-binder", async (req, res) => {
    try {
      const { actorId } = req.body;
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== 'admin' && actor.role !== 'manager' && actor.role !== 'partner')) {
        return res.status(403).json({ error: "Only admin/manager can request binders" });
      }
      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ error: "Lead not found" });

      await storage.updateQuote(req.params.id, { binderRequired: true });
      await storage.createActivity({
        quoteId: req.params.id,
        type: "system",
        content: "Binder/confirmation of insurance requested before closing",
        author: actor.name,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/leads/:id/remove-binder-request", async (req, res) => {
    try {
      const { actorId } = req.body;
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== 'admin' && actor.role !== 'manager' && actor.role !== 'partner')) {
        return res.status(403).json({ error: "Only admin/manager can remove binder requests" });
      }

      await storage.updateQuote(req.params.id, { binderRequired: false });
      await storage.createActivity({
        quoteId: req.params.id,
        type: "system",
        content: "Binder requirement removed",
        author: actor.name,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/leads/:id/upload-binder", binderUpload.single("binder"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const { actorId } = req.body;
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });

      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ error: "Lead not found" });

      const binderUrl = `/uploads/binders/${req.file.filename}`;
      const binderUploadedAt = new Date();
      const actor = await storage.getUser(actorId);

      const existingDocs = (quote as any).binderDocuments || [];
      const newDoc = {
        url: binderUrl,
        filename: req.file.originalname,
        uploadedAt: binderUploadedAt.toISOString(),
        uploadedBy: actor?.name || "Broker",
      };
      const updatedDocs = [...existingDocs, newDoc];

      await storage.updateQuote(req.params.id, {
        binderUrl,
        binderUploadedAt,
        binderDocuments: updatedDocs,
      });

      await storage.createActivity({
        quoteId: req.params.id,
        type: "system",
        content: `Binder/confirmation of insurance uploaded: ${req.file.originalname}`,
        author: actor?.name || "Broker",
      });

      res.json({ success: true, binderUrl, binderUploadedAt: binderUploadedAt.toISOString(), binderDocuments: updatedDocs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/leads/:id/email-binder", async (req, res) => {
    try {
      const { actorId, to, binderUrl, binderFilename } = req.body;
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });
      if (!to || !binderUrl) return res.status(400).json({ error: "Missing required fields (to, binderUrl)" });

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) return res.status(400).json({ error: "Invalid email address" });

      const actor = await storage.getUser(actorId);
      if (!actor) return res.status(403).json({ error: "User not found" });

      if (!['admin', 'manager', 'broker'].includes(actor.role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ error: "Lead not found" });

      if (actor.role === 'broker' && quote.assignedTo !== actor.id) {
        return res.status(403).json({ error: "Not authorized for this lead" });
      }

      const docs = Array.isArray(quote.binderDocuments) ? quote.binderDocuments as Array<{url: string}> : [];
      const legacyUrl = quote.binderUrl;
      const validUrls = [...docs.map(d => d.url), ...(legacyUrl ? [legacyUrl] : [])];
      if (!validUrls.includes(binderUrl)) {
        return res.status(400).json({ error: "Invalid binder document URL" });
      }

      const fullUrl = `${req.protocol}://${req.get('host')}${binderUrl}`;
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const safeClientName = esc(quote.clientName || '');
      const safeFilename = esc(binderFilename || 'Binder Document');
      const safeType = esc(quote.type || '');
      const safeActorName = esc(actor.name || '');
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">QuoteUs.ca</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #1f2937;">Binder / Confirmation of Insurance</h2>
            <p style="color: #4b5563;">Please find the attached binder document for <strong>${safeClientName}</strong>.</p>
            <p style="color: #4b5563;"><strong>Document:</strong> ${safeFilename}</p>
            <p style="color: #4b5563;"><strong>Insurance Type:</strong> ${safeType}</p>
            <div style="margin: 20px 0;">
              <a href="${fullUrl}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View / Download Binder</a>
            </div>
            <p style="color: #4b5563; font-size: 14px; margin-top: 30px;">
              Best regards,<br>
              <strong>${safeActorName}</strong><br>
              QuoteUs.ca
            </p>
          </div>
          <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>QuoteUs.ca - Your Trusted Insurance Partner</p>
          </div>
        </div>
      `;

      const sent = await sendEmail({
        to,
        subject: `Binder - ${quote.clientName} (${quote.type} Insurance)`,
        html: emailHtml,
      });

      await storage.createActivity({
        quoteId: req.params.id,
        type: "email_sent",
        content: sent ? `Binder emailed to ${to}: ${binderFilename || 'Binder Document'}` : `Binder email logged (SMTP not configured) to ${to}: ${binderFilename || 'Binder Document'}`,
        author: actor.name,
      });

      res.json({ success: true, delivered: !!sent });
    } catch (error: any) {
      console.error('[Email] Send binder error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/leads/:id/send-email", async (req, res) => {
    try {
      const { actorId, to, subject, body: emailBodyText } = req.body;
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });
      if (!to || !subject || !emailBodyText) return res.status(400).json({ error: "Missing required fields (to, subject, body)" });

      const actor = await storage.getUser(actorId);
      if (!actor) return res.status(403).json({ error: "User not found" });

      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ error: "Lead not found" });

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">QuoteUs.ca</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <p style="color: #4b5563; white-space: pre-wrap;">${emailBodyText}</p>
            <p style="color: #4b5563; font-size: 14px; margin-top: 30px;">
              Best regards,<br>
              <strong>${actor.name}</strong><br>
              QuoteUs.ca
            </p>
          </div>
          <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>QuoteUs.ca - Your Trusted Insurance Partner</p>
          </div>
        </div>
      `;

      const sent = await sendEmail({ to, subject, html: emailHtml });

      await storage.createActivity({
        quoteId: req.params.id,
        type: "email_sent",
        content: sent ? `Email sent to ${to}: "${subject}"` : `Email logged (SMTP not configured) to ${to}: "${subject}"`,
        author: actor.name,
      });

      res.json({ success: true, delivered: !!sent });
    } catch (error: any) {
      console.error('[Email] Send from lead error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== REFERRAL PARTNERS ROUTES =====

  app.get("/api/referral-partners", async (req, res) => {
    try {
      const partners = await storage.getAllReferralPartners();
      res.json(partners);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/referral-partners/generate-id/:province", async (req, res) => {
    try {
      const validProvinces = ["ON", "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "PE", "QC", "SK", "YT"];
      const province = req.params.province.toUpperCase();
      if (!validProvinces.includes(province)) {
        return res.status(400).json({ error: "Invalid province code" });
      }
      const referenceId = await storage.getNextReferenceIdForProvince(province);
      res.json({ referenceId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/referral-partners/:id", async (req, res) => {
    try {
      const partner = await storage.getReferralPartner(req.params.id);
      if (!partner) return res.status(404).json({ error: "Partner not found" });
      res.json(partner);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/referral-partners", async (req, res) => {
    try {
      const { actorId, contactName, email, phone, address, province, businessDescription, relationships } = req.body;
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });

      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
        return res.status(403).json({ error: "Only admin or manager can create referral partners" });
      }

      if (!contactName || !email || !province) {
        return res.status(400).json({ error: "Contact name, email, and province are required" });
      }

      const validProvinces = ["ON", "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "PE", "QC", "SK", "YT"];
      const upperProvince = province.toUpperCase();
      if (!validProvinces.includes(upperProvince)) {
        return res.status(400).json({ error: "Invalid province code" });
      }

      const referenceId = await storage.getNextReferenceIdForProvince(upperProvince);

      const partner = await storage.createReferralPartner({
        contactName,
        email,
        phone: phone || null,
        address: address || null,
        province: upperProvince,
        businessDescription: businessDescription || null,
        relationships: relationships || null,
        referenceId,
        status: "active",
        createdBy: actorId,
      });

      res.json(partner);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/referral-partners/:id", async (req, res) => {
    try {
      const { actorId, ...data } = req.body;
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });

      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
        return res.status(403).json({ error: "Only admin or manager can update referral partners" });
      }

      const existing = await storage.getReferralPartner(req.params.id);
      if (!existing) return res.status(404).json({ error: "Partner not found" });

      const { referenceId, createdBy, ...updateData } = data;
      const partner = await storage.updateReferralPartner(req.params.id, updateData);
      res.json(partner);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/referral-partners/:id", async (req, res) => {
    try {
      const { actorId } = req.body;
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });

      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
        return res.status(403).json({ error: "Only admin or manager can delete referral partners" });
      }

      const deleted = await storage.deleteReferralPartner(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Partner not found" });
      res.json({ success: true });
    } catch (error: any) {
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

  // Get global RG rates
  app.get("/api/credits/rg-rates", async (req, res) => {
    const stored = await storage.getSetting("rg_rates");
    if (stored) {
      try { return res.json(JSON.parse(stored)); } catch {}
    }
    res.json({ annualRate: 6.5, monthlyRate: 7 });
  });

  // Admin: Get province-specific RG rates
  app.get("/api/admin/rg-province-rates", async (req, res) => {
    try {
      const stored = await storage.getSetting("rg_province_rates");
      res.json(stored ? JSON.parse(stored) : {});
    } catch { res.json({}); }
  });

  // Admin: Save province-specific RG rates
  app.post("/api/admin/rg-province-rates", async (req, res) => {
    try {
      const { actorId, rates } = req.body;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId);
      if (!actor || !["admin", "manager", "partner"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      await storage.setSetting("rg_province_rates", JSON.stringify(rates), actorId);
      res.json({ success: true, rates });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Update global RG rates
  app.post("/api/admin/rg-rates", async (req, res) => {
    try {
      const { annualRate, monthlyRate, actorId } = req.body;
      if (!actorId) return res.status(401).json({ error: "Actor ID required" });
      const actor = await storage.getUser(actorId);
      if (!actor) return res.status(403).json({ error: "User not found" });
      if (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner") {
        return res.status(403).json({ error: "Only admin/manager can update RG rates" });
      }
      const annual = parseFloat(annualRate);
      const monthly = parseFloat(monthlyRate);
      if (isNaN(annual) || annual < 0 || isNaN(monthly) || monthly < 0) {
        return res.status(400).json({ error: "Rates must be non-negative numbers" });
      }
      await storage.setSetting("rg_rates", JSON.stringify({ annualRate: annual, monthlyRate: monthly }), actorId);
      res.json({ success: true, annualRate: annual, monthlyRate: monthly });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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
      if (actor.role === "manager" || actor.role === "partner") {
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
    if (user.role === 'manager' || user.role === 'partner') {
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
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
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
      const { userId, amount, returnPath } = req.body;
      
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
      
      // Only brokers and reps can purchase credits
      if (user.role !== "broker" && user.role !== "rep") {
        return res.status(403).json({ error: "Only brokers and reps can purchase credits" });
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
        success_url: `${baseUrl}${returnPath || '/broker/credits'}?success=true&amount=${amount}`,
        cancel_url: `${baseUrl}${returnPath || '/broker/credits'}?canceled=true`,
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
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
        return res.status(403).json({ error: "Only admin/manager can adjust credits" });
      }
      
      // Check manager permissions
      if (actor.role === "manager" || actor.role === "partner") {
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
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
        return res.status(403).json({ error: "Only admin/manager can update broker lead costs" });
      }
      
      // Verify target is a broker or rep
      const broker = await storage.getUser(brokerId);
      if (!broker) {
        return res.status(404).json({ error: "User not found" });
      }
      if (!["broker", "rep"].includes(broker.role)) {
        return res.status(400).json({ error: "Can only set lead costs for brokers or reps" });
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
        broker: safeUser(updatedUser) 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Broker Profile: Update tier, preferred insurance types, demographics
  app.post("/api/admin/broker-profile", async (req, res) => {
    try {
      const { brokerId, brokerTier, preferredInsuranceTypes, preferredDemographics, referenceId, actorId } = req.body;
      if (!actorId) return res.status(401).json({ error: "Actor ID is required" });
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
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
      if (referenceId !== undefined) {
        if (referenceId !== null) {
          const normalizedRefId = String(referenceId).toUpperCase().trim();
          if (!/^[A-Z0-9]{1,6}$/.test(normalizedRefId)) {
            return res.status(400).json({ error: "Reference ID must be 1-6 alphanumeric characters" });
          }
          const allUsers = await storage.getAllUsers();
          const existingHolder = allUsers.find(u => u.referenceId && u.referenceId.toUpperCase() === normalizedRefId && u.id !== brokerId);
          if (existingHolder) {
            return res.status(409).json({ error: `Reference ID "${normalizedRefId}" is already assigned to ${existingHolder.name}` });
          }
          updateData.referenceId = normalizedRefId;
        } else {
          updateData.referenceId = null;
        }
      }
      const updated = await storage.updateUser(brokerId, updateData);
      res.json({ success: true, broker: safeUser(updated) });
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
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
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
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
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
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
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
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
        return res.status(403).json({ error: "Only admin/manager can view broker stats" });
      }
      const allQuotes = await storage.getAllQuotes();
      const brokerQuotes = allQuotes.filter(q => q.assignedTo === brokerId);
      const totalAssigned = brokerQuotes.length;
      const bound = brokerQuotes.filter(q => q.status === "Bound").length;
      const win = brokerQuotes.filter(q => q.status === "Win").length;
      const lose = brokerQuotes.filter(q => q.status === "Lose").length;
      const quoted = brokerQuotes.filter(q => q.status === "Quoted").length;
      const lost = brokerQuotes.filter(q => q.status === "Lost").length;
      const closed = brokerQuotes.filter(q => q.status === "Closed").length;
      const contacted = brokerQuotes.filter(q => q.status === "Contacted").length;
      const followUp = brokerQuotes.filter(q => q.status === "Follow-Up").length;
      const newLeads = brokerQuotes.filter(q => q.status === "New").length;
      const totalWins = bound + win;
      const winRate = totalAssigned > 0 ? ((totalWins / totalAssigned) * 100).toFixed(1) : "0.0";
      const byType: Record<string, number> = {};
      brokerQuotes.forEach(q => {
        byType[q.type] = (byType[q.type] || 0) + 1;
      });
      res.json({
        totalAssigned,
        bound,
        win,
        lose,
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
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
        return res.status(403).json({ error: "Only admin/manager can assign leads" });
      }
      
      // Check manager permissions
      if (actor.role === "manager" || actor.role === "partner") {
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
      const defaultCost = currentLeadCosts[quote.type] ?? 0;
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
      const updatedQuote = await storage.updateQuote(quoteId, { assignedTo: brokerId, assignedAt: new Date() } as any);
      
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

  // Assign a lead to a rep (no credit deduction)
  app.post("/api/leads/assign-rep", async (req, res) => {
    try {
      const { quoteId, repId, actorId, actorName } = req.body;
      if (!quoteId || !repId) return res.status(400).json({ error: "Quote ID and rep ID are required" });
      if (!actorId) return res.status(401).json({ error: "Actor ID required" });
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
        return res.status(403).json({ error: "Only admin/manager can assign leads" });
      }
      if (actor.role === "manager" || actor.role === "partner") {
        const hasPerm = await checkPermission(actorId, "assignLeads");
        if (!hasPerm) return res.status(403).json({ error: "No permission to assign leads" });
      }
      const quote = await storage.getQuote(quoteId);
      if (!quote) return res.status(404).json({ error: "Quote not found" });
      const rep = await storage.getUser(repId);
      if (!rep || rep.role !== "rep") return res.status(400).json({ error: "Target user is not a rep" });
      if (quote.assignedTo === repId) {
        return res.json({ success: true, message: "Already assigned to this rep", alreadyAssigned: true });
      }
      await storage.updateQuote(quoteId, { assignedTo: repId, assignedAt: new Date() } as any);
      await storage.createActivity({
        quoteId,
        type: "assignment",
        content: `Lead forwarded to Rep: ${rep.name} (no charge)`,
        author: actorName || "System",
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get leads submitted using this partner's Reference ID (limited fields only)
  app.get("/api/partner/my-referred-leads", async (req, res) => {
    try {
      const { actorId } = req.query as any;
      if (!actorId) return res.status(401).json({ error: "Actor ID required" });
      const actor = await storage.getUser(actorId);
      if (!actor || actor.role !== "partner") {
        return res.status(403).json({ error: "Partner access only" });
      }
      if (!actor.referenceId) return res.json([]);
      const allQuotes = await storage.getQuotes();
      const referred = allQuotes
        .filter(q => q.referenceId && q.referenceId.toUpperCase() === actor.referenceId!.toUpperCase())
        .map(q => ({
          id: q.id,
          quoteNumber: q.quoteNumber,
          type: q.type,
          status: q.status,
          createdAt: q.createdAt,
          postalCode: q.postalCode,
        }));
      res.json(referred);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all quotes assigned to reps (for RG Leads section reflection)
  app.get("/api/rep/referred-quotes", async (req, res) => {
    try {
      const { actorId } = req.query as any;
      if (!actorId) return res.status(401).json({ error: "Actor ID required" });
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
        return res.status(403).json({ error: "Access denied" });
      }
      const allQuotes = await storage.getQuotes();
      const allUsers = await storage.getUsers();
      const repIds = new Set(allUsers.filter(u => u.role === "rep").map(u => u.id));
      const referred = allQuotes.filter(q => q.assignedTo && repIds.has(q.assignedTo));
      res.json(referred);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== LEAD EXPIRY TIMER ROUTES ==========

  // Get lead expiry timer setting (hours)
  app.get("/api/settings/lead-expiry-hours", async (req, res) => {
    try {
      const hours = await storage.getSetting("lead_expiry_hours");
      res.json({ hours: hours ? parseFloat(hours) : 24 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Set lead expiry timer (admin/manager)
  app.post("/api/settings/lead-expiry-hours", async (req, res) => {
    try {
      const { hours, actorId } = req.body;
      if (!actorId) {
        return res.status(401).json({ error: "Actor ID is required" });
      }
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
        return res.status(403).json({ error: "Only admin/manager can update expiry timer" });
      }
      if (typeof hours !== "number" || hours < 1 || hours > 720) {
        return res.status(400).json({ error: "Hours must be between 1 and 720 (30 days)" });
      }
      await storage.setSetting("lead_expiry_hours", hours.toString(), actorId);
      res.json({ success: true, hours });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check and expire leads that have exceeded the timer
  app.post("/api/leads/check-expiry", async (req, res) => {
    try {
      const { actorId } = req.body;
      if (!actorId) {
        return res.status(401).json({ error: "Actor ID is required" });
      }
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
        return res.status(403).json({ error: "Only admin/manager can check lead expiry" });
      }

      const expiryHoursSetting = await storage.getSetting("lead_expiry_hours");
      const expiryHours = expiryHoursSetting ? parseFloat(expiryHoursSetting) : 24;
      const now = new Date();
      const allQuotes = await storage.getAllQuotes();
      
      const expiredLeads: string[] = [];
      for (const quote of allQuotes) {
        if (
          quote.assignedTo &&
          quote.assignedAt &&
          quote.status === "New"
        ) {
          const assignedTime = new Date(quote.assignedAt);
          const expiryTime = new Date(assignedTime.getTime() + expiryHours * 60 * 60 * 1000);
          if (now > expiryTime) {
            await storage.updateQuote(quote.id, { status: "Expired" } as any);
            await storage.createActivity({
              quoteId: quote.id,
              type: "system",
              content: `Lead expired - broker did not respond within ${expiryHours} hours`,
              author: "System",
            });
            expiredLeads.push(quote.id);
          }
        }
      }

      res.json({ success: true, expiredCount: expiredLeads.length, expiredLeads });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reassign an expired lead to a new broker
  app.post("/api/leads/reassign", async (req, res) => {
    try {
      const { quoteId, brokerId, actorId, actorName } = req.body;
      if (!quoteId || !brokerId) {
        return res.status(400).json({ error: "Quote ID and broker ID are required" });
      }
      if (!actorId) {
        return res.status(401).json({ error: "Actor ID is required" });
      }
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
        return res.status(403).json({ error: "Only admin/manager can reassign leads" });
      }
      if (actor.role === "manager" || actor.role === "partner") {
        const hasPermission = await checkPermission(actorId, "assignLeads");
        if (!hasPermission) {
          return res.status(403).json({ error: "You don't have permission to reassign leads" });
        }
      }

      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      const broker = await storage.getUser(brokerId);
      if (!broker || broker.role !== "broker") {
        return res.status(400).json({ error: "Invalid broker" });
      }
      if (broker.status === "paused") {
        return res.status(400).json({ error: "Cannot reassign to paused brokers" });
      }

      // Get lead cost
      const currentLeadCosts = await getLeadCosts();
      const defaultCost = currentLeadCosts[quote.type] ?? 0;
      const leadCost = broker.leadCostOverride !== null && broker.leadCostOverride !== undefined
        ? parseFloat(broker.leadCostOverride)
        : defaultCost;

      // Deduct from new broker's balance
      const debitResult = await storage.debitBalance(
        brokerId,
        leadCost.toFixed(2),
        `Lead reassigned: ${quote.type} - ${quote.clientName} (${quote.quoteNumber})`,
        { quoteId, actorId, actorName }
      );

      if (!debitResult) {
        return res.status(400).json({
          error: "Insufficient balance",
          required: leadCost,
          currentBalance: broker.balance
        });
      }

      // Update quote - reset assignment and timer, change status back to New
      await storage.updateQuote(quoteId, {
        assignedTo: brokerId,
        assignedAt: new Date(),
        status: "New",
      } as any);

      await storage.createActivity({
        quoteId,
        type: "assignment",
        content: `Lead reassigned to ${broker.name} ($${leadCost} deducted) by ${actorName || "Admin"}`,
        author: actorName || "System",
      });

      // Send assignment email to new broker
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
        }).catch(err => console.error('[Email] Reassignment notification error:', err));
      }

      res.json({
        success: true,
        newBalance: debitResult.user.balance,
        transaction: debitResult.transaction,
        leadCost,
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
      const { name, mediaType, mediaUrl, linkUrl, openInPopup, targetPages, status, startDate, endDate, priority, createdBy, adText, textColor, backgroundColor, textPosition, topText, centerText, bottomText, topTextColor, centerTextColor, bottomTextColor, topBgColor, centerBgColor, bottomBgColor } = req.body;
      
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
        adText: adText || null,
        textColor: textColor || "#ffffff",
        backgroundColor: backgroundColor || "#1e3a5f",
        textPosition: textPosition || "bottom",
        topText: topText || null,
        centerText: centerText || null,
        bottomText: bottomText || null,
        topTextColor: topTextColor || "#ffffff",
        centerTextColor: centerTextColor || "#ffffff",
        bottomTextColor: bottomTextColor || "#ffffff",
        topBgColor: topBgColor || "#1e3a5f",
        centerBgColor: centerBgColor || "#1e3a5f",
        bottomBgColor: bottomBgColor || "#1e3a5f",
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
      const fields = ["name", "mediaType", "mediaUrl", "linkUrl", "openInPopup", "targetPages", "status", "startDate", "endDate", "priority", "adText", "textColor", "backgroundColor", "textPosition", "topText", "centerText", "bottomText", "topTextColor", "centerTextColor", "bottomTextColor", "topBgColor", "centerBgColor", "bottomBgColor"];
      
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
      if (!page) {
        return res.status(400).json({ error: "Page parameter required" });
      }
      const ads = await storage.getActiveAdsForPage(page);
      res.json(ads);
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
      if (!actor || (actor.role !== "admin" && actor.role !== "manager" && actor.role !== "partner")) {
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

  // Admin/Manager: Upload and install update ZIP
  const updateUpload = multer({
    dest: path.join(process.cwd(), "tmp_updates"),
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
        cb(null, true);
      } else {
        cb(new Error('Only ZIP files are allowed'));
      }
    }
  });

  app.post("/api/admin/update/install", updateUpload.single("updateFile"), async (req, res) => {
    try {
      const actorId = req.body?.actorId ? String(req.body.actorId) : null;
      if (!actorId) return res.status(401).json({ error: "Unauthorized" });
      const actor = await storage.getUser(actorId);
      if (!actor || !['admin', 'manager', 'partner'].includes(actor.role)) {
        return res.status(403).json({ error: "Only admins and managers can install updates" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No ZIP file uploaded" });
      }

      const AdmZip = (await import("adm-zip")).default;
      const zip = new AdmZip(req.file.path);
      const zipEntries = zip.getEntries();
      const projectRoot = process.cwd();

      const allowedDirectories = ['client/', 'server/', 'shared/'];
      const protectedFiles = [
        'server/storage.ts', 'shared/schema.ts', 'server/index.ts',
        'client/index.html'
      ];
      const protectedPatterns = [
        'node_modules/', '.git/', 'migrations/', '.config/',
        '.local/', 'tmp_updates/', '.env'
      ];

      const updatedFiles: string[] = [];
      const skippedFiles: string[] = [];

      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;

        let entryName = entry.entryName;
        const parts = entryName.split('/');
        if (parts.length > 1) {
          const firstDir = parts[0];
          const isWrapperDir = !['client', 'server', 'shared', 'public'].includes(firstDir);
          if (isWrapperDir) {
            entryName = parts.slice(1).join('/');
          }
        }

        if (!entryName || entryName.startsWith('.')) {
          skippedFiles.push(entry.entryName + ' (hidden file)');
          continue;
        }

        const inAllowedDir = allowedDirectories.some(d => entryName.startsWith(d));
        if (!inAllowedDir) {
          skippedFiles.push(entry.entryName + ' (outside allowed directories)');
          continue;
        }

        const isProtected = protectedPatterns.some(p => entryName.includes(p)) ||
                           protectedFiles.includes(entryName);
        if (isProtected) {
          skippedFiles.push(entry.entryName + ' (protected)');
          continue;
        }

        const targetPath = path.join(projectRoot, entryName);
        const resolvedPath = path.resolve(targetPath);
        if (!resolvedPath.startsWith(projectRoot)) {
          skippedFiles.push(entry.entryName + ' (path traversal blocked)');
          continue;
        }

        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const content = entry.getData();
        fs.writeFileSync(targetPath, content);
        updatedFiles.push(entryName);
      }

      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        summary: {
          totalFiles: zipEntries.filter(e => !e.isDirectory).length,
          updated: updatedFiles.length,
          skipped: skippedFiles.length,
          updatedFiles,
          skippedFiles,
        }
      });
    } catch (error: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: error.message || "Failed to install update" });
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

  // ===== ADMIN: RG LEAD MANAGEMENT =====

  // Get all RG leads with location + rep info (admin/manager)
  app.get("/api/admin/rg-leads", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(401).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor || !["admin", "manager", "partner"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      const leads = await storage.getAllRgLeads();
      const locations = await storage.getAllLocations();
      const allUsers = await storage.getAllUsers();
      const enriched = leads.map(lead => {
        const loc = locations.find(l => l.id === lead.locationId);
        const rep = allUsers.find(u => u.id === lead.repId);
        return {
          ...lead,
          location: loc ? { propertyAddress: loc.propertyAddress, unit: loc.unit, applicationNumber: loc.applicationNumber } : null,
          repName: rep ? rep.name : "Unassigned",
          repEmail: rep ? rep.email : null,
        };
      });
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Assign / reassign an RG lead to a rep or broker (admin/manager with assignLeads permission)
  app.patch("/api/admin/rg-leads/:id/assign", async (req, res) => {
    try {
      const { actorId, repId, brokerId } = req.body;
      if (!actorId) return res.status(401).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId);
      if (!actor || !["admin", "manager", "partner"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      if (actor.role === "manager" || actor.role === "partner") {
        const canAssign = await checkPermission(actorId, "assignLeads");
        if (!canAssign) return res.status(403).json({ error: "You don't have permission to assign leads" });
      }
      const lead = await storage.getRgLead(req.params.id);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      // Validate rep if provided
      if (repId) {
        const repUser = await storage.getUser(repId);
        if (!repUser || repUser.role !== "rep") return res.status(400).json({ error: "Target user is not a rep" });
      }

      // Validate broker and deduct "Rent Guarantee" cost if provided and changed
      if (brokerId !== undefined) {
        if (brokerId !== null) {
          const brokerUser = await storage.getUser(brokerId);
          if (!brokerUser || brokerUser.role !== "broker") return res.status(400).json({ error: "Target user is not a broker" });
          if (brokerId !== (lead as any).brokerId) {
            const leadCosts = await getLeadCosts();
            const rgCost = leadCosts["Rent Guarantee"] ?? 0;
            if (rgCost > 0) {
              const debitResult = await storage.debitBalance(
                brokerId,
                rgCost.toFixed(2),
                `RG lead assigned: ${lead.tenantName} at ${lead.propertyAddress}`,
                { actorId, actorName: actor.name }
              );
              if (!debitResult) {
                return res.status(400).json({
                  error: "Insufficient balance",
                  required: rgCost,
                  currentBalance: brokerUser.balance,
                });
              }
            }
          }
        }
      }

      const updateData: any = {};
      if (repId !== undefined) updateData.repId = repId || lead.repId;
      if (brokerId !== undefined) updateData.brokerId = brokerId || null;

      const updated = await storage.updateRgLead(req.params.id, updateData);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== REP / RENT GUARANTEE LEADS ==============

  // Get rep's own leads (or all leads for admin/manager)
  app.get("/api/rep/leads", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor) return res.status(403).json({ error: "Unauthorized" });
      let leads;
      if (actor.role === "admin" || actor.role === "manager") {
        leads = await storage.getAllRgLeads();
      } else if (actor.role === "rep") {
        leads = await storage.getRgLeadsForRep(actor.id);
      } else {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      res.json(leads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single RG lead
  app.get("/api/rep/leads/:id", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor) return res.status(403).json({ error: "Unauthorized" });
      const lead = await storage.getRgLead(req.params.id);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      if (actor.role === "rep" && lead.repId !== actor.id) return res.status(403).json({ error: "Access denied" });
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create RG lead
  app.post("/api/rep/leads", async (req, res) => {
    try {
      const { actorId, ...data } = req.body;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });

      const lead = await storage.createRgLead({ ...data, repId: actor.id });
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update RG lead
  app.patch("/api/rep/leads/:id", async (req, res) => {
    try {
      const { actorId, ...data } = req.body;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId);
      if (!actor) return res.status(403).json({ error: "Unauthorized" });
      const lead = await storage.getRgLead(req.params.id);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      if (actor.role === "rep" && lead.repId !== actor.id) return res.status(403).json({ error: "Access denied" });
      const updated = await storage.updateRgLead(req.params.id, data);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete RG lead
  app.delete("/api/rep/leads/:id", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor) return res.status(403).json({ error: "Unauthorized" });
      const lead = await storage.getRgLead(req.params.id);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      if (actor.role === "rep" && lead.repId !== actor.id) return res.status(403).json({ error: "Access denied" });
      await storage.deleteRgLead(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get document requests for a lead
  app.get("/api/rep/leads/:id/requests", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      const requests = await storage.getDocumentRequestsForLead(req.params.id);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send document request (create tokenized link)
  app.post("/api/rep/leads/:id/request-docs", async (req, res) => {
    try {
      const { actorId, recipientType, recipientName, recipientEmail, requiredDocs, expiresInDays } = req.body;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      const lead = await storage.getRgLead(req.params.id);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : new Date(Date.now() + 7 * 86400000);
      const docRequest = await storage.createDocumentRequest({
        rgLeadId: req.params.id,
        recipientType,
        recipientName,
        recipientEmail,
        requiredDocs: requiredDocs || [],
        expiresAt,
      });
      res.json(docRequest);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get documents for a lead
  app.get("/api/rep/leads/:id/documents", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      const docs = await storage.getDocumentsForLead(req.params.id);
      res.json(docs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a document
  app.delete("/api/rep/documents/:id", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      await storage.deleteRepDocument(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== RG LOCATION ROUTES =====

  // Get locations for rep (or all for admin/manager)
  app.get("/api/rep/locations", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      const locations = actor.role === "rep"
        ? await storage.getLocationsForRep(actorId as string)
        : await storage.getAllLocations();
      res.json(locations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single location
  app.get("/api/rep/locations/:id", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      const location = await storage.getLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "Location not found" });
      res.json(location);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get tenants for a location
  app.get("/api/rep/locations/:id/tenants", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      const tenants = await storage.getLeadsForLocation(req.params.id);
      res.json(tenants);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all doc requests for all tenants at a location
  app.get("/api/rep/locations/:id/doc-requests", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      const tenants = await storage.getLeadsForLocation(req.params.id);
      const allReqs = await Promise.all(tenants.map(t => storage.getDocumentRequestsForLead(t.id)));
      res.json(allReqs.flat());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all uploaded docs for all tenants at a location
  app.get("/api/rep/locations/:id/documents", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      const tenants = await storage.getLeadsForLocation(req.params.id);
      const allDocs = await Promise.all(tenants.map(t => storage.getDocumentsForLead(t.id)));
      res.json(allDocs.flat());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a location
  app.post("/api/rep/locations", async (req, res) => {
    try {
      const { actorId, repId: repIdOverride, propertyAddress, province, unit, landlordName, landlordEmail, landlordPhone, monthlyRent, moveInDate, notes, otherContactName, otherContactEmail, otherContactPhone } = req.body;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      if (!propertyAddress || !landlordName || !monthlyRent) return res.status(400).json({ error: "propertyAddress, landlordName, and monthlyRent are required" });
      // Admin/manager can specify a repId override to create on behalf of a rep
      let ownerRepId = actorId;
      if (repIdOverride && ["admin", "manager", "partner"].includes(actor.role)) {
        const repUser = await storage.getUser(repIdOverride);
        if (!repUser || repUser.role !== "rep") return res.status(400).json({ error: "Target user is not a rep" });
        ownerRepId = repIdOverride;
      }
      // Resolve rates: province-specific override → global default → hardcoded fallback
      const globalRates = await storage.getSetting("rg_rates").then(v => v ? JSON.parse(v) : { annualRate: 6.5, monthlyRate: 7 }).catch(() => ({ annualRate: 6.5, monthlyRate: 7 }));
      const provinceRatesAll = await storage.getSetting("rg_province_rates").then(v => v ? JSON.parse(v) : {}).catch(() => ({}));
      const prov = (province || "ON").toUpperCase();
      const provRates = provinceRatesAll[prov] || {};
      const finalAnnual = provRates.annualRate ?? globalRates.annualRate ?? 6.5;
      const finalMonthly = provRates.monthlyRate ?? globalRates.monthlyRate ?? 7;
      const location = await storage.createLocation({
        repId: ownerRepId,
        propertyAddress, unit: unit || null, landlordName,
        landlordEmail: landlordEmail || null, landlordPhone: landlordPhone || null,
        monthlyRent, moveInDate: moveInDate || null, notes: notes || null,
        annualRatePercent: String(finalAnnual),
        monthlyRatePercent: String(finalMonthly),
        otherContactName: otherContactName || null,
        otherContactEmail: otherContactEmail || null,
        otherContactPhone: otherContactPhone || null,
      }, prov);
      res.json(location);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update a location
  app.patch("/api/rep/locations/:id", async (req, res) => {
    try {
      const { actorId, ...data } = req.body;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      const updated = await storage.updateLocation(req.params.id, data);
      if (!updated) return res.status(404).json({ error: "Location not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a location
  app.delete("/api/rep/locations/:id", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      await storage.deleteLocation(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add a tenant to a location
  app.post("/api/rep/locations/:id/tenants", async (req, res) => {
    try {
      const { actorId, tenantName, tenantEmail, tenantPhone, employmentStatus, coApplicantName, coApplicantEmail, notes, householdIncome, employerName, paymentMethod } = req.body;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      if (!tenantName || !tenantEmail || !tenantPhone || !employmentStatus) return res.status(400).json({ error: "Tenant name, email, phone, and employment status are required" });
      const location = await storage.getLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "Location not found" });

      const lead = await storage.createRgLead({
        repId: location.repId,
        locationId: location.id,
        tenantName, tenantEmail, tenantPhone, employmentStatus,
        coApplicantName: coApplicantName || null,
        coApplicantEmail: coApplicantEmail || null,
        landlordName: location.landlordName,
        landlordEmail: location.landlordEmail,
        landlordPhone: location.landlordPhone,
        propertyAddress: location.propertyAddress + (location.unit ? ` Unit ${location.unit}` : ""),
        monthlyRent: location.monthlyRent,
        moveInDate: location.moveInDate,
        notes: notes || null,
        householdIncome: householdIncome || null,
        employerName: employerName || null,
        paymentMethod: paymentMethod || null,
        status: "New",
      });
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== REP REMINDER ROUTES =====

  // Get reminders for a rep
  app.get("/api/rep/reminders", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      const reminders = await storage.getRemindersForRep(actorId as string);
      res.json(reminders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a reminder
  app.post("/api/rep/reminders", async (req, res) => {
    try {
      const { actorId, title, notes, dueDate, leadId } = req.body;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      if (!title || !dueDate) return res.status(400).json({ error: "title and dueDate are required" });
      const reminder = await storage.createRepReminder({
        repId: actorId,
        title,
        notes: notes || null,
        dueDate: new Date(dueDate),
        leadId: leadId || null,
        completed: false,
      });
      res.json(reminder);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update a reminder (toggle complete, edit)
  app.patch("/api/rep/reminders/:id", async (req, res) => {
    try {
      const { actorId, ...data } = req.body;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      if (data.dueDate) data.dueDate = new Date(data.dueDate);
      const updated = await storage.updateRepReminder(req.params.id, data);
      if (!updated) return res.status(404).json({ error: "Reminder not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a reminder
  app.delete("/api/rep/reminders/:id", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      await storage.deleteRepReminder(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PUBLIC: Get document request info by token (no auth)
  app.get("/api/upload/:token", async (req, res) => {
    try {
      const docReq = await storage.getDocumentRequestByToken(req.params.token);
      if (!docReq) return res.status(404).json({ error: "Upload link not found or expired" });
      if (docReq.expiresAt && new Date(docReq.expiresAt) < new Date()) {
        return res.status(410).json({ error: "This upload link has expired" });
      }
      const lead = await storage.getRgLead(docReq.rgLeadId);
      const docs = await storage.getDocumentsForRequest(docReq.id);
      res.json({ request: docReq, lead, uploadedDocs: docs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PUBLIC: Upload document via token (no auth)
  app.post("/api/upload/:token/file", repDocUpload.single("file"), async (req, res) => {
    try {
      const docReq = await storage.getDocumentRequestByToken(req.params.token);
      if (!docReq) return res.status(404).json({ error: "Upload link not found" });
      if (docReq.expiresAt && new Date(docReq.expiresAt) < new Date()) {
        return res.status(410).json({ error: "This upload link has expired" });
      }
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const { docType } = req.body;
      const fileUrl = `/uploads/rep-docs/${req.file.filename}`;
      const doc = await storage.createRepDocument({
        rgLeadId: docReq.rgLeadId,
        documentRequestId: docReq.id,
        docType: docType || "Other",
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
      });
      // Update lead status to "Documents Received" if it was pending
      const lead = await storage.getRgLead(docReq.rgLeadId);
      if (lead && lead.status === "Documents Pending") {
        await storage.updateRgLead(lead.id, { status: "Documents Received" });
      }
      res.json(doc);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Rep Earnings & Commission System ─────────────────────────────

  // Rep gets their own earnings summary
  app.get("/api/rep/earnings", async (req, res) => {
    try {
      const sessionUser = (req.session as any)?.user;
      const actorId = req.query.actorId as string | undefined;
      const actor = sessionUser || (actorId ? await storage.getUser(actorId) : null);
      if (!actor || !["admin", "manager", "rep"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      const user = actor;
      const repId = user.role === "rep" ? user.id : (req.query.repId as string) || user.id;
      const [summary, repUser] = await Promise.all([
        storage.getRepEarningsSummary(repId),
        storage.getUser(repId),
      ]);
      // Calculate commission
      let commissionEarned = 0;
      if (repUser && repUser.commissionType && repUser.commissionRate) {
        const rate = parseFloat(repUser.commissionRate as string);
        if (repUser.commissionType === "percentage") {
          commissionEarned = Math.round((summary.totalCollectedCents * rate) / 100);
        } else {
          commissionEarned = Math.round(summary.totalPaid * rate * 100); // fixed per payment
        }
      }
      res.json({
        ...summary,
        commissionEarned,
        commissionType: repUser?.commissionType || null,
        commissionRate: repUser?.commissionRate || null,
        payoutSchedule: repUser?.payoutSchedule || null,
        renewalCommissionRate: repUser?.renewalCommissionRate || null,
        commissionNotes: repUser?.commissionNotes || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Rep: get all payments across all locations (for Commission tab)
  app.get("/api/rep/all-payments", async (req, res) => {
    try {
      const sessionUser = (req.session as any)?.user;
      const actorId = req.query.actorId as string | undefined;
      const user = sessionUser || (actorId ? await storage.getUser(actorId) : null);
      if (!user || !["admin", "manager", "rep"].includes(user.role)) return res.status(403).json({ error: "Access denied" });
      const repId = user.role === "rep" ? user.id : (req.query.repId as string) || user.id;
      const payments = await storage.getAllPaymentsForRep(repId);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Rep views their own payout history
  app.get("/api/rep/payouts", async (req, res) => {
    try {
      const sessionUser = (req.session as any)?.user;
      const actorId = req.query.actorId as string | undefined;
      const user = sessionUser || (actorId ? await storage.getUser(actorId) : null);
      if (!user || !["admin", "manager", "rep"].includes(user.role)) return res.status(403).json({ error: "Access denied" });
      const repId = user.role === "rep" ? user.id : (req.query.repId as string) || user.id;
      const payouts = await storage.getPayoutsForRep(repId);
      res.json(payouts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin/manager: get or update commission settings for a rep
  app.get("/api/admin/reps/:id/commission", async (req, res) => {
    try {
      const sessionUser = (req.session as any)?.user;
      const actorId = req.query.actorId as string | undefined;
      const user = sessionUser || (actorId ? await storage.getUser(actorId) : null);
      if (!user || !["admin", "manager"].includes(user.role)) return res.status(403).json({ error: "Access denied" });
      const rep = await storage.getUser(req.params.id);
      if (!rep || rep.role !== "rep") return res.status(404).json({ error: "Rep not found" });
      res.json({
        commissionType: rep.commissionType || null,
        commissionRate: rep.commissionRate || null,
        payoutSchedule: rep.payoutSchedule || null,
        renewalCommissionRate: rep.renewalCommissionRate || null,
        commissionNotes: rep.commissionNotes || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/reps/:id/commission", async (req, res) => {
    try {
      const sessionUser = (req.session as any)?.user;
      const actorId = req.body.actorId as string | undefined;
      const user = sessionUser || (actorId ? await storage.getUser(actorId) : null);
      if (!user || !["admin", "manager"].includes(user.role)) return res.status(403).json({ error: "Access denied" });
      if (user.role === "manager") {
        const perms = (user as any).permissions || {};
        if (!perms.approveRepCommission) return res.status(403).json({ error: "You do not have permission to approve rep commission" });
      }
      const { commissionType, commissionRate, payoutSchedule, renewalCommissionRate, commissionNotes } = req.body;
      const updated = await storage.updateUserCommission(req.params.id, {
        commissionType: commissionType || null,
        commissionRate: commissionRate || null,
        payoutSchedule: payoutSchedule || null,
        renewalCommissionRate: renewalCommissionRate || null,
        commissionNotes: commissionNotes || null,
      });
      if (!updated) return res.status(404).json({ error: "Rep not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin/manager: get payout history for a rep
  app.get("/api/admin/reps/:id/payouts", async (req, res) => {
    try {
      const sessionUser = (req.session as any)?.user;
      const actorId = req.query.actorId as string | undefined;
      const user = sessionUser || (actorId ? await storage.getUser(actorId) : null);
      if (!user || !["admin", "manager"].includes(user.role)) return res.status(403).json({ error: "Access denied" });
      const payouts = await storage.getPayoutsForRep(req.params.id);
      res.json(payouts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin/manager: create a payout for a rep
  app.post("/api/admin/reps/:id/payouts", async (req, res) => {
    try {
      const sessionUser = (req.session as any)?.user;
      const actorId = req.body.actorId as string | undefined;
      const user = sessionUser || (actorId ? await storage.getUser(actorId) : null);
      if (!user || !["admin", "manager"].includes(user.role)) return res.status(403).json({ error: "Access denied" });
      const { periodLabel, periodStart, periodEnd, totalPaymentsCents, commissionCents, isRenewal, notes } = req.body;
      if (!periodLabel || commissionCents === undefined) {
        return res.status(400).json({ error: "periodLabel and commissionCents are required" });
      }
      const payout = await storage.createRepPayout({
        repId: req.params.id,
        periodLabel,
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        totalPaymentsCents: totalPaymentsCents || 0,
        commissionCents,
        isRenewal: isRenewal || false,
        notes: notes || null,
        createdBy: user.id,
        status: "pending",
      });
      res.json(payout);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin/manager: update payout (mark as paid, etc.)
  app.put("/api/admin/payouts/:id", async (req, res) => {
    try {
      const sessionUser = (req.session as any)?.user;
      const actorId = req.body.actorId as string | undefined;
      const user = sessionUser || (actorId ? await storage.getUser(actorId) : null);
      if (!user || !["admin", "manager"].includes(user.role)) return res.status(403).json({ error: "Access denied" });
      const { status, notes } = req.body;
      const updateData: any = { notes: notes ?? undefined };
      if (status) {
        updateData.status = status;
        if (status === "paid") updateData.paidAt = new Date();
      }
      const updated = await storage.updateRepPayout(req.params.id, updateData);
      if (!updated) return res.status(404).json({ error: "Payout not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin/manager: get all rep payouts
  app.get("/api/admin/payouts", async (req, res) => {
    try {
      const sessionUser = (req.session as any)?.user;
      const actorId = req.query.actorId as string | undefined;
      const user = sessionUser || (actorId ? await storage.getUser(actorId) : null);
      if (!user || !["admin", "manager"].includes(user.role)) return res.status(403).json({ error: "Access denied" });
      const payouts = await storage.getAllRepPayouts();
      res.json(payouts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── RG Payment System ────────────────────────────────────────────

  function generateTrackingCode(planType: string): string {
    const prefix = planType === "annual" ? "RGA" : "RGM";
    const year = new Date().getFullYear();
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return `${prefix}-${year}-${code}`;
  }

  // Create Stripe checkout for a landlord payment
  app.post("/api/rep/locations/:id/create-payment", async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const location = await storage.getLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "Location not found" });

      const { planType, amountCents, landlordEmail, landlordName, periodLabel, description } = req.body;
      if (!planType || !amountCents || !landlordEmail) {
        return res.status(400).json({ error: "planType, amountCents, and landlordEmail are required" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0]
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : "http://localhost:5000";

      // Generate unique tracking code
      let trackingCode = generateTrackingCode(planType);
      for (let i = 0; i < 5; i++) {
        const existing = await storage.getRgPaymentByTrackingCode(trackingCode);
        if (!existing) break;
        trackingCode = generateTrackingCode(planType);
      }

      // Create pending payment record
      const payment = await storage.createRgPayment({
        locationId: location.id,
        trackingCode,
        planType,
        amountCents,
        landlordEmail,
        landlordName: landlordName || location.landlordName || "",
        description: description || `${planType === "annual" ? "Annual" : "Monthly"} RG Premium – ${location.address}`,
        periodLabel: periodLabel || "",
        createdBy: user.id,
        status: "pending",
      });

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: landlordEmail,
        line_items: [{
          price_data: {
            currency: "cad",
            product_data: {
              name: payment.description || "Rent Guarantee Premium",
              description: `Tracking: ${trackingCode}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${baseUrl}/rg-payment/success?session_id={CHECKOUT_SESSION_ID}&code=${trackingCode}`,
        cancel_url: `${baseUrl}/rep?tab=locations`,
        metadata: {
          type: "rg_payment",
          paymentId: payment.id,
          trackingCode,
          locationId: location.id,
        },
      });

      // Save session ID
      await storage.updateRgPayment(payment.id, { stripeSessionId: session.id });

      res.json({ url: session.url, sessionId: session.id, trackingCode, paymentId: payment.id });
    } catch (error: any) {
      console.error("[RG Payment] Checkout error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Confirm payment after Stripe redirect
  app.post("/api/rg/payment/confirm", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ error: "sessionId required" });

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return res.status(400).json({ error: "Payment not completed" });
      }

      const payment = await storage.getRgPaymentBySessionId(sessionId);
      if (!payment) return res.status(404).json({ error: "Payment record not found" });

      if (payment.status === "paid") return res.json(payment); // already confirmed

      const updated = await storage.updateRgPayment(payment.id, {
        status: "paid",
        stripePaymentIntentId: session.payment_intent as string,
        paidAt: new Date(),
      });

      res.json(updated);
    } catch (error: any) {
      console.error("[RG Payment] Confirm error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get payment history for a location
  app.get("/api/rep/locations/:id/payments", async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const payments = await storage.getPaymentsForLocation(req.params.id);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send year-end or monthly receipt email
  app.post("/api/rep/locations/:id/send-receipt", async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const location = await storage.getLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "Location not found" });

      const { recipientEmail, year, type } = req.body; // type: "annual" | "monthly_summary"
      const payments = await storage.getPaymentsForLocation(req.params.id);
      const filterYear = year || new Date().getFullYear();
      const paid = payments.filter(p =>
        p.status === "paid" &&
        p.paidAt &&
        new Date(p.paidAt).getFullYear() === Number(filterYear)
      );

      if (paid.length === 0) {
        return res.status(400).json({ error: "No paid payments found for this period" });
      }

      const totalCents = paid.reduce((sum, p) => sum + p.amountCents, 0);
      const rows = paid.map(p =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${p.trackingCode}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${p.planType === "annual" ? "Annual" : "Monthly"}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${p.periodLabel || ""}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">$${(p.amountCents / 100).toFixed(2)}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-CA") : ""}</td></tr>`
      ).join("");

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;background:#fff;">
          <div style="background:#1a56db;color:white;padding:24px 32px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:22px;">Payment ${type === "annual" ? "Annual Summary" : "Receipt"}</h1>
            <p style="margin:6px 0 0;opacity:.85;">${filterYear} — ${location.address}${location.unit ? `, Unit ${location.unit}` : ""}</p>
          </div>
          <div style="padding:24px 32px;">
            <p style="color:#555;">Dear ${location.landlordName || "Valued Client"},</p>
            <p style="color:#555;">Please find below your payment summary for the property at <strong>${location.address}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
              <thead>
                <tr style="background:#f8f9fa;">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#888;">Tracking Code</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#888;">Plan</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#888;">Period</th>
                  <th style="padding:10px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#888;">Amount</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#888;">Date</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="background:#f0f4ff;border-radius:8px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-weight:600;color:#333;">Total Paid in ${filterYear}</span>
              <span style="font-size:22px;font-weight:700;color:#1a56db;">$${(totalCents / 100).toFixed(2)} CAD</span>
            </div>
            <p style="color:#999;font-size:12px;margin-top:24px;">This is an official payment confirmation. Please retain for your records.</p>
          </div>
        </div>`;

      const sent = await sendEmail({
        to: recipientEmail || location.landlordEmail || "",
        subject: `Payment ${type === "annual" ? "Annual Summary" : "Receipt"} – ${filterYear} – ${location.address}`,
        html,
        text: `Payment summary for ${filterYear}: ${paid.length} payment(s), total $${(totalCents / 100).toFixed(2)} CAD`,
      });

      res.json({ sent, paymentCount: paid.length, totalCents });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Signature Template (admin/manager only) ──────────────────────
  app.get("/api/admin/signature-template", async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      if (!user || !["admin", "manager"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const template = await storage.getSignatureTemplate();
      res.json(template || { title: "Rent Secure Agreement", content: "" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/signature-template", async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      if (!user || !["admin", "manager"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { title, content } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }
      const template = await storage.upsertSignatureTemplate({ title, content, updatedBy: user.id });
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Send Signature Request (rep/admin/manager) ────────────────────
  app.post("/api/rep/locations/:id/send-signature", async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const location = await storage.getLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "Location not found" });

      const { landlordEmail } = req.body;
      if (!landlordEmail) return res.status(400).json({ error: "Landlord email is required" });

      // Generate unique token
      const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

      const request = await storage.createSignatureRequest({
        locationId: location.id,
        landlordName: location.landlordName || "",
        landlordEmail,
        propertyAddress: `${location.address}${location.unit ? ", Unit " + location.unit : ""}`,
        token,
        status: "pending",
        createdBy: user.id,
      });

      // Build signing URL
      const proto = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.get("host");
      const signingUrl = `${proto}://${host}/sign/${token}`;

      // Send email
      const template = await storage.getSignatureTemplate();
      const emailSent = await sendEmail({
        to: landlordEmail,
        subject: template?.title || "Agreement for Signature",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#1a56db;">Agreement Ready for Your Signature</h2>
            <p>Dear ${location.landlordName || "Landlord"},</p>
            <p>Please review and sign the agreement for the following property:</p>
            <p><strong>${location.address}${location.unit ? ", Unit " + location.unit : ""}</strong></p>
            <div style="margin:24px 0;">
              <a href="${signingUrl}" style="background:#1a56db;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">
                Sign Agreement
              </a>
            </div>
            <p style="color:#666;font-size:13px;">If you did not expect this email, please ignore it.</p>
          </div>`,
        text: `Please sign the agreement at: ${signingUrl}`,
      });

      res.json({ request, signingUrl, emailSent });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/rep/locations/:id/signature-status", async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const request = await storage.getSignatureRequestByLocation(req.params.id);
      res.json(request || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Public Signing Page ───────────────────────────────────────────
  app.get("/api/sign/:token", async (req, res) => {
    try {
      const request = await storage.getSignatureRequestByToken(req.params.token);
      if (!request) return res.status(404).json({ error: "Signing request not found" });
      const template = await storage.getSignatureTemplate();
      res.json({ request, template });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sign/:token", async (req, res) => {
    try {
      const request = await storage.getSignatureRequestByToken(req.params.token);
      if (!request) return res.status(404).json({ error: "Signing request not found" });
      if (request.status === "signed") {
        return res.status(400).json({ error: "This agreement has already been signed" });
      }
      const { signatureData, signerName } = req.body;
      if (!signatureData || !signerName) {
        return res.status(400).json({ error: "Signature and name are required" });
      }
      const updated = await storage.updateSignatureRequest(request.id, {
        status: "signed",
        signatureData,
        signerName,
        signedAt: new Date(),
      });

      // Auto-approve the active tenant lead for this location
      try {
        const locationLeads = await storage.getLeadsForLocation(request.locationId);
        const activeLead = locationLeads.find(l => l.status !== "Declined");
        if (activeLead && activeLead.status !== "Approved") {
          await storage.updateRgLead(activeLead.id, { status: "Approved" });
        }
      } catch (e) {
        // Non-fatal: signature was already recorded
        console.error("[sign] Failed to auto-approve lead:", e);
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Send for Processing ──────────────────────────────────────────
  // POST /api/rep/leads/:leadId/send-for-processing
  app.post("/api/rep/leads/:leadId/send-for-processing", async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const lead = await storage.getRgLead(req.params.leadId);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      // Get all uploaded documents for this lead
      const docs = await storage.getDocumentsForLead(lead.id);

      // Get location for additional contact info
      const location = lead.locationId ? await storage.getLocation(lead.locationId) : null;

      const baseUrl = `${req.protocol}://${req.get("host")}`;

      // Build contact details rows
      const tenantRows = `
        <tr><td style="padding:6px 12px;color:#666;width:160px;">Tenant Name</td><td style="padding:6px 12px;font-weight:500;">${lead.tenantName}</td></tr>
        <tr><td style="padding:6px 12px;color:#666;">Tenant Email</td><td style="padding:6px 12px;font-weight:500;">${lead.tenantEmail}</td></tr>
        <tr><td style="padding:6px 12px;color:#666;">Tenant Phone</td><td style="padding:6px 12px;font-weight:500;">${lead.tenantPhone}</td></tr>
        ${lead.employmentStatus ? `<tr><td style="padding:6px 12px;color:#666;">Employment</td><td style="padding:6px 12px;font-weight:500;">${lead.employmentStatus}${lead.employerName ? ` — ${lead.employerName}` : ""}</td></tr>` : ""}
        ${lead.coApplicantName ? `<tr><td style="padding:6px 12px;color:#666;">Co-Applicant</td><td style="padding:6px 12px;font-weight:500;">${lead.coApplicantName}${lead.coApplicantEmail ? ` (${lead.coApplicantEmail})` : ""}</td></tr>` : ""}
        ${lead.householdIncome ? `<tr><td style="padding:6px 12px;color:#666;">Household Income</td><td style="padding:6px 12px;font-weight:500;">$${Number(lead.householdIncome).toLocaleString()}/yr</td></tr>` : ""}
      `;

      const landlordRows = `
        <tr><td style="padding:6px 12px;color:#666;width:160px;">Landlord Name</td><td style="padding:6px 12px;font-weight:500;">${lead.landlordName}</td></tr>
        ${lead.landlordEmail ? `<tr><td style="padding:6px 12px;color:#666;">Landlord Email</td><td style="padding:6px 12px;font-weight:500;">${lead.landlordEmail}</td></tr>` : ""}
        ${lead.landlordPhone ? `<tr><td style="padding:6px 12px;color:#666;">Landlord Phone</td><td style="padding:6px 12px;font-weight:500;">${lead.landlordPhone}</td></tr>` : ""}
        ${(location as any)?.otherContactName ? `<tr><td style="padding:6px 12px;color:#666;">Other Contact</td><td style="padding:6px 12px;font-weight:500;">${(location as any).otherContactName}${(location as any).otherContactEmail ? ` — ${(location as any).otherContactEmail}` : ""}${(location as any).otherContactPhone ? ` — ${(location as any).otherContactPhone}` : ""}</td></tr>` : ""}
      `;

      const propertyRows = `
        <tr><td style="padding:6px 12px;color:#666;width:160px;">Property Address</td><td style="padding:6px 12px;font-weight:500;">${lead.propertyAddress}</td></tr>
        <tr><td style="padding:6px 12px;color:#666;">Monthly Rent</td><td style="padding:6px 12px;font-weight:500;">$${Number(lead.monthlyRent).toLocaleString()}/month</td></tr>
        ${lead.moveInDate ? `<tr><td style="padding:6px 12px;color:#666;">Move-In Date</td><td style="padding:6px 12px;font-weight:500;">${lead.moveInDate}</td></tr>` : ""}
        ${lead.notes ? `<tr><td style="padding:6px 12px;color:#666;">Notes</td><td style="padding:6px 12px;font-weight:500;">${lead.notes}</td></tr>` : ""}
      `;

      // Build document links
      const docLinksHtml = docs.length > 0
        ? docs.map(d => `<li style="padding:4px 0;"><a href="${baseUrl}${d.fileUrl}" style="color:#1a56db;">${d.fileName}</a> <span style="color:#999;font-size:12px;">(${d.docType})</span></li>`).join("")
        : "<li style='color:#999;'>No documents uploaded</li>";

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#fff;">
          <div style="background:#1a56db;color:white;padding:24px 32px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:22px;">Rent Guarantee — Processing Request</h1>
            <p style="margin:6px 0 0;opacity:.85;">${lead.propertyAddress}</p>
          </div>
          <div style="padding:24px 32px;">
            <p style="color:#555;">Please find below the complete application details and all collected documents for Rent Guarantee processing.</p>

            <h3 style="color:#1a56db;border-bottom:2px solid #e8f0fe;padding-bottom:8px;">Tenant Information</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${tenantRows}</table>

            <h3 style="color:#1a56db;border-bottom:2px solid #e8f0fe;padding-bottom:8px;">Landlord Information</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${landlordRows}</table>

            <h3 style="color:#1a56db;border-bottom:2px solid #e8f0fe;padding-bottom:8px;">Property Details</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${propertyRows}</table>

            <h3 style="color:#1a56db;border-bottom:2px solid #e8f0fe;padding-bottom:8px;">Collected Documents (${docs.length})</h3>
            <ul style="margin:0;padding-left:20px;line-height:1.8;">${docLinksHtml}</ul>

            <div style="background:#f0f4ff;border-radius:8px;padding:16px 20px;margin-top:24px;">
              <p style="margin:0;color:#555;font-size:13px;">Submitted by: <strong>${user.name}</strong> (${user.email})</p>
              <p style="margin:4px 0 0;color:#555;font-size:13px;">Submitted on: <strong>${new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" })}</strong></p>
            </div>
          </div>
        </div>`;

      // Get the processing email from settings or fallback to admin email
      const processingEmailSetting = await storage.getSetting("processing_email");
      const adminEmail = "info@quoteus.ca";
      const toEmail = processingEmailSetting?.value || adminEmail;

      const sent = await sendEmail({
        to: toEmail,
        subject: `RG Processing Request — ${lead.tenantName} — ${lead.propertyAddress}`,
        html,
        text: `Rent Guarantee processing request for ${lead.tenantName} at ${lead.propertyAddress}. ${docs.length} document(s) attached.`,
      });

      // Mark the lead as sent for processing
      const updated = await storage.updateRgLead(lead.id, {
        processingStatus: "sent",
        processingSentAt: new Date(),
      } as any);

      res.json({ sent, emailedTo: toEmail, documentCount: docs.length, lead: updated });
    } catch (error: any) {
      console.error("[Processing] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/rep/leads/:leadId/file-number — record the official file number
  app.patch("/api/rep/leads/:leadId/file-number", async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const lead = await storage.getRgLead(req.params.leadId);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const { fileNumber } = req.body;
      if (!fileNumber?.trim()) return res.status(400).json({ error: "File number is required" });

      const updated = await storage.updateRgLead(lead.id, {
        processingFileNumber: fileNumber.trim(),
        processingStatus: "file_received",
      } as any);

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== ADMIN BILLING ==============

  app.get("/api/admin/billing/rg-payments", async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || (user.role !== "admin" && user.role !== "manager")) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const payments = await storage.getAllRgPayments();
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/billing/rg-payments/:id", async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || (user.role !== "admin" && user.role !== "manager")) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const { status, description, periodLabel, landlordName, landlordEmail } = req.body;
      const updated = await storage.updateRgPayment(req.params.id, {
        ...(status !== undefined && { status }),
        ...(description !== undefined && { description }),
        ...(periodLabel !== undefined && { periodLabel }),
        ...(landlordName !== undefined && { landlordName }),
        ...(landlordEmail !== undefined && { landlordEmail }),
        ...(status === "paid" ? { paidAt: new Date() } : {}),
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/billing/customer-payments", async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || (user.role !== "admin" && user.role !== "manager")) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const payments = await storage.getAllCustomerPayments();
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/billing/customer-payments/:id", async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || (user.role !== "admin" && user.role !== "manager")) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const { status, description } = req.body;
      const updated = await storage.updateCustomerPayment(req.params.id, {
        ...(status !== undefined && { status }),
        ...(description !== undefined && { description }),
        ...(status === "paid" ? { paidAt: new Date() } : {}),
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== CUSTOMER PORTAL ==============

  function generateAccountNumber() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return `CP-${code}`;
  }

  function generateAuthToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  async function getCustomerFromRequest(req: any): Promise<any> {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return null;
    return await storage.getCustomerAccountByToken(token);
  }

  app.post("/api/customer/register", async (req, res) => {
    try {
      const { email, password, contactName, postalCode, phone } = req.body;
      if (!email || !password || !contactName || !postalCode) {
        return res.status(400).json({ error: "All fields are required." });
      }
      const existing = await storage.getCustomerAccountByEmail(email.toLowerCase().trim());
      if (existing) return res.status(409).json({ error: "An account with this email already exists." });

      const passwordHash = await bcrypt.hash(password, 10);
      const authToken = generateAuthToken();
      let accountNumber = generateAccountNumber();
      // Ensure uniqueness
      while (await storage.getCustomerAccountByNumber(accountNumber)) {
        accountNumber = generateAccountNumber();
      }

      const account = await storage.createCustomerAccount({
        accountNumber,
        contactName: contactName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        postalCode: postalCode.trim().toUpperCase(),
        passwordHash,
        authToken,
      });

      res.json({ token: authToken, account: { ...account, passwordHash: undefined, authToken: undefined } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/customer/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

      const account = await storage.getCustomerAccountByEmail(email.toLowerCase().trim());
      if (!account || !account.passwordHash) return res.status(401).json({ error: "Invalid email or password." });

      const valid = await bcrypt.compare(password, account.passwordHash);
      if (!valid) return res.status(401).json({ error: "Invalid email or password." });

      const authToken = generateAuthToken();
      await storage.updateCustomerAccount(account.id, { authToken });

      res.json({ token: authToken, account: { ...account, passwordHash: undefined, authToken: undefined } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/customer/me", async (req, res) => {
    try {
      const account = await getCustomerFromRequest(req);
      if (!account) return res.status(401).json({ error: "Not authenticated." });
      res.json({ ...account, passwordHash: undefined, authToken: undefined });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/customer/logout", async (req, res) => {
    try {
      const account = await getCustomerFromRequest(req);
      if (account) await storage.updateCustomerAccount(account.id, { authToken: null });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a Stripe checkout session for a customer payment
  app.post("/api/customer/payment", async (req, res) => {
    try {
      const { accountNumber, contactName, postalCode, amountCents, description, email } = req.body;
      if (!accountNumber || !contactName || !postalCode || !amountCents || amountCents < 50) {
        return res.status(400).json({ error: "Missing required fields or amount too small." });
      }

      const stripe = getUncachableStripeClient();
      if (!stripe) return res.status(503).json({ error: "Payment processing unavailable." });

      const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
      const session = await (stripe as any).checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: email || undefined,
        line_items: [
          {
            price_data: {
              currency: "cad",
              unit_amount: amountCents,
              product_data: {
                name: description || "Insurance Payment",
                description: `Account: ${accountNumber}`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/customer-portal/success?session_id={CHECKOUT_SESSION_ID}&account=${encodeURIComponent(accountNumber)}`,
        cancel_url: `${origin}/customer-portal`,
        metadata: { accountNumber, contactName, postalCode },
      });

      const payment = await storage.createCustomerPayment({
        accountNumber,
        contactName,
        email: email || null,
        description: description || "Insurance Payment",
        amount: (amountCents / 100).toFixed(2),
        status: "pending",
        stripeSessionId: session.id,
      });

      res.json({ sessionId: session.id, url: session.url, paymentId: payment.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Confirm payment after Stripe redirect
  app.post("/api/customer/payment/confirm", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ error: "Session ID required." });

      const stripe = getUncachableStripeClient();
      if (!stripe) return res.status(503).json({ error: "Payment processing unavailable." });

      const session = await (stripe as any).checkout.sessions.retrieve(sessionId);
      const payment = await storage.getCustomerPaymentBySession(sessionId);
      if (!payment) return res.status(404).json({ error: "Payment record not found." });

      const status = session.payment_status === "paid" ? "paid" : "pending";
      const updated = await storage.updateCustomerPayment(payment.id, {
        status,
        stripePaymentIntentId: session.payment_intent || null,
        paidAt: status === "paid" ? new Date() : null,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get payment history for authenticated customer
  app.get("/api/customer/payments", async (req, res) => {
    try {
      const account = await getCustomerFromRequest(req);
      if (!account) return res.status(401).json({ error: "Not authenticated." });
      const payments = await storage.getCustomerPaymentsByAccount(account.accountNumber);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get policy updates (quotes) linked to this customer's email
  app.get("/api/customer/policies", async (req, res) => {
    try {
      const account = await getCustomerFromRequest(req);
      if (!account) return res.status(401).json({ error: "Not authenticated." });
      const quotes = await storage.getQuotesByEmail(account.email);
      // Return only non-sensitive fields
      const safe = quotes.map((q) => ({
        id: q.id,
        insuranceType: q.type,
        status: q.status,
        createdAt: q.createdAt,
        postalCode: q.postalCode,
        clientName: q.clientName,
        quoteNumber: q.quoteNumber,
        referenceId: q.referenceId,
      }));
      res.json(safe);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
