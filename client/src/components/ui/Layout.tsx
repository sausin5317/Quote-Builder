import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Calculator,
  History,
  Settings,
  Truck,
  Menu,
  X,
  LayoutDashboard,
  Building2,
  LogOut,
  Users
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logoutMutation, user } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Calculator, label: "Quote Calculator", href: "/" },
    { icon: Building2, label: "Clients", href: "/clients" },
    { icon: History, label: "History", href: "/history" },
    { icon: Truck, label: "Lanes", href: "/lanes" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  if (user?.role === "admin") {
    navItems.push({ icon: Users, label: "Users", href: "/users" });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full z-10 shadow-lg">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-display font-bold text-gray-900">LoadTrax</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`
                flex items - center gap - 3 px - 4 py - 3 rounded - lg font - medium transition - all duration - 200
                ${isActive
                  ? "bg-primary text-white shadow-md shadow-primary/20 translate-x-1"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }
`}>
                <item.icon className={`w - 5 h - 5 ${isActive ? "text-white" : "text-gray-500"} `} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          {/* User Profile Section */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-semibold text-sm shadow-md">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.username}</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium 
                ${user?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                  user?.role === 'approver' ? 'bg-blue-100 text-blue-700' :
                    user?.role === 'quoter' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {user?.role?.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
            <h4 className="font-semibold text-blue-900 text-sm">Need Help?</h4>
            <p className="text-xs text-blue-600 mt-1">Contact support for pricing adjustments.</p>
          </div>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 border-gray-200 text-gray-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full bg-white border-b border-gray-200 z-20 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-gray-900">LoadTrax</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMobileOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-64 bg-white p-4 space-y-2 shadow-2xl" onClick={e => e.stopPropagation()}>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 animate-fade-in">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
