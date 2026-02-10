import { Layout } from "@/components/ui/Layout";
import { useImportLanes } from "@/hooks/use-lanes";
import { calculateDistance } from "@/lib/map-service";
import { LocationSearchInput } from "@/components/ui/start-location-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Download, Upload, Loader2, Plus, Pencil, Trash2,
  Search, ChevronLeft, ChevronRight, Copy, AlertTriangle, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useProducts } from "@/hooks/use-products";
import { api } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState, useCallback, useEffect } from "react";
import { Lane } from "@shared/schema";

const DEFAULT_LANE = {
  origin: "",
  destination: "",
  product: "",
  distance: "0",
  ratePerHour: "0",
  speed: "70",
  fuelSurcharge: "5",
  loadTime: "1",
  unloadTime: "1",
  minTons: "0",
  chainsFee: "0",
  driverTargetPay: "35",
  ownerOperatorBiziPay: "115",
  ownerOperatorOwnPay: "130",
};

const PAGE_SIZE = 25;

export default function Lanes() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: products } = useProducts();
  const importMutation = useImportLanes();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Distinct products used in lanes (for filter dropdown)
  const { data: laneProducts } = useQuery<string[]>({
    queryKey: ["/api/lanes/products"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/lanes/products");
      return res.json();
    },
  });

  // Search & pagination state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editLane, setEditLane] = useState<Lane | null>(null);
  const [formData, setFormData] = useState(DEFAULT_LANE);
  const [dupesOpen, setDupesOpen] = useState(false);

  const canEdit = user?.role !== "viewer";
  const canDelete = user?.role === "admin" || user?.role === "approver";

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [productFilter]);

  // Paginated lanes query
  const { data: lanesData, isLoading } = useQuery<{ lanes: Lane[]; total: number }>({
    queryKey: ["/api/lanes/search", debouncedSearch, productFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (productFilter && productFilter !== "all") params.set("product", productFilter);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const res = await apiRequest("GET", `/api/lanes/search?${params}`);
      return res.json();
    },
  });

  const lanes = lanesData?.lanes || [];
  const total = lanesData?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Duplicates query (only fetched on demand)
  const { data: duplicates, refetch: refetchDuplicates, isFetching: dupesFetching } = useQuery<
    { origin: string; destination: string; product: string; count: number; ids: number[] }[]
  >({
    queryKey: ["/api/lanes/duplicates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/lanes/duplicates");
      return res.json();
    },
    enabled: false, // only fetch when user clicks
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof DEFAULT_LANE) => {
      const res = await apiRequest("POST", "/api/lanes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lanes/search"] });
      setCreateOpen(false);
      setFormData(DEFAULT_LANE);
      toast({ title: "Lane created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create lane", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof DEFAULT_LANE }) => {
      const res = await apiRequest("PUT", `/api/lanes/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lanes/search"] });
      setEditLane(null);
      toast({ title: "Lane updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update lane", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/lanes/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lanes/search"] });
      toast({ title: "Lane deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete lane", description: error.message, variant: "destructive" });
    },
  });

  const handleDownloadTemplate = () => { window.location.href = api.lanes.template.path; };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await importMutation.mutateAsync(file);
      queryClient.invalidateQueries({ queryKey: ["/api/lanes/search"] });
      toast({ title: "Import Successful", description: `Successfully imported ${result.count} lanes.` });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message || "Failed to import lanes.", variant: "destructive" });
    }
  };

  const openEditDialog = (lane: Lane) => {
    console.log("Lanes: Opening Edit Dialog for:", lane);
    setEditLane(lane);
    setFormData({
      origin: lane.origin,
      destination: lane.destination,
      product: lane.product,
      distance: lane.distance,
      ratePerHour: lane.ratePerHour,
      speed: lane.speed,
      fuelSurcharge: lane.fuelSurcharge,
      loadTime: lane.loadTime,
      unloadTime: lane.unloadTime,
      minTons: lane.minTons,
      chainsFee: lane.chainsFee || "0",
      driverTargetPay: lane.driverTargetPay || "35",
      ownerOperatorBiziPay: lane.ownerOperatorBiziPay || "115",
      ownerOperatorOwnPay: lane.ownerOperatorOwnPay || "130",
    });
  };

  const openCreateDialog = () => { setFormData(DEFAULT_LANE); setCreateOpen(true); };

  const handleSave = () => {
    if (editLane) { updateMutation.mutate({ id: editLane.id, data: formData }); }
    else { createMutation.mutate(formData); }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-calculate distance for Lanes form
  useEffect(() => {
    const timer = setTimeout(async () => {
      console.log("Lanes: Auto-calc check:", formData.origin, formData.destination);
      if (formData.origin && formData.destination) {
        const dist = await calculateDistance(formData.origin, formData.destination);
        console.log("Lanes: Calculated Distance:", dist);
        if (dist && dist !== "0") {
          setFormData(prev => ({ ...prev, distance: dist }));
        }
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData.origin, formData.destination]);

  const laneFormFields = (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Origin *</Label>
          <LocationSearchInput
            value={formData.origin}
            onChange={v => updateField("origin", v)}
            placeholder="e.g. Toronto, ON"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label>Destination *</Label>
          <LocationSearchInput
            value={formData.destination}
            onChange={v => updateField("destination", v)}
            placeholder="e.g. Montreal, QC"
            className="h-10"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Product *</Label>
        <Select value={formData.product} onValueChange={v => updateField("product", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a product" />
          </SelectTrigger>
          <SelectContent>
            {products?.map(p => (
              <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Distance (km)</Label>
          <Input type="number" step="0.1" value={formData.distance} onChange={e => updateField("distance", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Rate $/Hr</Label>
          <Input type="number" step="0.01" value={formData.ratePerHour} onChange={e => updateField("ratePerHour", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Speed (km/h)</Label>
          <Input type="number" value={formData.speed} onChange={e => updateField("speed", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Load Time (hrs)</Label>
          <Input type="number" step="0.25" value={formData.loadTime} onChange={e => updateField("loadTime", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Unload Time (hrs)</Label>
          <Input type="number" step="0.25" value={formData.unloadTime} onChange={e => updateField("unloadTime", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Min Tons (MT)</Label>
          <Input type="number" step="0.1" value={formData.minTons} onChange={e => updateField("minTons", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fuel Surcharge (%)</Label>
          <Input type="number" step="0.1" value={formData.fuelSurcharge} onChange={e => updateField("fuelSurcharge", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Chains Fee ($)</Label>
          <Input type="number" step="0.01" value={formData.chainsFee} onChange={e => updateField("chainsFee", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Driver Target Pay</Label>
          <Input type="number" step="0.01" value={formData.driverTargetPay} onChange={e => updateField("driverTargetPay", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>O/O Bizi Pay</Label>
          <Input type="number" step="0.01" value={formData.ownerOperatorBiziPay} onChange={e => updateField("ownerOperatorBiziPay", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>O/O Own Pay</Label>
          <Input type="number" step="0.01" value={formData.ownerOperatorOwnPay} onChange={e => updateField("ownerOperatorOwnPay", e.target.value)} />
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">Master Lane List</h1>
            <p className="text-gray-500 mt-1">
              {total.toLocaleString()} total lane{total !== 1 ? "s" : ""}
              {debouncedSearch && ` matching "${debouncedSearch}"`}
              {productFilter !== "all" && ` · ${productFilter}`}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {canEdit && (
              <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700" onClick={openCreateDialog}>
                <Plus className="w-4 h-4" /> Add Lane
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4" /> Template
            </Button>
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".csv,.xlsx,.xls" />
            {canEdit && (
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
                {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import
              </Button>
            )}
            {canEdit && (
              <Button variant="outline" size="sm" className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                onClick={() => { refetchDuplicates(); setDupesOpen(true); }}
                disabled={dupesFetching}
              >
                {dupesFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                Duplicates
              </Button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Search by origin or destination..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setSearch("")}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {laneProducts?.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <>
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
                        {canEdit && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lanes.map((lane) => (
                        <TableRow key={lane.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{lane.origin}</TableCell>
                          <TableCell>{lane.destination}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                              {lane.product}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{lane.distance} km</TableCell>
                          <TableCell className="text-right">${lane.ratePerHour}</TableCell>
                          <TableCell className="text-right">{lane.minTons} MT</TableCell>
                          {canEdit && (
                            <TableCell className="text-right space-x-1">
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(lane)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {canDelete && (
                                <Button variant="destructive" size="sm"
                                  onClick={() => { if (confirm(`Delete "${lane.origin} → ${lane.destination}"?`)) deleteMutation.mutate(lane.id); }}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {lanes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-gray-400 py-8">
                            {debouncedSearch || productFilter !== "all"
                              ? "No lanes match your search criteria."
                              : "No lanes found. Add a lane or import from a file."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t px-4 py-3 bg-gray-50/50">
                    <p className="text-sm text-gray-500">
                      Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {/* Page number pills */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) { pageNum = i + 1; }
                        else if (page <= 3) { pageNum = i + 1; }
                        else if (page >= totalPages - 2) { pageNum = totalPages - 4 + i; }
                        else { pageNum = page - 2 + i; }
                        return (
                          <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="sm"
                            className="w-8 h-8 p-0" onClick={() => setPage(pageNum)}>
                            {pageNum}
                          </Button>
                        );
                      })}
                      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Lane Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Lane</DialogTitle>
            <DialogDescription>Enter details to create a new lane.</DialogDescription>
          </DialogHeader>
          {laneFormFields}
          <Button className="w-full" onClick={handleSave} disabled={createMutation.isPending || !formData.origin || !formData.destination || !formData.product}>
            {createMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>) : "Create Lane"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Edit Lane Dialog */}
      <Dialog open={!!editLane} onOpenChange={(open) => { if (!open) setEditLane(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Lane</DialogTitle>
            <DialogDescription>Modify the details of the selected lane.</DialogDescription>
          </DialogHeader>
          {laneFormFields}
          <Button className="w-full" onClick={handleSave} disabled={updateMutation.isPending || !formData.origin || !formData.destination || !formData.product}>
            {updateMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>) : "Save Changes"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Duplicates Dialog */}
      <Dialog open={dupesOpen} onOpenChange={setDupesOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Duplicate Lanes
            </DialogTitle>
            <DialogDescription>Review keys that have multiple entries.</DialogDescription>
          </DialogHeader>

          {dupesFetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : !duplicates || duplicates.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-lg font-medium">✅ No duplicates found</p>
              <p className="text-sm">All lane entries are unique by origin + destination + product.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Found {duplicates.length} group{duplicates.length !== 1 ? "s" : ""} of duplicate lanes (same origin + destination + product).
              </p>
              {duplicates.map((dupe, i) => (
                <Card key={i} className="border-amber-200 bg-amber-50/50">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{dupe.origin} → {dupe.destination}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700">{dupe.product}</Badge>
                          <span className="text-xs text-amber-600 font-medium">{dupe.count} entries</span>
                          <span className="text-xs text-gray-400">IDs: {dupe.ids?.join(", ")}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm"
                        onClick={() => {
                          setSearch(dupe.origin);
                          setProductFilter(dupe.product);
                          setDupesOpen(false);
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
