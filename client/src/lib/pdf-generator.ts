import { jsPDF } from "jspdf";
import { QuoteWithLane, AccessorialCharge } from "@shared/schema";

interface GeneratePDFParams {
    quote: QuoteWithLane | any; // Accept QuoteWithLane or FormValues-like object
    clientName?: string;
    isDraft?: boolean;
}

export const generateQuotePDF = ({ quote, clientName, isDraft = false }: GeneratePDFParams) => {
    const doc = new jsPDF();

    // Extract values, handling both DB Quote and Form Values structures
    // Form Values might have string numbers, DB has specific types.
    // We'll normalize to safe numbers/strings.

    const getValue = (key: string, defaultVal: any = "") => {
        return quote[key] !== undefined && quote[key] !== null ? quote[key] : defaultVal;
    };

    const origin = getValue("origin") || getValue("originOverride") || "";
    const destination = getValue("destination") || getValue("destinationOverride") || "";
    const product = getValue("product") || getValue("productOverride") || "";
    const distance = getValue("distance", 0);
    const isRoundTrip = getValue("isRoundTrip", false);

    const baseRevenue = (() => {
        // Re-calculate or use stored total? 
        // If passing a Quote object, it might only have totalCost.
        // Ideally we want the breakdown.
        // If we are in History, we might not have all breakdown fields if they weren't saved?
        // Wait, the DB schema for Quote doesn't have breakdown fields like 'driveRevenue'.
        // It has rate components like 'driveRate', 'loadRate'...
        // We can re-calculate if needed, or just show summary if breakdown is missing.
        // But for CalculatorForm, we have the calculated values.
        // Let's rely on the passed object having the necessary data or we calculate it.

        const dist = parseFloat(distance);
        const spd = parseFloat(getValue("speed", 80));
        const distMult = isRoundTrip ? 2 : 1;
        const driveHrs = (dist * distMult) / spd;

        const loadTime = parseFloat(getValue("loadTime", 0));
        const unloadTime = parseFloat(getValue("unloadTime", 0));
        const standbyTime = parseFloat(getValue("standbyTime", 0));

        const driveRate = parseFloat(getValue("driveRate", 0));
        const loadRate = parseFloat(getValue("loadRate", 0));
        const unloadRate = parseFloat(getValue("unloadRate", 0));

        return (driveHrs * driveRate) + (loadTime * loadRate) + (unloadTime * unloadRate) + (standbyTime * loadRate);
    })();

    const fuelSurchargePercent = parseFloat(getValue("fuelSurcharge", 0));
    const fuelRevenue = baseRevenue * (fuelSurchargePercent / 100);
    const chainsFee = parseFloat(getValue("chainsFee", 0));
    const miscCharges = parseFloat(getValue("miscCharges", 0));
    const miscDesc = getValue("miscChargesDescription", "Other");

    const accessorials: AccessorialCharge[] = getValue("accessorials", []);

    const accessorialsCost = accessorials.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    const totalTripPrice = baseRevenue + fuelRevenue + chainsFee + miscCharges + accessorialsCost;

    const mtPerLoad = parseFloat(getValue("mtPerLoad", 1));
    const ratePerTon = mtPerLoad > 0 ? totalTripPrice / mtPerLoad : 0;


    // Header
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Bizi Transport Quote", 15, 25);

    const displayDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${displayDate}`, 150, 25);

    if (isDraft) {
        doc.setTextColor(255, 200, 200);
        doc.text("DRAFT", 100, 25);
    }

    // Client Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Customer Information", 15, 55);
    doc.setLineWidth(0.5);
    doc.line(15, 57, 195, 57);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    // Use passed clientName or try to find it in quote (if joined)
    const custName = clientName || getValue("customerName") || "N/A";
    doc.text(`Client: ${custName}`, 15, 65);
    doc.text(`Product: ${product}`, 15, 72);

    // Lane Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Lane Details", 15, 90);
    doc.line(15, 92, 195, 92);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Origin: ${origin}`, 15, 100);
    doc.text(`Destination: ${destination}`, 15, 107);
    doc.text(`Distance: ${distance} km (${isRoundTrip ? "Round Trip" : "One Way"})`, 15, 114);

    // Cost Breakdown
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Pricing Summary", 15, 135);
    doc.line(15, 137, 195, 137);

    let yPos = 145;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const addLine = (label: string, value: string) => {
        doc.text(label, 15, yPos);
        doc.text(value, 195, yPos, { align: "right" });
        yPos += 7;
    };

    addLine("Base Revenue", `$${baseRevenue.toFixed(2)}`);
    addLine(`Fuel Surcharge (${fuelSurchargePercent}%)`, `$${fuelRevenue.toFixed(2)}`);
    if (chainsFee > 0) addLine("Chains Fee", `$${chainsFee.toFixed(2)}`);
    if (miscCharges > 0) addLine(`Misc Charges (${miscDesc})`, `$${miscCharges.toFixed(2)}`);

    // Accessorials
    if (accessorials.length > 0) {
        yPos += 5;
        doc.setFont("helvetica", "bold");
        doc.text("Additional Services", 15, yPos);
        yPos += 7;

        // Accessorial Table Header
        doc.setFillColor(240, 240, 240);
        doc.rect(15, yPos - 5, 180, 7, "F");
        doc.setFontSize(9);
        doc.text("Description", 17, yPos);
        doc.text("Condition / Notes", 100, yPos);
        doc.text("Rate", 193, yPos, { align: "right" });
        yPos += 7;

        doc.setFont("helvetica", "normal");
        accessorials.forEach(acc => {
            const name = acc.name || "Accessorial";
            const note = acc.notes || "-";
            const cost = `$${Number(acc.cost).toFixed(2)}`;

            doc.text(name, 17, yPos);
            doc.text(note, 100, yPos);
            doc.text(cost, 193, yPos, { align: "right" });
            yPos += 6;
        });
    }

    const notes = getValue("notes");
    if (notes) {
        yPos += 5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Notes / Terms", 15, yPos);
        yPos += 5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const splitNotes = doc.splitTextToSize(notes, 180);
        doc.text(splitNotes, 15, yPos);
        yPos += (splitNotes.length * 5);
    }

    yPos += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPos, 195, yPos);
    yPos += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74); // Green
    doc.text("Total Trip Cost:", 15, yPos);
    doc.text(`$${totalTripPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 195, yPos, { align: "right" });

    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Rate per MT: $${ratePerTon.toFixed(2)}`, 195, yPos, { align: "right" });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("This quote is valid for 30 days from issuance.", 105, 280, { align: "center" });

    doc.save(`Bizi_Quote_${getValue("id", "Draft")}.pdf`);
};
