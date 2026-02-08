import { db } from "./db";
import {
  lanes,
  quotes,
  clients,
  users,
  products,
  type Lane,
  type InsertLane,
  type Quote,
  type InsertQuote,
  type Client,
  type InsertClient,
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
} from "@shared/schema";
import { eq, sql, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  getClientByName(name: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;

  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Products
  getProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;

  // Lanes
  getLanes(): Promise<Lane[]>;
  getLanesByClient(clientId: number): Promise<Lane[]>;
  getLane(id: number): Promise<Lane | undefined>;
  createLane(lane: InsertLane): Promise<Lane>;
  clearLanes(): Promise<void>;

  // Quotes
  getQuotes(): Promise<Quote[]>;
  getQuotesByClient(clientId: number): Promise<Quote[]>;
  getQuotesByStatus(status: string): Promise<Quote[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote>;
  deleteQuote(id: number): Promise<void>;

  // Analytics
  getQuoteStats(): Promise<{ status: string; count: number }[]>;
  getRevenueByDateRange(startDate: Date, endDate: Date): Promise<{ total: string }>;
  getRevenueByClient(): Promise<{ clientId: number; clientName: string; total: string }[]>;
}

export class DatabaseStorage implements IStorage {
  // Clients
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientByName(name: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.name, name));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [created] = await db.insert(clients).values(client).returning();
    return created;
  }

  // Users
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isActive, true));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  // Lanes
  async getLanes(): Promise<Lane[]> {
    return await db.select().from(lanes);
  }

  async getLanesByClient(clientId: number): Promise<Lane[]> {
    return await db
      .select()
      .from(lanes)
      .where(sql`${lanes.clientId} = ${clientId} OR ${lanes.clientId} IS NULL`);
  }

  async getLane(id: number): Promise<Lane | undefined> {
    const [lane] = await db.select().from(lanes).where(eq(lanes.id, id));
    return lane;
  }

  async createLane(lane: InsertLane): Promise<Lane> {
    const [created] = await db.insert(lanes).values(lane).returning();
    return created;
  }

  async clearLanes(): Promise<void> {
    await db.delete(lanes);
  }

  // Quotes
  async getQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes).orderBy(sql`${quotes.createdAt} DESC`);
  }

  async getQuotesByClient(clientId: number): Promise<Quote[]> {
    return await db.select().from(quotes).where(eq(quotes.clientId, clientId)).orderBy(sql`${quotes.createdAt} DESC`);
  }

  async getQuotesByStatus(status: string): Promise<Quote[]> {
    return await db.select().from(quotes).where(eq(quotes.status, status));
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [created] = await db.insert(quotes).values(quote).returning();
    return created;
  }

  async updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote> {
    const [updated] = await db
      .update(quotes)
      .set({ ...quote, updatedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning();
    return updated;
  }

  async deleteQuote(id: number): Promise<void> {
    await db.delete(quotes).where(eq(quotes.id, id));
  }

  // Analytics
  async getQuoteStats(): Promise<{ status: string; count: number }[]> {
    const result = await db
      .select({
        status: quotes.status,
        count: sql<number>`count(*)::int`,
      })
      .from(quotes)
      .groupBy(quotes.status);
    return result.map(r => ({ status: r.status || "Unknown", count: r.count }));
  }

  async getRevenueByDateRange(startDate: Date, endDate: Date): Promise<{ total: string }> {
    const [result] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${quotes.totalCost}::numeric), 0)::text`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.status, "Approved"),
          gte(quotes.createdAt, startDate),
          lte(quotes.createdAt, endDate)
        )
      );
    return { total: result?.total || "0" };
  }

  async getRevenueByClient(): Promise<{ clientId: number; clientName: string; total: string }[]> {
    const result = await db
      .select({
        clientId: quotes.clientId,
        clientName: clients.name,
        total: sql<string>`COALESCE(SUM(${quotes.totalCost}::numeric), 0)::text`,
      })
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .where(eq(quotes.status, "Approved"))
      .groupBy(quotes.clientId, clients.name);
    return result.map(r => ({
      clientId: r.clientId || 0,
      clientName: r.clientName || "Unknown",
      total: r.total,
    }));
  }
}

export const storage = new DatabaseStorage();
