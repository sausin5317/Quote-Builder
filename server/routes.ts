import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Lanes API
  app.get(api.lanes.list.path, async (req, res) => {
    const lanes = await storage.getLanes();
    res.json(lanes);
  });

  app.get(api.lanes.get.path, async (req, res) => {
    const lane = await storage.getLane(Number(req.params.id));
    if (!lane) {
      return res.status(404).json({ message: 'Lane not found' });
    }
    res.json(lane);
  });

  // Quotes API
  app.get(api.quotes.list.path, async (req, res) => {
    const quotes = await storage.getQuotes();
    res.json(quotes);
  });

  app.post(api.quotes.create.path, async (req, res) => {
    try {
      const input = api.quotes.create.input.parse(req.body);
      const quote = await storage.createQuote(input);
      res.status(201).json(quote);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.quotes.update.path, async (req, res) => {
    try {
      const input = api.quotes.update.input.parse(req.body);
      const quote = await storage.updateQuote(Number(req.params.id), input);
      res.json(quote);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Seed Data function
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingLanes = await storage.getLanes();
  // if (existingLanes.length > 0) return; // Force re-seed to fix bad data
  
  console.log("Seeding database from CSV...");
  
  const csvPath = path.resolve(process.cwd(), "attached_assets/2025_Worksheet_(approved_in_green).xlsx_-_2025_Contract_1767808699578.csv");
  
  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found at:", csvPath);
    return;
  }

  const parser = fs
    .createReadStream(csvPath)
    .pipe(parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      from_line: 2
    }));

  // Clear existing data to re-seed correctly
  await storage.clearLanes();

  for await (const record of parser) {
    try {
      // Map CSV columns to schema
      // CSV Headers based on snippet:
      // "Ship Point", "Delivery Point", "Product", "dist. 1 way", "rate $", "Speed", "fuel Sur", "load", "unload", "MT"
      
      const cleanRate = (val: string) => {
        if (!val) return "0";
        return val.replace(/[$,]/g, '').trim();
      };

      const cleanPercent = (val: string) => {
        if (!val) return "0";
        return val.replace(/[%]/g, '').trim();
      };

      await storage.createLane({
        origin: record["Ship Point"] || "Unknown",
        destination: record["Delivery Point"] || "Unknown",
        product: record["Product"] || "General",
        distance: cleanRate(record["dist. 1 way"]),
        ratePerHour: cleanRate(record["rate $"]),
        speed: cleanRate(record["Speed"]),
        fuelSurcharge: cleanPercent(record["fuel Sur"]),
        loadTime: cleanRate(record["load"]),
        unloadTime: cleanRate(record["unload"]),
        minTons: cleanRate(record["MT"]),
        chainsFee: cleanRate(record["chains"]),
        driverTargetPay: cleanRate(record["Target Bizi"]),
        ownerOperatorBiziPay: cleanRate(record["Target o/o"]),
        ownerOperatorOwnPay: cleanRate(record["o/o Own"])
      });
    } catch (e) {
      console.error("Failed to insert record:", e);
    }
  }
  
  console.log("Seeding complete.");
}
