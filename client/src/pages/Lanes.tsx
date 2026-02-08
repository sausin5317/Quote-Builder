import { Layout } from "@/components/ui/Layout";
import { useLanes, useImportLanes } from "@/hooks/use-lanes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { useRef } from "react";

export default function Lanes() {
  const { data: lanes, isLoading } = useLanes();
  const importMutation = useImportLanes();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">Master Lane List</h1>
            <p className="text-gray-500 mt-1">View and manage all available shipping lanes.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleDownloadTemplate}
            >
              <Download className="w-4 h-4" />
              Download Template
            </Button>

            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.xlsx,.xls"
            />

            <Button
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Import Lanes
            </Button>
          </div>
        </div>

        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead>Origin</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Distance</TableHead>
                      <TableHead className="text-right">Rate/Hr</TableHead>
                      <TableHead className="text-right">Min Tons</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lanes?.map((lane) => (
                      <TableRow key={lane.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{lane.origin}</TableCell>
                        <TableCell>{lane.destination}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {lane.product}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{lane.distance} km</TableCell>
                        <TableCell className="text-right">${lane.ratePerHour}</TableCell>
                        <TableCell className="text-right">{lane.minTons} MT</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
