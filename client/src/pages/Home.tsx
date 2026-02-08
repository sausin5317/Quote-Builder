import { Layout } from "@/components/ui/Layout";
import { LaneSelector } from "@/components/calculator/LaneSelector";
import { CalculatorForm } from "@/components/calculator/CalculatorForm";
import { useState } from "react";
import { Lane, Client } from "@shared/schema";
import { Calculator, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Home() {
  const [selectedLane, setSelectedLane] = useState<Lane | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const { data: clients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const handleClientChange = (value: string) => {
    if (value === "all") {
      setSelectedClientId(null);
    } else {
      setSelectedClientId(parseInt(value));
    }
    // Reset lane selection when client changes
    setSelectedLane(null);
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] gap-6">

        <div className="flex flex-col lg:flex-row gap-6 h-full">

          <div className="w-full lg:w-80 lg:shrink-0 flex flex-col gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                <Building2 className="w-3 h-3 inline mr-1" />
                Filter by Client
              </Label>
              <Select value={selectedClientId?.toString() || "all"} onValueChange={handleClientChange}>
                <SelectTrigger className="w-full" data-testid="select-filter-client">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients?.map(client => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-1 text-[8px] text-gray-400">
                {clients ? `${clients.length} clients loaded` : "Loading clients..."}
              </div>
            </div>

            <div className="flex-1 h-64 lg:h-auto">
              <LaneSelector
                selectedLaneId={selectedLane?.id || null}
                onSelectLane={setSelectedLane}
                clientId={selectedClientId}
              />
            </div>
          </div>

          <div className="flex-1 h-full overflow-y-auto pr-2 pb-10">
            {selectedLane ? (
              <div className="animate-fade-in">
                <CalculatorForm lane={selectedLane} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 p-8 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <Calculator className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Lane Selected</h3>
                <p className="max-w-md mx-auto">Select a lane from the sidebar to start calculating a quote. You can search by origin, destination, or product.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
