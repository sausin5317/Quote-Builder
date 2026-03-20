import React, { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface LocationSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    id?: string;
}

export const LocationSearchInput = React.memo(function LocationSearchInput({
    value,
    onChange,
    placeholder = "Search location...",
    className,
    id,
}: LocationSearchInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);

    useEffect(() => {
        let active = true;

        const initAutocomplete = async () => {
            const g = (window as any).google;
            if (!g?.maps?.importLibrary) return;

            try {
                // Ensure places library is loaded
                await g.maps.importLibrary("places");
                if (!active || !inputRef.current) return;

                // Standard bulletproof autocomplete class
                if (!autocompleteRef.current) {
                    const Autocomplete = g.maps.places.Autocomplete;
                    if (!Autocomplete) return;

                    autocompleteRef.current = new Autocomplete(inputRef.current, {
                        fields: ["formatted_address", "name", "geometry"],
                    });

                    // Listen for the place selection
                    autocompleteRef.current.addListener("place_changed", () => {
                        const place = autocompleteRef.current.getPlace();
                        const address = place.formatted_address || place.name || inputRef.current?.value || "";
                        if (address) {
                            onChange(address);
                        }
                    });
                }
            } catch (e) {
                console.error("LocationSearchInput: Error loading autocomplete:", e);
            }
        };

        const interval = setInterval(() => {
            if ((window as any).google?.maps?.places?.Autocomplete || (window as any).google?.maps?.importLibrary) {
                initAutocomplete();
                clearInterval(interval);
            }
        }, 500);

        return () => {
            active = false;
            clearInterval(interval);
            if (inputRef.current && (window as any).google?.maps?.event) {
                (window as any).google.maps.event.clearInstanceListeners(inputRef.current);
            }
        };
    }, []); // Only run once on mount

    // To allow the parent to clear it or set it natively
    useEffect(() => {
        if (inputRef.current && inputRef.current.value !== value) {
             inputRef.current.value = value || "";
        }
    }, [value]);

    return (
        <div className={cn("relative flex items-center gap-2", className)}>
            <Input
                ref={inputRef}
                id={id}
                placeholder={placeholder}
                defaultValue={value}
                onChange={(e) => onChange(e.target.value)}
                className="pr-8 focus-visible:ring-1 bg-white border-gray-300"
            />
            {value && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 h-7 w-7 p-0 text-gray-400 hover:text-gray-600 z-10"
                    onClick={() => {
                        onChange("");
                        if (inputRef.current) {
                            inputRef.current.value = "";
                            inputRef.current.focus();
                        }
                    }}
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
});
