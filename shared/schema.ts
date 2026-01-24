import { pgTable, text, serial, numeric, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Clients table for client-specific pricing
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users table with roles for workflow approval
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  role: text("role").notNull().default("viewer"), // admin, manager, viewer
  createdAt: timestamp("created_at").defaultNow(),
});

// Products table for dropdown selection
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  isActive: boolean("is_active").default(true),
});

// Master list of lanes imported from CSV
export const lanes = pgTable("lanes", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  product: text("product").notNull(),
  distance: numeric("distance").notNull(),
  ratePerHour: numeric("rate_per_hour").notNull(),
  speed: numeric("speed").notNull(),
  fuelSurcharge: numeric("fuel_surcharge").notNull(),
  loadTime: numeric("load_time").notNull(),
  unloadTime: numeric("unload_time").notNull(),
  minTons: numeric("min_tons").notNull(),
  chainsFee: numeric("chains_fee").default("0"),
  
  driverTargetPay: numeric("driver_target_pay").default("35"),
  ownerOperatorBiziPay: numeric("oo_bizi_pay").default("115"),
  ownerOperatorOwnPay: numeric("oo_own_pay").default("130"),
});

// Saved quotes/drafts with enhanced workflow
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  laneId: integer("lane_id").references(() => lanes.id),
  clientId: integer("client_id").references(() => clients.id),
  customerName: text("customer_name"),
  
  // Workflow Status: Draft, Pending Review, Approved, Rejected
  status: text("status").default("Draft"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  // Location overrides
  originOverride: text("origin_override"),
  destinationOverride: text("destination_override"),
  
  // Core trip parameters
  distance: numeric("distance"),
  speed: numeric("speed"),
  loadTime: numeric("load_time"),
  unloadTime: numeric("unload_time"),
  standbyTime: numeric("standby_time").default("0"),
  mtPerLoad: numeric("mt_per_load"),
  isRoundTrip: boolean("is_round_trip").default(true),
  
  // Rate parameters
  driveRate: numeric("drive_rate"),
  loadRate: numeric("load_rate"),
  unloadRate: numeric("unload_rate"),
  fuelSurcharge: numeric("fuel_surcharge"),
  chainsFee: numeric("chains_fee"),
  miscCharges: numeric("misc_charges").default("0"),
  miscChargesDescription: text("misc_charges_description"),
  
  // Target pay rates
  driverTarget: numeric("driver_target"),
  ooBiziTarget: numeric("oo_bizi_target"),
  ooOwnTarget: numeric("oo_own_target"),
  
  // Calculated Results (Snapshot)
  totalHours: numeric("total_hours"),
  totalCost: numeric("total_cost"),
  ratePerTon: numeric("rate_per_ton"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === SCHEMAS ===
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertLaneSchema = createInsertSchema(lanes).omit({ id: true });
export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true, updatedAt: true });

// === TYPES ===
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Lane = typeof lanes.$inferSelect;
export type InsertLane = z.infer<typeof insertLaneSchema>;
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

// Quote Status Types
export const QUOTE_STATUSES = ["Draft", "Pending Review", "Approved", "Rejected"] as const;
export type QuoteStatus = typeof QUOTE_STATUSES[number];

// User Roles
export const USER_ROLES = ["admin", "manager", "viewer"] as const;
export type UserRole = typeof USER_ROLES[number];
