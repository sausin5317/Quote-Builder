import { useState, useEffect } from "react";
import { generateQuotePDF } from "@/lib/pdf-generator";
import { Lane, InsertQuote, Client } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Clock, DollarSign, Fuel, Truck, Save, FileText, Send, Plus, CheckCircle, ArrowRight, AlertTriangle, Check, ShieldCheck } from "lucide-react";
import { useCreateQuote } from "@/hooks/use-quotes";
import { useToast } from "@/hooks/use-toast";
import { LocationSearchInput } from "@/components/ui/start-location-search";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccessorialsTable } from "./AccessorialsTable";
import { AccessorialCharge } from "@shared/schema";


interface CalculatorFormProps {
  lane: Lane | null; // Allow null for new lanes
  selectedClientId?: number | null; // Add prop
}

const PRODUCT_TYPES = ["Sulfur", "Bentonite", "PAC", "ACH", "Caustic", "Acid", "Other"];

export function CalculatorForm({ lane, selectedClientId }: CalculatorFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const createQuote = useCreateQuote();

  const { data: clients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  // Default blank values
  const defaultValues = {
    distance: "0",
    speed: "80", // Default speed
    loadTime: "1",
    unloadTime: "1",
    standbyTime: "0",
    mtPerLoad: "0",
    isRoundTrip: true,

    driveRate: "0",
    loadRate: "0",
    unloadRate: "0",
    fuelSurcharge: "0",
    chainsFee: "0",
    miscCharges: "0",
    miscChargesDescription: "",

    driverTarget: "0",
    ooBiziTarget: "0",
    ooOwnTarget: "0",

    customerName: "",
    clientId: selectedClientId?.toString() || "", // Init with prop
    originOverride: "",
    destinationOverride: "",
    productOverride: "Sulfur",
    accessorials: [] as AccessorialCharge[],
  };

  const [values, setValues] = useState(defaultValues);

  // Sync state when dependencies change (lane or selectedClientId)
  useEffect(() => {
    if (lane) {
      setValues({
        distance: lane.distance,
        speed: lane.speed,
        loadTime: lane.loadTime,
        unloadTime: lane.unloadTime,
        standbyTime: "0",
        mtPerLoad: lane.minTons,
        isRoundTrip: true,
        driveRate: lane.ratePerHour || "0",
        loadRate: lane.ratePerHour || "0",
        unloadRate: lane.ratePerHour || "0",
        fuelSurcharge: lane.fuelSurcharge || "0",
        chainsFee: lane.chainsFee || "0",
        miscCharges: "0",
        miscChargesDescription: "",
        driverTarget: lane.driverTargetPay || "0",
        ooBiziTarget: lane.ownerOperatorBiziPay || "0",
        ooOwnTarget: lane.ownerOperatorOwnPay || "0",
        customerName: "",
        clientId: selectedClientId?.toString() || "",
        originOverride: lane.origin,
        destinationOverride: lane.destination,
        productOverride: lane.product,
        accessorials: [],
      });
    } else {
      // If "New Lane" (null lane), just update client ID if it changed, keep other edits or reset?
      // For now, let's just ensure client ID is synced if it's not set
      setValues(prev => ({
        ...prev,
        clientId: selectedClientId?.toString() || prev.clientId
      }));
    }
  }, [lane, selectedClientId]);

  const handleChange = (key: string, value: string | boolean) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const distance = parseFloat(values.distance || "0");
  const speed = parseFloat(values.speed || "1");
  const loadTime = parseFloat(values.loadTime || "0");
  const unloadTime = parseFloat(values.unloadTime || "0");
  const standbyTime = parseFloat(values.standbyTime || "0");
  const driveRate = parseFloat(values.driveRate || "0");
  const loadRate = parseFloat(values.loadRate || "0");
  const unloadRate = parseFloat(values.unloadRate || "0");
  const fuelSurchargePercent = parseFloat(values.fuelSurcharge || "0");
  const chainsFee = parseFloat(values.chainsFee || "0");
  const miscCharges = parseFloat(values.miscCharges || "0");
  const mtPerLoad = parseFloat(values.mtPerLoad || "1");

  const distanceMultiplier = values.isRoundTrip ? 2 : 1;
  const driveHours = (distance * distanceMultiplier) / speed;
  const totalHours = driveHours + loadTime + unloadTime + standbyTime;

  const driveRevenue = driveHours * driveRate;
  const loadRevenue = loadTime * loadRate;
  const unloadRevenue = unloadTime * unloadRate;
  const standbyRevenue = standbyTime * loadRate;

  const baseRevenue = driveRevenue + loadRevenue + unloadRevenue + standbyRevenue;

  const fuelRevenue = baseRevenue * (fuelSurchargePercent / 100);

  const accessorialsCost = values.accessorials.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
  const totalTripPrice = baseRevenue + fuelRevenue + chainsFee + miscCharges + accessorialsCost;

  const driverTarget = parseFloat(values.driverTarget || "0");
  const ooBiziTarget = parseFloat(values.ooBiziTarget || "0");
  const ooOwnTarget = parseFloat(values.ooOwnTarget || "0");

  const accessorialsDriverPay = values.accessorials.reduce((sum, item) => sum + (Number(item.driverPay) || 0), 0);
  const accessorialsOOBiziPay = values.accessorials.reduce((sum, item) => sum + (Number(item.ooBiziPay) || 0), 0);

  const driverPay = (totalHours * driverTarget) + accessorialsDriverPay;
  const ooBiziPay = (totalHours * ooBiziTarget) + accessorialsOOBiziPay;
  const ooOwnPay = totalHours * ooOwnTarget; // User didn't ask for O/O Own Pay accessorials column yet

  const margin = totalTripPrice - driverPay;
  const hourlyMargin = totalHours > 0 ? margin / totalHours : 0;
  const ratePerTon = mtPerLoad > 0 ? totalTripPrice / mtPerLoad : 0;

  const handleSave = async (status: string = "Draft") => {
    if (!values.customerName && !values.clientId) {
      toast({
        title: "Missing Customer Info",
        description: "Please select a client or enter a customer name.",
        variant: "destructive",
      });
      return;
    }

    const selectedClient = clients?.find(c => c.id.toString() === values.clientId);

    try {
      await createQuote.mutateAsync({
        laneId: lane?.id ?? null,
        clientId: values.clientId ? parseInt(values.clientId) : null,
        customerName: values.customerName || selectedClient?.name || "",
        status, // Draft, Pending Review, or Approved
        distance: values.distance,
        speed: values.speed,
        loadTime: values.loadTime,
        unloadTime: values.unloadTime,
        standbyTime: values.standbyTime,
        mtPerLoad: values.mtPerLoad,
        isRoundTrip: values.isRoundTrip,
        driveRate: values.driveRate,
        loadRate: values.loadRate,
        unloadRate: values.unloadRate,
        fuelSurcharge: values.fuelSurcharge,
        chainsFee: values.chainsFee,
        miscCharges: values.miscCharges,
        miscChargesDescription: values.miscChargesDescription || null,
        driverTarget: values.driverTarget,
        ooBiziTarget: values.ooBiziTarget,
        ooOwnTarget: values.ooOwnTarget,
        totalHours: totalHours.toFixed(2),
        totalCost: totalTripPrice.toFixed(2),
        ratePerTon: ratePerTon.toFixed(2),
        originOverride: values.originOverride || null,
        destinationOverride: values.destinationOverride || null,
        accessorials: values.accessorials,
      });

      toast({
        title: status === "Pending Review" ? "Quote Submitted" : (status === "Approved" ? "Quote Approved" : "Quote Saved"),
        description: status === "Pending Review"
          ? "Quote has been submitted for review."
          : (status === "Approved" ? "Quote has been approved successfully." : "Draft saved successfully."),
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save quote. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    generateQuotePDF({
      quote: values,
      clientName: clients?.find(c => c.id.toString() === values.clientId)?.name || values.customerName,
      isDraft: true
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex flex-col gap-4 bg-white">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-1 gap-2 items-center w-full lg:w-auto">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-gray-500 mb-1 block">Origin</Label>
              <LocationSearchInput
                value={values.originOverride}
                onChange={(v) => handleChange("originOverride", v)}
                placeholder="Search Origin..."
                className="h-8 text-sm"
              />
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 mt-5" />
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-gray-500 mb-1 block">Destination</Label>
              <LocationSearchInput
                value={values.destinationOverride}
                onChange={(v) => handleChange("destinationOverride", v)}
                placeholder="Search Destination..."
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <Label className="text-xs text-gray-500 mb-1 block">Product</Label>
              <Select value={values.productOverride} onValueChange={(v) => handleChange("productOverride", v)}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue>{values.productOverride}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 mt-5">
              <Button variant="outline" size="sm" onClick={() => handleSave("Draft")} disabled={createQuote.isPending || user?.role === "viewer"} className="h-8">
                <Save className="w-3 h-3 mr-2" /> Save Draft
              </Button>
              {(user?.role === "admin" || user?.role === "approver") && (
                <Button
                  variant="default"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white h-8"
                  onClick={() => handleSave("Approved")}
                  disabled={createQuote.isPending}
                >
                  <ShieldCheck className="w-3 h-3 mr-2" /> Approve
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">

        {/* Trip & Time */}
        <Card className="p-4 shadow-sm border-gray-200">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Trip & Time</h3>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-32">
              <Label className="text-xs text-gray-500">One-Way KM</Label>
              <Input className="h-8 mt-1" type="number" value={values.distance} onChange={(e) => handleChange("distance", e.target.value)} />
            </div>
            <div className="w-32">
              <Label className="text-xs text-gray-500">Speed (KM/H)</Label>
              <Input className="h-8 mt-1" type="number" value={values.speed} onChange={(e) => handleChange("speed", e.target.value)} />
            </div>
            <div className="w-24">
              <Label className="text-xs text-gray-500">Load Hrs</Label>
              <Input className="h-8 mt-1" type="number" value={values.loadTime} onChange={(e) => handleChange("loadTime", e.target.value)} />
            </div>
            <div className="w-24">
              <Label className="text-xs text-gray-500">Unload Hrs</Label>
              <Input className="h-8 mt-1" type="number" value={values.unloadTime} onChange={(e) => handleChange("unloadTime", e.target.value)} />
            </div>
            <div className="w-24">
              <Label className="text-xs text-gray-500">Standby Hrs</Label>
              <Input className="h-8 mt-1" type="number" value={values.standbyTime} onChange={(e) => handleChange("standbyTime", e.target.value)} />
            </div>
            <div className="w-32">
              <Label className="text-xs text-gray-500">MT Per Load</Label>
              <Input className="h-8 mt-1" type="number" value={values.mtPerLoad} onChange={(e) => handleChange("mtPerLoad", e.target.value)} />
            </div>
            <div className="flex items-center gap-2 mb-2 ml-4">
              <Switch checked={values.isRoundTrip} onCheckedChange={(v) => handleChange("isRoundTrip", v)} id="rt-switch" />
              <Label htmlFor="rt-switch" className="text-xs font-medium">Round Trip</Label>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Rates & Surcharges */}
          <Card className="p-4 shadow-sm border-gray-200 bg-slate-50/50">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Rates & Surcharges</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-gray-500">Drive Rate ($/HR)</Label>
                <Input className="h-8 text-right bg-white" type="number" value={values.driveRate} onChange={(e) => handleChange("driveRate", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-gray-600">Load Rate ($/HR)</Label>
                <Input className="h-8 text-right bg-white" type="number" value={values.loadRate} onChange={(e) => handleChange("loadRate", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-gray-600">Unload Rate ($/HR)</Label>
                <Input className="h-8 text-right bg-white" type="number" value={values.unloadRate} onChange={(e) => handleChange("unloadRate", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-gray-500">Fuel Surch. (%)</Label>
                <Input className="h-8 text-right bg-white" type="number" value={values.fuelSurcharge} onChange={(e) => handleChange("fuelSurcharge", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-gray-500">Chains Fee ($)</Label>
                <Input className="h-8 text-right bg-white" type="number" value={values.chainsFee} onChange={(e) => handleChange("chainsFee", e.target.value)} />
              </div>
            </div>
          </Card>

          {/* Target Pay Rates */}
          <Card className="p-4 shadow-sm border-gray-200 bg-slate-50/50">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Target Pay Rates</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-gray-500">Driver Target</Label>
                <Input className="h-8 text-right bg-white" type="number" value={values.driverTarget} onChange={(e) => handleChange("driverTarget", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-gray-500">O/O Target (Bizi)</Label>
                <Input className="h-8 text-right bg-white" type="number" value={values.ooBiziTarget} onChange={(e) => handleChange("ooBiziTarget", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-gray-500">O/O Target (Own)</Label>
                <Input className="h-8 text-right bg-white" type="number" value={values.ooOwnTarget} onChange={(e) => handleChange("ooOwnTarget", e.target.value)} />
              </div>
            </div>
          </Card>



          {/* Margin & Warnings */}
          <Card className="p-4 shadow-sm border-gray-200 bg-white">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Margin & Warnings</h3>
            <div className="space-y-3">
              <div className="text-xs text-gray-500 font-medium">Hourly Thresholds:</div>

              <div className={cn(
                "flex items-center gap-2 p-2 rounded text-xs font-semibold border transition-all text-white",
                hourlyMargin > 160
                  ? "bg-gradient-to-r from-red-500 to-red-600 border-red-600"
                  : "bg-gray-100 text-gray-400 border-gray-200"
              )}>
                {hourlyMargin > 160 ? <AlertTriangle className="w-3 h-3 text-white" /> : <div className="w-3 h-3 rounded-full bg-gray-300" />}
                Over $160 / HR
              </div>

              <div className={cn(
                "flex items-center gap-2 p-2 rounded text-xs font-semibold border transition-all text-white",
                hourlyMargin > 180
                  ? "bg-gradient-to-r from-red-700 to-red-900 border-red-800"
                  : "bg-gray-100 text-gray-400 border-gray-200"
              )}>
                {hourlyMargin > 180 ? <AlertTriangle className="w-3 h-3 text-white" /> : <div className="w-3 h-3 rounded-full bg-gray-300" />}
                Over $180 / HR
              </div>

              <div className={cn(
                "flex items-center gap-2 p-2 rounded text-xs font-semibold border transition-all",
                hourlyMargin < 120
                  ? "bg-amber-100 text-amber-500 border-amber-200"
                  : "bg-gray-50 text-gray-300 border-gray-100"
              )}>
                {hourlyMargin < 120 ? <AlertTriangle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full bg-gray-200" />}
                Below Threshold
              </div>
            </div>
          </Card>

          {/* Accessorials - Spanning 3 cols */}
          <div className="col-span-1 lg:col-span-3">
            <AccessorialsTable
              charges={values.accessorials}
              onChange={(newCharges) => setValues(prev => ({ ...prev, accessorials: newCharges }))}
            />
          </div>
        </div>

        {/* Calculations */}
        <div className="bg-gray-100 p-3 rounded-md border border-gray-200 flex flex-wrap gap-6 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Drive Hours ({values.isRoundTrip ? "RT" : "1W"}):</span>
            <span className="text-sm font-mono font-bold">{driveHours.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Total Hours:</span>
            <span className="text-sm font-mono font-bold">{totalHours.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2 border-l border-gray-300 pl-6">
            <span className="text-xs font-bold text-gray-500 uppercase">All-in $/Trip:</span>
            <span className="text-xl font-mono font-bold text-gray-900">${totalTripPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          <div className="bg-white rounded-md border border-gray-200 p-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-medium">Company Driver:</span>
              <span className="font-bold font-mono">${driverPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-medium">O/O (Bizi Truck):</span>
              <span className="font-bold font-mono">${ooBiziPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-medium">O/O (Own Truck):</span>
              <span className="font-bold font-mono">${ooOwnPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-medium">Internal Notes:</span>
            </div>
            <Textarea placeholder="Add notes..." className="h-10 text-xs resize-none" />
          </div>

          <div className="bg-white rounded-md border border-gray-200 p-3 space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase">Output</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-24">Customer Quote:</span>
              <div className="flex gap-1 flex-1">
                <Button variant="outline" size="sm" className="h-7 text-xs flex-1">Preview</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={handleExportPDF}>
                  <FileText className="w-3 h-3 mr-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => {
                  const subject = encodeURIComponent(`Quote #${lane?.id ?? "New"}`);
                  const body = encodeURIComponent(`Total: $${totalTripPrice}`);
                  window.location.href = `mailto:?subject=${subject}&body=${body}`;
                }}>Email</Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-24">Internal Breakdown:</span>
              <div className="flex gap-1 flex-1">
                <div className="flex-1">
                  <Button
                    className="w-full h-7 text-xs bg-slate-800 text-white hover:bg-slate-700"
                    onClick={() => handleSave("Pending Review")}
                    disabled={createQuote.isPending || user?.role === "viewer"}
                  >
                    Submit Review
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
