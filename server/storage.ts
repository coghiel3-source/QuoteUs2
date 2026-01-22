// Database blueprint integration - see blueprint:javascript_database
import { users, quotes, activities, transactions, systemSettings, type User, type InsertUser, type Quote, type InsertQuote, type Activity, type InsertActivity, type Transaction, type InsertTransaction, type SystemSetting } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
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
}

export const storage = new DatabaseStorage();
