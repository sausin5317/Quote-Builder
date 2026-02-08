import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify/sync";
import multer from "multer";
import * as XLSX from "xlsx";
import { setupAuth, hashPassword } from "./auth";
import { parseLaneRecord, LANE_IMPORT_COLUMNS } from "./utils/lane-parser";

const upload = multer({ dest: "uploads/" });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Setup Authentication
  setupAuth(app);

  // === CLIENTS API ===
  app.get(api.clients.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clients = await storage.getClients();
    res.json(clients);
  });

  app.get(api.clients.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const client = await storage.getClient(Number(req.params.id));
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json(client);
  });

  app.post(api.clients.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
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
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post(api.users.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Only admins should create users directly via API, others use register
    if (req.user?.role !== "admin") return res.sendStatus(403);

    try {
      const input = api.users.create.input.parse(req.body);
      // Hash password if provided, though this endpoint might rely on raw schema
      const hashedPassword = await hashPassword(input.password || "password123");
      const user = await storage.createUser({ ...input, password: hashedPassword });
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
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const products = await storage.getProducts();
    res.json(products);
  });

  app.post(api.products.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
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
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const lanes = await storage.getLanes();
    res.json(lanes);
  });

  // Bulk Download - CSV export of lanes
  app.get(api.lanes.bulkDownload.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
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

  // Template Download
  app.get(api.lanes.template.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const csvData = stringify([], {
      header: true,
      columns: LANE_IMPORT_COLUMNS
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=lane_import_template.csv');
    res.send(csvData);
  });

  // Bulk Upload
  app.post(api.lanes.bulkUpload.path, upload.single("file"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      let records: any[] = [];
      const extension = path.extname(file.originalname).toLowerCase();

      if (extension === ".csv") {
        const content = fs.readFileSync(file.path, "utf-8");
        records = await new Promise((resolve, reject) => {
          parse(content, { columns: true, skip_empty_lines: true, trim: true }, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
      } else if (extension === ".xlsx" || extension === ".xls") {
        const workbook = XLSX.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } else {
        return res.status(400).json({ message: "Unsupported file format. Use CSV or Excel." });
      }

      let laneCount = 0;
      for (const record of records) {
        const laneData = parseLaneRecord(record);
        if (laneData) {
          await storage.createLane(laneData);
          laneCount++;
        }
      }

      // Cleanup uploaded file
      fs.unlinkSync(file.path);

      res.status(201).json({ count: laneCount });
    } catch (err) {
      console.error("Bulk upload failed:", err);
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(500).json({ message: "Internal server error during upload" });
    }
  });

  app.get(api.lanes.listByClient.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const lanes = await storage.getLanesByClient(Number(req.params.clientId));
    res.json(lanes);
  });

  app.get(api.lanes.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const lane = await storage.getLane(Number(req.params.id));
    if (!lane) {
      return res.status(404).json({ message: 'Lane not found' });
    }
    res.json(lane);
  });


  // === QUOTES API ===
  app.get(api.quotes.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const quotes = await storage.getQuotes();
    // Maybe filter for non-admins? Currently leaving open to all auth users
    res.json(quotes);
  });

  app.get(api.quotes.listByClient.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const quotes = await storage.getQuotesByClient(Number(req.params.clientId));
    res.json(quotes);
  });

  app.post(api.quotes.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
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
    if (!req.isAuthenticated()) return res.sendStatus(401);
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
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteQuote(Number(req.params.id));
    res.json({ success: true });
  });

  // Quote Approval Workflow
  app.post(api.quotes.approve.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    // Strict role-based access control
    if (req.user.role !== "admin" && req.user.role !== "manager") {
      return res.status(403).json({ message: "Only admins or managers can approve quotes" });
    }

    try {
      // Validate the quote ID param
      const quoteId = Number(req.params.id);
      if (isNaN(quoteId)) {
        return res.status(400).json({ message: "Invalid quote ID" });
      }

      const quote = await storage.updateQuote(quoteId, {
        status: "Approved",
        approvedBy: req.user.id, // Use authenticated user ID
        approvedAt: new Date(),
      });

      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      res.json(quote);
    } catch (err) {
      // ... existing error handling
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === ANALYTICS API ===
  app.get(api.analytics.quoteStats.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const stats = await storage.getQuoteStats();
    res.json(stats);
  });

  app.get(api.analytics.revenueByDateRange.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const result = await storage.getRevenueByDateRange(startDate, endDate);
    res.json(result);
  });

  app.get(api.analytics.revenueByClient.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
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

  if (fs.existsSync(csvPath)) {
    if (existingLanes.length > 0) {
      console.log("Lanes already exist, skipping CSV re-seeding.");
    } else {
      const parser = fs
        .createReadStream(csvPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          from_line: 2
        }));

      // Clear existing data to re-seed correctly
      // await storage.clearLanes(); // Already checked above, but safe to allow if we were inside the else

      let laneCount = 0;
      for await (const record of parser) {
        try {
          const laneData = parseLaneRecord(record);
          if (laneData) {
            await storage.createLane(laneData);
            laneCount++;
          }
        } catch (e) {
          console.error("Failed to insert record:", e);
        }
      }
      console.log(`Inserted ${laneCount} lanes from CSV.`);
    }
  } else {
    console.error("CSV file not found at:", csvPath);
  }

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
  // Simply check if admin exists, if not create default users
  const adminUser = existingUsers.find(u => u.username === "admin");

  if (!adminUser) {
    const hashedPassword = await hashPassword("password123");

    await storage.createUser({ username: "admin", password: hashedPassword, email: "admin@loadtrax.com", role: "admin" });
    await storage.createUser({ username: "manager", password: hashedPassword, email: "manager@loadtrax.com", role: "manager" });
    await storage.createUser({ username: "viewer", password: hashedPassword, email: "viewer@loadtrax.com", role: "viewer" });

    console.log("Default users seeded with password 'password123'");
  }

  // Seed default client
  const existingClients = await storage.getClients();
  if (existingClients.length === 0) {
    await storage.createClient({ name: "Oosita Chemicals", contactEmail: "contact@oosita.com" });
    await storage.createClient({ name: "ChemCorp Inc", contactEmail: "info@chemcorp.com" });
  }

  console.log("Seeding complete.");
}
