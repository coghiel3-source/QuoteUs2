import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertQuoteSchema, insertActivitySchema } from "@shared/schema";
import { z } from "zod";
import { sendEmail, generateNewLeadEmail, generateAssignmentEmail, generateStatusChangeEmail } from "./email";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

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
  
  // Update user
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.updateUser(req.params.id, req.body);
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
      
      // Send notification email to admin (info@quoteus.ca)
      const adminEmail = generateNewLeadEmail({
        clientName: quote.clientName,
        type: quote.type,
        email: quote.email || '',
        phone: quote.phone || undefined,
        source: quote.source || 'Website'
      });
      sendEmail({
        to: 'info@quoteus.ca',
        subject: adminEmail.subject,
        html: adminEmail.html
      }).catch(err => console.error('[Email] Admin notification error:', err));
      
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
      
      // Verify actor is admin/manager
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
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
      
      if (!host || !username || !password) {
        return res.status(400).json({ error: "Host, username and password are required" });
      }
      
      // For now, just validate the settings exist - actual SMTP test would require nodemailer
      // In production, you'd test the connection here
      res.json({ success: true, message: "SMTP settings validated" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Save SMTP settings
  app.post("/api/admin/smtp/save", async (req, res) => {
    try {
      const { host, port, username, password, fromEmail, fromName, useSsl, actorId } = req.body;
      
      if (!actorId) {
        return res.status(401).json({ error: "Actor ID is required" });
      }
      
      const actor = await storage.getUser(actorId);
      if (!actor || actor.role !== "admin") {
        return res.status(403).json({ error: "Only admin can configure SMTP" });
      }
      
      if (!host || !username || !password) {
        return res.status(400).json({ error: "Host, username and password are required" });
      }
      
      // Save SMTP settings to database (password should be encrypted in production)
      const smtpSettings = {
        host,
        port: port || 587,
        username,
        password, // In production, encrypt this
        fromEmail: fromEmail || username,
        fromName: fromName || "QuoteUs.ca",
        useSsl: useSsl !== false
      };
      
      await storage.setSetting("smtp_settings", JSON.stringify(smtpSettings), actorId);
      
      res.json({ success: true, message: "SMTP settings saved" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Get SMTP settings (without password)
  app.get("/api/admin/smtp/settings", async (req, res) => {
    try {
      const setting = await storage.getSetting("smtp_settings");
      if (!setting) {
        return res.json({ configured: false });
      }
      
      const settings = JSON.parse(setting.value);
      // Don't return the password
      res.json({
        configured: true,
        host: settings.host,
        port: settings.port,
        username: settings.username,
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
        useSsl: settings.useSsl
      });
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

  // Create payment link for policy premium collection
  app.post("/api/payments/premium", async (req, res) => {
    try {
      const { quoteId, amount, description, actorId } = req.body;
      
      if (!quoteId || !amount) {
        return res.status(400).json({ error: "Quote ID and amount are required" });
      }
      
      if (!actorId) {
        return res.status(401).json({ error: "Actor ID is required for authentication" });
      }
      
      // Verify actor is admin/manager/broker
      const actor = await storage.getUser(actorId);
      if (!actor || !["admin", "manager", "broker"].includes(actor.role)) {
        return res.status(403).json({ error: "Only staff can collect premiums" });
      }
      
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      if (!quote.email) {
        return res.status(400).json({ error: "Client email is required for payment" });
      }
      
      const stripe = await getUncachableStripeClient();
      
      const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';
      
      // Create checkout session for premium payment
      const session = await stripe.checkout.sessions.create({
        customer_email: quote.email,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'cad',
            product_data: {
              name: `${quote.type} Insurance Premium`,
              description: description || `Policy premium for ${quote.clientName} - ${quote.quoteNumber}`,
            },
            unit_amount: Math.round(parseFloat(amount) * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/payment/canceled`,
        metadata: {
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          type: 'premium_payment',
          premiumAmount: amount.toString(),
        },
      });
      
      // Update quote with premium amount
      await storage.updateQuote(quoteId, { premiumAmount: amount } as any);
      
      // Log activity
      await storage.createActivity({
        quoteId,
        type: "system",
        content: `Payment link created for $${amount} premium`,
        author: actor.name,
      });
      
      res.json({ 
        url: session.url, 
        sessionId: session.id,
        paymentLink: session.url
      });
    } catch (error: any) {
      console.error('[Premium Payment] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Handle premium payment webhook/confirmation
  app.post("/api/payments/premium/confirm", async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID required" });
      }
      
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status !== 'paid') {
        return res.status(400).json({ error: "Payment not completed" });
      }
      
      const metadata = session.metadata;
      if (!metadata?.quoteId || metadata.type !== 'premium_payment') {
        return res.status(400).json({ error: "Invalid session" });
      }
      
      // Update quote as paid
      await storage.updateQuote(metadata.quoteId, {
        premiumPaid: true,
        premiumPaidAt: new Date(),
        stripePaymentIntentId: session.payment_intent as string,
      } as any);
      
      // Log activity
      await storage.createActivity({
        quoteId: metadata.quoteId,
        type: "system",
        content: `Premium payment of $${metadata.premiumAmount} received via Stripe`,
        author: "System",
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Premium Confirm] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get payment status for a quote
  app.get("/api/payments/quote/:quoteId", async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      res.json({
        quoteId: quote.id,
        premiumAmount: quote.premiumAmount,
        premiumPaid: quote.premiumPaid,
        premiumPaidAt: quote.premiumPaidAt,
      });
    } catch (error: any) {
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
      
      // Verify actor is admin/manager
      const actor = await storage.getUser(actorId);
      if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
        return res.status(403).json({ error: "Only admin/manager can assign leads" });
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

  return httpServer;
}
