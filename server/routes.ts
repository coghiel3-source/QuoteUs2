import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertQuoteSchema, insertActivitySchema, rgInvoices, rgClaims } from "@shared/schema";
import { db } from "./db";
import { z } from "zod";
import { sendEmail, generateNewLeadEmail, generateAssignmentEmail, generateStatusChangeEmail, generateThankYouEmail, clearSmtpCache, generatePasswordResetEmail } from "./email";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Stamps the captured landlord signature onto a PDF by appending a clean
 * "Landlord Signature" page containing the signature image placed on a labeled
 * signature line, signer name, and date.
 * Returns the path (under /uploads/doc-signatures/) of the new signed PDF, or null on failure.
 */
async function stampSignatureOnPdf(
  originalPath: string,
  signatureDataUrl: string,
  signerName: string,
): Promise<string | null> {
  try {
    if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/")) return null;
    const absoluteOriginal = path.join(process.cwd(), "client", "public", originalPath.replace(/^\//, ""));
    if (!fs.existsSync(absoluteOriginal)) return null;
    const pdfBytes = fs.readFileSync(absoluteOriginal);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Decode the signature image (png or jpeg)
    const base64 = signatureDataUrl.split(",")[1] || "";
    const imgBytes = Buffer.from(base64, "base64");
    const isPng = signatureDataUrl.includes("image/png");
    const sigImage = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);

    // Append a clean signature page (A4)
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    // Header
    page.drawText("LANDLORD SIGNATURE", {
      x: 50, y: 780, size: 16, font: fontBold, color: rgb(0, 0, 0),
    });
    page.drawText("Signed electronically per the Lease Co-Guarantee Agreement above.", {
      x: 50, y: 760, size: 10, font, color: rgb(0.3, 0.3, 0.3),
    });

    // "Accepted, Acknowledged and Agreed:" block + "By: Landlord" — matches the document layout
    page.drawText("Accepted, Acknowledged and Agreed:", {
      x: 50, y: 700, size: 12, font, color: rgb(0, 0, 0),
    });
    page.drawText("By: Landlord", {
      x: 50, y: 675, size: 12, font, color: rgb(0, 0, 0),
    });

    // Signature line (matches the visual in the editor — 220pt wide line)
    const lineY = 580;
    const lineX = 50;
    const lineW = 320;
    // Place the signature image so its baseline sits on the line
    const sigDims = sigImage.scale(1);
    const sigMaxW = 280;
    const sigMaxH = 80;
    const sigScale = Math.min(sigMaxW / sigDims.width, sigMaxH / sigDims.height);
    const sigW = sigDims.width * sigScale;
    const sigH = sigDims.height * sigScale;
    page.drawImage(sigImage, {
      x: lineX + 10,
      y: lineY + 2,
      width: sigW,
      height: sigH,
    });
    // Draw the signature line
    page.drawLine({
      start: { x: lineX, y: lineY },
      end: { x: lineX + lineW, y: lineY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Signer name + date below the line
    page.drawText(signerName, {
      x: lineX, y: lineY - 18, size: 11, font: fontBold, color: rgb(0, 0, 0),
    });
    const dateStr = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
    page.drawText(`Signed on ${dateStr}`, {
      x: lineX, y: lineY - 34, size: 10, font, color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText("Landlord (or Landlord's Property Manager, if authorized)", {
      x: lineX, y: lineY - 50, size: 10, font, color: rgb(0.3, 0.3, 0.3),
    });

    // Footer disclaimer
    page.drawText(
      "Electronic Signature Disclaimer: The use of electronic signatures in connection with this",
      { x: 50, y: 80, size: 9, font, color: rgb(0.4, 0.4, 0.4) },
    );
    page.drawText(
      "Agreement is permitted and has the same legal effect and enforceability as a handwritten signature.",
      { x: 50, y: 68, size: 9, font, color: rgb(0.4, 0.4, 0.4) },
    );

    const signedBytes = await pdfDoc.save();
    const signedFilename = `signed-${Date.now()}-${path.basename(originalPath)}`;
    const signedAbsolute = path.join(process.cwd(), "client", "public", "uploads", "doc-signatures", signedFilename);
    fs.writeFileSync(signedAbsolute, signedBytes);
    return `/uploads/doc-signatures/${signedFilename}`;
  } catch (e) {
    console.error("[stampSignatureOnPdf] failed:", e);
    return null;
  }
}

function safeUser(user: any): any {
  if (!user) return user;
  const { password, resetToken, resetTokenExpiry, twoFactorSecret, twoFactorCode, twoFactorCodeExpiry, ...safe } = user;
  return safe;
}

function safeUsers(users: any[]): any[] {
  return users.map(safeUser);
}

// ── RG Org-aware authorization helpers ─────────────────────────────────────
// A rep can access an RG resource if they own it OR if they're the principal
// of an org and the resource owner is a member of that same org.
async function canActorAccessRepResource(actor: any, ownerRepId: string | null | undefined): Promise<boolean> {
  if (!actor) return false;
  if (actor.role === "admin" || actor.role === "manager") return true;
  if (actor.role !== "rep") return false;
  if (!ownerRepId) return false;
  if (ownerRepId === actor.id) return true;
  const membership = await storage.getOrgMembership(actor.id);
  if (!membership || membership.member.role !== "principal") return false;
  const members = await storage.getOrgMembers(membership.org.id);
  return members.some(m => m.userId === ownerRepId);
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

// Doc signature uploads
const docSignDir = path.join(uploadDir, "doc-signatures");
if (!fs.existsSync(docSignDir)) fs.mkdirSync(docSignDir, { recursive: true });
const docSignUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, docSignDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `docsig-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const docSignUpload = multer({
  storage: docSignUploadStorage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|heic|webp|html/;
    if (allowedTypes.test(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new Error("Only PDF, Word, image, and HTML files are allowed"));
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
  
  // Login (checks email + password; returns twoFactorRequired if 2FA is enabled)
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

      // Determine if OTP is required: per-user 2FA OR admin role-based OTP policy
      let otpRequired = (user as any).twoFactorEnabled;

      if (!otpRequired) {
        // Check admin role-based OTP settings for this user's role
        const allOtpSettings = await storage.getAllOtpSettings();
        const roleSetting = allOtpSettings.find(s => s.role === user.role);
        if (roleSetting?.enabled) {
          const lastVerified: Date | null = (user as any).otpLastVerified ? new Date((user as any).otpLastVerified) : null;
          const now = new Date();
          if (!lastVerified) {
            otpRequired = true;
          } else {
            const msSince = now.getTime() - lastVerified.getTime();
            const hoursSince = msSince / (1000 * 60 * 60);
            if (roleSetting.frequency === 'always') otpRequired = true;
            else if (roleSetting.frequency === 'daily' && hoursSince >= 24) otpRequired = true;
            else if (roleSetting.frequency === 'weekly' && hoursSince >= 168) otpRequired = true;
            else if (roleSetting.frequency === 'monthly' && hoursSince >= 720) otpRequired = true;
          }
        }
      }

      if (otpRequired) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await storage.updateUser(user.id, { twoFactorCode: otp, twoFactorCodeExpiry: expiry } as any);

        const emailHtml = `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#1e3a5f;margin-bottom:8px">QuoteUs.ca — Login Verification</h2>
            <p style="color:#555;margin-bottom:20px">Use the code below to complete your sign-in. It expires in <strong>10 minutes</strong>.</p>
            <div style="background:#f0f4ff;border:2px solid #3b5bdb;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px">
              <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1e3a5f">${otp}</span>
            </div>
            <p style="color:#888;font-size:13px">If you did not attempt to log in, please ignore this email and consider changing your password.</p>
          </div>`;

        const sent = await sendEmail({ to: user.email, subject: "QuoteUs.ca — Your Login Code", html: emailHtml });

        const response: any = { twoFactorRequired: true, userId: user.id };
        if (!sent) {
          response.previewCode = otp;
        }
        return res.json(response);
      }
      
      res.json(safeUser(user));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── 2FA Routes (Email OTP) ───────────────────────────────────────────────────

  // POST /api/auth/2fa/enable — enable email 2FA for the current user (no code required)
  app.post("/api/auth/2fa/enable", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      await storage.updateUser(userId, { twoFactorEnabled: true } as any);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/auth/2fa/verify-login — verify email OTP during login, return user
  app.post("/api/auth/2fa/verify-login", async (req, res) => {
    try {
      const { userId, token } = req.body;
      if (!userId || !token) return res.status(400).json({ error: "userId and token required" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      const stored = (user as any).twoFactorCode;
      const expiry = (user as any).twoFactorCodeExpiry;
      if (!stored) return res.status(400).json({ error: "No verification code found. Please log in again." });
      if (!expiry || new Date() > new Date(expiry)) return res.status(401).json({ error: "Verification code has expired. Please log in again." });
      if (token.trim() !== stored) return res.status(401).json({ error: "Invalid code. Please check your email and try again." });
      // Clear the used code and record verification time
      await storage.updateUser(userId, { twoFactorCode: null, twoFactorCodeExpiry: null, otpLastVerified: new Date() } as any);
      res.json(safeUser(user));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/auth/2fa/disable — disable 2FA for the current user (already logged in)
  app.post("/api/auth/2fa/disable", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      await storage.updateUser(userId, { twoFactorEnabled: false, twoFactorCode: null, twoFactorCodeExpiry: null } as any);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/users/:id/disable-2fa — admin resets 2FA for any user (account recovery)
  app.post("/api/admin/users/:id/disable-2fa", async (req, res) => {
    try {
      const actorId = req.body.actorId;
      const actor = actorId ? await storage.getUser(actorId) : null;
      if (!actor || !["admin", "manager"].includes(actor.role)) {
        return res.status(403).json({ error: "Admin or manager access required" });
      }
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      await storage.updateUser(req.params.id, { twoFactorEnabled: false, twoFactorCode: null, twoFactorCodeExpiry: null } as any);
      res.json({ success: true });
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

  // ── RG Organization routes (admin/manager) ────────────────────────────────

  app.get("/api/admin/rg-organizations", async (req, res) => {
    try {
      const { actorId } = req.query;
      const actor = actorId ? await storage.getUser(actorId as string) : (req.session as any)?.user;
      if (!actor || !["admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      const orgs = await storage.getAllOrganizations();
      // attach member counts
      const withCounts = await Promise.all(orgs.map(async org => {
        const members = await storage.getOrgMembers(org.id);
        return { ...org, memberCount: members.length, members };
      }));
      res.json(withCounts);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/admin/rg-organizations", async (req, res) => {
    try {
      const { actorId, ...data } = req.body;
      const actor = actorId ? await storage.getUser(actorId) : (req.session as any)?.user;
      if (!actor || !["admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      if (!data.name?.trim()) return res.status(400).json({ error: "name is required" });
      const org = await storage.createOrganization(data);
      res.json(org);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.patch("/api/admin/rg-organizations/:id", async (req, res) => {
    try {
      const { actorId, ...data } = req.body;
      const actor = actorId ? await storage.getUser(actorId) : (req.session as any)?.user;
      if (!actor || !["admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      const updated = await storage.updateOrganization(req.params.id, data);
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.delete("/api/admin/rg-organizations/:id", async (req, res) => {
    try {
      const { actorId } = req.query;
      const actor = actorId ? await storage.getUser(actorId as string) : (req.session as any)?.user;
      if (!actor || !["admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      const ok = await storage.deleteOrganization(req.params.id);
      if (!ok) return res.status(404).json({ error: "Not found" });
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Members
  app.get("/api/admin/rg-organizations/:id/members", async (req, res) => {
    try {
      const { actorId } = req.query;
      const actor = actorId ? await storage.getUser(actorId as string) : (req.session as any)?.user;
      if (!actor || !["admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      const members = await storage.getOrgMembers(req.params.id);
      const allUsers = await storage.getAllUsers();
      const withNames = members.map(m => {
        const u = allUsers.find(u => u.id === m.userId);
        return { ...m, userName: u?.name || "Unknown", userEmail: u?.email || "" };
      });
      res.json(withNames);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/admin/rg-organizations/:id/members", async (req, res) => {
    try {
      const { actorId, userId, role = "member" } = req.body;
      const actor = actorId ? await storage.getUser(actorId) : (req.session as any)?.user;
      if (!actor || !["admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      if (!userId) return res.status(400).json({ error: "userId required" });
      if (!["principal", "member"].includes(role)) return res.status(400).json({ error: "role must be 'principal' or 'member'" });
      const org = await storage.getOrganization(req.params.id);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const targetUser = await storage.getUser(userId);
      if (!targetUser || targetUser.role !== "rep") return res.status(400).json({ error: "Only rep users can be added" });
      // Enforce one membership per user: remove from any existing org first
      const existing = await storage.getOrgMembership(userId);
      if (existing) await storage.removeOrgMember(existing.org.id, userId);
      const member = await storage.addOrgMember(req.params.id, userId, role);
      res.json({ ...member, userName: targetUser.name, userEmail: targetUser.email });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.patch("/api/admin/rg-organizations/:id/members/:memberId", async (req, res) => {
    try {
      const { actorId, role } = req.body;
      const actor = actorId ? await storage.getUser(actorId) : (req.session as any)?.user;
      if (!actor || !["admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      if (!["principal", "member"].includes(role)) return res.status(400).json({ error: "role must be 'principal' or 'member'" });
      // Verify the member actually belongs to the org in the URL (prevent cross-org tampering)
      const members = await storage.getOrgMembers(req.params.id);
      if (!members.some(m => m.id === req.params.memberId)) return res.status(404).json({ error: "Member not found in this organization" });
      const updated = await storage.updateOrgMember(req.params.memberId, role);
      if (!updated) return res.status(404).json({ error: "Member not found" });
      res.json(updated);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.delete("/api/admin/rg-organizations/:id/members/:userId", async (req, res) => {
    try {
      const { actorId } = req.query;
      const actor = actorId ? await storage.getUser(actorId as string) : (req.session as any)?.user;
      if (!actor || !["admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      await storage.removeOrgMember(req.params.id, req.params.userId);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // GET /api/rep/my-organization — for reps to get their org membership info + org member summary
  app.get("/api/rep/my-organization", async (req, res) => {
    try {
      const { actorId } = req.query;
      const actor = actorId ? await storage.getUser(actorId as string) : (req.session as any)?.user;
      if (!actor || actor.role !== "rep") return res.status(403).json({ error: "Access denied" });
      const membership = await storage.getOrgMembership(actor.id);
      if (!membership) return res.json(null);
      const members = await storage.getOrgMembers(membership.org.id);
      const allUsers = await storage.getAllUsers();
      const memberUserIds = members.map(m => m.userId);
      const [orgLocations, orgLeads] = await Promise.all([
        storage.getLocationsForUsers(memberUserIds),
        storage.getLeadsForUsers(memberUserIds),
      ]);
      const membersWithStats = members.map(m => {
        const u = allUsers.find(u => u.id === m.userId);
        return {
          ...m,
          userName: u?.name || "Unknown",
          userEmail: u?.email || "",
          locationCount: orgLocations.filter(l => l.repId === m.userId).length,
          leadCount: orgLeads.filter(l => l.repId === m.userId).length,
        };
      });
      res.json({ org: membership.org, myRole: membership.member.role, members: membersWithStats });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
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

  // Admin: Get OTP login settings
  app.get("/api/admin/otp-settings", async (req, res) => {
    try {
      const actorId = req.query.actorId as string;
      if (!actorId) return res.status(401).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId);
      if (!actor || actor.role !== "admin") return res.status(403).json({ error: "Admin only" });
      const settings = await storage.getAllOtpSettings();
      // Return defaults for any roles not yet in DB
      const roles = ["broker", "manager", "partner", "rep", "customer"];
      const result = roles.map(role => {
        const found = settings.find(s => s.role === role);
        return found || { role, enabled: false, frequency: "always" };
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Save OTP login settings
  app.post("/api/admin/otp-settings", async (req, res) => {
    try {
      const { actorId, settings } = req.body;
      if (!actorId) return res.status(401).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId);
      if (!actor || actor.role !== "admin") return res.status(403).json({ error: "Admin only" });
      if (!Array.isArray(settings)) return res.status(400).json({ error: "settings array required" });
      await storage.upsertOtpSettings(settings);
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
      const allQuotes = await storage.getAllQuotes();
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
      const allQuotes = await storage.getAllQuotes();
      const allUsers = await storage.getAllUsers();
      const repIds = new Set(allUsers.filter((u) => u.role === "rep").map((u) => u.id));
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

  // Report which Stripe keys are saved (no key values exposed)
  app.get("/api/settings/stripe-status", async (req, res) => {
    try {
      const secret = await storage.getSetting("stripe_secret_key");
      const publishable = await storage.getSetting("stripe_publishable_key");
      res.json({ hasSecret: !!(secret && secret.length > 0), hasPublishable: !!(publishable && publishable.length > 0) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Stripe Key Management ────────────────────────────────────────────────────
  // Save Stripe keys to system_settings
  app.post("/api/admin/stripe-keys", async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      const actorId = req.body?.actorId || user?.id;
      const actor = actorId ? await storage.getUser(actorId) : user;
      if (!actor || !["admin", "manager"].includes(actor.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { secretKey, publishableKey, webhookSecret } = req.body;
      if (secretKey !== undefined && secretKey !== null) {
        await storage.setSetting("stripe_secret_key", secretKey.trim(), actor.id);
      }
      if (publishableKey !== undefined && publishableKey !== null) {
        await storage.setSetting("stripe_publishable_key", publishableKey.trim(), actor.id);
      }
      if (webhookSecret !== undefined && webhookSecret !== null) {
        await storage.setSetting("stripe_webhook_secret", webhookSecret.trim(), actor.id);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test Stripe connection with the currently saved keys
  app.post("/api/admin/stripe-test", async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      const actorId = req.body?.actorId || user?.id;
      const actor = actorId ? await storage.getUser(actorId) : user;
      if (!actor || !["admin", "manager"].includes(actor.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      // Lightweight API call to verify the key is valid
      const balance = await stripe.balance.retrieve();
      res.json({ success: true, available: balance.available?.map(b => `${b.amount / 100} ${b.currency.toUpperCase()}`).join(", ") || "0.00 CAD" });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Connection failed" });
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
        const membership = await storage.getOrgMembership(actor.id);
        if (membership && membership.member.role === "principal") {
          const members = await storage.getOrgMembers(membership.org.id);
          leads = await storage.getLeadsForUsers(members.map(m => m.userId));
        } else {
          leads = await storage.getRgLeadsForRep(actor.id);
        }
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
      if (!(await canActorAccessRepResource(actor, lead.repId))) return res.status(403).json({ error: "Access denied" });
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
      if (!(await canActorAccessRepResource(actor, lead.repId))) return res.status(403).json({ error: "Access denied" });
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
      if (!(await canActorAccessRepResource(actor, lead.repId))) return res.status(403).json({ error: "Access denied" });
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

  // Get locations for rep (or all for admin/manager; or all org members for principal)
  app.get("/api/rep/locations", async (req, res) => {
    try {
      const { actorId } = req.query;
      if (!actorId) return res.status(400).json({ error: "actorId required" });
      const actor = await storage.getUser(actorId as string);
      if (!actor || !["rep", "admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Insufficient permissions" });
      let locations;
      if (actor.role !== "rep") {
        locations = await storage.getAllLocations();
      } else {
        const membership = await storage.getOrgMembership(actor.id);
        if (membership && membership.member.role === "principal") {
          const members = await storage.getOrgMembers(membership.org.id);
          locations = await storage.getLocationsForUsers(members.map(m => m.userId));
        } else {
          locations = await storage.getLocationsForRep(actorId as string);
        }
      }
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
      if (!(await canActorAccessRepResource(actor, location.repId))) return res.status(403).json({ error: "Access denied" });
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
      const location = await storage.getLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "Location not found" });
      if (!(await canActorAccessRepResource(actor, location.repId))) return res.status(403).json({ error: "Access denied" });
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
      const location = await storage.getLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "Location not found" });
      if (!(await canActorAccessRepResource(actor, location.repId))) return res.status(403).json({ error: "Access denied" });
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
      const location = await storage.getLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "Location not found" });
      if (!(await canActorAccessRepResource(actor, location.repId))) return res.status(403).json({ error: "Access denied" });
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
      const existing = await storage.getLocation(req.params.id);
      if (!existing) return res.status(404).json({ error: "Location not found" });
      if (!(await canActorAccessRepResource(actor, existing.repId))) return res.status(403).json({ error: "Access denied" });
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
      const existing = await storage.getLocation(req.params.id);
      if (!existing) return res.status(404).json({ error: "Location not found" });
      if (!(await canActorAccessRepResource(actor, existing.repId))) return res.status(403).json({ error: "Access denied" });
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
      const { actorId, planType, amountCents, landlordEmail, landlordName, periodLabel, description, recurring, serviceFeeAmountCents } = req.body;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const location = await storage.getLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "Location not found" });
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

      const desc = description || `${planType === "annual" ? "Annual" : "Monthly"} RG Premium – ${location.propertyAddress}`;

      // Create pending payment record (amountCents = recurring monthly amount)
      const payment = await storage.createRgPayment({
        locationId: location.id,
        trackingCode,
        planType,
        amountCents,
        landlordEmail,
        landlordName: landlordName || location.landlordName || "",
        description: desc + (recurring && (serviceFeeAmountCents || 0) > 0 ? ` + Service Fee ($${((serviceFeeAmountCents || 0) / 100).toFixed(2)})` : ""),
        periodLabel: periodLabel || "",
        createdBy: user.id,
        status: "pending",
      });

      let session: any;

      if (recurring && planType === "monthly") {
        // --- Subscription mode (recurring monthly with optional setup fee on first invoice) ---
        const lineItems: any[] = [
          {
            price_data: {
              currency: "cad",
              product_data: { name: `Monthly RG Premium – ${location.propertyAddress}` },
              recurring: { interval: "month" },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ];
        if ((serviceFeeAmountCents || 0) > 0) {
          lineItems.push({
            price_data: {
              currency: "cad",
              product_data: { name: "Service Fee (First Month)" },
              unit_amount: serviceFeeAmountCents,
            },
            quantity: 1,
          });
        }
        session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          customer_email: landlordEmail,
          line_items: lineItems,
          mode: "subscription",
          subscription_data: {
            metadata: {
              rg_type: "rg_subscription",
              locationId: location.id,
              paymentId: payment.id,
              trackingCode,
            },
          },
          success_url: `${baseUrl}/rg-payment/success?session_id={CHECKOUT_SESSION_ID}&code=${trackingCode}`,
          cancel_url: `${baseUrl}/rep?tab=locations`,
          metadata: {
            rg_type: "rg_subscription",
            paymentId: payment.id,
            trackingCode,
            locationId: location.id,
          },
        });
      } else {
        // --- One-time payment (existing logic) ---
        session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          customer_email: landlordEmail,
          line_items: [{
            price_data: {
              currency: "cad",
              product_data: { name: desc, description: `Tracking: ${trackingCode}` },
              unit_amount: amountCents,
            },
            quantity: 1,
          }],
          mode: "payment",
          success_url: `${baseUrl}/rg-payment/success?session_id={CHECKOUT_SESSION_ID}&code=${trackingCode}`,
          cancel_url: `${baseUrl}/rep?tab=locations`,
          metadata: {
            rg_type: "rg_payment",
            paymentId: payment.id,
            trackingCode,
            locationId: location.id,
          },
        });
      }

      await storage.updateRgPayment(payment.id, { stripeSessionId: session.id });
      res.json({ url: session.url, sessionId: session.id, trackingCode, paymentId: payment.id, recurring: !!recurring });
    } catch (error: any) {
      console.error("[RG Payment] Checkout error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Save service fee settings for a location
  app.post("/api/rep/locations/:id/service-fee", async (req, res) => {
    try {
      const { actorId, serviceFeeEnabled, serviceFee } = req.body;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updated = await storage.updateLocation(req.params.id, {
        serviceFeeEnabled: !!serviceFeeEnabled,
        serviceFee: String(Number(serviceFee) || 0),
      } as any);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel active Stripe subscription for a location
  app.post("/api/rep/locations/:id/cancel-subscription", async (req, res) => {
    try {
      const { actorId } = req.body;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const location = await storage.getLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "Location not found" });
      if (!location.stripeSubscriptionId) return res.status(400).json({ error: "No active subscription" });

      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.cancel(location.stripeSubscriptionId);
      const updated = await storage.updateLocation(req.params.id, {
        subscriptionStatus: "cancelled",
      } as any);
      res.json({ success: true, location: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sync paid invoices from a Stripe subscription into rg_payments
  app.post("/api/rep/locations/:id/sync-subscription-payments", async (req, res) => {
    try {
      const { actorId } = req.body;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const location = await storage.getLocation(req.params.id);
      if (!location || !location.stripeSubscriptionId) {
        return res.json({ synced: 0 });
      }
      const stripe = await getUncachableStripeClient();
      const invoices = await stripe.invoices.list({
        subscription: location.stripeSubscriptionId,
        status: "paid",
        limit: 100,
      });

      let synced = 0;
      for (const inv of invoices.data) {
        // Skip if already recorded
        const existing = await storage.getRgPaymentByStripePaymentIntent((inv as any).payment_intent as string);
        if (existing) continue;

        const periodStart = inv.period_start ? new Date(inv.period_start * 1000) : new Date();
        const periodLabel = periodStart.toLocaleString("en-CA", { month: "long", year: "numeric" });
        let trackingCode = generateTrackingCode("monthly");
        for (let i = 0; i < 5; i++) {
          const ex = await storage.getRgPaymentByTrackingCode(trackingCode);
          if (!ex) break;
          trackingCode = generateTrackingCode("monthly");
        }
        await storage.createRgPayment({
          locationId: location.id,
          trackingCode,
          planType: "monthly",
          amountCents: inv.amount_paid,
          landlordEmail: location.landlordEmail || "",
          landlordName: location.landlordName || "",
          description: `Monthly RG Premium – ${periodLabel} (auto)`,
          periodLabel,
          createdBy: user.id,
          status: "paid",
          stripeSubscriptionId: location.stripeSubscriptionId,
          stripePaymentIntentId: (inv as any).payment_intent as string,
          paidAt: new Date(inv.status_transitions?.paid_at ? inv.status_transitions.paid_at * 1000 : Date.now()),
        } as any);
        synced++;
      }
      res.json({ synced });
    } catch (error: any) {
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

      const updateData: any = { status: "paid", paidAt: new Date() };

      if (session.mode === "subscription" && session.subscription) {
        // Store subscription ID on the payment and on the location
        const subId = session.subscription as string;
        updateData.stripeSubscriptionId = subId;
        await storage.updateLocation(payment.locationId, {
          stripeSubscriptionId: subId,
          subscriptionStatus: "active",
        } as any);
      } else {
        updateData.stripePaymentIntentId = session.payment_intent as string;
      }

      const updated = await storage.updateRgPayment(payment.id, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error("[RG Payment] Confirm error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get payment history for a location
  app.get("/api/rep/locations/:id/payments", async (req, res) => {
    try {
      const actorId = req.query.actorId as string | undefined;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
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
      const actorId = req.body?.actorId;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
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
            <p style="margin:6px 0 0;opacity:.85;">${filterYear} — ${location.propertyAddress}${location.unit ? `, Unit ${location.unit}` : ""}</p>
          </div>
          <div style="padding:24px 32px;">
            <p style="color:#555;">Dear ${location.landlordName || "Valued Client"},</p>
            <p style="color:#555;">Please find below your payment summary for the property at <strong>${location.propertyAddress}</strong>.</p>
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
        subject: `Payment ${type === "annual" ? "Annual Summary" : "Receipt"} – ${filterYear} – ${location.propertyAddress}`,
        html,
        text: `Payment summary for ${filterYear}: ${paid.length} payment(s), total $${(totalCents / 100).toFixed(2)} CAD`,
      });

      res.json({ sent, paymentCount: paid.length, totalCents });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── RG Claims ────────────────────────────────────────────────────
  // GET /api/rep/leads/:id/claims — list claims for a lead
  app.get("/api/rep/leads/:id/claims", async (req, res) => {
    try {
      const actorId = (req.query as any).actorId;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { eq } = await import("drizzle-orm");
      const claims = await db.select().from(rgClaims).where(eq(rgClaims.leadId, req.params.id));
      res.json(claims);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/rep/leads/:id/claims — submit a new claim
  app.post("/api/rep/leads/:id/claims", async (req, res) => {
    try {
      const actorId = req.body?.actorId;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { claimType, description, incidentDate, claimNotes } = req.body;
      if (!claimType || !description) return res.status(400).json({ error: "claimType and description are required" });
      const [claim] = await db.insert(rgClaims).values({
        leadId: req.params.id,
        repId: user.id,
        claimType,
        description,
        incidentDate: incidentDate || null,
        claimNotes: claimNotes || null,
        status: "Pending",
      }).returning();
      res.json(claim);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/rep/locations/:id/claims — list all claims for all leads at a location
  app.get("/api/rep/locations/:id/claims", async (req, res) => {
    try {
      const actorId = (req.query as any).actorId;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { eq, inArray } = await import("drizzle-orm");
      const { rgLeads } = await import("@shared/schema");
      const leads = await db.select({ id: rgLeads.id }).from(rgLeads).where(eq(rgLeads.locationId, req.params.id));
      if (leads.length === 0) return res.json([]);
      const leadIds = leads.map(l => l.id);
      const claims = await db.select().from(rgClaims).where(inArray(rgClaims.leadId, leadIds));
      res.json(claims);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/rep/locations/:id/claims — submit a claim against a location (attaches to active lead)
  app.post("/api/rep/locations/:id/claims", async (req, res) => {
    try {
      const actorId = req.body?.actorId;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { claimType, description, incidentDate, claimNotes, leadId } = req.body;
      if (!claimType || !description) return res.status(400).json({ error: "claimType and description are required" });
      const { eq, and, notInArray } = await import("drizzle-orm");
      const { rgLeads } = await import("@shared/schema");
      let targetLeadId = leadId;
      if (!targetLeadId) {
        const leads = await db.select({ id: rgLeads.id }).from(rgLeads)
          .where(and(eq(rgLeads.locationId, req.params.id), notInArray(rgLeads.status, ["Cancelled", "Declined"])));
        if (leads.length === 0) return res.status(400).json({ error: "No active tenants at this location" });
        targetLeadId = leads[0].id;
      }
      const [claim] = await db.insert(rgClaims).values({
        leadId: targetLeadId,
        repId: user.id,
        claimType,
        description,
        incidentDate: incidentDate || null,
        claimNotes: claimNotes || null,
        status: "Pending",
      }).returning();
      res.json(claim);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/rep/locations/:id/cancel — close / cancel a rent guarantee location account
  app.patch("/api/rep/locations/:id/cancel", async (req, res) => {
    try {
      const { actorId, cancellationDate, cancellationReason } = req.body;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (!cancellationReason?.trim()) return res.status(400).json({ error: "cancellationReason is required" });
      const location = await storage.getLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "Location not found" });
      const cancelNote = `\n\n--- CANCELLED ${cancellationDate || new Date().toISOString().split("T")[0]} ---\nReason: ${cancellationReason.trim()}`;
      const updated = await storage.updateLocation(req.params.id, {
        status: "Cancelled",
        notes: (location.notes || "") + cancelNote,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/rep/leads/:id/renewal — update renewal reminder status
  app.patch("/api/rep/leads/:id/renewal", async (req, res) => {
    try {
      const actorId = req.body?.actorId;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { renewalContacted, renewalNotes } = req.body;
      const { eq } = await import("drizzle-orm");
      const { rgLeads } = await import("@shared/schema");
      const updateData: Record<string, any> = {
        renewalNotes: renewalNotes ?? null,
        updatedAt: new Date(),
      };
      if (renewalContacted === true) {
        updateData.renewalContacted = true;
        updateData.renewalContactedAt = new Date();
        updateData.renewalContactedBy = user.id;
      } else if (renewalContacted === false) {
        updateData.renewalContacted = false;
        updateData.renewalContactedAt = null;
        updateData.renewalContactedBy = null;
      }
      const [updated] = await db.update(rgLeads).set(updateData).where(eq(rgLeads.id, req.params.id)).returning();
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/rep/leads/:id/cancel — cancel an RG lead with date + reason
  app.patch("/api/rep/leads/:id/cancel", async (req, res) => {
    try {
      const actorId = req.body?.actorId;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { cancellationDate, cancellationReason } = req.body;
      const { eq } = await import("drizzle-orm");
      const { rgLeads } = await import("@shared/schema");
      const [updated] = await db.update(rgLeads).set({
        status: "Cancelled" as any,
        cancellationDate: cancellationDate || null,
        cancellationReason: cancellationReason || null,
        updatedAt: new Date(),
      }).where(eq(rgLeads.id, req.params.id)).returning();
      if (!updated) return res.status(404).json({ error: "Lead not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── RG Invoices ─────────────────────────────────────────────────
  // GET /api/rep/locations/:id/invoices — list invoices for a location
  app.get("/api/rep/locations/:id/invoices", async (req, res) => {
    try {
      const actorId = (req.query as any).actorId;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { eq } = await import("drizzle-orm");
      const invoices = await db.select().from(rgInvoices).where(eq(rgInvoices.locationId, req.params.id));
      invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/rep/locations/:id/invoices — create & store a new invoice
  app.post("/api/rep/locations/:id/invoices", async (req, res) => {
    try {
      const actorId = req.body?.actorId;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const location = await storage.getLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "Location not found" });

      const { monthlyRentCents, annualRatePct, monthlyRatePct, annualAmountCents, monthlyAmountCents, landlordName, landlordEmail, propertyAddress, notes, requiresSignature } = req.body;

      // Generate invoice number: INV-YYYY-XXXXXX
      const year = new Date().getFullYear();
      const suffix = Math.random().toString(36).toUpperCase().slice(2, 8);
      const invoiceNumber = `INV-${year}-${suffix}`;

      // Generate sign token if signature required
      const needsSig = !!requiresSignature;
      const signToken = needsSig ? Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) : null;

      const [invoice] = await db.insert(rgInvoices).values({
        locationId: req.params.id,
        invoiceNumber,
        monthlyRentCents: Number(monthlyRentCents) || 0,
        annualRatePct: String(annualRatePct || "0"),
        monthlyRatePct: String(monthlyRatePct || "0"),
        annualAmountCents: Number(annualAmountCents) || 0,
        monthlyAmountCents: Number(monthlyAmountCents) || 0,
        landlordName: landlordName || location.landlordName,
        landlordEmail: landlordEmail || location.landlordEmail,
        propertyAddress: propertyAddress || `${location.propertyAddress}${location.unit ? `, Unit ${location.unit}` : ""}`,
        notes: notes || null,
        status: "generated",
        requiresSignature: needsSig,
        signToken,
        createdBy: user.id,
      }).returning();

      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/rep/locations/:id/invoices/:invoiceId/email — email an invoice to landlord
  app.post("/api/rep/locations/:id/invoices/:invoiceId/email", async (req, res) => {
    try {
      const actorId = req.body?.actorId;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { eq } = await import("drizzle-orm");
      const [invoice] = await db.select().from(rgInvoices).where(eq(rgInvoices.id, req.params.invoiceId));
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });

      const recipientEmail = req.body.email || invoice.landlordEmail;
      if (!recipientEmail) return res.status(400).json({ error: "No recipient email" });

      const fmtCAD = (cents: number) => `$${(cents / 100).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD`;
      const fmtPct = (pct: string) => `${parseFloat(pct).toFixed(2)}%`;

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;">
          <div style="background:#1e3a5f;color:white;padding:28px 36px;display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <h1 style="margin:0;font-size:24px;font-weight:700;letter-spacing:-.5px;">QUOTE INVOICE</h1>
              <p style="margin:6px 0 0;opacity:.8;font-size:14px;">Rent Guarantee — QuoteUs.ca</p>
            </div>
            <div style="text-align:right;font-size:13px;opacity:.85;">
              <div style="font-weight:700;font-size:18px;">${invoice.invoiceNumber}</div>
              <div>Date: ${new Date(invoice.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
          </div>
          <div style="padding:28px 36px;">
            <table style="width:100%;margin-bottom:24px;">
              <tr>
                <td style="width:50%;vertical-align:top;padding-right:16px;">
                  <h3 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#888;">Prepared For</h3>
                  <div style="font-weight:600;font-size:15px;color:#1a1a1a;">${invoice.landlordName || "—"}</div>
                  <div style="color:#555;font-size:13px;">${invoice.landlordEmail || ""}</div>
                </td>
                <td style="width:50%;vertical-align:top;">
                  <h3 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#888;">Property</h3>
                  <div style="font-weight:600;font-size:15px;color:#1a1a1a;">${invoice.propertyAddress || "—"}</div>
                  <div style="color:#555;font-size:13px;">Monthly Rent: ${fmtCAD(invoice.monthlyRentCents)}</div>
                </td>
              </tr>
            </table>
            <h3 style="margin:0 0 12px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#888;">Plan Options</h3>
            <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #e5e7eb;">Plan</th>
                  <th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #e5e7eb;">Rate</th>
                  <th style="padding:12px 16px;text-align:right;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #e5e7eb;">Amount</th>
                  <th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #e5e7eb;">Billing</th>
                </tr>
              </thead>
              <tbody>
                <tr style="background:#eff6ff;">
                  <td style="padding:14px 16px;font-weight:600;color:#1d4ed8;">Annual Plan</td>
                  <td style="padding:14px 16px;color:#374151;">${fmtPct(invoice.annualRatePct)} of annual rent</td>
                  <td style="padding:14px 16px;text-align:right;font-weight:700;font-size:16px;color:#1d4ed8;">${fmtCAD(invoice.annualAmountCents)}</td>
                  <td style="padding:14px 16px;color:#6b7280;font-size:13px;">One-time annual payment</td>
                </tr>
                <tr style="background:#f0fdf4;">
                  <td style="padding:14px 16px;font-weight:600;color:#15803d;">Monthly Plan</td>
                  <td style="padding:14px 16px;color:#374151;">${fmtPct(invoice.monthlyRatePct)} of monthly rent</td>
                  <td style="padding:14px 16px;text-align:right;font-weight:700;font-size:16px;color:#15803d;">${fmtCAD(invoice.monthlyAmountCents)}/mo</td>
                  <td style="padding:14px 16px;color:#6b7280;font-size:13px;">Billed each month<br/><span style="color:#6b7280;">(${fmtCAD(invoice.monthlyAmountCents * 12)}/yr total)</span></td>
                </tr>
              </tbody>
            </table>
            ${invoice.notes ? `<div style="margin-top:20px;background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:16px;font-size:13px;color:#555;"><strong>Notes:</strong> ${invoice.notes}</div>` : ""}
            <div style="margin-top:24px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;">
              <div style="font-weight:700;font-size:11px;color:#92400e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Disclaimer</div>
              <p style="font-size:12px;color:#78350f;line-height:1.7;margin:0;">
                The premiums shown above are estimates only. <strong>Applicable taxes and fees will be added at the time of payment</strong>, depending on the selected payment option.
                Credit card payments may incur additional processing fees — the exact amount will be confirmed at the time of payment processing.
                This quote is valid for 30 days from the date of issue and is subject to underwriting approval and final review.
              </p>
            </div>
            <p style="margin-top:16px;font-size:12px;color:#9ca3af;">For questions, contact <a href="mailto:info@quoteus.ca" style="color:#1e3a5f;">info@quoteus.ca</a> or call 1-877-253-2695.</p>
          </div>
          <div style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">QuoteUs.ca · Rent Guarantee · 1-877-253-2695 · info@quoteus.ca</p>
          </div>
        </div>`;

      // Build signing section if required
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const signingBlock = invoice.signToken
        ? `<div style="margin-top:28px;background:#eff6ff;border:2px solid #3b82f6;border-radius:12px;padding:20px 24px;text-align:center;">
             <div style="font-weight:700;font-size:15px;color:#1d4ed8;margin-bottom:8px;">Action Required: Accept Your Quote</div>
             <p style="font-size:13px;color:#374151;margin:0 0 16px;">Please click the button below to review and accept your Rent Guarantee quote. You will be able to choose your preferred plan (Annual or Monthly) and confirm with your name.</p>
             <a href="${baseUrl}/invoice-sign/${invoice.signToken}"
                style="display:inline-block;background:#1d4ed8;color:white;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;letter-spacing:-.2px;">
               Review &amp; Accept Quote →
             </a>
             <p style="margin:12px 0 0;font-size:11px;color:#6b7280;">Or copy this link: ${baseUrl}/invoice-sign/${invoice.signToken}</p>
           </div>`
        : "";

      const htmlWithSig = html.replace(
        `<p style="margin-top:16px;font-size:12px;color:#9ca3af;">For questions, contact`,
        `${signingBlock}<p style="margin-top:16px;font-size:12px;color:#9ca3af;">For questions, contact`
      );

      const sent = await sendEmail({
        to: recipientEmail,
        subject: invoice.signToken ? `Action Required: Accept Your Rent Guarantee Quote — ${invoice.invoiceNumber}` : `Rent Guarantee Quote — ${invoice.invoiceNumber}`,
        html: htmlWithSig,
        text: `Rent Guarantee Quote ${invoice.invoiceNumber}\nAnnual Plan: ${fmtCAD(invoice.annualAmountCents)}\nMonthly Plan: ${fmtCAD(invoice.monthlyAmountCents)}/mo${invoice.signToken ? `\n\nAccept your quote at: ${baseUrl}/invoice-sign/${invoice.signToken}` : ""}`,
      });

      // Update status to emailed
      await db.update(rgInvoices).set({ status: "emailed", emailedAt: new Date() }).where(eq(rgInvoices.id, invoice.id));

      res.json({ sent });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Invoice Sign (public) ────────────────────────────────────────
  // GET /api/invoice-sign/:token — fetch invoice for signing
  app.get("/api/invoice-sign/:token", async (req, res) => {
    try {
      const { eq } = await import("drizzle-orm");
      const [invoice] = await db.select().from(rgInvoices).where(eq(rgInvoices.signToken, req.params.token));
      if (!invoice) return res.status(404).json({ error: "Invoice not found or link is invalid." });
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/invoice-sign/:token/accept — client accepts a plan
  app.post("/api/invoice-sign/:token/accept", async (req, res) => {
    try {
      const { eq } = await import("drizzle-orm");
      const [invoice] = await db.select().from(rgInvoices).where(eq(rgInvoices.signToken, req.params.token));
      if (!invoice) return res.status(404).json({ error: "Invoice not found or link is invalid." });
      if (invoice.signedAt) return res.status(409).json({ error: "This invoice has already been accepted." });

      const { plan, signerName } = req.body;
      if (!["annual", "monthly"].includes(plan)) return res.status(400).json({ error: "Invalid plan selection." });
      if (!signerName?.trim()) return res.status(400).json({ error: "Signer name is required." });

      const [updated] = await db.update(rgInvoices)
        .set({ signedAt: new Date(), signedBy: signerName.trim(), signedPlan: plan, status: "accepted" })
        .where(eq(rgInvoices.id, invoice.id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Signature Template (admin/manager only) ──────────────────────
  app.get("/api/admin/signature-template", async (req, res) => {
    try {
      const sessionUser = (req.session as any)?.user;
      const actorId = (req.query as any).actorId || sessionUser?.id;
      const actor = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!actor || !["admin", "manager"].includes(actor.role)) {
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
      const sessionUser = (req.session as any)?.user;
      const actorId = req.body?.actorId || sessionUser?.id;
      const actor = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!actor || !["admin", "manager"].includes(actor.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { title, content } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }
      const template = await storage.upsertSignatureTemplate({ title, content, updatedBy: actor.id });
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Send Signature Request (rep/admin/manager) ────────────────────
  app.post("/api/rep/locations/:id/send-signature", async (req, res) => {
    try {
      const { actorId, landlordEmail } = req.body;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
      if (!user || !["admin", "manager", "rep"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const location = await storage.getLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "Location not found" });
      if (!landlordEmail) return res.status(400).json({ error: "Landlord email is required" });

      // Generate unique token
      const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

      const request = await storage.createSignatureRequest({
        locationId: location.id,
        landlordName: location.landlordName || "",
        landlordEmail,
        propertyAddress: `${location.propertyAddress}${location.unit ? ", Unit " + location.unit : ""}`,
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
            <p><strong>${location.propertyAddress}${location.unit ? ", Unit " + location.unit : ""}</strong></p>
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
      const actorId = req.query.actorId as string | undefined;
      const sessionUser = (req.session as any)?.user;
      const user = actorId ? await storage.getUser(actorId) : sessionUser;
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

  // ── Document Signature (DocuSign-like) ───────────────────────────
  // POST /api/rep/locations/:id/doc-signatures  (multipart: documents[] + signatureFields JSON + landlordName + landlordEmail + templateIds)
  app.post("/api/rep/locations/:id/doc-signatures", docSignUpload.array("documents", 10), async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      const actorId = req.body?.actorId || user?.id;
      const actor = actorId ? await storage.getUser(actorId) : user;
      if (!actor || !["admin", "manager", "rep"].includes(actor.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const location = await storage.getLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "Location not found" });

      const { landlordName, landlordEmail, signatureFields, templateIds, signers: signersRaw, templateData } = req.body;

      const uploadedFiles = (req.files as Express.Multer.File[]) || [];
      const masterToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

      // Build signers list — supports multi-signer (new) or single signer (legacy)
      let signersList: Array<{ id: string; name: string; email: string; token: string; status: string }> = [];
      if (signersRaw) {
        try {
          const parsed: Array<{ id: string; name: string; email: string }> = JSON.parse(signersRaw);
          signersList = parsed
            .filter(s => s.email?.trim())
            .map(s => ({
              id: s.id,
              name: s.name || "",
              email: s.email.trim(),
              token: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
              status: "pending",
            }));
        } catch { /* fall through to legacy */ }
      }
      if (signersList.length === 0) {
        if (!landlordEmail) return res.status(400).json({ error: "At least one signer email is required" });
        signersList = [{ id: "s1", name: landlordName || location.landlordName || "", email: landlordEmail, token: masterToken, status: "pending" }];
      }

      const primarySigner = signersList[0];

      // Create the signature request record
      const record = await storage.createDocSignature({
        locationId: location.id,
        documentPath: uploadedFiles[0] ? `/uploads/doc-signatures/${uploadedFiles[0].filename}` : null,
        documentName: uploadedFiles[0] ? uploadedFiles[0].originalname : null,
        documentMimeType: uploadedFiles[0] ? uploadedFiles[0].mimetype : null,
        landlordName: primarySigner.name || location.landlordName || "",
        landlordEmail: primarySigner.email,
        propertyAddress: `${location.propertyAddress}${location.unit ? ", Unit " + location.unit : ""}`,
        token: masterToken,
        status: "pending",
        createdBy: actor.id,
        signatureFields: signatureFields || null,
        signers: JSON.stringify(signersList),
        templateData: templateData || null,
      });

      // Save each uploaded file to location_doc_signature_files
      for (let i = 0; i < uploadedFiles.length; i++) {
        const f = uploadedFiles[i];
        await storage.createDocSigFile({
          sigRequestId: record.id,
          filePath: `/uploads/doc-signatures/${f.filename}`,
          fileName: f.originalname,
          mimeType: f.mimetype,
          sortOrder: i,
        });
      }

      // Include template files from admin library
      if (templateIds) {
        const ids: string[] = Array.isArray(templateIds) ? templateIds : [templateIds];
        const allTemplates = await storage.getAllDocTemplates();
        const selectedTemplates = allTemplates.filter(t => ids.includes(t.id));
        for (let i = 0; i < selectedTemplates.length; i++) {
          const t = selectedTemplates[i];
          await storage.createDocSigFile({
            sigRequestId: record.id,
            filePath: t.filePath,
            fileName: t.fileName || t.title,
            mimeType: t.mimeType || undefined,
            sortOrder: uploadedFiles.length + i,
          });
        }
      }

      const proto = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.get("host");
      const allFileNames = uploadedFiles.map(f => f.originalname).join(", ");

      // Send individual emails to each signer with their unique token link
      const signerLinks: Array<{ name: string; email: string; url: string }> = [];
      let anyEmailSent = false;
      for (const signer of signersList) {
        const signerUrl = `${proto}://${host}/doc-sign/${signer.token}`;
        signerLinks.push({ name: signer.name, email: signer.email, url: signerUrl });
        const sent = await sendEmail({
          to: signer.email,
          subject: `Document Ready for Your Signature — ${location.propertyAddress}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#1a56db;">Document Ready for Your Signature</h2>
              <p>Dear ${signer.name || "Signer"},</p>
              <p>A document has been sent to you for review and signature for the property:</p>
              <p><strong>${location.propertyAddress}${location.unit ? ", Unit " + location.unit : ""}</strong></p>
              ${allFileNames ? `<p>Documents: <strong>${allFileNames}</strong></p>` : ""}
              <div style="margin:24px 0;">
                <a href="${signerUrl}" style="background:#1a56db;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">
                  Review &amp; Sign Document
                </a>
              </div>
              <p style="color:#666;font-size:13px;">If you did not expect this email, please ignore it.</p>
            </div>`,
          text: `Please review and sign the document at: ${signerUrl}`,
        });
        if (sent) anyEmailSent = true;
      }

      const files = await storage.getFilesForDocSig(record.id);
      // Backward-compat: include signingUrl for single-signer flow
      const signingUrl = signerLinks[0]?.url || `${proto}://${host}/doc-sign/${masterToken}`;
      res.json({ record: { ...record, files }, signingUrl, signerLinks, emailSent: anyEmailSent });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/rep/locations/:id/doc-signatures  (includes files per request)
  app.get("/api/rep/locations/:id/doc-signatures", async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      const actorId = (req.query as any).actorId || user?.id;
      const actor = actorId ? await storage.getUser(actorId) : user;
      if (!actor || !["admin", "manager", "rep"].includes(actor.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const records = await storage.getDocSignaturesByLocation(req.params.id);
      const withFiles = await Promise.all(records.map(async r => ({
        ...r,
        fields: r.signatureFields ? JSON.parse(r.signatureFields) : [],
        files: await storage.getFilesForDocSig(r.id),
      })));
      res.json(withFiles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/doc-sign/:token  (public — returns record + files + fields; supports signer tokens)
  app.get("/api/doc-sign/:token", async (req, res) => {
    try {
      const { token } = req.params;
      // Try master token first (backward compat), then search signer tokens
      let record = await storage.getDocSignatureByToken(token);
      let signerEntry: any = null;
      if (!record) {
        record = await storage.getDocSignatureBySignerToken(token);
        if (record?.signers) {
          const signers = JSON.parse(record.signers);
          signerEntry = signers.find((s: any) => s.token === token) || null;
        }
      }
      if (!record) return res.status(404).json({ error: "Signing request not found" });

      const files = await storage.getFilesForDocSig(record.id);
      const allFields: any[] = record.signatureFields ? JSON.parse(record.signatureFields) : [];

      // If accessed by a signer token, return only that signer's fields
      const fields = signerEntry
        ? allFields.filter((f: any) => !f.signerId || f.signerId === signerEntry.id)
        : allFields;

      const effectiveStatus = signerEntry ? signerEntry.status : record.status;
      const effectiveSignedAt = signerEntry?.signedAt || record.signedAt;
      const effectiveSignerName = signerEntry?.signerName || record.signerName;

      res.json({
        ...record,
        status: effectiveStatus,
        signedAt: effectiveSignedAt,
        signerName: effectiveSignerName,
        signer: signerEntry,
        files,
        fields,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/doc-sign/:token  (public — submit; supports multi-signer)
  app.post("/api/doc-sign/:token", async (req, res) => {
    try {
      const { token } = req.params;
      let record = await storage.getDocSignatureByToken(token);
      let signerEntry: any = null;
      let signerIdx = -1;

      if (!record) {
        record = await storage.getDocSignatureBySignerToken(token);
        if (record?.signers) {
          const signers = JSON.parse(record.signers);
          signerIdx = signers.findIndex((s: any) => s.token === token);
          signerEntry = signerIdx >= 0 ? signers[signerIdx] : null;
        }
      }

      if (!record) return res.status(404).json({ error: "Signing request not found" });

      const isAlreadySigned = signerEntry ? signerEntry.status === "signed" : record.status === "signed";
      if (isAlreadySigned) return res.status(400).json({ error: "This document has already been signed" });

      const { signatureData, signerName, fieldResponses } = req.body;
      if (!signerName) return res.status(400).json({ error: "Signer name is required" });

      let updateData: any = {};
      if (signerEntry !== null && signerIdx >= 0 && record.signers) {
        // Update the specific signer entry inside the signers JSON
        const signers = JSON.parse(record.signers);
        signers[signerIdx] = {
          ...signers[signerIdx],
          status: "signed",
          signedAt: new Date().toISOString(),
          signatureData: signatureData || null,
          signerName,
        };
        const allSigned = signers.every((s: any) => s.status === "signed");
        updateData = {
          signers: JSON.stringify(signers),
          status: allSigned ? "signed" : "partial",
          // Update top-level for backward compat when all are done
          ...(allSigned ? { signatureData, signerName, signedAt: new Date() } : {}),
          signatureFields: fieldResponses ? JSON.stringify(fieldResponses) : record.signatureFields,
        };
      } else {
        // Legacy single-signer flow
        updateData = {
          status: "signed",
          signatureData,
          signerName,
          signedAt: new Date(),
          signatureFields: fieldResponses ? JSON.stringify(fieldResponses) : record.signatureFields,
        };
      }

      const updated = await storage.updateDocSignature(record.id, updateData);

      // Auto-attach document files to rep_documents via the location's active lead (only when fully signed).
      // For PDFs, stamp the captured signature onto a clean appended landlord signature page
      // and attach the SIGNED PDF (not the original) to documents. Also email signed copies
      // to the client(s) as confirmation of completion.
      if (updateData.status === "signed") {
        const signedFilesForEmail: { absPath: string; fileName: string }[] = [];
        try {
          const leads = await storage.getLeadsForLocation(record.locationId);
          const activeLead = leads.find(l => l.status !== "Declined") || leads[0];

          // Determine the signature data to stamp (use top-level or last signer's data)
          let sigDataToStamp: string | null = signatureData || null;
          let stampSignerName: string = signerName || "";
          if (!sigDataToStamp && record.signers) {
            try {
              const ss = JSON.parse(record.signers);
              const signed = ss.filter((s: any) => s.signatureData);
              if (signed.length > 0) {
                sigDataToStamp = signed[signed.length - 1].signatureData;
                stampSignerName = signed[signed.length - 1].signerName || stampSignerName;
              }
            } catch {}
          }

          const files = await storage.getFilesForDocSig(record.id);
          for (const f of files) {
            let attachPath = f.filePath;
            let attachName = f.fileName || "Signed Document";
            const isPdf = f.mimeType === "application/pdf" || (f.filePath || "").toLowerCase().endsWith(".pdf");
            if (isPdf && sigDataToStamp && stampSignerName) {
              const signedPath = await stampSignatureOnPdf(f.filePath, sigDataToStamp, stampSignerName);
              if (signedPath) {
                attachPath = signedPath;
                attachName = `Signed - ${attachName}`;
              }
            }
            if (activeLead) {
              await storage.createRepDocument({
                rgLeadId: activeLead.id,
                documentRequestId: null,
                docType: "signed-document",
                fileName: attachName,
                fileUrl: attachPath,
                fileSize: null,
              });
            }
            // Collect absolute path for email attachment
            const abs = path.join(process.cwd(), "client", "public", attachPath.replace(/^\//, ""));
            if (fs.existsSync(abs)) signedFilesForEmail.push({ absPath: abs, fileName: attachName });
          }
        } catch (e) {
          console.error("[doc-sign] Failed to attach signed docs:", e);
        }

        // Email signed copies to the client(s) as confirmation
        try {
          // Collect recipient emails: top-level landlordEmail + any signer emails
          const recipients = new Set<string>();
          if (record.landlordEmail) recipients.add(record.landlordEmail);
          if (record.signers) {
            try {
              const ss = JSON.parse(record.signers);
              for (const s of ss) {
                if (s.email) recipients.add(s.email);
              }
            } catch {}
          }
          if (recipients.size > 0 && signedFilesForEmail.length > 0) {
            const docTitle = record.documentName || "Signed Document";
            const propertyAddr = record.propertyAddress ? `<p style="margin:8px 0;color:#555;"><strong>Property:</strong> ${record.propertyAddress}</p>` : "";
            const html = `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                <h2 style="color:#1e40af;margin-top:0;">Your Signed Document — Confirmation of Completion</h2>
                <p style="color:#333;font-size:15px;">Hello${stampSignerName ? ` ${stampSignerName}` : ""},</p>
                <p style="color:#333;font-size:15px;">Thank you for signing <strong>${docTitle}</strong>. A fully signed copy is attached to this email for your records.</p>
                ${propertyAddr}
                <p style="color:#333;font-size:15px;">Signed on ${new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}.</p>
                <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
                <p style="color:#888;font-size:12px;">This is an automated confirmation from QuoteUs.ca. The use of electronic signatures has the same legal effect and enforceability as a handwritten signature.</p>
              </div>
            `;
            const attachments = signedFilesForEmail.map(f => ({ filename: f.fileName, path: f.absPath }));
            for (const to of recipients) {
              await sendEmail({
                to,
                subject: `Signed Copy — ${docTitle}`,
                html,
                attachments,
              });
            }
          }
        } catch (e) {
          console.error("[doc-sign] Failed to email signed copy to client:", e);
        }
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Service Agreements ────────────────────────────────────────────
  // GET /api/rep/locations/:id/service-agreements
  app.get("/api/rep/locations/:id/service-agreements", async (req, res) => {
    try {
      const actorId = (req.query as any).actorId;
      const actor = actorId ? await storage.getUser(actorId) : (req.session as any)?.user;
      if (!actor || !["admin", "manager", "rep"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      const agreements = await storage.getServiceAgreementsByLocation(req.params.id);
      res.json(agreements);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/rep/locations/:id/service-agreements
  app.post("/api/rep/locations/:id/service-agreements", async (req, res) => {
    try {
      const { actorId, ...data } = req.body;
      const actor = actorId ? await storage.getUser(actorId) : (req.session as any)?.user;
      if (!actor || !["admin", "manager", "rep"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      const agreement = await storage.createServiceAgreement({ ...data, locationId: req.params.id });
      res.json(agreement);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // PATCH /api/rep/service-agreements/:id
  app.patch("/api/rep/service-agreements/:id", async (req, res) => {
    try {
      const { actorId, ...data } = req.body;
      const actor = actorId ? await storage.getUser(actorId) : (req.session as any)?.user;
      if (!actor || !["admin", "manager", "rep"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      const updated = await storage.updateServiceAgreement(req.params.id, data);
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /api/rep/service-agreements/:id
  app.delete("/api/rep/service-agreements/:id", async (req, res) => {
    try {
      const actorId = (req.query as any).actorId;
      const actor = actorId ? await storage.getUser(actorId) : (req.session as any)?.user;
      if (!actor || !["admin", "manager", "rep"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      await storage.deleteServiceAgreement(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/rep/service-agreements/:id/send — email signing link to client
  app.post("/api/rep/service-agreements/:id/send", async (req, res) => {
    try {
      const { actorId } = req.body;
      const actor = actorId ? await storage.getUser(actorId) : (req.session as any)?.user;
      if (!actor || !["admin", "manager", "rep"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      const sa = await storage.getServiceAgreement(req.params.id);
      if (!sa) return res.status(404).json({ error: "Agreement not found" });
      if (!sa.landlordEmail) return res.status(400).json({ error: "Landlord email is required before sending" });

      const proto = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const signingUrl = `${proto}://${host}/service-sign/${sa.token}`;

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px">
          <div style="background:#1a56db;border-radius:8px;padding:20px 24px;margin-bottom:20px">
            <h1 style="color:#fff;margin:0;font-size:20px">QuoteUs.ca Service Agreement</h1>
          </div>
          <p style="color:#374151;font-size:15px">Hello <strong>${sa.landlordName || "there"}</strong>,</p>
          <p style="color:#374151;font-size:15px">Your service agreement for <strong>${sa.propertyAddress}</strong> is ready for your review and signature.</p>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px">Service Details</p>
            <p style="margin:0 0 4px;color:#111827;font-size:14px"><strong>Tenant Type:</strong> ${sa.tenantType === "new" ? "New Tenants" : "Existing Tenants"}</p>
            <p style="margin:0 0 4px;color:#111827;font-size:14px"><strong>Service Fee:</strong> $${sa.serviceFee}</p>
            ${sa.serviceStartDate ? `<p style="margin:0;color:#111827;font-size:14px"><strong>Start Date:</strong> ${sa.serviceStartDate}</p>` : ""}
          </div>
          <a href="${signingUrl}" style="display:inline-block;background:#1a56db;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin:8px 0">
            Review &amp; Sign Agreement →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">If you did not expect this email, please ignore it. This link is unique to your agreement.</p>
        </div>`;

      await sendEmail({ to: sa.landlordEmail, subject: "Your QuoteUs.ca Service Agreement — Signature Required", html });
      await storage.updateServiceAgreement(sa.id, { status: "sent" });
      res.json({ success: true, signingUrl });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/rep/service-agreements/:id/attachments
  app.get("/api/rep/service-agreements/:id/attachments", async (req, res) => {
    try {
      const attachments = await storage.getSaAttachments(req.params.id);
      res.json(attachments);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/rep/service-agreements/:id/attachments
  app.post("/api/rep/service-agreements/:id/attachments", async (req, res) => {
    try {
      const { fileName, fileData, fileType } = req.body;
      if (!fileName || !fileData) return res.status(400).json({ error: "fileName and fileData are required" });
      const attachment = await storage.addSaAttachment({ saId: req.params.id, fileName, fileData, fileType: fileType || "application/octet-stream" });
      res.json(attachment);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /api/rep/service-agreements/:id/attachments/:attachId
  app.delete("/api/rep/service-agreements/:id/attachments/:attachId", async (req, res) => {
    try {
      await storage.removeSaAttachment(req.params.attachId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/service-sign/:token — public signing page data
  app.get("/api/service-sign/:token", async (req, res) => {
    try {
      const sa = await storage.getServiceAgreementByToken(req.params.token);
      if (!sa) return res.status(404).json({ error: "Agreement not found" });
      const attachments = await storage.getSaAttachments(sa.id);
      res.json({ ...sa, attachments });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/service-sign/:token — public: submit signature
  app.post("/api/service-sign/:token", async (req, res) => {
    try {
      const sa = await storage.getServiceAgreementByToken(req.params.token);
      if (!sa) return res.status(404).json({ error: "Agreement not found" });
      if (sa.status === "signed") return res.status(400).json({ error: "This agreement has already been signed" });
      const { signatureData, signerName } = req.body;
      if (!signerName?.trim()) return res.status(400).json({ error: "Signer name is required" });
      const updated = await storage.updateServiceAgreement(sa.id, {
        status: "signed",
        signatureData,
        signerName,
        signedAt: new Date(),
      });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Admin Document Template Library ──────────────────────────────
  app.post("/api/admin/doc-templates", docSignUpload.single("document"), async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      const actorId = req.body?.actorId || user?.id;
      const actor = actorId ? await storage.getUser(actorId) : user;
      if (!actor || !["admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      if (!req.file) return res.status(400).json({ error: "File is required" });
      const { title } = req.body;
      if (!title) return res.status(400).json({ error: "Title is required" });
      const template = await storage.createDocTemplate({
        title,
        filePath: `/uploads/doc-signatures/${req.file.filename}`,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        uploadedBy: actor.id,
      });
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/doc-templates", async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      const actorId = (req.query as any).actorId || user?.id;
      const actor = actorId ? await storage.getUser(actorId) : user;
      if (!actor || !["admin", "manager", "rep"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      const templates = await storage.getAllDocTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/doc-templates/:id", async (req, res) => {
    try {
      const user = (req.session as any)?.user;
      const actorId = req.body?.actorId || (req.query as any).actorId || user?.id;
      const actor = actorId ? await storage.getUser(actorId) : user;
      if (!actor || !["admin", "manager"].includes(actor.role)) return res.status(403).json({ error: "Access denied" });
      await storage.deleteDocTemplate(req.params.id);
      res.json({ success: true });
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
      const toEmail = processingEmailSetting || adminEmail;

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

  // ============== ADMIN REPORTS OVERVIEW ==============

  app.get("/api/admin/reports/overview", async (req, res) => {
    try {
      const actorId = req.query.actorId as string;
      const actor = actorId ? await storage.getUser(actorId) : (req as any).user;
      if (!actor || !["admin", "manager"].includes(actor.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const [allRgLeads, allRgPayments, allTransactions] = await Promise.all([
        storage.getAllRgLeads(),
        storage.getAllRgPayments(),
        storage.getAllTransactions(),
      ]);

      // RG leads by status
      const rgLeadsByStatus: Record<string, number> = {};
      allRgLeads.forEach(l => {
        rgLeadsByStatus[l.status] = (rgLeadsByStatus[l.status] || 0) + 1;
      });

      // RG leads over last 12 months
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const now = new Date();
      const rgLeadsOverTime: { name: string; leads: number; month: number; year: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        rgLeadsOverTime.push({ name: `${months[d.getMonth()]} ${d.getFullYear()}`, leads: 0, month: d.getMonth(), year: d.getFullYear() });
      }
      allRgLeads.forEach(l => {
        const d = new Date(l.createdAt);
        const entry = rgLeadsOverTime.find(e => e.month === d.getMonth() && e.year === d.getFullYear());
        if (entry) entry.leads++;
      });

      // RG revenue (paid only)
      const paidRgPayments = allRgPayments.filter(p => p.status === "paid");
      const totalRgRevenue = paidRgPayments.reduce((sum, p) => sum + p.amountCents, 0);
      const rgRevenueOverTime: { name: string; revenue: number; month: number; year: number }[] = rgLeadsOverTime.map(e => ({ ...e, revenue: 0, leads: undefined as any }));
      paidRgPayments.forEach(p => {
        const d = new Date(p.paidAt || p.createdAt);
        const entry = rgRevenueOverTime.find(e => e.month === d.getMonth() && e.year === d.getFullYear());
        if (entry) entry.revenue += p.amountCents;
      });
      rgRevenueOverTime.forEach(e => { (e as any).revenue = e.revenue / 100; });

      // Broker credit purchase revenue (transactions with positive amount)
      const creditPurchases = allTransactions.filter(t => t.type === "credit_purchase" && parseFloat(t.amount) > 0);
      const totalCreditRevenue = creditPurchases.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const creditRevenueOverTime: { name: string; revenue: number; month: number; year: number }[] = rgLeadsOverTime.map(e => ({ ...e, revenue: 0, leads: undefined as any }));
      creditPurchases.forEach(t => {
        const d = new Date(t.createdAt);
        const entry = creditRevenueOverTime.find(e => e.month === d.getMonth() && e.year === d.getFullYear());
        if (entry) entry.revenue += parseFloat(t.amount);
      });

      // Issued/Cancelled trends
      const issuedLeads = allRgLeads.filter(l => l.status === "Issued").length;
      const cancelledLeads = allRgLeads.filter(l => l.status === "Cancelled").length;
      const approvedLeads = allRgLeads.filter(l => l.status === "Approved").length;
      const newLeads = allRgLeads.filter(l => l.status === "New").length;

      // Monthly combined revenue (rg + credits)
      const combinedRevenueOverTime = rgLeadsOverTime.map((e, i) => ({
        name: e.name,
        rgRevenue: rgRevenueOverTime[i].revenue,
        creditRevenue: creditRevenueOverTime[i].revenue,
        total: rgRevenueOverTime[i].revenue + creditRevenueOverTime[i].revenue,
      }));

      res.json({
        rgLeadsByStatus: Object.entries(rgLeadsByStatus).map(([name, value]) => ({ name, value })),
        rgLeadsOverTime: rgLeadsOverTime.map(e => ({ name: e.name, leads: e.leads })),
        rgRevenueOverTime: rgRevenueOverTime.map(e => ({ name: e.name, revenue: (e as any).revenue })),
        creditRevenueOverTime: creditRevenueOverTime.map(e => ({ name: e.name, revenue: e.revenue })),
        combinedRevenueOverTime,
        totalRgRevenue: totalRgRevenue / 100,
        totalCreditRevenue,
        totalRevenue: totalRgRevenue / 100 + totalCreditRevenue,
        totalRgLeads: allRgLeads.length,
        issuedLeads,
        cancelledLeads,
        approvedLeads,
        newLeads,
      });
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

  // ── AI Mascot Chat ────────────────────────────────────────────────────────────

  // POST /api/chat/message — smart rule-based (+ optional OpenAI) chat handler
  app.post("/api/chat/message", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) return res.status(400).json({ error: "message required" });

      // Try OpenAI if key is available
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey) {
        try {
          const { OpenAI } = await import("openai");
          const ai = new OpenAI({ apiKey: openaiKey });
          const msgs: any[] = [
            {
              role: "system",
              content: `You are a friendly insurance advisor for QuoteUs.ca, an Ontario insurance platform. 
You help visitors understand insurance options and connect them with brokers.
Insurance types offered: Auto, Home, Tenant, Business, Life, Travel, Pet, Mortgage, Rent Guarantee.
Keep answers concise (2-4 sentences). Always be helpful and suggest booking a callback or getting a free quote.
When someone wants to book a callback, tell them to click "Book a Callback" button.
When someone wants more info by email, tell them to click "Email Me Info" button.
Do not make up specific prices. Encourage them to fill out a free quote form.`
            },
            ...(Array.isArray(history) ? history : []),
            { role: "user", content: message }
          ];
          const completion = await ai.chat.completions.create({ model: "gpt-4o-mini", messages: msgs, max_tokens: 300 });
          const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that. Please try again.";
          return res.json({ reply, source: "ai" });
        } catch {
          // Fall through to rule-based
        }
      }

      // Rule-based system
      const q = message.toLowerCase();
      let reply = "";

      if (/auto|car|vehicle|driving|driver|collision|liability/.test(q)) {
        reply = "Auto insurance in Ontario is mandatory and covers liability, collision, and comprehensive protection. Rates depend on your driving history, vehicle type, and location. We work with top insurers to get you competitive quotes — would you like a free auto quote or to speak with a broker?";
      } else if (/home|house|homeowner|property|dwelling/.test(q)) {
        reply = "Home insurance protects your home's structure and your belongings against fire, theft, water damage, and more. In Ontario, rates vary by location, home age, and coverage level. Get a free home insurance quote through our site or book a callback to discuss your needs.";
      } else if (/tenant|renter|apartment|condo|rental/.test(q)) {
        reply = "Tenant insurance covers your personal belongings and provides liability protection — even in a rented apartment or condo. It's very affordable, often under $20/month. Want a free tenant insurance quote?";
      } else if (/business|commercial|liability|professional/.test(q)) {
        reply = "Business insurance protects your company from liability claims, property damage, and other risks. Coverage depends on your industry and business size. Our brokers specialize in Ontario small business coverage. Book a callback to discuss your specific needs.";
      } else if (/life|death benefit|term life|whole life/.test(q)) {
        reply = "Life insurance provides financial security for your loved ones. We offer term and whole life options through our licensed brokers. The right coverage depends on your age, health, and financial goals. Would you like a broker to contact you?";
      } else if (/travel|trip|vacation|medical emergency|abroad/.test(q)) {
        reply = "Travel insurance covers emergency medical expenses, trip cancellation, lost luggage, and more. We partner with TuGo for comprehensive travel coverage. Get a quote directly through our Travel page or book a callback.";
      } else if (/pet|dog|cat|animal|vet/.test(q)) {
        reply = "Pet insurance helps cover unexpected vet bills for accidents and illnesses. Plans can cover surgeries, medications, and routine care. Get a free pet insurance quote through QuoteUs.ca.";
      } else if (/mortgage|lender|mortgage protection/.test(q)) {
        reply = "Mortgage protection insurance ensures your mortgage is covered if you're unable to make payments due to disability, illness, or death. We can match you with the right policy through our broker network. Want to book a callback?";
      } else if (/rent guarantee|landlord|tenant screening|rental income/.test(q)) {
        reply = "Rent Guarantee insurance protects landlords from lost rental income if a tenant defaults. We offer specialized Rent Guarantee plans for Ontario landlords. Contact us for a custom quote.";
      } else if (/price|cost|rate|how much|cheap|afford|premium/.test(q)) {
        reply = "Insurance rates depend on many factors like your location, age, coverage needs, and history. The best way to find out is to fill out our free quote form — it takes just 2 minutes and we'll find you the most competitive rate.";
      } else if (/claim|accident|incident|report/.test(q)) {
        reply = "For a claims question, contact your insurance provider directly using the number on your policy documents. Your broker can also assist. Would you like to book a callback to speak with one of our brokers?";
      } else if (/broker|agent|advisor|speak|talk|call/.test(q)) {
        reply = "Our licensed Ontario insurance brokers are ready to help you find the best coverage. You can book a callback below and a broker will reach out at your preferred time, or call us at 1-877-253-2695.";
      } else if (/quote|compare|get quote|free quote/.test(q)) {
        reply = "Getting a quote is fast and free! Use our quote forms for Auto, Home, Tenant, Business, Life, Travel, Pet, Mortgage, or Rent Guarantee insurance. Just click the insurance type in the navigation menu to get started.";
      } else if (/hello|hi|hey|good morning|good afternoon|greetings/.test(q)) {
        reply = "Hello! I'm the QuoteUs.ca virtual assistant. I can help you understand your insurance options, answer questions, book a callback with a broker, or arrange to have information sent to your email. What can I help you with today?";
      } else if (/who|what is quoteus|about you|about quoteus/.test(q)) {
        reply = "QuoteUs.ca is an Ontario-based insurance comparison platform. We help residents find competitive quotes for Auto, Home, Tenant, Business, Life, Travel, Pet, Mortgage, and Rent Guarantee insurance. Our licensed brokers work hard to get you the best coverage at the best price.";
      } else if (/email|information|send info|more info/.test(q)) {
        reply = "I can arrange to have detailed information about any insurance type sent to your email. Click the \"Email Me Info\" button below and fill in your details — we'll get back to you within one business day.";
      } else if (/appointment|book|callback|schedule|call me|call back/.test(q)) {
        reply = "I can book you a callback with one of our licensed brokers. Click \"Book a Callback\" below, enter your name, phone number, and preferred time, and a broker will call you.";
      } else if (/thank|thanks|great|awesome|helpful/.test(q)) {
        reply = "You're very welcome! Is there anything else I can help you with? I'm here to answer any insurance questions or connect you with a broker.";
      } else {
        reply = "Thanks for your question! For specific insurance advice, our licensed brokers are the best resource. You can book a free callback below, or call us at 1-877-253-2695. I can also help answer questions about Auto, Home, Tenant, Business, Life, Travel, Pet, Mortgage, or Rent Guarantee insurance.";
      }

      res.json({ reply, source: "rules" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/chat/book-appointment — book a callback appointment
  app.post("/api/chat/book-appointment", async (req, res) => {
    try {
      const { name, phone, preferredTime, topic } = req.body;
      if (!name || !phone) return res.status(400).json({ error: "name and phone required" });

      const emailHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px">
          <div style="background:#1e3a5f;color:white;padding:20px;border-radius:8px;margin-bottom:24px;text-align:center">
            <h2 style="margin:0">📅 New Callback Request</h2>
          </div>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;font-weight:bold;color:#555">Name:</td><td style="padding:8px">${name}</td></tr>
            <tr style="background:#f0f4ff"><td style="padding:8px;font-weight:bold;color:#555">Phone:</td><td style="padding:8px">${phone}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555">Preferred Time:</td><td style="padding:8px">${preferredTime || "Any time"}</td></tr>
            <tr style="background:#f0f4ff"><td style="padding:8px;font-weight:bold;color:#555">Topic:</td><td style="padding:8px">${topic || "General inquiry"}</td></tr>
          </table>
          <p style="color:#888;font-size:13px;margin-top:24px">This request was submitted via the QuoteUs.ca AI Chat Assistant.</p>
        </div>`;

      await sendEmail({
        to: "info@quoteus.ca",
        subject: `📅 Callback Request: ${name} — ${phone}`,
        html: emailHtml
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/chat/contact — send email for more information
  app.post("/api/chat/contact", async (req, res) => {
    try {
      const { name, email, topic, message } = req.body;
      if (!name || !email) return res.status(400).json({ error: "name and email required" });

      const emailHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px">
          <div style="background:#1e3a5f;color:white;padding:20px;border-radius:8px;margin-bottom:24px;text-align:center">
            <h2 style="margin:0">✉️ Info Request from Chat</h2>
          </div>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;font-weight:bold;color:#555">Name:</td><td style="padding:8px">${name}</td></tr>
            <tr style="background:#f0f4ff"><td style="padding:8px;font-weight:bold;color:#555">Email:</td><td style="padding:8px">${email}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555">Topic:</td><td style="padding:8px">${topic || "General information"}</td></tr>
            <tr style="background:#f0f4ff"><td style="padding:8px;font-weight:bold;color:#555">Message:</td><td style="padding:8px">${message || "(none)"}</td></tr>
          </table>
          <p style="color:#888;font-size:13px;margin-top:24px">This request was submitted via the QuoteUs.ca AI Chat Assistant.</p>
        </div>`;

      await sendEmail({
        to: "info@quoteus.ca",
        subject: `✉️ Info Request: ${name} (${topic || "General"})`,
        html: emailHtml
      });

      // Confirm to visitor
      const confirmHtml = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1e3a5f">Thank you, ${name}!</h2>
          <p>We've received your request for more information about <strong>${topic || "insurance"}</strong>. One of our licensed brokers will email you at <strong>${email}</strong> within one business day.</p>
          <p>In the meantime, you're welcome to explore our free quote tools at <a href="https://quoteus.ca">QuoteUs.ca</a>.</p>
        </div>`;
      sendEmail({ to: email, subject: "Your Information Request — QuoteUs.ca", html: confirmHtml });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
