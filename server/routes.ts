import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify/sync";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === CLIENTS API ===
  app.get(api.clients.list.path, async (req, res) => {
    const clients = await storage.getClients();
    res.json(clients);
  });

  app.get(api.clients.get.path, async (req, res) => {
    const client = await storage.getClient(Number(req.params.id));
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json(client);
  });

  app.post(api.clients.create.path, async (req, res) => {
    try {
      const input = api.clients.create.input.parse(req.body);
      const client = await storage.createClient(input);
      res.status(201).json(client);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === USERS API ===
  app.get(api.users.list.path, async (req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post(api.users.create.path, async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);
      const user = await storage.createUser(input);
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === PRODUCTS API ===
  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.post(api.products.create.path, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === LANES API ===
  app.get(api.lanes.list.path, async (req, res) => {
    const lanes = await storage.getLanes();
    res.json(lanes);
  });

  app.get(api.lanes.listByClient.path, async (req, res) => {
    const lanes = await storage.getLanesByClient(Number(req.params.clientId));
    res.json(lanes);
  });

  app.get(api.lanes.get.path, async (req, res) => {
    const lane = await storage.getLane(Number(req.params.id));
    if (!lane) {
      return res.status(404).json({ message: 'Lane not found' });
    }
    res.json(lane);
  });

  // Bulk Download - CSV export of lanes
  app.get(api.lanes.bulkDownload.path, async (req, res) => {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const lanes = clientId ? await storage.getLanesByClient(clientId) : await storage.getLanes();
    
    const csvData = stringify(lanes.map(lane => ({
      "Ship Point": lane.origin,
      "Delivery Point": lane.destination,
      "Product": lane.product,
      "Distance (1-way)": lane.distance,
      "Rate $/HR": lane.ratePerHour,
      "Speed": lane.speed,
      "Fuel Surcharge %": lane.fuelSurcharge,
      "Load Time": lane.loadTime,
      "Unload Time": lane.unloadTime,
      "Min Tons": lane.minTons,
      "Chains Fee": lane.chainsFee,
      "Driver Target": lane.driverTargetPay,
      "O/O Bizi": lane.ownerOperatorBiziPay,
      "O/O Own": lane.ownerOperatorOwnPay,
    })), { header: true });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=pricing_lanes.csv');
    res.send(csvData);
  });

  // === QUOTES API ===
  app.get(api.quotes.list.path, async (req, res) => {
    const quotes = await storage.getQuotes();
    res.json(quotes);
  });

  app.get(api.quotes.listByClient.path, async (req, res) => {
    const quotes = await storage.getQuotesByClient(Number(req.params.clientId));
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

  app.delete(api.quotes.delete.path, async (req, res) => {
    await storage.deleteQuote(Number(req.params.id));
    res.json({ success: true });
  });

  // Quote Approval Workflow
  app.post(api.quotes.approve.path, async (req, res) => {
    try {
      const { userId } = api.quotes.approve.input.parse(req.body);
      
      if (!userId || typeof userId !== 'number') {
        return res.status(400).json({ message: "Valid user ID is required" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      
      // Strict role-based access control
      if (user.role !== "admin" && user.role !== "manager") {
        return res.status(403).json({ message: "Only admins or managers can approve quotes" });
      }
      
      const quoteId = Number(req.params.id);
      if (isNaN(quoteId)) {
        return res.status(400).json({ message: "Invalid quote ID" });
      }
      
      const quote = await storage.updateQuote(quoteId, {
        status: "Approved",
        approvedBy: userId,
        approvedAt: new Date(),
      });
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      res.json(quote);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === ANALYTICS API ===
  app.get(api.analytics.quoteStats.path, async (req, res) => {
    const stats = await storage.getQuoteStats();
    res.json(stats);
  });

  app.get(api.analytics.revenueByDateRange.path, async (req, res) => {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const result = await storage.getRevenueByDateRange(startDate, endDate);
    res.json(result);
  });

  app.get(api.analytics.revenueByClient.path, async (req, res) => {
    const result = await storage.getRevenueByClient();
    res.json(result);
  });

  // Seed Data function
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingLanes = await storage.getLanes();
  
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

  let laneCount = 0;
  for await (const record of parser) {
    try {
      const cleanRate = (val: string): string => {
        if (!val) return "0";
        const cleaned = val.replace(/[$,]/g, '').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? "0" : num.toString();
      };

      const cleanPercent = (val: string): string => {
        if (!val) return "0";
        const cleaned = val.replace(/[%]/g, '').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? "0" : num.toString();
      };

      const isValidNumeric = (val: string): boolean => {
        if (!val) return false;
        const cleaned = val.replace(/[$,%]/g, '').trim();
        const parsed = parseFloat(cleaned);
        return !isNaN(parsed) && isFinite(parsed) && parsed > 0;
      };

      // Get values
      const distanceVal = record["dist. 1 way"];
      const rateVal = record["rate $"];
      const speedVal = record["Speed"];
      
      // Skip rows that don't have valid positive numeric data in key fields
      if (!isValidNumeric(distanceVal) || !isValidNumeric(rateVal) || !isValidNumeric(speedVal)) {
        continue; // Silently skip invalid rows
      }

      await storage.createLane({
        origin: record["Ship Point"] || "Unknown",
        destination: record["Delivery Point"] || "Unknown",
        product: record["Product"] || "General",
        distance: cleanRate(distanceVal),
        ratePerHour: cleanRate(rateVal),
        speed: cleanRate(speedVal),
        fuelSurcharge: cleanPercent(record["fuel Sur"]),
        loadTime: cleanRate(record["load"]),
        unloadTime: cleanRate(record["unload"]),
        minTons: cleanRate(record["MT"]),
        chainsFee: cleanRate(record["chains"]),
        driverTargetPay: cleanRate(record["Target Bizi"]),
        ownerOperatorBiziPay: cleanRate(record["Target o/o"]),
        ownerOperatorOwnPay: cleanRate(record["o/o Own"])
      });
      laneCount++;
    } catch (e) {
      console.error("Failed to insert record:", e);
    }
  }
  console.log(`Inserted ${laneCount} lanes from CSV.`);
  
  // Seed default products
  const existingProducts = await storage.getProducts();
  if (existingProducts.length === 0) {
    const defaultProducts = [
      { name: "Aluminum Chlorohydrate", category: "Chemical" },
      { name: "Ferric Chloride", category: "Chemical" },
      { name: "Sodium Hypochlorite", category: "Chemical" },
      { name: "Caustic Soda", category: "Chemical" },
      { name: "Hydrochloric Acid", category: "Chemical" },
      { name: "Sulfuric Acid", category: "Chemical" },
      { name: "General Freight", category: "General" },
    ];
    for (const product of defaultProducts) {
      await storage.createProduct(product);
    }
  }
  
  // Seed default users
  const existingUsers = await storage.getUsers();
  if (existingUsers.length === 0) {
    await storage.createUser({ username: "admin", email: "admin@loadtrax.com", role: "admin" });
    await storage.createUser({ username: "manager", email: "manager@loadtrax.com", role: "manager" });
    await storage.createUser({ username: "viewer", email: "viewer@loadtrax.com", role: "viewer" });
  }
  
  // Seed default client
  const existingClients = await storage.getClients();
  if (existingClients.length === 0) {
    await storage.createClient({ name: "Oosita Chemicals", contactEmail: "contact@oosita.com" });
    await storage.createClient({ name: "ChemCorp Inc", contactEmail: "info@chemcorp.com" });
  }
  
  console.log("Seeding complete.");
}
