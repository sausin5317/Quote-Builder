
import "dotenv/config";
import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function check() {
    try {
        console.log("Checking database connection...");
        const result = await db.execute(sql`SELECT 1`);
        console.log("Database connection successful!", result);
        process.exit(0);
    } catch (err) {
        console.error("Database connection failed:", err);
        process.exit(1);
    }
}

check();
