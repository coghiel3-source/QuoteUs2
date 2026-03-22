// Database blueprint integration - see blueprint:javascript_database
import { users, quotes, activities, transactions, systemSettings, advertisements, brokerNotes, partnerRedirects, referralPartners, rgLocations, rgLeads, documentRequests, repDocuments, repReminders, type User, type InsertUser, type Quote, type InsertQuote, type Activity, type InsertActivity, type Transaction, type InsertTransaction, type SystemSetting, type Advertisement, type InsertAdvertisement, type BrokerNote, type InsertBrokerNote, type PartnerRedirect, type InsertPartnerRedirect, type ReferralPartner, type InsertReferralPartner, type RgLocation, type InsertRgLocation, type RgLead, type InsertRgLead, type DocumentRequest, type InsertDocumentRequest, type RepDocument, type InsertRepDocument, type RepReminder, type InsertRepReminder } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, lte, gte, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  setResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  clearResetToken(userId: string): Promise<void>;
  updatePassword(userId: string, password: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Quote operations
  getQuote(id: string): Promise<Quote | undefined>;
  getAllQuotes(): Promise<Quote[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, data: Partial<InsertQuote>): Promise<Quote | undefined>;
  deleteQuote(id: string): Promise<boolean>;
  
  // Activity operations
  getActivitiesForQuote(quoteId: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Balance & Transaction operations
  getUserBalance(userId: string): Promise<string>;
  updateUserBalance(userId: string, newBalance: string): Promise<User | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsForUser(userId: string): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  
  // System Settings operations
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string, updatedBy?: string): Promise<SystemSetting>;
  
  // Advertisement operations
  getAllAdvertisements(): Promise<Advertisement[]>;
  getAdvertisement(id: string): Promise<Advertisement | undefined>;
  getAdvertisementByPreviewToken(token: string): Promise<Advertisement | undefined>;
  getActiveAdsForPage(page: string): Promise<Advertisement[]>;
  createAdvertisement(ad: InsertAdvertisement): Promise<Advertisement>;
  updateAdvertisement(id: string, data: Partial<InsertAdvertisement>): Promise<Advertisement | undefined>;
  deleteAdvertisement(id: string): Promise<boolean>;
  incrementAdImpression(id: string): Promise<void>;
  incrementAdClick(id: string): Promise<void>;
  
  // Broker Notes operations
  getBrokerNotes(brokerId: string): Promise<BrokerNote[]>;
  createBrokerNote(note: InsertBrokerNote): Promise<BrokerNote>;
  deleteBrokerNote(id: string): Promise<boolean>;

  // Partner Redirect operations
  getAllPartnerRedirects(): Promise<PartnerRedirect[]>;
  getPartnerRedirect(id: string): Promise<PartnerRedirect | undefined>;
  getPartnerRedirectByQuoteType(quoteType: string): Promise<PartnerRedirect | undefined>;
  createPartnerRedirect(redirect: InsertPartnerRedirect): Promise<PartnerRedirect>;
  updatePartnerRedirect(id: string, data: Partial<InsertPartnerRedirect>): Promise<PartnerRedirect | undefined>;
  deletePartnerRedirect(id: string): Promise<boolean>;

  // Referral Partner operations
  getAllReferralPartners(): Promise<ReferralPartner[]>;
  getReferralPartner(id: string): Promise<ReferralPartner | undefined>;
  getReferralPartnerByReferenceId(referenceId: string): Promise<ReferralPartner | undefined>;
  createReferralPartner(partner: InsertReferralPartner): Promise<ReferralPartner>;
  updateReferralPartner(id: string, data: Partial<InsertReferralPartner>): Promise<ReferralPartner | undefined>;
  deleteReferralPartner(id: string): Promise<boolean>;
  getNextReferenceIdForProvince(province: string): Promise<string>;

  // Rep / RG Lead operations
  getRgLeadsForRep(repId: string): Promise<RgLead[]>;
  getAllRgLeads(): Promise<RgLead[]>;
  getRgLead(id: string): Promise<RgLead | undefined>;
  createRgLead(lead: InsertRgLead): Promise<RgLead>;
  updateRgLead(id: string, data: Partial<InsertRgLead>): Promise<RgLead | undefined>;
  deleteRgLead(id: string): Promise<boolean>;

  // Document Request operations
  getDocumentRequestsForLead(rgLeadId: string): Promise<DocumentRequest[]>;
  getDocumentRequestByToken(token: string): Promise<DocumentRequest | undefined>;
  createDocumentRequest(req: InsertDocumentRequest): Promise<DocumentRequest>;

  // Uploaded Document operations
  getDocumentsForLead(rgLeadId: string): Promise<RepDocument[]>;
  getDocumentsForRequest(documentRequestId: string): Promise<RepDocument[]>;
  createRepDocument(doc: InsertRepDocument): Promise<RepDocument>;
  deleteRepDocument(id: string): Promise<boolean>;

  // Rep Reminder operations
  getRemindersForRep(repId: string): Promise<RepReminder[]>;
  createRepReminder(reminder: InsertRepReminder): Promise<RepReminder>;
  updateRepReminder(id: string, data: Partial<InsertRepReminder>): Promise<RepReminder | undefined>;
  deleteRepReminder(id: string): Promise<boolean>;

  // RG Location operations
  getLocationsForRep(repId: string): Promise<RgLocation[]>;
  getAllLocations(): Promise<RgLocation[]>;
  getLocation(id: string): Promise<RgLocation | undefined>;
  createLocation(location: InsertRgLocation): Promise<RgLocation>;
  updateLocation(id: string, data: Partial<InsertRgLocation>): Promise<RgLocation | undefined>;
  deleteLocation(id: string): Promise<boolean>;
  getLeadsForLocation(locationId: string): Promise<RgLead[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user || undefined;
  }

  async setResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db.update(users).set({ resetToken: token, resetTokenExpiry: expiry }).where(eq(users.id, userId));
  }

  async clearResetToken(userId: string): Promise<void> {
    await db.update(users).set({ resetToken: null, resetTokenExpiry: null }).where(eq(users.id, userId));
  }

  async updatePassword(userId: string, password: string): Promise<void> {
    await db.update(users).set({ password }).where(eq(users.id, userId));
  }

  // Quote operations
  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote || undefined;
  }

  async getAllQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    // Generate quote number
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const quoteNumber = `Q-${year}-${randomNum}`;
    
    const [quote] = await db
      .insert(quotes)
      .values({
        ...insertQuote,
        quoteNumber,
      })
      .returning();
    return quote;
  }

  async updateQuote(id: string, data: Partial<InsertQuote>): Promise<Quote | undefined> {
    const [quote] = await db
      .update(quotes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, id))
      .returning();
    return quote || undefined;
  }

  async deleteQuote(id: string): Promise<boolean> {
    const result = await db.delete(quotes).where(eq(quotes.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Activity operations
  async getActivitiesForQuote(quoteId: string): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.quoteId, quoteId))
      .orderBy(desc(activities.createdAt));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values(insertActivity)
      .returning();
    return activity;
  }

  // Balance & Transaction operations
  async getUserBalance(userId: string): Promise<string> {
    const user = await this.getUser(userId);
    return user?.balance || "0.00";
  }

  async updateUserBalance(userId: string, newBalance: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async getTransactionsForUser(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt));
  }

  // System Settings operations
  async getSetting(key: string): Promise<string | null> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    return setting?.value || null;
  }

  async setSetting(key: string, value: string, updatedBy?: string): Promise<SystemSetting> {
    const existing = await this.getSetting(key);
    
    if (existing !== null) {
      const [updated] = await db
        .update(systemSettings)
        .set({ value, updatedBy, updatedAt: new Date() })
        .where(eq(systemSettings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(systemSettings)
        .values({ key, value, updatedBy })
        .returning();
      return created;
    }
  }

  // Credit operations - atomic balance updates with transaction logging
  async creditBalance(
    userId: string, 
    amount: string, 
    type: "credit_purchase" | "manual_credit" | "adjustment" | "refund",
    description: string,
    options?: { stripePaymentId?: string; actorId?: string; actorName?: string; reason?: string }
  ): Promise<{ user: User; transaction: Transaction }> {
    const currentBalance = parseFloat(await this.getUserBalance(userId));
    const creditAmount = parseFloat(amount);
    const newBalance = (currentBalance + creditAmount).toFixed(2);
    
    const user = await this.updateUserBalance(userId, newBalance);
    if (!user) throw new Error("User not found");
    
    const transaction = await this.createTransaction({
      userId,
      type,
      amount,
      balanceAfter: newBalance,
      description,
      reason: options?.reason,
      stripePaymentId: options?.stripePaymentId,
      actorId: options?.actorId,
      actorName: options?.actorName,
    });
    
    return { user, transaction };
  }

  async debitBalance(
    userId: string,
    amount: string,
    description: string,
    options?: { quoteId?: string; actorId?: string; actorName?: string }
  ): Promise<{ user: User; transaction: Transaction } | null> {
    const currentBalance = parseFloat(await this.getUserBalance(userId));
    const debitAmount = parseFloat(amount);
    
    if (currentBalance < debitAmount) {
      return null; // Insufficient balance
    }
    
    const newBalance = (currentBalance - debitAmount).toFixed(2);
    
    const user = await this.updateUserBalance(userId, newBalance);
    if (!user) throw new Error("User not found");
    
    const transaction = await this.createTransaction({
      userId,
      type: "lead_deduction",
      amount: `-${amount}`,
      balanceAfter: newBalance,
      description,
      quoteId: options?.quoteId,
      actorId: options?.actorId,
      actorName: options?.actorName,
    });
    
    return { user, transaction };
  }

  // Advertisement operations
  async getAllAdvertisements(): Promise<Advertisement[]> {
    return await db.select().from(advertisements).orderBy(desc(advertisements.createdAt));
  }

  async getAdvertisement(id: string): Promise<Advertisement | undefined> {
    const [ad] = await db.select().from(advertisements).where(eq(advertisements.id, id));
    return ad || undefined;
  }

  async getAdvertisementByPreviewToken(token: string): Promise<Advertisement | undefined> {
    const [ad] = await db.select().from(advertisements).where(eq(advertisements.previewToken, token));
    return ad || undefined;
  }

  async getActiveAdsForPage(page: string): Promise<Advertisement[]> {
    const now = new Date();
    const ads = await db.select().from(advertisements).where(
      and(
        eq(advertisements.status, "active"),
        or(
          isNull(advertisements.startDate),
          lte(advertisements.startDate, now)
        ),
        or(
          isNull(advertisements.endDate),
          sql`${advertisements.endDate} + interval '1 day' > ${now}`
        ),
        or(
          isNull(advertisements.approvalStatus),
          eq(advertisements.approvalStatus, "approved"),
          eq(advertisements.approvalStatus, "pending")
        )
      )
    ).orderBy(desc(advertisements.priority));
    
    // Filter by target page
    return ads.filter(ad => 
      ad.targetPages.length === 0 || ad.targetPages.includes(page) || ad.targetPages.includes("all")
    );
  }

  async createAdvertisement(ad: InsertAdvertisement): Promise<Advertisement> {
    const [created] = await db.insert(advertisements).values(ad).returning();
    return created;
  }

  async updateAdvertisement(id: string, data: Partial<InsertAdvertisement>): Promise<Advertisement | undefined> {
    const [updated] = await db
      .update(advertisements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(advertisements.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAdvertisement(id: string): Promise<boolean> {
    const result = await db.delete(advertisements).where(eq(advertisements.id, id));
    return true;
  }

  async incrementAdImpression(id: string): Promise<void> {
    await db.update(advertisements)
      .set({ impressions: sql`${advertisements.impressions} + 1` })
      .where(eq(advertisements.id, id));
  }

  async incrementAdClick(id: string): Promise<void> {
    await db.update(advertisements)
      .set({ clicks: sql`${advertisements.clicks} + 1` })
      .where(eq(advertisements.id, id));
  }

  // Partner Redirect operations
  // Broker Notes operations
  async getBrokerNotes(brokerId: string): Promise<BrokerNote[]> {
    return await db.select().from(brokerNotes)
      .where(eq(brokerNotes.brokerId, brokerId))
      .orderBy(desc(brokerNotes.createdAt));
  }

  async createBrokerNote(note: InsertBrokerNote): Promise<BrokerNote> {
    const [newNote] = await db.insert(brokerNotes).values(note).returning();
    return newNote;
  }

  async deleteBrokerNote(id: string): Promise<boolean> {
    const result = await db.delete(brokerNotes).where(eq(brokerNotes.id, id)).returning();
    return result.length > 0;
  }

  async getAllPartnerRedirects(): Promise<PartnerRedirect[]> {
    return await db.select().from(partnerRedirects).orderBy(desc(partnerRedirects.createdAt));
  }

  async getPartnerRedirect(id: string): Promise<PartnerRedirect | undefined> {
    const [redirect] = await db.select().from(partnerRedirects).where(eq(partnerRedirects.id, id));
    return redirect || undefined;
  }

  async getPartnerRedirectByQuoteType(quoteType: string): Promise<PartnerRedirect | undefined> {
    const [redirect] = await db.select().from(partnerRedirects)
      .where(and(
        eq(partnerRedirects.quoteType, quoteType as any),
        eq(partnerRedirects.isActive, true)
      ));
    return redirect || undefined;
  }

  async createPartnerRedirect(redirect: InsertPartnerRedirect): Promise<PartnerRedirect> {
    const [newRedirect] = await db.insert(partnerRedirects).values(redirect).returning();
    return newRedirect;
  }

  async updatePartnerRedirect(id: string, data: Partial<InsertPartnerRedirect>): Promise<PartnerRedirect | undefined> {
    const [redirect] = await db.update(partnerRedirects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(partnerRedirects.id, id))
      .returning();
    return redirect || undefined;
  }

  async deletePartnerRedirect(id: string): Promise<boolean> {
    const result = await db.delete(partnerRedirects).where(eq(partnerRedirects.id, id)).returning();
    return result.length > 0;
  }

  // Referral Partner operations
  async getAllReferralPartners(): Promise<ReferralPartner[]> {
    return await db.select().from(referralPartners).orderBy(desc(referralPartners.createdAt));
  }

  async getReferralPartner(id: string): Promise<ReferralPartner | undefined> {
    const [partner] = await db.select().from(referralPartners).where(eq(referralPartners.id, id));
    return partner || undefined;
  }

  async getReferralPartnerByReferenceId(referenceId: string): Promise<ReferralPartner | undefined> {
    const allPartners = await db.select().from(referralPartners);
    return allPartners.find(p => p.referenceId.toUpperCase() === referenceId.toUpperCase());
  }

  async createReferralPartner(partner: InsertReferralPartner): Promise<ReferralPartner> {
    const [newPartner] = await db.insert(referralPartners).values(partner).returning();
    return newPartner;
  }

  async updateReferralPartner(id: string, data: Partial<InsertReferralPartner>): Promise<ReferralPartner | undefined> {
    const [partner] = await db.update(referralPartners)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(referralPartners.id, id))
      .returning();
    return partner || undefined;
  }

  async deleteReferralPartner(id: string): Promise<boolean> {
    const result = await db.delete(referralPartners).where(eq(referralPartners.id, id)).returning();
    return result.length > 0;
  }

  async getNextReferenceIdForProvince(province: string): Promise<string> {
    const prefix = province.toUpperCase();
    const existing = await db.select().from(referralPartners)
      .where(sql`UPPER(LEFT(${referralPartners.referenceId}, 2)) = ${prefix}`);
    
    let maxNum = 0;
    for (const p of existing) {
      const numPart = parseInt(p.referenceId.substring(2), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
    
    const nextNum = maxNum + 1;
    return `${prefix}${String(nextNum).padStart(7, '0')}`;
  }

  // Rep / RG Lead operations
  async getRgLeadsForRep(repId: string): Promise<RgLead[]> {
    return db.select().from(rgLeads).where(eq(rgLeads.repId, repId)).orderBy(desc(rgLeads.createdAt));
  }

  async getAllRgLeads(): Promise<RgLead[]> {
    return db.select().from(rgLeads).orderBy(desc(rgLeads.createdAt));
  }

  async getRgLead(id: string): Promise<RgLead | undefined> {
    const [lead] = await db.select().from(rgLeads).where(eq(rgLeads.id, id));
    return lead || undefined;
  }

  async createRgLead(lead: InsertRgLead): Promise<RgLead> {
    const [created] = await db.insert(rgLeads).values(lead).returning();
    return created;
  }

  async updateRgLead(id: string, data: Partial<InsertRgLead>): Promise<RgLead | undefined> {
    const [updated] = await db.update(rgLeads).set({ ...data, updatedAt: new Date() }).where(eq(rgLeads.id, id)).returning();
    return updated || undefined;
  }

  async deleteRgLead(id: string): Promise<boolean> {
    const result = await db.delete(rgLeads).where(eq(rgLeads.id, id)).returning();
    return result.length > 0;
  }

  // Document Request operations
  async getDocumentRequestsForLead(rgLeadId: string): Promise<DocumentRequest[]> {
    return db.select().from(documentRequests).where(eq(documentRequests.rgLeadId, rgLeadId)).orderBy(desc(documentRequests.createdAt));
  }

  async getDocumentRequestByToken(token: string): Promise<DocumentRequest | undefined> {
    const [req] = await db.select().from(documentRequests).where(eq(documentRequests.token, token));
    return req || undefined;
  }

  async createDocumentRequest(req: InsertDocumentRequest): Promise<DocumentRequest> {
    const [created] = await db.insert(documentRequests).values(req).returning();
    return created;
  }

  // Uploaded Document operations
  async getDocumentsForLead(rgLeadId: string): Promise<RepDocument[]> {
    return db.select().from(repDocuments).where(eq(repDocuments.rgLeadId, rgLeadId)).orderBy(desc(repDocuments.uploadedAt));
  }

  async getDocumentsForRequest(documentRequestId: string): Promise<RepDocument[]> {
    return db.select().from(repDocuments).where(eq(repDocuments.documentRequestId, documentRequestId)).orderBy(desc(repDocuments.uploadedAt));
  }

  async createRepDocument(doc: InsertRepDocument): Promise<RepDocument> {
    const [created] = await db.insert(repDocuments).values(doc).returning();
    return created;
  }

  async deleteRepDocument(id: string): Promise<boolean> {
    const result = await db.delete(repDocuments).where(eq(repDocuments.id, id)).returning();
    return result.length > 0;
  }

  // Rep Reminder operations
  async getRemindersForRep(repId: string): Promise<RepReminder[]> {
    return db.select().from(repReminders).where(eq(repReminders.repId, repId)).orderBy(repReminders.dueDate);
  }

  async createRepReminder(reminder: InsertRepReminder): Promise<RepReminder> {
    const [created] = await db.insert(repReminders).values(reminder).returning();
    return created;
  }

  async updateRepReminder(id: string, data: Partial<InsertRepReminder>): Promise<RepReminder | undefined> {
    const [updated] = await db.update(repReminders).set(data).where(eq(repReminders.id, id)).returning();
    return updated || undefined;
  }

  async deleteRepReminder(id: string): Promise<boolean> {
    const result = await db.delete(repReminders).where(eq(repReminders.id, id)).returning();
    return result.length > 0;
  }

  // RG Location operations
  async getLocationsForRep(repId: string): Promise<RgLocation[]> {
    return db.select().from(rgLocations).where(eq(rgLocations.repId, repId)).orderBy(desc(rgLocations.createdAt));
  }

  async getAllLocations(): Promise<RgLocation[]> {
    return db.select().from(rgLocations).orderBy(desc(rgLocations.createdAt));
  }

  async getLocation(id: string): Promise<RgLocation | undefined> {
    const [loc] = await db.select().from(rgLocations).where(eq(rgLocations.id, id));
    return loc || undefined;
  }

  async createLocation(location: InsertRgLocation): Promise<RgLocation> {
    const year = new Date().getFullYear();
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(rgLocations);
    const seq = String(Number(count) + 1).padStart(5, "0");
    const applicationNumber = `RG-${year}-${seq}`;
    const [created] = await db.insert(rgLocations).values({ ...location, applicationNumber }).returning();
    return created;
  }

  async updateLocation(id: string, data: Partial<InsertRgLocation>): Promise<RgLocation | undefined> {
    const [updated] = await db.update(rgLocations).set(data).where(eq(rgLocations.id, id)).returning();
    return updated || undefined;
  }

  async deleteLocation(id: string): Promise<boolean> {
    const result = await db.delete(rgLocations).where(eq(rgLocations.id, id)).returning();
    return result.length > 0;
  }

  async getLeadsForLocation(locationId: string): Promise<RgLead[]> {
    return db.select().from(rgLeads).where(eq(rgLeads.locationId, locationId)).orderBy(desc(rgLeads.createdAt));
  }
}

export const storage = new DatabaseStorage();
