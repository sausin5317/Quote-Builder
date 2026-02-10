import { useLanes, useImportLanes } from "@/hooks/use-lanes";
import { Lane } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Upload, Download, Loader2 } from "lucide-react";
import { useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";

interface LaneTableSelectorProps {
    selectedLaneId: number | null;
    onSelectLane: (lane: Lane) => void;
    clientId?: number | null;
}

export function LaneTableSelector({ selectedLaneId, onSelectLane, clientId }: LaneTableSelectorProps) {
    const { data: lanes, isLoading } = useLanes(clientId);
    const importMutation = useImportLanes();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-2 h-full">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-full w-full" />
            </div>
        );
    }

    const safeLanes = lanes || [];

    // Filter valid lanes
    const validLanes = safeLanes.filter(lane => {
        const distance = parseFloat(lane.distance || "0");
        const speed = parseFloat(lane.speed || "0");
        return distance > 0 && speed > 0;
    });

    const handleDownloadTemplate = () => {
        window.location.href = api.lanes.template.path;
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const result = await importMutation.mutateAsync(file);
            toast({
                title: "Import Successful",
                description: `Successfully imported ${result.count} lanes.`,
            });
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (error: any) {
            toast({
                title: "Import Failed",
                description: error.message || "Failed to import lanes.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-3 bg-slate-900 border-b border-slate-700 text-white flex justify-between items-center">
                <h3 className="font-bold text-sm">Lanes (Master List)</h3>
                <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">
                    {validLanes.length}
                </span>
            </div>

            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader className="bg-gray-50 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="text-[10px] h-8 py-1 uppercase font-bold text-gray-500 w-[40%]">Ship → Delivery</TableHead>
                            <TableHead className="text-[10px] h-8 py-1 uppercase font-bold text-gray-500 w-[20%]">Product</TableHead>
                            <TableHead className="text-[10px] h-8 py-1 uppercase font-bold text-gray-500 w-[20%] text-right">$/HR</TableHead>
                            <TableHead className="text-[10px] h-8 py-1 uppercase font-bold text-gray-500 w-[20%] text-right">$/MT</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {validLanes.map((lane) => (
                            <TableRow
                                key={lane.id}
                                className={cn(
                                    "cursor-pointer hover:bg-blue-50/50 transition-colors h-10 border-b border-gray-100",
                                    selectedLaneId === lane.id ? "bg-blue-50 border-blue-100" : ""
                                )}
                                onClick={() => onSelectLane(lane)}
                            >
                                <TableCell className="p-2 text-xs font-medium text-gray-700 truncate max-w-[120px]" title={`${lane.origin} -> ${lane.destination}`}>
                                    {lane.origin} → {lane.destination}
                                </TableCell>
                                <TableCell className="p-2 text-xs text-gray-500 truncate">{lane.product}</TableCell>
                                <TableCell className="p-2 text-xs text-right font-mono text-gray-600">{parseFloat(lane.ratePerHour || "0").toFixed(2)}</TableCell>
                                <TableCell className="p-2 text-xs text-right font-mono text-gray-600">{parseFloat(lane.minTons || "0").toFixed(1)}</TableCell>
                            </TableRow>
                        ))}
                        {validLanes.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-xs text-gray-400">
                                    No lanes available
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="p-2 border-t border-gray-200 bg-gray-50 flex gap-2">
                <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv,.xlsx,.xls"
                />
                <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-[10px] h-8 border-gray-300 bg-white"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importMutation.isPending}
                >
                    {importMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                    Import Excel/CSV
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8 border-gray-300 bg-white" onClick={handleDownloadTemplate}>
                    <Download className="w-3 h-3 mr-1" />
                    Export
                </Button>
            </div>
        </div>
    );
}
