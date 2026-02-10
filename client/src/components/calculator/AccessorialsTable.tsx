import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccessorialCharge } from "@shared/schema";
import { Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AccessorialsTableProps {
    charges: AccessorialCharge[];
    onChange: (charges: AccessorialCharge[]) => void;
    disabled?: boolean;
}

const PRESET_CHARGES = [
    { name: "FSC", defaultCost: 0, notes: "FSC to be added at time of delivery", defaultDriverPay: 0, defaultOOBiziPay: 0 },
    { name: "Standby", defaultCost: 120, notes: ">3 hours", defaultDriverPay: 30, defaultOOBiziPay: 90 },
    { name: "Non Driving Ferry Time", defaultCost: 90, notes: "Per Hour", defaultDriverPay: 28, defaultOOBiziPay: 70 },
    { name: "Daily Min", defaultCost: 900, notes: "10Hr Max", defaultDriverPay: 300, defaultOOBiziPay: 700 },
    { name: "Chains", defaultCost: 120, notes: "Per event", defaultDriverPay: 28, defaultOOBiziPay: 90 },
    { name: "Diversion", defaultCost: 170, notes: "> Lane Rate", defaultDriverPay: 35, defaultOOBiziPay: 140 },
    { name: "Ferry / Permit", defaultCost: 0, notes: "Cost", defaultDriverPay: 0, defaultOOBiziPay: 0 },
    { name: "Preload Request", defaultCost: 500, notes: "Day Before", defaultDriverPay: 200, defaultOOBiziPay: 0 },
    { name: "Flush Charge", defaultCost: 600, notes: "1", defaultDriverPay: 200, defaultOOBiziPay: 0 },
    { name: "Others", defaultCost: 0, notes: "", defaultDriverPay: 0, defaultOOBiziPay: 0 },
    { name: "Custom", defaultCost: 0, notes: "", defaultDriverPay: 0, defaultOOBiziPay: 0 },
];

export function AccessorialsTable({ charges, onChange, disabled }: AccessorialsTableProps) {
    const addCharge = () => {
        const newCharge: AccessorialCharge = {
            id: nanoid(),
            name: "",
            cost: 0,
            notes: "",
            driverPay: 0,
            ooBiziPay: 0,
        };
        onChange([...charges, newCharge]);
    };

    const removeCharge = (id: string) => {
        onChange(charges.filter(c => c.id !== id));
    };

    const updateCharge = (id: string, field: keyof AccessorialCharge, value: any) => {
        const updated = charges.map(c => {
            if (c.id === id) {
                if (field === "name") {
                    // If name changes to a preset, populate defaults if current values are 0 or empty
                    const preset = PRESET_CHARGES.find(p => p.name === value);
                    if (preset && value !== "Custom" && value !== "Others") {
                        // Only override if it looks like a fresh line or user switched types, 
                        // but usually user expects defaults when picking a type.
                        return {
                            ...c,
                            name: value,
                            cost: preset.defaultCost,
                            notes: preset.notes,
                            driverPay: preset.defaultDriverPay,
                            ooBiziPay: preset.defaultOOBiziPay
                        };
                    }
                }
                return { ...c, [field]: value };
            }
            return c;
        });
        onChange(updated);
    };

    const totalCost = charges.reduce((sum, c) => sum + (Number(c.cost) || 0), 0);
    const totalDriverPay = charges.reduce((sum, c) => sum + (Number(c.driverPay) || 0), 0);
    const totalOOBiziPay = charges.reduce((sum, c) => sum + (Number(c.ooBiziPay) || 0), 0);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-800">Accessorial Charges</h3>
                <Button size="sm" variant="outline" onClick={addCharge} disabled={disabled} className="h-8">
                    <Plus className="w-4 h-4 mr-2" /> Add Charge
                </Button>
            </div>

            <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead className="w-[180px]">Charge Name</TableHead>
                            <TableHead className="w-[100px]">Cost ($)</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead className="w-[100px]">Bizi Pay ($)</TableHead>
                            <TableHead className="w-[100px]">O/O Bizi ($)</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {charges.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-gray-400 py-4 text-xs">
                                    No accessorial charges added.
                                </TableCell>
                            </TableRow>
                        ) : (
                            charges.map((charge) => (
                                <TableRow key={charge.id}>
                                    <TableCell>
                                        <Select
                                            value={PRESET_CHARGES.some(p => p.name === charge.name) ? charge.name : "Custom"}
                                            onValueChange={(v) => {
                                                if (v === "Custom") updateCharge(charge.id, "name", "");
                                                else updateCharge(charge.id, "name", v);
                                            }}
                                            disabled={disabled}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Select..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PRESET_CHARGES.map(p => (
                                                    <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {/* If Custom or not in preset list (e.g. manually typed before), show input? 
                        The requirement says "give option add additional row and pricing data".
                        Let's allow free text editing if Custom, or just always allow editing the name if it's not a strict enum?
                        Actually, the user gave specific types. 
                        Let's stick to the Select + "Custom" allows free text input via a separate input or editable combo?
                        For simplicity, if they select "Custom", we can show an Input.
                    */}
                                        {(!PRESET_CHARGES.some(p => p.name === charge.name) || charge.name === "Others") && (
                                            <Input
                                                className="h-8 mt-1 text-xs"
                                                placeholder="Charge Name"
                                                value={charge.name}
                                                onChange={(e) => updateCharge(charge.id, "name", e.target.value)}
                                                disabled={disabled}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="h-8 text-xs text-right"
                                            value={charge.cost}
                                            onChange={(e) => updateCharge(charge.id, "cost", parseFloat(e.target.value))}
                                            disabled={disabled}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            className="h-8 text-xs"
                                            value={charge.notes}
                                            onChange={(e) => updateCharge(charge.id, "notes", e.target.value)}
                                            disabled={disabled}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="h-8 text-xs text-right"
                                            value={charge.driverPay}
                                            onChange={(e) => updateCharge(charge.id, "driverPay", parseFloat(e.target.value))}
                                            disabled={disabled}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="h-8 text-xs text-right"
                                            value={charge.ooBiziPay}
                                            onChange={(e) => updateCharge(charge.id, "ooBiziPay", parseFloat(e.target.value))}
                                            disabled={disabled}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-gray-400 hover:text-red-500"
                                            onClick={() => removeCharge(charge.id)}
                                            disabled={disabled}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                    {charges.length > 0 && (
                        <tfoot className="bg-gray-50 border-t border-gray-200">
                            <TableRow>
                                <TableCell className="font-bold text-xs">Totals</TableCell>
                                <TableCell className="font-bold text-xs text-right">${totalCost.toFixed(2)}</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="font-bold text-xs text-right">${totalDriverPay.toFixed(2)}</TableCell>
                                <TableCell className="font-bold text-xs text-right">${totalOOBiziPay.toFixed(2)}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </tfoot>
                    )}
                </Table>
            </div>
        </div>
    );
}
