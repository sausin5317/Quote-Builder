import { useState, useEffect } from "react";
import { Lane, InsertQuote } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, Fuel, Truck, Save, FileText, Send } from "lucide-react";
import { useCreateQuote } from "@/hooks/use-quotes";
import { useToast } from "@/hooks/use-toast";

interface CalculatorFormProps {
  lane: Lane;
}

export function CalculatorForm({ lane }: CalculatorFormProps) {
  const { toast } = useToast();
  const createQuote = useCreateQuote();
  
  // State for form values (initialized with lane defaults)
  const [values, setValues] = useState({
    distance: lane.distance,
    speed: lane.speed,
    loadTime: lane.loadTime,
    unloadTime: lane.unloadTime,
    standbyTime: "0",
    mtPerLoad: lane.minTons,
    
    // Rates
    driveRate: lane.ratePerHour, // Assuming rate_per_hour maps to drive rate base
    loadRate: lane.ratePerHour,
    unloadRate: lane.ratePerHour,
    fuelSurcharge: lane.fuelSurcharge,
    chainsFee: lane.chainsFee,
    
    // Targets
    driverTarget: lane.driverTargetPay,
    ooBiziTarget: lane.ownerOperatorBiziPay,
    ooOwnTarget: lane.ownerOperatorOwnPay,

    customerName: "",
  });

  // Reset form when lane changes
  useEffect(() => {
    setValues({
      distance: lane.distance,
      speed: lane.speed,
      loadTime: lane.loadTime,
      unloadTime: lane.unloadTime,
      standbyTime: "0",
      mtPerLoad: lane.minTons,
      
      driveRate: lane.ratePerHour,
      loadRate: lane.ratePerHour,
      unloadRate: lane.ratePerHour,
      fuelSurcharge: lane.fuelSurcharge,
      chainsFee: lane.chainsFee,
      
      driverTarget: lane.driverTargetPay,
      ooBiziTarget: lane.ownerOperatorBiziPay,
      ooOwnTarget: lane.ownerOperatorOwnPay,
      
      customerName: "",
    });
  }, [lane]);

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  // --- Calculations ---
  const distance = parseFloat(values.distance || "0");
  const speed = parseFloat(values.speed || "1"); // Avoid divide by zero
  const loadTime = parseFloat(values.loadTime || "0");
  const unloadTime = parseFloat(values.unloadTime || "0");
  const standbyTime = parseFloat(values.standbyTime || "0");
  const driveRate = parseFloat(values.driveRate || "0");
  const fuelSurchargePercent = parseFloat(values.fuelSurcharge || "0");
  const chainsFee = parseFloat(values.chainsFee || "0");
  
  // Logic: 
  // Drive Hours = (Distance * 2 (Round Trip)) / Speed
  const driveHours = (distance * 2) / speed;
  const totalHours = driveHours + loadTime + unloadTime + standbyTime;
  
  // Basic Pricing Logic (Simplified for Demo)
  // Base Cost = Total Hours * Drive Rate
  // Fuel Surcharge = Base Cost * (Fuel % / 100)
  // Total = Base Cost + Fuel Surcharge + Chains
  const baseCost = totalHours * driveRate;
  const fuelCost = baseCost * (fuelSurchargePercent / 100);
  const totalCost = baseCost + fuelCost + chainsFee;
  
  const handleSave = async () => {
    if (!values.customerName) {
      toast({
        title: "Missing Customer Name",
        description: "Please enter a customer name to save this quote.",
        variant: "destructive",
      });
      return;
    }

    try {
      const quoteData: InsertQuote = {
        laneId: lane.id,
        customerName: values.customerName,
        status: "Draft",
        
        distance: values.distance,
        speed: values.speed,
        loadTime: values.loadTime,
        unloadTime: values.unloadTime,
        standbyTime: values.standbyTime,
        mtPerLoad: values.mtPerLoad,
        
        driveRate: values.driveRate,
        loadRate: values.loadRate,
        unloadRate: values.unloadRate,
        fuelSurcharge: values.fuelSurcharge,
        chainsFee: values.chainsFee,
        
        driverTarget: values.driverTarget,
        ooBiziTarget: values.ooBiziTarget,
        ooOwnTarget: values.ooOwnTarget,
        
        totalHours: totalHours.toFixed(2),
        totalCost: totalCost.toFixed(2),
      };

      await createQuote.mutateAsync(quoteData);
      
      toast({
        title: "Quote Saved",
        description: `Draft for ${values.customerName} saved successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save quote. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-gray-900">
              {lane.origin} <span className="text-gray-400 mx-2">→</span> {lane.destination}
            </h2>
            <div className="flex gap-4 mt-2 text-sm text-gray-500">
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">{lane.product}</span>
              <span className="flex items-center gap-1"><Truck className="w-4 h-4" /> {lane.distance} km</span>
            </div>
          </div>
          
          <div className="w-full md:w-auto">
            <Label className="text-xs text-gray-500 mb-1.5 block">Prepare Quote For</Label>
            <Input 
              placeholder="Customer Name" 
              className="md:w-64" 
              value={values.customerName}
              onChange={(e) => handleChange("customerName", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Trip & Time */}
          <Card className="p-6 shadow-sm border-gray-200">
            <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold">
              <Clock className="w-5 h-5 text-primary" />
              <h3>Trip & Time Configuration</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Distance (One Way)</Label>
                <div className="relative">
                  <Input type="number" value={values.distance} onChange={(e) => handleChange("distance", e.target.value)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Avg Speed</Label>
                <div className="relative">
                  <Input type="number" value={values.speed} onChange={(e) => handleChange("speed", e.target.value)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">km/h</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Load Time</Label>
                <div className="relative">
                  <Input type="number" value={values.loadTime} onChange={(e) => handleChange("loadTime", e.target.value)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">hrs</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Unload Time</Label>
                <div className="relative">
                  <Input type="number" value={values.unloadTime} onChange={(e) => handleChange("unloadTime", e.target.value)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">hrs</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Standby</Label>
                <div className="relative">
                  <Input type="number" value={values.standbyTime} onChange={(e) => handleChange("standbyTime", e.target.value)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">hrs</span>
                </div>
              </div>
               <div className="space-y-2">
                <Label>MT Per Load</Label>
                <div className="relative">
                  <Input type="number" value={values.mtPerLoad} onChange={(e) => handleChange("mtPerLoad", e.target.value)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">tons</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 2: Rates */}
          <Card className="p-6 shadow-sm border-gray-200">
            <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold">
              <DollarSign className="w-5 h-5 text-primary" />
              <h3>Rates & Surcharges</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Rate Per Hour</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <Input className="pl-6" type="number" value={values.driveRate} onChange={(e) => handleChange("driveRate", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fuel Surcharge</Label>
                <div className="relative">
                  <Input type="number" value={values.fuelSurcharge} onChange={(e) => handleChange("fuelSurcharge", e.target.value)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              </div>
               <div className="space-y-2">
                <Label>Chains Fee</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <Input className="pl-6" type="number" value={values.chainsFee} onChange={(e) => handleChange("chainsFee", e.target.value)} />
                </div>
              </div>
            </div>
          </Card>
          
          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button 
              className="flex-1 h-12 text-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              onClick={handleSave}
              disabled={createCreateQuote.isPending}
            >
              <Save className="mr-2 w-5 h-5" />
              {createQuote.isPending ? "Saving..." : "Save Quote"}
            </Button>
            <Button variant="outline" className="h-12 border-2">
              <FileText className="mr-2 w-5 h-5" /> Preview PDF
            </Button>
            <Button variant="outline" className="h-12 border-2">
              <Send className="mr-2 w-5 h-5" /> Email
            </Button>
          </div>
        </div>

        {/* Right Column: Live Calculations */}
        <div className="space-y-6">
          <div className="sticky top-6">
            <Card className="bg-slate-900 text-white p-6 shadow-xl border-slate-800">
              <h3 className="text-slate-400 font-medium text-sm uppercase tracking-wider mb-6">Live Calculations</h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm text-slate-400 mb-1">Drive Time (Round Trip)</div>
                  <div className="text-2xl font-mono font-bold">{driveHours.toFixed(2)} <span className="text-sm font-sans font-normal text-slate-500">hrs</span></div>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-slate-400 mb-1">Total Trip Time</div>
                  <div className="text-2xl font-mono font-bold text-blue-400">{totalHours.toFixed(2)} <span className="text-sm font-sans font-normal text-slate-500">hrs</span></div>
                  <div className="text-xs text-slate-500 mt-1">Includes load, unload & standby</div>
                </div>

                <Separator className="bg-slate-700" />

                <div>
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-slate-400">Base Cost</span>
                     <span className="font-mono">${baseCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2 text-sm">
                     <span className="text-slate-400">Fuel Surcharge ({fuelSurchargePercent}%)</span>
                     <span className="font-mono text-amber-500">+${fuelCost.toFixed(2)}</span>
                  </div>
                   <div className="flex justify-between items-center mb-2 text-sm">
                     <span className="text-slate-400">Chains</span>
                     <span className="font-mono text-amber-500">+${chainsFee.toFixed(2)}</span>
                  </div>
                </div>

                <Separator className="bg-slate-700" />

                <div className="pt-2">
                  <div className="text-slate-400 text-sm mb-1 uppercase tracking-wider">Total Trip Cost</div>
                  <div className="text-4xl font-display font-bold text-green-400 tracking-tight">
                    ${totalCost.toFixed(2)}
                  </div>
                  <div className="text-sm text-slate-500 mt-2">
                    ${(totalCost / parseFloat(values.mtPerLoad || "1")).toFixed(2)} per MT
                  </div>
                </div>
              </div>
            </Card>

            {/* Target Pay Mini-Table */}
            <Card className="mt-6 p-4 bg-white border-gray-200 shadow-sm">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Target Pay Rates</h4>
              <div className="space-y-3 text-sm">
                 <div className="flex justify-between">
                  <span className="text-gray-600">Driver Target</span>
                  <span className="font-mono font-medium">${values.driverTarget}</span>
                 </div>
                 <div className="flex justify-between">
                  <span className="text-gray-600">O/O Bizi</span>
                  <span className="font-mono font-medium">${values.ooBiziTarget}</span>
                 </div>
                 <div className="flex justify-between">
                  <span className="text-gray-600">O/O Own</span>
                  <span className="font-mono font-medium">${values.ooOwnTarget}</span>
                 </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
