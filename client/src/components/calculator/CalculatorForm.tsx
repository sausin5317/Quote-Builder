import { useState, useEffect } from "react";
import { Lane, InsertQuote, Client } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Clock, DollarSign, Fuel, Truck, Save, FileText, Send, Plus, CheckCircle } from "lucide-react";
import { useCreateQuote } from "@/hooks/use-quotes";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CalculatorFormProps {
  lane: Lane;
}

export function CalculatorForm({ lane }: CalculatorFormProps) {
  const { toast } = useToast();
  const createQuote = useCreateQuote();
  
  const { data: clients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });
  
  const [values, setValues] = useState({
    distance: lane.distance,
    speed: lane.speed,
    loadTime: lane.loadTime,
    unloadTime: lane.unloadTime,
    standbyTime: "0",
    mtPerLoad: lane.minTons,
    isRoundTrip: true,
    
    driveRate: lane.ratePerHour,
    loadRate: lane.ratePerHour,
    unloadRate: lane.ratePerHour,
    fuelSurcharge: lane.fuelSurcharge,
    chainsFee: lane.chainsFee,
    miscCharges: "0",
    miscChargesDescription: "",
    
    driverTarget: lane.driverTargetPay,
    ooBiziTarget: lane.ownerOperatorBiziPay,
    ooOwnTarget: lane.ownerOperatorOwnPay,

    customerName: "",
    clientId: "",
    originOverride: "",
    destinationOverride: "",
  });

  useEffect(() => {
    setValues({
      distance: lane.distance,
      speed: lane.speed,
      loadTime: lane.loadTime,
      unloadTime: lane.unloadTime,
      standbyTime: "0",
      mtPerLoad: lane.minTons,
      isRoundTrip: true,
      
      driveRate: lane.ratePerHour,
      loadRate: lane.ratePerHour,
      unloadRate: lane.ratePerHour,
      fuelSurcharge: lane.fuelSurcharge,
      chainsFee: lane.chainsFee,
      miscCharges: "0",
      miscChargesDescription: "",
      
      driverTarget: lane.driverTargetPay,
      ooBiziTarget: lane.ownerOperatorBiziPay,
      ooOwnTarget: lane.ownerOperatorOwnPay,
      
      customerName: "",
      clientId: "",
      originOverride: "",
      destinationOverride: "",
    });
  }, [lane]);

  const handleChange = (key: string, value: string | boolean) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const distance = parseFloat(values.distance || "0");
  const speed = parseFloat(values.speed || "1");
  const loadTime = parseFloat(values.loadTime || "0");
  const unloadTime = parseFloat(values.unloadTime || "0");
  const standbyTime = parseFloat(values.standbyTime || "0");
  const driveRate = parseFloat(values.driveRate || "0");
  const fuelSurchargePercent = parseFloat(values.fuelSurcharge || "0");
  const chainsFee = parseFloat(values.chainsFee || "0");
  const miscCharges = parseFloat(values.miscCharges || "0");
  const mtPerLoad = parseFloat(values.mtPerLoad || "1");
  
  const distanceMultiplier = values.isRoundTrip ? 2 : 1;
  const driveHours = (distance * distanceMultiplier) / speed;
  const totalHours = driveHours + loadTime + unloadTime + standbyTime;
  const baseRevenue = totalHours * driveRate;
  const fuelRevenue = baseRevenue * (fuelSurchargePercent / 100);
  const totalTripPrice = baseRevenue + fuelRevenue + chainsFee + miscCharges;

  const driverTarget = parseFloat(values.driverTarget || "0");
  const driverPay = totalHours * driverTarget;
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
        laneId: lane.id,
        clientId: values.clientId ? parseInt(values.clientId) : null,
        customerName: values.customerName || selectedClient?.name || "",
        status,
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
      });
      
      toast({
        title: status === "Pending Review" ? "Quote Submitted" : "Quote Saved",
        description: status === "Pending Review" 
          ? "Quote has been submitted for review."
          : `Draft for ${values.customerName || selectedClient?.name} saved successfully.`,
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
      <div className="bg-[#0f172a] text-white rounded-xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Active Lane</div>
            <h2 className="text-2xl font-display font-bold">
              {values.originOverride || lane.origin} <span className="text-slate-500 mx-2">→</span> {values.destinationOverride || lane.destination}
            </h2>
            <div className="flex gap-3 mt-3 flex-wrap">
              <span className="bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1 rounded border border-blue-500/20 font-bold uppercase">{lane.product}</span>
              <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded border border-slate-700 flex items-center gap-1 font-mono">
                <Truck className="w-3 h-3" /> {lane.distance} KM
              </span>
              {values.isRoundTrip && (
                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded border border-emerald-500/20 font-bold uppercase">Round Trip</span>
              )}
            </div>
          </div>
          
          <div className="w-full md:w-auto space-y-3">
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
              <Label className="text-[10px] font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Client</Label>
              <Select value={values.clientId} onValueChange={(v) => handleChange("clientId", v)}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-9 text-sm w-full md:w-64" data-testid="select-client">
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map(client => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!values.clientId && (
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <Label className="text-[10px] font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Or Customer Name</Label>
                <Input 
                  placeholder="Enter Customer Name..." 
                  className="bg-slate-900 border-slate-700 text-white h-9 text-sm w-full md:w-64" 
                  value={values.customerName}
                  onChange={(e) => handleChange("customerName", e.target.value)}
                  data-testid="input-customer-name"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 shadow-sm border-slate-200">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm uppercase tracking-tight">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <h3>Trip & Time</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="round-trip" className="text-xs text-slate-500">Round Trip</Label>
                  <Switch 
                    id="round-trip" 
                    checked={values.isRoundTrip} 
                    onCheckedChange={(v) => handleChange("isRoundTrip", v)}
                    data-testid="switch-round-trip"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 font-semibold">KM (One-Way)</Label>
                  <Input className="h-9 text-sm font-mono" type="number" value={values.distance} onChange={(e) => handleChange("distance", e.target.value)} data-testid="input-distance" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 font-semibold">Speed (KM/H)</Label>
                  <Input className="h-9 text-sm font-mono" type="number" value={values.speed} onChange={(e) => handleChange("speed", e.target.value)} data-testid="input-speed" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 font-semibold">Load Hours</Label>
                  <Input className="h-9 text-sm font-mono" type="number" value={values.loadTime} onChange={(e) => handleChange("loadTime", e.target.value)} data-testid="input-load-time" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 font-semibold">Unload Hours</Label>
                  <Input className="h-9 text-sm font-mono" type="number" value={values.unloadTime} onChange={(e) => handleChange("unloadTime", e.target.value)} data-testid="input-unload-time" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 font-semibold">Standby Hours</Label>
                  <Input className="h-9 text-sm font-mono" type="number" value={values.standbyTime} onChange={(e) => handleChange("standbyTime", e.target.value)} data-testid="input-standby-time" />
                </div>
                 <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 font-semibold">MT Per Load</Label>
                  <Input className="h-9 text-sm font-mono" type="number" value={values.mtPerLoad} onChange={(e) => handleChange("mtPerLoad", e.target.value)} data-testid="input-mt-per-load" />
                </div>
              </div>
            </Card>

            <Card className="p-5 shadow-sm border-slate-200">
              <div className="flex items-center gap-2 mb-5 text-slate-800 font-bold text-sm uppercase tracking-tight">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <h3>Rates & Surcharges</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 font-semibold">Drive Rate ($/HR)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <Input className="pl-6 h-9 text-sm font-mono" type="number" value={values.driveRate} onChange={(e) => handleChange("driveRate", e.target.value)} data-testid="input-drive-rate" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 font-semibold">Fuel Surcharge (%)</Label>
                    <div className="relative">
                      <Input className="h-9 text-sm font-mono" type="number" value={values.fuelSurcharge} onChange={(e) => handleChange("fuelSurcharge", e.target.value)} data-testid="input-fuel-surcharge" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">%</span>
                    </div>
                  </div>
                   <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 font-semibold">Chains Fee ($)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <Input className="pl-6 h-9 text-sm font-mono" type="number" value={values.chainsFee} onChange={(e) => handleChange("chainsFee", e.target.value)} data-testid="input-chains-fee" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 font-semibold">Misc Charges ($)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <Input className="pl-6 h-9 text-sm font-mono" type="number" value={values.miscCharges} onChange={(e) => handleChange("miscCharges", e.target.value)} data-testid="input-misc-charges" />
                  </div>
                </div>
                {parseFloat(values.miscCharges) > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 font-semibold">Misc Description</Label>
                    <Textarea 
                      placeholder="Describe additional charges..." 
                      className="text-sm resize-none"
                      rows={2}
                      value={values.miscChargesDescription}
                      onChange={(e) => handleChange("miscChargesDescription", e.target.value)}
                      data-testid="input-misc-description"
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>

          <Card className="p-5 shadow-sm border-slate-200">
            <div className="flex items-center gap-2 mb-5 text-slate-800 font-bold text-sm uppercase tracking-tight">
              <Truck className="w-4 h-4 text-blue-600" />
              <h3>Target Pay Rates</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 font-semibold">Driver Target ($/HR)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <Input className="pl-6 h-9 text-sm font-mono" type="number" value={values.driverTarget} onChange={(e) => handleChange("driverTarget", e.target.value)} data-testid="input-driver-target" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 font-semibold">O/O Bizi Target ($/HR)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <Input className="pl-6 h-9 text-sm font-mono" type="number" value={values.ooBiziTarget} onChange={(e) => handleChange("ooBiziTarget", e.target.value)} data-testid="input-oo-bizi-target" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 font-semibold">O/O Own Target ($/HR)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <Input className="pl-6 h-9 text-sm font-mono" type="number" value={values.ooOwnTarget} onChange={(e) => handleChange("ooOwnTarget", e.target.value)} data-testid="input-oo-own-target" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 shadow-sm border-slate-200">
            <div className="flex items-center gap-2 mb-5 text-slate-800 font-bold text-sm uppercase tracking-tight">
              <Plus className="w-4 h-4 text-blue-600" />
              <h3>Location Overrides (Optional)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 font-semibold">Origin Override</Label>
                <Input 
                  className="h-9 text-sm" 
                  placeholder={lane.origin}
                  value={values.originOverride} 
                  onChange={(e) => handleChange("originOverride", e.target.value)} 
                  data-testid="input-origin-override"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 font-semibold">Destination Override</Label>
                <Input 
                  className="h-9 text-sm" 
                  placeholder={lane.destination}
                  value={values.destinationOverride} 
                  onChange={(e) => handleChange("destinationOverride", e.target.value)} 
                  data-testid="input-destination-override"
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-[#1e293b] text-white p-6 shadow-xl border-slate-800 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <DollarSign className="w-24 h-24" />
            </div>
            
            <h3 className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-6">Quote Summary</h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Drive Hours {values.isRoundTrip ? "(RT)" : "(1-way)"}</div>
                  <div className="text-xl font-mono font-bold">{driveHours.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total Hours</div>
                  <div className="text-xl font-mono font-bold text-blue-400">{totalHours.toFixed(1)}</div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Base Revenue</span>
                  <span className="font-mono font-bold">${baseRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Fuel Surcharge</span>
                  <span className="font-mono text-amber-500">+${fuelRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Chains Fee</span>
                  <span className="font-mono text-amber-500">+${chainsFee.toFixed(2)}</span>
                </div>
                {miscCharges > 0 && (
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Misc Charges</span>
                    <span className="font-mono text-amber-500">+${miscCharges.toFixed(2)}</span>
                  </div>
                )}
                <Separator className="bg-slate-700/50" />
                <div className="flex justify-between items-end pt-2">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">All-in $/Trip</div>
                  <div className="text-3xl font-mono font-bold text-emerald-400" data-testid="text-total-price">${totalTripPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="text-[10px] text-right text-slate-500 font-bold uppercase" data-testid="text-rate-per-ton">
                  ${ratePerTon.toFixed(2)} per MT
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 text-xs uppercase tracking-widest"
                  onClick={() => handleSave("Draft")}
                  disabled={createQuote.isPending}
                  data-testid="button-save-draft"
                >
                  <Save className="mr-2 w-4 h-4" />
                  {createQuote.isPending ? "Saving..." : "Save Draft"}
                </Button>
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 text-xs uppercase tracking-widest"
                  onClick={() => handleSave("Pending Review")}
                  disabled={createQuote.isPending}
                  data-testid="button-submit-review"
                >
                  <CheckCircle className="mr-2 w-4 h-4" />
                  Submit for Review
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-[10px] font-bold h-9 uppercase" data-testid="button-export-pdf">
                    <FileText className="mr-2 w-3 h-3" /> PDF
                  </Button>
                  <Button variant="outline" className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-[10px] font-bold h-9 uppercase" data-testid="button-send-email">
                    <Send className="mr-2 w-3 h-3" /> Email
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-slate-200 shadow-sm">
             <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-wider">Margin Analysis</h4>
             <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-600 font-medium">Hourly Margin</span>
                    <span className={`font-mono font-bold ${hourlyMargin > 180 ? 'text-emerald-600' : 'text-amber-600'}`} data-testid="text-hourly-margin">
                      ${hourlyMargin.toFixed(2)}/HR
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${hourlyMargin > 180 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min((hourlyMargin / 300) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 p-2 rounded text-[10px] font-bold uppercase tracking-tight ${hourlyMargin > 160 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${hourlyMargin > 160 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    Above $160/HR Threshold
                  </div>
                  <div className={`flex items-center gap-2 p-2 rounded text-[10px] font-bold uppercase tracking-tight ${hourlyMargin > 180 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${hourlyMargin > 180 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    Above $180/HR Threshold
                  </div>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
