import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, pgEnum, boolean, decimal, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "partner", "broker", "customer", "rep"]);
export const userStatusEnum = pgEnum("user_status", ["active", "pending", "paused", "cancelled", "denied"]);
export const quoteTypeEnum = pgEnum("quote_type", ["Auto", "Home", "Tenant", "Business", "Life", "Travel", "Pet", "Mortgage", "Rent Guarantee", "General"]);
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
  referenceId: varchar("reference_id", { length: 6 }).unique(),
  partnerAccountNumber: varchar("partner_account_number", { length: 12 }).unique(),
  // Rep commission settings (set by admin/manager)
  commissionType: varchar("commission_type", { length: 20 }), // "percentage" | "fixed"
  commissionRate: decimal("commission_rate", { precision: 10, scale: 4 }), // percent or $ per payment
  payoutSchedule: varchar("payout_schedule", { length: 20 }), // "monthly" | "quarterly" | "annually"
  renewalCommissionRate: decimal("renewal_commission_rate", { precision: 10, scale: 4 }),
  commissionNotes: text("commission_notes"),
  partnerNotes: text("partner_notes"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorCode: varchar("two_factor_code", { length: 6 }),
  twoFactorCodeExpiry: timestamp("two_factor_code_expiry", { withTimezone: true }),
  otpLastVerified: timestamp("otp_last_verified", { withTimezone: true }),
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

// OTP Settings Table — admin-configured role-based OTP requirements
export const otpSettings = pgTable("otp_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: text("role").notNull().unique(), // broker | manager | partner | rep | customer
  enabled: boolean("enabled").notNull().default(false),
  frequency: text("frequency").notNull().default("always"), // always | daily | weekly | monthly
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOtpSettingsSchema = createInsertSchema(otpSettings).omit({ id: true, updatedAt: true });
export type InsertOtpSettings = z.infer<typeof insertOtpSettingsSchema>;
export type OtpSettings = typeof otpSettings.$inferSelect;

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
  referenceId: varchar("reference_id", { length: 12 }),
  binderRequired: boolean("binder_required").default(false),
  binderUrl: text("binder_url"),
  binderUploadedAt: timestamp("binder_uploaded_at"),
  binderDocuments: jsonb("binder_documents").default([]),
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
  forceDisplay: boolean("force_display").notNull().default(false),
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

// Referral Partners Table - accounts for reference ID holders
export const referralPartners = pgTable("referral_partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  province: varchar("province", { length: 2 }).notNull(),
  businessDescription: text("business_description"),
  relationships: text("relationships"),
  referenceId: varchar("reference_id", { length: 12 }).notNull().unique(),
  status: userStatusEnum("status").notNull().default("active"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// RG Lead status enum
export const rgLeadStatusEnum = pgEnum("rg_lead_status", ["New", "Contacted", "Documents Pending", "Documents Received", "Submitted", "Approved", "Declined", "Issued", "Cancelled"]);

// Rent Guarantee Leads Table (managed by reps)
// RG Locations Table (property + landlord details)
export const rgLocations = pgTable("rg_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repId: varchar("rep_id").notNull().references(() => users.id),
  applicationNumber: text("application_number").unique(),
  propertyAddress: text("property_address").notNull(),
  unit: text("unit"),
  landlordName: text("landlord_name").notNull(),
  landlordEmail: text("landlord_email"),
  landlordPhone: text("landlord_phone"),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  moveInDate: text("move_in_date"),
  notes: text("notes"),
  status: text("status").default("New"),
  annualRatePercent: decimal("annual_rate_percent", { precision: 5, scale: 2 }).default("4.50"),
  monthlyRatePercent: decimal("monthly_rate_percent", { precision: 5, scale: 2 }).default("5.00"),
  commissionPercent: decimal("commission_percent", { precision: 5, scale: 2 }).default("0"),
  monthlyCommissionPercent: decimal("monthly_commission_percent", { precision: 5, scale: 2 }).default("0"),
  pricingNotes: text("pricing_notes"),
  paymentLink: text("payment_link"),
  otherContactName: text("other_contact_name"),
  otherContactEmail: text("other_contact_email"),
  otherContactPhone: text("other_contact_phone"),
  // Pre-Authorized Debit (PAD) form fields
  padAccountHolder: text("pad_account_holder"),
  padBankName: text("pad_bank_name"),
  padTransitNumber: text("pad_transit_number"),
  padInstitutionNumber: text("pad_institution_number"),
  padAccountNumber: text("pad_account_number"),
  padAccountType: text("pad_account_type"), // "chequing" | "savings"
  padPaymentAmount: decimal("pad_payment_amount", { precision: 10, scale: 2 }),
  padPaymentFrequency: text("pad_payment_frequency"), // "monthly" | "annual"
  padAuthorizedDate: text("pad_authorized_date"),
  padCompletedAt: timestamp("pad_completed_at"),
  // Recurring subscription
  serviceFeeEnabled: boolean("service_fee_enabled").default(false),
  serviceFee: decimal("service_fee", { precision: 10, scale: 2 }).default("0"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status"), // "active" | "cancelled" | "past_due"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rgLeads = pgTable("rg_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repId: varchar("rep_id").notNull().references(() => users.id),
  locationId: varchar("location_id").references(() => rgLocations.id, { onDelete: "set null" }),
  tenantName: text("tenant_name").notNull(),
  landlordName: text("landlord_name").notNull(),
  landlordEmail: text("landlord_email"),
  landlordPhone: text("landlord_phone"),
  propertyAddress: text("property_address").notNull(),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  tenantEmail: text("tenant_email").notNull(),
  tenantPhone: text("tenant_phone").notNull(),
  employmentStatus: text("employment_status").notNull(),
  coApplicantName: text("co_applicant_name"),
  coApplicantEmail: text("co_applicant_email"),
  moveInDate: text("move_in_date"),
  notes: text("notes"),
  status: rgLeadStatusEnum("status").notNull().default("New"),
  markupPercent: decimal("markup_percent", { precision: 5, scale: 2 }).default("0"),
  householdIncome: decimal("household_income", { precision: 10, scale: 2 }),
  employerName: text("employer_name"),
  paymentMethod: text("payment_method"),
  brokerId: varchar("broker_id").references(() => users.id),
  processingStatus: text("processing_status").default("none"), // "none" | "sent" | "file_received"
  processingFileNumber: text("processing_file_number"),
  processingSentAt: timestamp("processing_sent_at"),
  creditReportOnFile: boolean("credit_report_on_file").default(false),
  bankruptcyLastThreeYears: boolean("bankruptcy_last_three_years").default(false),
  noEvictionsOrJudgements: boolean("no_evictions_or_judgements").default(false),
  employmentLetterOnFile: boolean("employment_letter_on_file").default(false),
  governmentIdOnFile: boolean("government_id_on_file").default(false),
  twelveMonthLease: boolean("twelve_month_lease").default(false),
  leaseViolation: boolean("lease_violation").default(false),
  rentArrearsLastTwelveMonths: boolean("rent_arrears_last_twelve_months").default(false),
  noDefaultFirstSixtyDays: boolean("no_default_first_sixty_days").default(false),
  ongoingEmploymentNoTerminationRisk: boolean("ongoing_employment_no_termination_risk").default(false),
  documentsReceived: boolean("documents_received").default(false),
  // Renewal reminder fields (used when status = "Issued")
  renewalContacted: boolean("renewal_contacted").default(false),
  renewalContactedAt: timestamp("renewal_contacted_at"),
  renewalContactedBy: varchar("renewal_contacted_by").references(() => users.id),
  renewalNotes: text("renewal_notes"),
  // Cancellation fields (used when status = "Cancelled")
  cancellationDate: text("cancellation_date"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// RG Claims Table
export const rgClaims = pgTable("rg_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => rgLeads.id, { onDelete: "cascade" }),
  repId: varchar("rep_id").notNull().references(() => users.id),
  claimType: text("claim_type").notNull(), // e.g. "Non-Payment", "Property Damage", "Abandonment", "Other"
  description: text("description").notNull(),
  incidentDate: text("incident_date"),
  status: text("status").notNull().default("Pending"), // "Pending" | "In Review" | "Approved" | "Denied"
  claimNotes: text("claim_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRgClaimSchema = createInsertSchema(rgClaims).omit({ id: true, createdAt: true, updatedAt: true });
export type RgClaim = typeof rgClaims.$inferSelect;
export type InsertRgClaim = z.infer<typeof insertRgClaimSchema>;

// Document Requests Table (tokenized links sent to tenant/landlord)
export const documentRequests = pgTable("document_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rgLeadId: varchar("rg_lead_id").notNull().references(() => rgLeads.id, { onDelete: "cascade" }),
  token: varchar("token").notNull().unique().default(sql`gen_random_uuid()`),
  recipientType: text("recipient_type").notNull(), // "tenant" or "landlord"
  recipientName: text("recipient_name").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  requiredDocs: text("required_docs").array().notNull().default([]),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Uploaded Documents Table
export const repDocuments = pgTable("rep_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rgLeadId: varchar("rg_lead_id").notNull().references(() => rgLeads.id, { onDelete: "cascade" }),
  documentRequestId: varchar("document_request_id").references(() => documentRequests.id),
  docType: text("doc_type").notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// Rep Reminders Table
export const repReminders = pgTable("rep_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repId: varchar("rep_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  leadId: varchar("lead_id").references(() => rgLeads.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  notes: text("notes"),
  dueDate: timestamp("due_date").notNull(),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Rep Commission Payouts ────────────────────────────────────────
export const repPayouts = pgTable("rep_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repId: varchar("rep_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodLabel: varchar("period_label", { length: 50 }).notNull(), // e.g. "January 2026", "Q1 2026", "2026"
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  totalPaymentsCents: integer("total_payments_cents").notNull().default(0),
  commissionCents: integer("commission_cents").notNull().default(0),
  isRenewal: boolean("is_renewal").default(false),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending" | "paid"
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── RG Payment Tracking ───────────────────────────────────────────
export const rgPayments = pgTable("rg_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => rgLocations.id, { onDelete: "cascade" }),
  trackingCode: varchar("tracking_code", { length: 20 }).unique().notNull(),
  planType: varchar("plan_type", { length: 20 }).notNull(), // "annual" | "monthly"
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 3 }).default("cad"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending" | "paid" | "failed"
  stripeSessionId: varchar("stripe_session_id"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"), // set for auto-charged recurring payments
  landlordEmail: text("landlord_email"),
  landlordName: text("landlord_name"),
  description: text("description"),
  paidAt: timestamp("paid_at"),
  periodLabel: varchar("period_label"), // e.g. "January 2026" or "2026 Full Year"
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Signature System ──────────────────────────────────────────────
export const signatureTemplates = pgTable("signature_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("Rent Secure Agreement"),
  content: text("content").notNull().default(""),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const signatureRequests = pgTable("signature_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => rgLocations.id, { onDelete: "cascade" }),
  landlordName: text("landlord_name"),
  landlordEmail: text("landlord_email"),
  propertyAddress: text("property_address"),
  token: text("token").unique().notNull(),
  status: varchar("status").notNull().default("pending"),
  signatureData: text("signature_data"),
  signerName: text("signer_name"),
  signedAt: timestamp("signed_at"),
  sentAt: timestamp("sent_at").defaultNow(),
  createdBy: varchar("created_by"),
});

// Location Document Signatures (DocuSign-like custom document upload + e-sign)
export const locationDocSignatures = pgTable("location_doc_signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => rgLocations.id, { onDelete: "cascade" }),
  documentPath: text("document_path"),
  documentName: text("document_name"),
  documentMimeType: text("document_mime_type"),
  landlordName: text("landlord_name"),
  landlordEmail: text("landlord_email"),
  propertyAddress: text("property_address"),
  token: text("token").unique().notNull(),
  status: varchar("status").notNull().default("pending"),
  signatureData: text("signature_data"),
  signerName: text("signer_name"),
  signedAt: timestamp("signed_at"),
  sentAt: timestamp("sent_at").defaultNow(),
  createdBy: varchar("created_by"),
  signatureFields: text("signature_fields"),
  signers: text("signers"),
  templateData: text("template_data"),
});
export type LocationDocSignature = typeof locationDocSignatures.$inferSelect;

// Individual files for a doc-signature request (supports multiple docs per request)
export const locationDocSignatureFiles = pgTable("location_doc_signature_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sigRequestId: varchar("sig_request_id").notNull().references(() => locationDocSignatures.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  fileName: text("file_name"),
  mimeType: text("mime_type"),
  sortOrder: integer("sort_order").default(0),
});
export type LocationDocSignatureFile = typeof locationDocSignatureFiles.$inferSelect;

// Admin document template library
export const docTemplates = pgTable("doc_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  filePath: text("file_path").notNull(),
  fileName: text("file_name"),
  mimeType: text("mime_type"),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type DocTemplate = typeof docTemplates.$inferSelect;

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

export const insertReferralPartnerSchema = createInsertSchema(referralPartners).omit({
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

export type ReferralPartner = typeof referralPartners.$inferSelect;
export type InsertReferralPartner = z.infer<typeof insertReferralPartnerSchema>;

export const insertRgLocationSchema = createInsertSchema(rgLocations).omit({
  id: true,
  applicationNumber: true,
  createdAt: true,
});

export const insertRgLeadSchema = createInsertSchema(rgLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentRequestSchema = createInsertSchema(documentRequests).omit({
  id: true,
  token: true,
  createdAt: true,
});

export const insertRepDocumentSchema = createInsertSchema(repDocuments).omit({
  id: true,
  uploadedAt: true,
});

export const insertRepReminderSchema = createInsertSchema(repReminders).omit({
  id: true,
  createdAt: true,
});

export type RgLocation = typeof rgLocations.$inferSelect;
export type InsertRgLocation = z.infer<typeof insertRgLocationSchema>;

export type RgLead = typeof rgLeads.$inferSelect;
export type InsertRgLead = z.infer<typeof insertRgLeadSchema>;

export type DocumentRequest = typeof documentRequests.$inferSelect;
export type InsertDocumentRequest = z.infer<typeof insertDocumentRequestSchema>;

export type RepDocument = typeof repDocuments.$inferSelect;
export type InsertRepDocument = z.infer<typeof insertRepDocumentSchema>;

export type RepReminder = typeof repReminders.$inferSelect;
export type InsertRepReminder = z.infer<typeof insertRepReminderSchema>;

export type SignatureTemplate = typeof signatureTemplates.$inferSelect;
export type SignatureRequest = typeof signatureRequests.$inferSelect;

export type RgPayment = typeof rgPayments.$inferSelect;
export type RepPayout = typeof repPayouts.$inferSelect;

// ── RG Invoices ────────────────────────────────────────────────────────────
export const rgInvoices = pgTable("rg_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => rgLocations.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 30 }).unique().notNull(),
  monthlyRentCents: integer("monthly_rent_cents").notNull(),
  annualRatePct: varchar("annual_rate_pct", { length: 10 }).notNull(),
  monthlyRatePct: varchar("monthly_rate_pct", { length: 10 }).notNull(),
  annualAmountCents: integer("annual_amount_cents").notNull(),
  monthlyAmountCents: integer("monthly_amount_cents").notNull(),
  landlordName: text("landlord_name"),
  landlordEmail: text("landlord_email"),
  propertyAddress: text("property_address"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("generated"),
  emailedAt: timestamp("emailed_at"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRgInvoiceSchema = createInsertSchema(rgInvoices).omit({ id: true, createdAt: true });
export type RgInvoice = typeof rgInvoices.$inferSelect;
export type InsertRgInvoice = z.infer<typeof insertRgInvoiceSchema>;

// ── Customer Portal ────────────────────────────────────────────────────────

export const customerAccounts = pgTable("customer_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountNumber: varchar("account_number", { length: 20 }).notNull().unique(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  postalCode: varchar("postal_code", { length: 10 }).notNull(),
  passwordHash: text("password_hash"),
  authToken: text("auth_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customerPayments = pgTable("customer_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountNumber: varchar("account_number", { length: 20 }).notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email"),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomerAccountSchema = createInsertSchema(customerAccounts).omit({
  id: true,
  authToken: true,
  createdAt: true,
});
export const insertCustomerPaymentSchema = createInsertSchema(customerPayments).omit({
  id: true,
  createdAt: true,
});

export type CustomerAccount = typeof customerAccounts.$inferSelect;
export type InsertCustomerAccount = z.infer<typeof insertCustomerAccountSchema>;
export type CustomerPayment = typeof customerPayments.$inferSelect;
export type InsertCustomerPayment = z.infer<typeof insertCustomerPaymentSchema>;

// ── RG Organizations ────────────────────────────────────────────────────────

export const rgOrganizations = pgTable("rg_organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  notes: text("notes"),
  status: text("status").default("Active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rgOrgMembers = pgTable("rg_org_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => rgOrganizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member"), // "principal" | "member"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRgOrganizationSchema = createInsertSchema(rgOrganizations).omit({ id: true, createdAt: true });
export const insertRgOrgMemberSchema = createInsertSchema(rgOrgMembers).omit({ id: true, createdAt: true });

export type RgOrganization = typeof rgOrganizations.$inferSelect;
export type InsertRgOrganization = z.infer<typeof insertRgOrganizationSchema>;
export type RgOrgMember = typeof rgOrgMembers.$inferSelect;

// ── Service Agreements ──────────────────────────────────────────────────────
export const serviceAgreements = pgTable("service_agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => rgLocations.id, { onDelete: "cascade" }),
  landlordName: text("landlord_name").notNull().default(""),
  landlordEmail: text("landlord_email").notNull().default(""),
  propertyAddress: text("property_address").notNull().default(""),
  serviceStartDate: text("service_start_date").default(""),
  tenantType: text("tenant_type").notNull().default("new"),
  serviceFee: text("service_fee").notNull().default(""),
  notes: text("notes").default(""),
  status: text("status").notNull().default("draft"),
  token: varchar("token").unique().default(sql`gen_random_uuid()`),
  signatureData: text("signature_data"),
  signerName: text("signer_name"),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServiceAgreementSchema = createInsertSchema(serviceAgreements).omit({ id: true, token: true, signatureData: true, signerName: true, signedAt: true, createdAt: true });
export type ServiceAgreement = typeof serviceAgreements.$inferSelect;
export type InsertServiceAgreement = z.infer<typeof insertServiceAgreementSchema>;

// ── Service Agreement Attachments ────────────────────────────────────────────
export const serviceAgreementAttachments = pgTable("service_agreement_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saId: varchar("sa_id").notNull().references(() => serviceAgreements.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileData: text("file_data").notNull(),
  fileType: text("file_type").notNull().default("application/octet-stream"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSaAttachmentSchema = createInsertSchema(serviceAgreementAttachments).omit({ id: true, createdAt: true });
export type SaAttachment = typeof serviceAgreementAttachments.$inferSelect;
export type InsertSaAttachment = z.infer<typeof insertSaAttachmentSchema>;
