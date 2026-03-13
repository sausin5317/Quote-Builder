import { Layout } from "@/components/ui/Layout";
import { LaneSearchCombobox } from "@/components/calculator/LaneSearchCombobox";
import { CalculatorForm } from "@/components/calculator/CalculatorForm";
import { useState, useEffect } from "react";
import { Lane, Client } from "@shared/schema";
import { Calculator, Plus, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocationSearchInput } from "@/components/ui/start-location-search";
import { useLanes } from "@/hooks/use-lanes";
import { useQuotes } from "@/hooks/use-quotes";

export default function Home() {
  const [selectedLane, setSelectedLane] = useState<Lane | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isCustomQuote, setIsCustomQuote] = useState(false); // Track if user wants a blank quote

  // Search state for free text (From/To overrides)
  const [searchOrigin, setSearchOrigin] = useState("");
  const [searchDestination, setSearchDestination] = useState("");

  const { data: clients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const { data: lanes } = useLanes(selectedClientId);

  const editIdStr = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get("edit") : null;
  const editId = editIdStr ? parseInt(editIdStr) : null;
  const { data: quotes } = useQuotes();
  const editQuote = quotes?.find(q => q.id === editId) || null;

  // Sync client/lane when editQuote loads
  useEffect(() => {
    if (editQuote) {
      if (editQuote.clientId && selectedClientId !== editQuote.clientId) {
        setSelectedClientId(editQuote.clientId);
      }
      if (editQuote.laneId && (!selectedLane || selectedLane.id !== editQuote.laneId)) {
        const lane = lanes?.find(l => l.id === editQuote.laneId) || null;
        setSelectedLane(lane);
      }
    }
  }, [editQuote, lanes]);

  const handleClientChange = (value: string) => {
    if (value === "all") {
      setSelectedClientId(null);
    } else {
      setSelectedClientId(parseInt(value));
    }
    // Don't reset lane here, user might want to keep same lane for diff customer
  };

  const handleNewLane = () => {
    setSelectedLane(null);
    setIsCustomQuote(true);
    setSearchOrigin("");
    setSearchDestination("");
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-6rem)] gap-4">

        {/* Compact Top Control Bar */}
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col xl:flex-row gap-4">
          {/* Group 1: Setup */}
          <div className="flex flex-wrap items-center gap-4 flex-1">

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Customer:</span>
              <Select value={selectedClientId?.toString() || "all"} onValueChange={handleClientChange}>
                <SelectTrigger className="w-40 h-9 text-sm bg-slate-50 border-slate-200">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {clients?.map(client => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Master Lane:</span>
              <LaneSearchCombobox
                lanes={lanes || []}
                selectedLaneId={selectedLane?.id || null}
                onSelectLane={(lane) => {
                  setSelectedLane(lane);
                  setIsCustomQuote(false); // Reset custom quote if master lane picked
                  if (lane) {
                    setSearchOrigin(""); // Clear overrides if master lane selected
                    setSearchDestination("");
                  }
                }}
              />
            </div>
          </div>

          {/* Group 2: Context & Action */}
          <div className="flex flex-wrap items-center gap-4 justify-end">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-600">Status:</span>
              <Select defaultValue="draft">
                <SelectTrigger className="w-28 h-9 text-sm bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-600">Effective:</span>
              <Input type="date" className="w-34 h-9 text-sm bg-slate-50 border-slate-200" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>

            <Button
              className="h-9 bg-blue-800 hover:bg-blue-900 text-white gap-2 shadow-sm"
              onClick={handleNewLane}
            >
              <Plus className="w-4 h-4" /> New Lane
            </Button>
          </div>
        </div>

        {/* Lane Builder / Calculator Form */}
        <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 shadow-sm bg-white relative">
          {selectedLane || isCustomQuote || editQuote ? (
            <div className="h-full animate-fade-in overflow-y-auto custom-scrollbar">
              {editQuote && (
                <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-blue-800">Editing Quote #{editQuote.id}</span>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{editQuote.status}</span>
                </div>
              )}
              <CalculatorForm
                lane={selectedLane} // can be null now
                selectedClientId={selectedClientId}
                editQuote={editQuote}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50/50">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                <Calculator className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Quote Calculator</h3>
              <p className="max-w-md mx-auto text-gray-500">
                Select a <strong>Customer</strong> and <strong>Master Lane</strong> above to generate a quote.
                <br /><span className="text-sm opacity-75">Or click "New Lane" to start from scratch.</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
