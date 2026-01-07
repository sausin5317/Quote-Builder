import { Layout } from "@/components/ui/Layout";
import { useQuotes } from "@/hooks/use-quotes";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function History() {
  const { data: quotes, isLoading } = useQuotes();

  return (
    <Layout>
      <div className="space-y-6">
         <div className="flex justify-between items-center">
          <div>
             <h1 className="text-3xl font-display font-bold text-gray-900">Quote History</h1>
             <p className="text-gray-500 mt-1">Review previously generated quotes.</p>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes?.map((quote) => {
                      const mtRate = quote.mtPerLoad ? (parseFloat(quote.totalCost || "0") / parseFloat(quote.mtPerLoad)).toFixed(2) : "0.00";
                      
                      return (
                        <TableRow key={quote.id} className="hover:bg-gray-50 cursor-pointer">
                          <TableCell className="text-gray-600">
                            {quote.createdAt ? format(new Date(quote.createdAt), 'MMM dd, yyyy') : '-'}
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">{quote.customerName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                              {quote.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{quote.totalHours} h</TableCell>
                          <TableCell className="text-right font-mono font-medium text-green-600">${quote.totalCost}</TableCell>
                          <TableCell className="text-right text-gray-500 text-sm">${mtRate}/MT</TableCell>
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
