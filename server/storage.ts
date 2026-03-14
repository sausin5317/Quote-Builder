import { db } from "./db";
import {
  lanes,
  quotes,
  clients,
  users,
  products,
  vehicles,
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
  type Vehicle,
  type InsertVehicle,
  type QuoteWithLane,
} from "@shared/schema";
import { eq, sql, and, gte, lte, ilike, or, count, asc, desc } from "drizzle-orm";

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
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Products
  getProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Vehicles
  getVehicles(): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  deleteVehicle(id: number): Promise<void>;

  // Lanes
  getLanes(): Promise<Lane[]>;
  getLanesByClient(clientId: number): Promise<Lane[]>;
  getLane(id: number): Promise<Lane | undefined>;
  createLane(lane: InsertLane): Promise<Lane>;
  updateLane(id: number, lane: Partial<InsertLane>): Promise<Lane>;
  deleteLane(id: number): Promise<void>;
  clearLanes(): Promise<void>;
  searchLanes(params: { search?: string; product?: string; page: number; pageSize: number }): Promise<{ lanes: Lane[]; total: number }>;
  findDuplicateLanes(): Promise<{ origin: string; destination: string; product: string; count: number; ids: number[] }[]>;
  getDistinctLaneProducts(): Promise<string[]>;

  // Quotes
  getQuotes(): Promise<QuoteWithLane[]>;
  getQuote(id: number): Promise<Quote | undefined>;
  getQuotesByClient(clientId: number): Promise<QuoteWithLane[]>;
  getQuotesByStatus(status: string): Promise<QuoteWithLane[]>;
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

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updated] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isActive, true));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Vehicles
  async getVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles).where(eq(vehicles.isActive, true));
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [created] = await db.insert(vehicles).values(vehicle).returning();
    return created;
  }

  async deleteVehicle(id: number): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.id, id));
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

  async updateLane(id: number, lane: Partial<InsertLane>): Promise<Lane> {
    const [updated] = await db
      .update(lanes)
      .set(lane)
      .where(eq(lanes.id, id))
      .returning();
    return updated;
  }

  async deleteLane(id: number): Promise<void> {
    await db.delete(lanes).where(eq(lanes.id, id));
  }

  async clearLanes(): Promise<void> {
    await db.delete(lanes);
  }

  async searchLanes(params: { search?: string; product?: string; page: number; pageSize: number }): Promise<{ lanes: Lane[]; total: number }> {
    const conditions = [];
    if (params.search) {
      const term = `%${params.search}%`;
      conditions.push(or(ilike(lanes.origin, term), ilike(lanes.destination, term)));
    }
    if (params.product) {
      conditions.push(eq(lanes.product, params.product));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (params.page - 1) * params.pageSize;

    const [totalResult] = await db.select({ count: count() }).from(lanes).where(where);
    const results = await db.select().from(lanes).where(where).orderBy(asc(lanes.id)).limit(params.pageSize).offset(offset);

    return { lanes: results, total: totalResult.count };
  }

  async findDuplicateLanes(): Promise<{ origin: string; destination: string; product: string; count: number; ids: number[] }[]> {
    const dupes = await db.execute(sql`
      SELECT origin, destination, product, COUNT(*)::int as count,
             ARRAY_AGG(id ORDER BY id) as ids
      FROM lanes
      GROUP BY origin, destination, product
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `);
    return (dupes.rows || []) as any;
  }

  async getDistinctLaneProducts(): Promise<string[]> {
    const result = await db.selectDistinct({ product: lanes.product }).from(lanes).orderBy(asc(lanes.product));
    return result.map(r => r.product);
  }

  // Quotes
  async getQuotes(): Promise<QuoteWithLane[]> {
    const result = await db
      .select()
      .from(quotes)
      .leftJoin(lanes, eq(quotes.laneId, lanes.id))
      .orderBy(sql`${quotes.createdAt} DESC`);

    return result.map(({ quotes, lanes }) => ({
      ...quotes,
      origin: lanes?.origin ?? quotes.originOverride ?? null,
      destination: lanes?.destination ?? quotes.destinationOverride ?? null,
      product: lanes?.product ?? quotes.productOverride ?? null,
      originOverride: quotes.originOverride,
      destinationOverride: quotes.destinationOverride,
      productOverride: quotes.productOverride,
    }));
  }

  async getQuote(id: number): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote;
  }

  async getQuotesByClient(clientId: number): Promise<QuoteWithLane[]> {
    const result = await db
      .select()
      .from(quotes)
      .leftJoin(lanes, eq(quotes.laneId, lanes.id))
      .where(eq(quotes.clientId, clientId))
      .orderBy(sql`${quotes.createdAt} DESC`);

    return result.map(({ quotes, lanes }) => ({
      ...quotes,
      origin: lanes?.origin ?? quotes.originOverride ?? null,
      destination: lanes?.destination ?? quotes.destinationOverride ?? null,
      product: lanes?.product ?? quotes.productOverride ?? null,
      originOverride: quotes.originOverride,
      destinationOverride: quotes.destinationOverride,
      productOverride: quotes.productOverride,
    }));
  }

  async getQuotesByStatus(status: string): Promise<QuoteWithLane[]> {
    const result = await db
      .select()
      .from(quotes)
      .leftJoin(lanes, eq(quotes.laneId, lanes.id))
      .where(eq(quotes.status, status));

    return result.map(({ quotes, lanes }) => ({
      ...quotes,
      origin: lanes?.origin ?? quotes.originOverride ?? null,
      destination: lanes?.destination ?? quotes.destinationOverride ?? null,
      product: lanes?.product ?? quotes.productOverride ?? null,
      originOverride: quotes.originOverride,
      destinationOverride: quotes.destinationOverride,
      productOverride: quotes.productOverride,
    }));
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [created] = await db.insert(quotes).values(quote as any).returning();
    return created;
  }

  async updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote> {
    const [updated] = await db
      .update(quotes)
      .set({ ...(quote as any), updatedAt: new Date() })
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
