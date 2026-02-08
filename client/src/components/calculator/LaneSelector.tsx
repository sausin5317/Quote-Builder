import { ChevronsUpDown, Check, ChevronDown } from "lucide-react";
import { useLanes } from "@/hooks/use-lanes";
import { Lane } from "@shared/schema";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface LaneSelectorProps {
  selectedLaneId: number | null;
  onSelectLane: (lane: Lane) => void;
  clientId?: number | null;
}

export function LaneSelector({ selectedLaneId, onSelectLane, clientId }: LaneSelectorProps) {
  const { data: lanes, isLoading } = useLanes(clientId);
  const [open, setOpen] = useState(false); // Popover state
  const [isOpen, setIsOpen] = useState(true); // Collapsible state

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-2">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const safeLanes = lanes || [];
  const selectedLane = safeLanes.find(l => l.id === selectedLaneId);

  // Filter valid lanes
  const validLanes = safeLanes.filter(lane => {
    const distance = parseFloat(lane.distance || "0");
    const speed = parseFloat(lane.speed || "0");
    return distance > 0 && speed > 0;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="font-display font-semibold text-gray-900">Select Lane</h3>
            {!isOpen && selectedLane && (
              <span className="text-xs text-primary font-medium mt-1">
                {selectedLane.origin} → {selectedLane.destination}
              </span>
            )}
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen ? "" : "-rotate-90")} />
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="p-4">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between h-auto py-3 px-4 text-left font-normal"
                >
                  {selectedLane ? (
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium text-gray-900">
                        {selectedLane.origin} → {selectedLane.destination}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {selectedLane.product} • {selectedLane.distance}km
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select a lane...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search lanes..." />
                  <CommandList>
                    <CommandEmpty>No lanes found.</CommandEmpty>
                    <CommandGroup>
                      {validLanes.map((lane) => (
                        <CommandItem
                          key={lane.id}
                          value={`${lane.origin} ${lane.destination} ${lane.product}`}
                          onSelect={() => {
                            onSelectLane(lane);
                            setOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedLaneId === lane.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {lane.origin} → {lane.destination}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {lane.product} • {lane.distance}km
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {validLanes.length > 0 && (
              <div className="mt-2 text-xs text-center text-gray-400">
                {validLanes.length} lanes available
                <div className="text-[8px] text-gray-300">Total: {lanes?.length || 0}</div>
              </div>
            )}
            {!isLoading && lanes?.length === 0 && (
              <div className="mt-2 text-xs text-center text-red-400">
                No lanes found (API returned 0)
              </div>
            )}
            {!isLoading && lanes && validLanes.length === 0 && lanes.length > 0 && (
              <div className="mt-2 text-xs text-center text-amber-400">
                {lanes.length} lanes fetched, but 0 match filter
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
