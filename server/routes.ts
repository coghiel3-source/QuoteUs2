import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertQuoteSchema, insertActivitySchema } from "@shared/schema";
import { z } from "zod";

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
      const quote = await storage.updateQuote(req.params.id, req.body);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
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

  return httpServer;
}
