import { pgTable, text, serial, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Master list of lanes imported from CSV
export const lanes = pgTable("lanes", {
  id: serial("id").primaryKey(),
  origin: text("origin").notNull(),           // Ship Point
  destination: text("destination").notNull(), // Delivery Point
  product: text("product").notNull(),
  distance: numeric("distance").notNull(),    // dist. 1 way
  ratePerHour: numeric("rate_per_hour").notNull(), // rate $
  speed: numeric("speed").notNull(),
  fuelSurcharge: numeric("fuel_surcharge").notNull(), // fuel Sur
  loadTime: numeric("load_time").notNull(),   // load
  unloadTime: numeric("unload_time").notNull(), // unload
  minTons: numeric("min_tons").notNull(),     // MT
  chainsFee: numeric("chains_fee").default("0"), // chains
  
  // Pay Targets
  driverTargetPay: numeric("driver_target_pay").default("35"), // Target Bizi
  ownerOperatorBiziPay: numeric("oo_bizi_pay").default("115"), // Target o/o
  ownerOperatorOwnPay: numeric("oo_own_pay").default("130"),   // o/o Own
});

// Saved quotes/drafts
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  laneId: integer("lane_id").references(() => lanes.id),
  customerName: text("customer_name"),
  status: text("status").default("Draft"), // Draft, Approved, etc.
  
  // Overrides / Actual values used in calculation
  // (We store these because users might edit defaults)
  distance: numeric("distance"),
  speed: numeric("speed"),
  loadTime: numeric("load_time"),
  unloadTime: numeric("unload_time"),
  standbyTime: numeric("standby_time").default("0"),
  mtPerLoad: numeric("mt_per_load"),
  
  driveRate: numeric("drive_rate"),
  loadRate: numeric("load_rate"),
  unloadRate: numeric("unload_rate"),
  fuelSurcharge: numeric("fuel_surcharge"),
  chainsFee: numeric("chains_fee"),
  
  driverTarget: numeric("driver_target"),
  ooBiziTarget: numeric("oo_bizi_target"),
  ooOwnTarget: numeric("oo_own_target"),
  
  // Calculated Results (Snapshot)
  totalHours: numeric("total_hours"),
  totalCost: numeric("total_cost"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===
export const insertLaneSchema = createInsertSchema(lanes).omit({ id: true });
export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true });

// === TYPES ===
export type Lane = typeof lanes.$inferSelect;
export type InsertLane = z.infer<typeof insertLaneSchema>;
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
