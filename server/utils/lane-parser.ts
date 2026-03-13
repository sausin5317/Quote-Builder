import { type InsertLane } from "@shared/schema";

export const cleanRate = (val: any): string => {
    if (val === undefined || val === null) return "0";
    const str = String(val).replace(/[$,]/g, '').trim();
    const num = parseFloat(str);
    return isNaN(num) ? "0" : num.toString();
};

export const cleanPercent = (val: any): string => {
    if (val === undefined || val === null) return "0";
    const str = String(val).replace(/[%]/g, '').trim();
    const num = parseFloat(str);
    return isNaN(num) ? "0" : num.toString();
};

export const isValidNumeric = (val: any): boolean => {
    if (val === undefined || val === null) return false;
    const str = String(val).replace(/[$,%]/g, '').trim();
    const parsed = parseFloat(str);
    return !isNaN(parsed) && isFinite(parsed) && parsed > 0;
};

export function parseLaneRecord(record: any): InsertLane | null {
    // Get values
    const distanceVal = record["dist. 1 way"] || record["Distance"] || record["Distance (1-way)"];
    const rateVal = record["rate $"] || record["Rate $/HR"];
    let speedVal = record["Speed"];
    if (speedVal === undefined || speedVal === null || speedVal === "") {
        speedVal = "70";
    }

    // Skip rows that don't have valid positive numeric data in key fields
    if (!isValidNumeric(distanceVal) || !isValidNumeric(rateVal)) {
        return null;
    }

    return {
        origin: record["Ship Point"] || record["Origin"] || "Unknown",
        destination: record["Delivery Point"] || record["Destination"] || "Unknown",
        product: record["Product"] || "General",
        distance: cleanRate(distanceVal),
        ratePerHour: cleanRate(rateVal),
        speed: cleanRate(speedVal),
        fuelSurcharge: cleanPercent(record["fuel Sur"] || record["Fuel Surcharge %"]),
        loadTime: cleanRate(record["load"] || record["Load Time"]),
        unloadTime: cleanRate(record["unload"] || record["Unload Time"]),
        minTons: cleanRate(record["MT"] || record["Min Tons"]),
        chainsFee: cleanRate(record["chains"] || record["Chains Fee"]),
        driverTargetPay: cleanRate(record["Target Bizi"] || record["Driver Target"]),
        ownerOperatorBiziPay: cleanRate(record["Target o/o"] || record["O/O Bizi"]),
        ownerOperatorOwnPay: cleanRate(record["o/o Own"] || record["O/O Own"]),
        clientId: record["clientId"] ? parseInt(record["clientId"]) : null
    };
}

export const LANE_IMPORT_COLUMNS = [
    "Ship Point",
    "Delivery Point",
    "Product",
    "Distance (1-way)",
    "Rate $/HR",
    "Speed",
    "Fuel Surcharge %",
    "Load Time",
    "Unload Time",
    "Min Tons",
    "Chains Fee",
    "Driver Target",
    "O/O Bizi",
    "O/O Own"
];
