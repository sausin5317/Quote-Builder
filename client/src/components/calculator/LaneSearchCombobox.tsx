import * as React from "react"
import { Check, ChevronsUpDown, Search, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Lane } from "@shared/schema"

interface LaneSearchComboboxProps {
    lanes: Lane[];
    selectedLaneId: number | null;
    onSelectLane: (lane: Lane | null) => void;
    isLoading?: boolean;
}

export function LaneSearchCombobox({
    lanes,
    selectedLaneId,
    onSelectLane,
    isLoading
}: LaneSearchComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    const selectedLane = lanes.find((lane) => lane.id === selectedLaneId)

    // Filter lanes based on search
    const filteredLanes = lanes.filter(lane => {
        const searchLower = search.toLowerCase();
        return (
            lane.origin.toLowerCase().includes(searchLower) ||
            lane.destination.toLowerCase().includes(searchLower) ||
            lane.product.toLowerCase().includes(searchLower)
        );
    }).slice(0, 50); // Limit to 50 results for performance

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[400px] justify-between text-left font-normal bg-slate-50 border-slate-200 h-9"
                >
                    {selectedLane ? (
                        <span className="truncate flex items-center gap-2">
                            <span className="font-semibold">{selectedLane.origin}</span>
                            <span className="text-gray-400">→</span>
                            <span className="font-semibold">{selectedLane.destination}</span>
                            <span className="text-gray-400 text-xs ml-2">({selectedLane.product})</span>
                        </span>
                    ) : (
                        <span className="text-gray-500">Select a master lane...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                    <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Search origin, destination, or product..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <CommandList>
                        <CommandEmpty>No lane found.</CommandEmpty>
                        <CommandGroup heading="Results">
                            {filteredLanes.map((lane) => (
                                <CommandItem
                                    key={lane.id}
                                    value={`${lane.id}`}
                                    onSelect={() => {
                                        onSelectLane(lane)
                                        setOpen(false)
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
                                        <div className="flex items-center gap-1 font-medium">
                                            {lane.origin} <span className="text-gray-400">→</span> {lane.destination}
                                        </div>
                                        <div className="text-xs text-gray-500 flex gap-2">
                                            <span>{lane.product}</span>
                                            <span>•</span>
                                            <span>{lane.distance} km</span>
                                        </div>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
