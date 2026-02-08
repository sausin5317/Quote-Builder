
import "dotenv/config";
import { db } from "./server/db";
import { lanes, clients } from "./shared/schema";
import { count } from "drizzle-orm";

async function checkData() {
    try {
        const laneCount = await db.select({ value: count() }).from(lanes);
        const clientCount = await db.select({ value: count() }).from(clients);

        console.log(`Lanes in database: ${laneCount[0].value}`);
        console.log(`Clients in database: ${clientCount[0].value}`);

        if (clientCount[0].value > 0) {
            const allClients = await db.select().from(clients);
            console.log("Clients:", JSON.stringify(allClients, null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error("Failed to check data:", err);
        process.exit(1);
    }
}

checkData();
