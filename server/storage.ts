import { db } from "./db";
import {
  lanes,
  quotes,
  type Lane,
  type InsertLane,
  type Quote,
  type InsertQuote,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Lanes
  getLanes(): Promise<Lane[]>;
  getLane(id: number): Promise<Lane | undefined>;
  createLane(lane: InsertLane): Promise<Lane>;
  clearLanes(): Promise<void>; // Add this method
  
  // Quotes
  getQuotes(): Promise<Quote[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote>;
}

export class DatabaseStorage implements IStorage {
  async getLanes(): Promise<Lane[]> {
    return await db.select().from(lanes);
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

  async getQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes);
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [created] = await db.insert(quotes).values(quote).returning();
    return created;
  }

  async updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote> {
    const [updated] = await db
      .update(quotes)
      .set(quote)
      .where(eq(quotes.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
