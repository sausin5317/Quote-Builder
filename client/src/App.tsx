import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import History from "@/pages/History";
import Lanes from "@/pages/Lanes";
import Settings from "@/pages/Settings";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import AuthPage from "@/pages/auth-page";
import { useEffect } from "react";

function ProtectedRoute({ component: Component, path }: { component: React.ComponentType, path: string }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex justify-center items-center gap-2 h-screen"><Loader2 className="h-8 w-8 animate-spin" text-gray-500 /></div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        <ProtectedRoute component={Home} path="/" />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} path="/dashboard" />
      </Route>
      <Route path="/clients">
        <ProtectedRoute component={Clients} path="/clients" />
      </Route>
      <Route path="/history">
        <ProtectedRoute component={History} path="/history" />
      </Route>
      <Route path="/lanes">
        <ProtectedRoute component={Lanes} path="/lanes" />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} path="/settings" />
      </Route>
      <Route path="/users">
        <ProtectedRoute component={UsersPage} path="/users" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
