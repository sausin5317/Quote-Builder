import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanes } from "@/hooks/use-lanes";
import { Lane } from "@shared/schema";
import { useState } from "react";

interface LaneSelectorProps {
  selectedLaneId: number | null;
  onSelectLane: (lane: Lane) => void;
}

export function LaneSelector({ selectedLaneId, onSelectLane }: LaneSelectorProps) {
  const { data: lanes, isLoading } = useLanes();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLanes = lanes?.filter(lane => 
    lane.origin.toLowerCase().includes(searchTerm.toLowerCase()) || 
    lane.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lane.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="font-display font-semibold text-gray-900 mb-2">Select Lane</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            className="pl-9 bg-white border-gray-200 focus:ring-primary/20" 
            placeholder="Search Origin, Dest..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-gray-500">Loading lanes...</div>
        ) : filteredLanes?.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">No lanes found</div>
        ) : (
          <div className="space-y-1">
            {filteredLanes?.map((lane) => (
              <button
                key={lane.id}
                onClick={() => onSelectLane(lane)}
                className={`
                  w-full text-left p-3 rounded-lg text-sm transition-all duration-200 group
                  ${selectedLaneId === lane.id 
                    ? "bg-primary/10 border-primary/20 border text-primary font-medium shadow-sm" 
                    : "hover:bg-gray-50 border border-transparent text-gray-600"}
                `}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{lane.origin} → {lane.destination}</div>
                    <div className="text-xs opacity-70 mt-1">{lane.product} • {lane.distance}km</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
