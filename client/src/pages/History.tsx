import { Layout } from "@/components/ui/Layout";
import { useLocation } from "wouter";
import { useQuotes, useUpdateQuote, useDeleteQuote } from "@/hooks/use-quotes";
import { generateQuotePDF } from "@/lib/pdf-generator";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, FileText, AlertCircle, Trash2, Download, FilterX, Search, Eye, MapPin, DollarSign, Timer, Truck, Send } from "lucide-react";
import type { Quote, Client, QuoteWithLane } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
// Removed csv-stringify import which causes Buffer error in browser
// import { stringify } from "csv-stringify/sync";

export default function History() {
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { data: quotes, isLoading } = useQuotes();
  const { data: clients } = useQuery<Client[]>({ queryKey: ['/api/clients'] });
  const { toast } = useToast();
  const updateQuote = useUpdateQuote();
  const deleteQuote = useDeleteQuote();

  const [selectedQuote, setSelectedQuote] = useState<QuoteWithLane | null>(null);

  // Filters
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const approveQuote = useMutation({
    mutationFn: async ({ quoteId, userId }: { quoteId: number; userId: number }) => {
      const res = await apiRequest("POST", `/api/quotes/${quoteId}/approve`, { userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      toast({
        title: "Quote Approved",
        description: "The quote has been approved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve quote",
        variant: "destructive",
      });
    },
  });

  const handleReject = async (quoteId: number) => {
    try {
      await updateQuote.mutateAsync({ id: quoteId, status: "Rejected" });
      toast({
        title: "Quote Rejected",
        description: "The quote has been rejected.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject quote",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (quoteId: number) => {
    try {
      await deleteQuote.mutateAsync(quoteId);
      toast({
        title: "Quote Deleted",
        description: "The quote has been permanently removed.",
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "Approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "Pending Review":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "Rejected":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200">
            <FileText className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
    }
  };

  const canApprove = currentUser?.role === "admin" || currentUser?.role === "approver";
  const canDelete = currentUser?.role === "admin";
  const canSubmit = currentUser?.role !== "viewer";
  // Actually simpler: everyone can delete a draft, only Admin can delete passed that? 
  // For now, let's allow "Delete" freely if generic user, but maybe restrict 'Approved' ones? 
  // Adhering to "clear history" request -> User probably wants to clean up.

  // --- Filtering Logic ---
  const filteredQuotes = quotes?.filter(quote => {
    // 1. Client Filter
    if (selectedClientId !== "all" && quote.clientId?.toString() !== selectedClientId) {
      return false;
    }

    // 2. Date Range Filter
    if (startDate || endDate) {
      if (!quote.createdAt) return false;
      const quoteDate = new Date(quote.createdAt);
      const start = startDate ? startOfDay(parseISO(startDate)) : null;
      const end = endDate ? endOfDay(parseISO(endDate)) : null;

      if (start && quoteDate < start) return false;
      if (end && quoteDate > end) return false;
    }

    return true;
  }) || [];

  const handleResetFilters = () => {
    setSelectedClientId("all");
    setStartDate("");
    setEndDate("");
  };

  const handleExportCSV = () => {
    if (filteredQuotes.length === 0) {
      toast({ title: "No data", description: "No quotes to export based on current filters." });
      return;
    }

    // Manual CSV generation to avoid Node.js Buffer dependency
    const headers = ["ID", "Date", "Customer", "Origin", "Destination", "Product", "TotalCost", "Status"];
    const rows = filteredQuotes.map(q => [
      q.id,
      q.createdAt ? format(new Date(q.createdAt), 'yyyy-MM-dd') : '',
      q.customerName?.replace(/,/g, ' ') || '', // escape commas
      (q.origin || q.originOverride || "")?.replace(/,/g, ' ') || '',
      (q.destination || q.destinationOverride || "")?.replace(/,/g, ' ') || '',
      q.product || q.productOverride || '',
      q.totalCost || '0',
      q.status || ''
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `quotes_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDelete = async () => {
    // Sequentially delete filtered quotes
    // Note: Ideally backend should have bulk delete endpoint, but loop is fine for < 100 items
    let count = 0;
    try {
      for (const quote of filteredQuotes) {
        await deleteQuote.mutateAsync(quote.id);
        count++;
      }
      toast({ title: "History Cleared", description: `Deleted ${count} quotes.` });
    } catch (e) {
      toast({ title: "Error", description: "Some quotes could not be deleted.", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">Quote History</h1>
            <p className="text-gray-500 mt-1">Review, manage, and export your quotes.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} disabled={filteredQuotes.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>

            {canDelete && filteredQuotes.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Clear Listed
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the <strong>{filteredQuotes.length}</strong> currently listed quotes.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">Yes, Delete All</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <Card className="bg-slate-50 border-slate-200 shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full md:w-auto space-y-1">
              <label className="text-xs font-semibold text-gray-500">Client</label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 w-full md:w-auto space-y-1">
              <label className="text-xs font-semibold text-gray-500">From Date</label>
              <Input type="date" className="bg-white" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="flex-1 w-full md:w-auto space-y-1">
              <label className="text-xs font-semibold text-gray-500">To Date</label>
              <Input type="date" className="bg-white" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <Button variant="ghost" size="icon" onClick={handleResetFilters} title="Reset Filters" className="mb-[2px]">
              <FilterX className="w-5 h-5 text-gray-500" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredQuotes.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                No quotes match your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Origin / Dest</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => {
                      return (
                        <TableRow key={quote.id} className="hover:bg-gray-50">
                          <TableCell className="text-gray-600">
                            {quote.createdAt ? format(new Date(quote.createdAt), 'MMM dd, yyyy') : '-'}
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">{quote.customerName || "-"}</TableCell>
                          <TableCell className="text-xs text-gray-500">
                            <div className="flex flex-col">
                              <span>{quote.origin || quote.originOverride || ""}</span>
                              <span className="opacity-50">to</span>
                              <span>{quote.destination || quote.destinationOverride || ""}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(quote.status)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-green-600">${parseFloat(quote.totalCost || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {/* Review Action - Always Visible */}
                              <Button
                                size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                onClick={() => setSelectedQuote(quote)}
                                title="Review Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              {/* Edit Action */}
                              {(quote.status === "Draft" || quote.status === "Pending Review") && canSubmit && (
                                <Button
                                  size="icon" variant="ghost" className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                                  onClick={() => setLocation(`/?edit=${quote.id}`)}
                                  title="Edit Quote"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                </Button>
                              )}

                              {/* Admin/Manager Actions: Approve/Reject (Available for Draft & Pending) */}
                              {(quote.status === "Pending Review" || quote.status === "Draft") && canApprove ? (
                                <>
                                  <Button
                                    size="icon" variant="outline" className="h-8 w-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                    onClick={() => approveQuote.mutate({ quoteId: quote.id, userId: currentUser!.id })}
                                    title="Approve"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon" variant="outline" className="h-8 w-8 text-amber-600 border-amber-200 hover:bg-amber-50"
                                    onClick={() => handleReject(quote.id)}
                                    title="Reject"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                /* Standard User Action: Submit Draft */
                                quote.status === "Draft" && canSubmit && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-blue-600 h-8 px-2"
                                    onClick={() => updateQuote.mutate({ id: quote.id, status: "Pending Review" })}
                                    disabled={updateQuote.isPending}
                                  >
                                    Submit
                                  </Button>
                                )
                              )}

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Quote?</AlertDialogTitle>
                                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(quote.id)} className="bg-red-600">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quote Review Dialog */}
        <Dialog open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                Quote #{selectedQuote?.id}
                {getStatusBadge(selectedQuote?.status || null)}
              </DialogTitle>
              <DialogDescription>
                Created on {selectedQuote?.createdAt ? format(new Date(selectedQuote.createdAt), 'PPpp') : '-'}
              </DialogDescription>
            </DialogHeader>

            {selectedQuote && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                {/* 1. Route Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Route Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 block">Customer</span>
                      <span className="font-medium">{selectedQuote.customerName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Product</span>
                      <span className="font-medium">{selectedQuote.product || selectedQuote.productOverride || "—"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500 block">Origin</span>
                      <span className="font-medium">{selectedQuote.origin || selectedQuote.originOverride}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500 block">Destination</span>
                      <span className="font-medium">{selectedQuote.destination || selectedQuote.destinationOverride}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Distance</span>
                      <span className="font-medium">{selectedQuote.distance} km</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Round Trip</span>
                      <span className="font-medium">{selectedQuote.isRoundTrip ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Financials */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Financials
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-500 block">Total Cost</span>
                      <span className="text-xl font-bold text-green-700">
                        ${parseFloat(selectedQuote.totalCost || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-500 block">Rate / Ton</span>
                      <span className="text-xl font-bold text-blue-700">
                        ${selectedQuote.ratePerTon}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Metric Tons</span>
                      <span className="font-medium">{selectedQuote.mtPerLoad} MT</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Total Hours</span>
                      <span className="font-medium">{selectedQuote.totalHours || "0"} hrs</span>
                    </div>
                  </div>
                </div>

                {/* 3. Operational Params */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                    <Timer className="w-4 h-4" /> Operational
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 block">Avg Speed</span>
                      <span className="font-medium">{selectedQuote.speed} km/h</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Load/Unload Time</span>
                      <span className="font-medium">{parseFloat(selectedQuote.loadTime || '0') + parseFloat(selectedQuote.unloadTime || '0')} hrs</span>
                    </div>
                  </div>
                </div>

                {/* 4. Rates Breakdown */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Rates Used
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 block">Drive Rate</span>
                      <span className="font-medium">${selectedQuote.driveRate}/hr</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Fuel Surcharge</span>
                      <span className="font-medium">{selectedQuote.fuelSurcharge}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Misc Charges</span>
                      <span className="font-medium">${selectedQuote.miscCharges}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
              {/* PDF and Email Actions */}
              {selectedQuote && (
                <div className="flex gap-2 w-full sm:w-auto mr-auto">
                  <Button variant="outline" size="sm" onClick={() => generateQuotePDF({ quote: selectedQuote, isDraft: selectedQuote.status === "Draft" })}>
                    <FileText className="w-3 h-3 mr-1" /> PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const subject = encodeURIComponent(`Quote #${selectedQuote.id}`);
                    const body = encodeURIComponent(`Total: $${selectedQuote.totalCost}`);
                    window.location.href = `mailto:?subject=${subject}&body=${body}`;
                  }}>
                    <Send className="w-3 h-3 mr-1" /> Email
                  </Button>
                </div>
              )}
              {/* Buttons inside Modal for Quick Action */}
              {selectedQuote && canApprove && (selectedQuote.status === "Pending Review" || selectedQuote.status === "Draft") && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleReject(selectedQuote.id);
                      setSelectedQuote(null);
                    }}
                  >
                    Reject Quote
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      approveQuote.mutate({ quoteId: selectedQuote.id, userId: currentUser!.id });
                      setSelectedQuote(null);
                    }}
                  >
                    Approve Quote
                  </Button>
                </div>
              )}
              <Button variant="outline" onClick={() => setSelectedQuote(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
