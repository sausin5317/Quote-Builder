import { Layout } from "@/components/ui/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, FileText, Clock, TrendingUp, Users, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface QuoteStat {
  status: string;
  count: number;
}

interface ClientRevenue {
  clientId: number;
  clientName: string;
  total: string;
}

export default function Dashboard() {
  const { data: quoteStats, isLoading: statsLoading } = useQuery<QuoteStat[]>({
    queryKey: ['/api/analytics/quote-stats'],
  });

  const { data: revenue, isLoading: revenueLoading } = useQuery<{ total: string }>({
    queryKey: ['/api/analytics/revenue'],
  });

  const { data: clientRevenue, isLoading: clientRevenueLoading } = useQuery<ClientRevenue[]>({
    queryKey: ['/api/analytics/revenue-by-client'],
  });

  const { data: clients } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['/api/clients'],
  });

  const totalQuotes = quoteStats?.reduce((sum, s) => sum + s.count, 0) || 0;
  const approvedCount = quoteStats?.find(s => s.status === "Approved")?.count || 0;
  const pendingCount = quoteStats?.find(s => s.status === "Pending Review")?.count || 0;
  const draftCount = quoteStats?.find(s => s.status === "Draft")?.count || 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "Pending Review": return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "Rejected": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Pending Review": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Rejected": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-500 text-sm">Overview of your pricing quotes and performance</p>
          </div>
          <div className="text-xs text-slate-400">
            Last updated: {format(new Date(), "MMM d, yyyy h:mm a")}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-slate-500 uppercase">Total Quotes</CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-slate-800">{totalQuotes}</div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-slate-500 uppercase">Approved Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold text-emerald-600">
                  ${parseFloat(revenue?.total || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-slate-500 uppercase">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-slate-500 uppercase">Active Clients</CardTitle>
              <Users className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{clients?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-700">Quote Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {quoteStats?.map(stat => (
                    <div 
                      key={stat.status} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(stat.status)}`}
                      data-testid={`stat-${stat.status.toLowerCase().replace(" ", "-")}`}
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(stat.status)}
                        <span className="font-medium text-sm">{stat.status}</span>
                      </div>
                      <span className="font-bold">{stat.count}</span>
                    </div>
                  ))}
                  {(!quoteStats || quoteStats.length === 0) && (
                    <div className="text-center text-slate-400 py-8">
                      No quotes yet
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-700">Revenue by Client</CardTitle>
            </CardHeader>
            <CardContent>
              {clientRevenueLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {clientRevenue?.filter(c => parseFloat(c.total) > 0).map(client => (
                    <div 
                      key={client.clientId} 
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                      data-testid={`client-revenue-${client.clientId}`}
                    >
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-sm text-slate-700">{client.clientName}</span>
                      </div>
                      <span className="font-bold text-emerald-600">
                        ${parseFloat(client.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  {(!clientRevenue || clientRevenue.filter(c => parseFloat(c.total) > 0).length === 0) && (
                    <div className="text-center text-slate-400 py-8">
                      No approved revenue yet
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
