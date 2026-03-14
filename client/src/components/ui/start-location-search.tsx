import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface LocationSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function LocationSearchInput({
    value,
    onChange,
    placeholder = "Search location...",
    className,
}: LocationSearchInputProps) {
    const [isEditing, setIsEditing] = useState(!value);
    const containerRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<any>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastPlaceIdRef = useRef("");
    const onChangeRef = useRef(onChange);
    const setEditRef = useRef(setIsEditing);
    const placeSelectedRef = useRef(false); // true when gmp-placeselect already fired

    // Keep onChange ref fresh
    useEffect(() => { 
        onChangeRef.current = onChange; 
        setEditRef.current = setIsEditing;
    }, [onChange, setIsEditing]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    // If value is cleared externally, switch to edit mode
    useEffect(() => {
        if (!value) setIsEditing(true);
    }, [value]);

    useEffect(() => {
        if (!isEditing) return;
        let active = true;

        // Arrow function - safe in strict mode
        const handlePlaceSelect = async (place: any) => {
            if (!place) return;
            try {
                const pid = place.id || "";
                if (pid && pid === lastPlaceIdRef.current) return;
                if (pid) lastPlaceIdRef.current = pid;

                await place.fetchFields({ fields: ["formattedAddress", "name", "location"] });
                const address = place.formattedAddress || place.name || "";
                console.log("LocationSearchInput: address resolved:", address);
                if (address) {
                    onChangeRef.current(address);
                    setIsEditing(false);
                }
            } catch (err) {
                console.error("LocationSearchInput: fetchFields error", err);
                const fallback = place.name || place.displayName || "";
                if (fallback) {
                    onChangeRef.current(fallback);
                    setIsEditing(false);
                }
            }
        };

        // Arrow function - safe in strict mode
        const init = async () => {
            try {
                const g = (window as any).google;
                if (!g?.maps?.importLibrary) return;

                const lib = await g.maps.importLibrary("places");
                if (!active || !containerRef.current) return;

                const Ctor = lib.PlaceAutocompleteElement;
                if (!Ctor) return;

                if (!pickerRef.current) {
                    const picker = new Ctor();
                    picker.placeholder = placeholder;
                    picker.classList.add("w-full");
                    picker.addEventListener("gmp-placeselect", async (evt: any) => {
                        console.log("LocationSearchInput: gmp-placeselect fired");
                        placeSelectedRef.current = true; // mark that a real selection happened
                        await handlePlaceSelect(evt.place);
                    });
                    
                    // Capture raw typed input on blur ONLY if no Google place was selected
                    picker.addEventListener("focusout", () => {
                        setTimeout(() => {
                           if (placeSelectedRef.current) {
                               // A real place was selected via dropdown — don't overwrite it
                               placeSelectedRef.current = false;
                               return;
                           }
                           const rawVal = picker.inputValue;
                           if (rawVal) {
                               onChangeRef.current(rawVal);
                           }
                        }, 300);
                    });
                    
                    // Sync on enter key for manual text entry
                    picker.addEventListener("keydown", (evt: KeyboardEvent) => {
                        if (evt.key === "Enter") {
                            if (!placeSelectedRef.current) {
                                const rawVal = picker.inputValue;
                                if (rawVal) {
                                    onChangeRef.current(rawVal);
                                }
                            }
                        }
                    });

                    pickerRef.current = picker;
                }

                if (
                    pickerRef.current &&
                    containerRef.current &&
                    !containerRef.current.contains(pickerRef.current)
                ) {
                    containerRef.current.innerHTML = "";
                    containerRef.current.appendChild(pickerRef.current);
                    console.log("LocationSearchInput: Picker attached");
                }

                // Start polling fallback
                if (!pollingRef.current) {
                    pollingRef.current = setInterval(() => {
                        const picker = pickerRef.current;
                        if (picker && picker.place) {
                            const p = picker.place;
                            const pid = p.id || "";
                            if (pid && pid !== lastPlaceIdRef.current) {
                                console.log("LocationSearchInput: polling detected place");
                                handlePlaceSelect(p);
                            }
                        }
                    }, 1000);
                }

                if (active) clearInterval(retry);
            } catch (e) {
                console.error("LocationSearchInput: init error", e);
            }
        };

        const retry = setInterval(init, 500);
        init();

        return () => {
            active = false;
            clearInterval(retry);
        };
    }, [isEditing, placeholder]);

    // View mode
    if (!isEditing && value) {
        return (
            <div className={cn("relative flex items-center gap-2", className)}>
                <Input
                    value={value}
                    readOnly
                    className="pr-8 bg-gray-50 focus-visible:ring-0 cursor-default"
                    onClick={() => setIsEditing(true)}
                />
                <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                    onClick={() => { onChange(""); setIsEditing(true); }}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    // Edit mode
    return (
        <div ref={containerRef} className={cn("w-full min-h-[40px] border rounded-md", className)}>
            <div className="p-2 text-xs text-gray-400">Loading Google Maps...</div>
        </div>
    );
}
