import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, pgEnum, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "broker", "customer"]);
export const userStatusEnum = pgEnum("user_status", ["active", "pending", "paused", "cancelled", "denied"]);
export const quoteTypeEnum = pgEnum("quote_type", ["Auto", "Home", "Tenant", "Business", "Life", "Travel", "Pet", "Mortgage", "General"]);
export const quoteStatusEnum = pgEnum("quote_status", ["New", "Contacted", "Quoted", "Bound", "Follow-Up", "Closed", "Lost", "Win", "Lose", "Expired"]);
export const priorityEnum = pgEnum("priority", ["High", "Medium", "Low"]);
export const activityTypeEnum = pgEnum("activity_type", ["status_change", "assignment", "note", "email_sent", "system"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["credit_purchase", "lead_deduction", "manual_credit", "adjustment", "refund"]);
export const brokerTierEnum = pgEnum("broker_tier", ["bronze", "silver", "gold", "platinum"]);
export const adMediaTypeEnum = pgEnum("ad_media_type", ["image", "video"]);
export const adStatusEnum = pgEnum("ad_status", ["active", "paused", "scheduled", "expired"]);

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
  permissions: jsonb("permissions"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  pauseStartDate: timestamp("pause_start_date"),
  pauseEndDate: timestamp("pause_end_date"),
  googleId: text("google_id"),
  assignedPostalCodes: text("assigned_postal_codes").array(),
  assignedCities: text("assigned_cities").array(),
  brokerTier: brokerTierEnum("broker_tier"),
  preferredInsuranceTypes: text("preferred_insurance_types").array(),
  preferredDemographics: text("preferred_demographics"),
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
  assignedAt: timestamp("assigned_at"),
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

// Advertisements Table
export const advertisements = pgTable("advertisements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  mediaType: adMediaTypeEnum("media_type").notNull().default("image"),
  mediaUrl: text("media_url").notNull(),
  linkUrl: text("link_url"),
  openInPopup: boolean("open_in_popup").notNull().default(false),
  targetPages: text("target_pages").array().notNull().default([]),
  status: adStatusEnum("status").notNull().default("active"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  priority: integer("priority").notNull().default(1),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  previewToken: varchar("preview_token").default(sql`gen_random_uuid()`),
  approvalStatus: text("approval_status").default("pending"),
  adText: text("ad_text"),
  textColor: text("text_color").default("#ffffff"),
  backgroundColor: text("background_color").default("#1e3a5f"),
  textPosition: text("text_position").default("bottom"),
  topText: text("top_text"),
  centerText: text("center_text"),
  bottomText: text("bottom_text"),
  topTextColor: text("top_text_color").default("#ffffff"),
  centerTextColor: text("center_text_color").default("#ffffff"),
  bottomTextColor: text("bottom_text_color").default("#ffffff"),
  topBgColor: text("top_bg_color").default("#1e3a5f"),
  centerBgColor: text("center_bg_color").default("#1e3a5f"),
  bottomBgColor: text("bottom_bg_color").default("#1e3a5f"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Broker Notes Table - internal notes by admin/manager, NOT visible to brokers
export const brokerNotes = pgTable("broker_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brokerId: varchar("broker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Partner Redirects Table - for redirecting users to partner sites after quote submission
export const partnerRedirects = pgTable("partner_redirects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteType: quoteTypeEnum("quote_type").notNull().unique(),
  redirectUrl: text("redirect_url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export const insertAdvertisementSchema = createInsertSchema(advertisements).omit({
  id: true,
  impressions: true,
  clicks: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBrokerNoteSchema = createInsertSchema(brokerNotes).omit({
  id: true,
  createdAt: true,
});

export const insertPartnerRedirectSchema = createInsertSchema(partnerRedirects).omit({
  id: true,
  createdAt: true,
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

export type Advertisement = typeof advertisements.$inferSelect;
export type InsertAdvertisement = z.infer<typeof insertAdvertisementSchema>;

export type BrokerNote = typeof brokerNotes.$inferSelect;
export type InsertBrokerNote = z.infer<typeof insertBrokerNoteSchema>;

export type PartnerRedirect = typeof partnerRedirects.$inferSelect;
export type InsertPartnerRedirect = z.infer<typeof insertPartnerRedirectSchema>;
