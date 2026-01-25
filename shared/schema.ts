import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, pgEnum, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "broker", "customer"]);
export const userStatusEnum = pgEnum("user_status", ["active", "pending", "paused", "cancelled", "denied"]);
export const quoteTypeEnum = pgEnum("quote_type", ["Auto", "Home", "Tenant", "Business", "Life", "Travel", "Pet", "General"]);
export const quoteStatusEnum = pgEnum("quote_status", ["New", "Contacted", "Quoted", "Bound", "Follow-Up", "Closed", "Lost"]);
export const priorityEnum = pgEnum("priority", ["High", "Medium", "Low"]);
export const activityTypeEnum = pgEnum("activity_type", ["status_change", "assignment", "note", "email_sent", "system"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["credit_purchase", "lead_deduction", "manual_credit", "adjustment", "refund"]);

// Users Table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  password: text("password"),
  role: userRoleEnum("role").notNull().default("customer"),
  status: userStatusEnum("status").notNull().default("active"),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  leadCostOverride: decimal("lead_cost_override", { precision: 10, scale: 2 }),
  stripeCustomerId: text("stripe_customer_id"),
  brokerage: text("brokerage"),
  yearsOfService: integer("years_of_service"),
  productTypes: text("product_types").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Transactions Table - logs all balance changes
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  reason: text("reason"),
  quoteId: varchar("quote_id").references(() => quotes.id),
  stripePaymentId: text("stripe_payment_id"),
  actorId: varchar("actor_id").references(() => users.id),
  actorName: text("actor_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// System Settings Table - for lead pricing etc
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  premiumAmount: decimal("premium_amount", { precision: 10, scale: 2 }),
  premiumPaid: boolean("premium_paid").default(false),
  premiumPaidAt: timestamp("premium_paid_at"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
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

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

// Select Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
