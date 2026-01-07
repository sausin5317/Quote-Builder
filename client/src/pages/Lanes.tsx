import { Layout } from "@/components/ui/Layout";
import { useLanes } from "@/hooks/use-lanes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function Lanes() {
  const { data: lanes, isLoading } = useLanes();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
             <h1 className="text-3xl font-display font-bold text-gray-900">Master Lane List</h1>
             <p className="text-gray-500 mt-1">View and manage all available shipping lanes.</p>
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
