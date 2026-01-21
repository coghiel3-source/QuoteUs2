import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "broker", "customer"]);
export const userStatusEnum = pgEnum("user_status", ["active", "pending", "paused", "cancelled", "denied"]);
export const quoteTypeEnum = pgEnum("quote_type", ["Auto", "Home", "Tenant", "Business", "Life", "Travel", "Pet", "General"]);
export const quoteStatusEnum = pgEnum("quote_status", ["New", "Contacted", "Quoted", "Bound", "Follow-Up", "Closed", "Lost"]);
export const priorityEnum = pgEnum("priority", ["High", "Medium", "Low"]);
export const activityTypeEnum = pgEnum("activity_type", ["status_change", "assignment", "note", "email_sent", "system"]);

// Users Table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  password: text("password"),
  role: userRoleEnum("role").notNull().default("customer"),
  status: userStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Quotes/Leads Table
export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteNumber: text("quote_number").notNull().unique(),
  type: quoteTypeEnum("type").notNull(),
  clientName: text("client_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  postalCode: text("postal_code"),
  status: quoteStatusEnum("status").notNull().default("New"),
  priority: priorityEnum("priority").notNull().default("Medium"),
  source: text("source").notNull().default("Web Form"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  internalNotes: text("internal_notes").default(""),
  details: jsonb("details").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Activity Log Table
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  type: activityTypeEnum("type").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  quoteNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

// Select Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
