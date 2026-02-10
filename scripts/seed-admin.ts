import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function seedAdmin() {
    console.log("Seeding admin user...");
    try {
        const hashedPassword = await hashPassword("admin123");
        console.log("Password hashed.");

        // Check if admin exists
        console.log("Checking for existing users...");
        const existing = await db.select().from(users).limit(1);
        console.log("Existing users count:", existing.length);
        if (existing.length > 0) {
            console.log("Users already exist. Skipping seed.");
            process.exit(0);
        }

        await db.insert(users).values({
            username: "admin",
            password: hashedPassword,
            role: "admin",
            email: "admin@example.com"
        });
        console.log("Admin user created: admin / admin123");
    } catch (error) {
        console.error("Error seeding admin:", error);
        process.exit(1);
    }
    process.exit(0);
}

seedAdmin();
