import { useEffect, useState } from "react";
import usePlacesAutocomplete, {
    getGeocode,
    getLatLng,
} from "use-places-autocomplete";
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

// Mock suggestions for testing without API key


export function LocationSearchInput({
    value,
    onChange,
    placeholder = "Search location...",
    className,
}: LocationSearchInputProps) {
    const [open, setOpen] = useState(false);

    const {
        ready,
        value: searchValue,
        suggestions: { status, data },
        setValue: setSearchValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            /* Define search scope here if needed */
        },
        debounce: 300,
        initOnMount: true, // Initialize when Google Maps script is loaded
    });

    // Mock logic: Use mock data if API is not ready (missing key)
    const displayedData = data;

    const displayedStatus = status;

    // Sync internal search state if external value changes (optional)
    useEffect(() => {
        // Only set if we aren't actively searching to avoid overwriting user input
        if (!open && value) {
            // We don't necessarily want to query strict address on value change as it might trigger API cost
            // But we can keep it in sync if needed. For now, we trust the input.
        }
    }, [value, open]);

    const handleSelect = async (address: string) => {
        setSearchValue(address, false);
        clearSuggestions();
        onChange(address);
        setOpen(false);
    };

    return (
        <div className="relative w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Input
                        className={cn("w-full", className)}
                        placeholder={placeholder}
                        value={open ? searchValue : value}
                        onChange={(e) => {
                            setSearchValue(e.target.value);
                            if (!open) setOpen(true);
                            // Also update parent immediately to allow free text
                            onChange(e.target.value);
                        }}
                        disabled={false}
                        autoComplete="off"
                    // data-1p-ignore // Ignore password managers
                    />
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <Command shouldFilter={false}>
                        {/* We don't filter locally, we rely on Google results or Mock results */}
                        <CommandList>
                            {displayedStatus === "OK" &&
                                displayedData.map(({ place_id, description }) => (
                                    <CommandItem
                                        key={place_id}
                                        value={description}
                                        onSelect={handleSelect}
                                        className="cursor-pointer"
                                    >
                                        <MapPin className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                        {description}
                                    </CommandItem>
                                ))}
                            {displayedStatus === "ZERO_RESULTS" && (
                                <CommandEmpty>No results found.</CommandEmpty>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
