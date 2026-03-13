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
import { setupAuth, hashPassword, comparePasswords } from "./auth";
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
    // Only admins see all users
    if (req.user.role !== "admin") return res.sendStatus(403);
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post(api.users.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Only admins should create users
    if (req.user.role !== "admin") return res.sendStatus(403);

    try {
      const input = api.users.create.input.parse(req.body);

      const existingUsers = await storage.getUsers();
      if (existingUsers.some(u => u.username === input.username)) {
        return res.status(400).json({ message: "Username already exists" });
      }

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

  // Admin: Reset Password
  app.put("/api/users/:id/password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);

    try {
      const userId = Number(req.params.id);
      console.log("[Password Reset] User ID:", userId);
      console.log("[Password Reset] Request body:", req.body);

      const { password } = z.object({ password: z.string().min(6) }).parse(req.body);
      console.log("[Password Reset] Password length:", password.length);

      const hashedPassword = await hashPassword(password);
      console.log("[Password Reset] Hashed password (first 20 chars):", hashedPassword.substring(0, 20));

      await storage.updateUser(userId, { password: hashedPassword });
      console.log("[Password Reset] Password updated successfully for user:", userId);

      res.json({ message: "Password updated" });
    } catch (err) {
      console.error("[Password Reset] Error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Admin: Delete User
  app.delete("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);

    // Prevent deleting self
    if (req.user.id === Number(req.params.id)) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    try {
      await storage.deleteUser(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // User: Change own password (requires old password)
  app.put("/api/user/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { oldPassword, newPassword } = z.object({
        oldPassword: z.string().min(1),
        newPassword: z.string().min(6, "New password must be at least 6 characters"),
      }).parse(req.body);

      // Verify old password
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const isValid = await comparePasswords(oldPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash and update new password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(req.user.id, { password: hashedPassword });

      res.json({ message: "Password changed successfully" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to change password" });
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

  // Delete product (admin only)
  app.delete("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.status(403).json({ message: "Only admins can delete products" });
    try {
      await storage.deleteProduct(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // === VEHICLES API ===
  app.get("/api/vehicles", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const vehicles = await storage.getVehicles();
    res.json(vehicles);
  });

  app.post("/api/vehicles", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const vehicle = await storage.createVehicle(req.body);
      res.status(201).json(vehicle);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete("/api/vehicles/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.status(403).json({ message: "Only admins can delete vehicles" });
    try {
      await storage.deleteVehicle(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete vehicle" });
    }
  });

  // === LANES API ===

  // Paginated search endpoint
  app.get("/api/lanes/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const search = req.query.search as string | undefined;
    const product = req.query.product as string | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));

    const result = await storage.searchLanes({ search, product, page, pageSize });
    res.json(result);
  });

  // Duplicate detection endpoint
  app.get("/api/lanes/duplicates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const duplicates = await storage.findDuplicateLanes();
    res.json(duplicates);
  });

  // Distinct products used in lanes (for filter dropdown)
  app.get("/api/lanes/products", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const products = await storage.getDistinctLaneProducts();
    res.json(products);
  });

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
        const fileBuffer = fs.readFileSync(file.path);
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });
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

  // Create single lane
  app.post("/api/lanes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role === "viewer") return res.status(403).json({ message: "Viewers cannot create lanes" });

    try {
      const lane = await storage.createLane(req.body);
      res.status(201).json(lane);
    } catch (err) {
      console.error("Create lane error:", err);
      res.status(500).json({ message: "Failed to create lane" });
    }
  });

  // Update lane
  app.put("/api/lanes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role === "viewer") return res.status(403).json({ message: "Viewers cannot edit lanes" });

    try {
      const id = Number(req.params.id);
      const existing = await storage.getLane(id);
      if (!existing) return res.status(404).json({ message: "Lane not found" });

      const lane = await storage.updateLane(id, req.body);
      res.json(lane);
    } catch (err) {
      console.error("Update lane error:", err);
      res.status(500).json({ message: "Failed to update lane" });
    }
  });

  // Delete lane
  app.delete("/api/lanes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role === "viewer") {
      return res.status(403).json({ message: "Viewers cannot delete lanes" });
    }

    try {
      const id = Number(req.params.id);
      const existing = await storage.getLane(id);
      if (!existing) return res.status(404).json({ message: "Lane not found" });

      await storage.deleteLane(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete lane error:", err);
      res.status(500).json({ message: "Failed to delete lane" });
    }
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
    if (req.user.role === "viewer") return res.status(403).json({ message: "Viewers cannot create quotes" });

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
    if (req.user.role === "viewer") return res.status(403).json({ message: "Viewers cannot update quotes" });

    try {
      const quoteId = Number(req.params.id);
      const currentQuote = await storage.getQuote(quoteId);

      if (!currentQuote) return res.status(404).json({ message: "Quote not found" });

      // Quoters cannot edit Approved/Rejected quotes, but Admins/Approvers can (or maybe restriction applies to all?)
      // Let's say once Approved, only Admin/Approver can edit.
      if (currentQuote.status === "Approved" && req.user.role === "quoter") {
        return res.status(403).json({ message: "Cannot edit approved quotes" });
      }

      const input = api.quotes.update.input.parse(req.body);
      const quote = await storage.updateQuote(quoteId, input);
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
    if (req.user.role !== "admin" && req.user.role !== "approver") {
      return res.status(403).json({ message: "Only admins or approvers can approve quotes" });
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
