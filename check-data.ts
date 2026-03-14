
import "dotenv/config";
import { db } from "./server/db";
import { lanes, clients, quotes, products, users, vehicles } from "./shared/schema";
import { count } from "drizzle-orm";

async function checkData() {
    try {
        const [laneCount, clientCount, quoteCount, productCount, vehicleCount, userCount] = await Promise.all([
            db.select({ value: count() }).from(lanes),
            db.select({ value: count() }).from(clients),
            db.select({ value: count() }).from(quotes),
            db.select({ value: count() }).from(products),
            db.select({ value: count() }).from(vehicles),
            db.select({ value: count() }).from(users)
        ]);

        console.log(`Lanes in database: ${laneCount[0].value}`);
        console.log(`Clients in database: ${clientCount[0].value}`);
        console.log(`Quotes in database: ${quoteCount[0].value}`);
        console.log(`Products in database: ${productCount[0].value}`);
        console.log(`Vehicles in database: ${vehicleCount[0].value}`);
        console.log(`Users in database: ${userCount[0].value}`);

        if (clientCount[0].value > 0) {
            const allClients = await db.select().from(clients);
            console.log("Recent Clients:", JSON.stringify(allClients.slice(-3), null, 2));
        }

        process.exit(0);
    } catch (err: any) {
        console.error("Failed to check data:", err.message);
        process.exit(1);
    }
}

checkData();
