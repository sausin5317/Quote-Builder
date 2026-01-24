import { Layout } from "@/components/ui/Layout";
import { useQuotes, useUpdateQuote } from "@/hooks/use-quotes";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, FileText, AlertCircle } from "lucide-react";
import type { Quote, User } from "@shared/schema";

export default function History() {
  const { data: quotes, isLoading } = useQuotes();
  const { toast } = useToast();
  const updateQuote = useUpdateQuote();
  
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

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

  const adminUser = users?.find(u => u.role === "admin");

  return (
    <Layout>
      <div className="space-y-6">
         <div className="flex justify-between items-center">
          <div>
             <h1 className="text-3xl font-display font-bold text-gray-900">Quote History</h1>
             <p className="text-gray-500 mt-1">Review and manage previously generated quotes.</p>
          </div>
        </div>

        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
               <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : quotes?.length === 0 ? (
               <div className="p-12 text-center text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                No history available yet. Create your first quote!
               </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total Hours</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">MT Rate</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes?.map((quote) => {
                      const mtRate = quote.mtPerLoad && parseFloat(quote.mtPerLoad) > 0 
                        ? (parseFloat(quote.totalCost || "0") / parseFloat(quote.mtPerLoad)).toFixed(2) 
                        : quote.ratePerTon || "0.00";
                      
                      return (
                        <TableRow key={quote.id} className="hover:bg-gray-50" data-testid={`row-quote-${quote.id}`}>
                          <TableCell className="text-gray-600">
                            {quote.createdAt ? format(new Date(quote.createdAt), 'MMM dd, yyyy') : '-'}
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">{quote.customerName || "-"}</TableCell>
                          <TableCell>
                            {getStatusBadge(quote.status)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{quote.totalHours} h</TableCell>
                          <TableCell className="text-right font-mono font-medium text-green-600">${parseFloat(quote.totalCost || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right text-gray-500 text-sm">${mtRate}/MT</TableCell>
                          <TableCell>
                            {quote.status === "Pending Review" && adminUser && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                  onClick={() => approveQuote.mutate({ quoteId: quote.id, userId: adminUser.id })}
                                  disabled={approveQuote.isPending}
                                  data-testid={`button-approve-${quote.id}`}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleReject(quote.id)}
                                  disabled={updateQuote.isPending}
                                  data-testid={`button-reject-${quote.id}`}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                            {quote.status === "Draft" && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-blue-600"
                                onClick={() => updateQuote.mutate({ id: quote.id, status: "Pending Review" })}
                                disabled={updateQuote.isPending}
                                data-testid={`button-submit-${quote.id}`}
                              >
                                Submit
                              </Button>
                            )}
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
      </div>
    </Layout>
  );
}
