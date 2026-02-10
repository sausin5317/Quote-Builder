import { Layout } from "@/components/ui/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Loader2, User, Shield, Building2, Check, X, Package, Plus, Trash2 } from "lucide-react";
import { USER_ROLES } from "@shared/schema";
import { useProducts, useCreateProduct, useDeleteProduct } from "@/hooks/use-products";

// Role permissions matrix
const PERMISSIONS = {
  "View Quotes": { admin: true, approver: true, quoter: true, viewer: true },
  "Create Quotes": { admin: true, approver: true, quoter: true, viewer: false },
  "Edit Quotes": { admin: true, approver: true, quoter: true, viewer: false },
  "Approve Quotes": { admin: true, approver: true, quoter: false, viewer: false },
  "Delete Quotes": { admin: true, approver: false, quoter: false, viewer: false },
  "Manage Users": { admin: true, approver: false, quoter: false, viewer: false },
  "Reset Passwords": { admin: true, approver: false, quoter: false, viewer: false },
  "Access Settings": { admin: true, approver: true, quoter: true, viewer: true },
  "Modify Defaults": { admin: true, approver: true, quoter: false, viewer: false },
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newProductName, setNewProductName] = useState("");

  const { data: products } = useProducts();
  const createProductMutation = useCreateProduct();
  const deleteProductMutation = useDeleteProduct();

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { oldPassword: string; newPassword: string }) => {
      const res = await apiRequest("PUT", "/api/user/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to change password", description: error.message, variant: "destructive" });
    },
  });

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ oldPassword, newPassword });
  };

  const isAdmin = user?.role === "admin";
  const canModifyDefaults = user?.role === "admin" || user?.role === "approver";

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold text-gray-900">Settings</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[520px]">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissions
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="company" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>View your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Username</Label>
                    <p className="font-medium">{user?.username}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Role</Label>
                    <p className="font-medium capitalize">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                        ${user?.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          user?.role === 'approver' ? 'bg-blue-100 text-blue-800' :
                            user?.role === 'quoter' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {user?.role?.toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="oldPassword">Current Password</Label>
                  <Input
                    id="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <Button
                  onClick={handlePasswordChange}
                  disabled={changePasswordMutation.isPending || !oldPassword || !newPassword || !confirmPassword}
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Manage Products</CardTitle>
                <CardDescription>Control the list of products available for shipping lanes and quotes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {canModifyDefaults && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter product name"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newProductName.trim()) {
                          createProductMutation.mutate({ name: newProductName.trim() }, {
                            onSuccess: () => {
                              setNewProductName("");
                              toast({ title: "Product added" });
                            },
                            onError: (err: Error) => {
                              toast({ title: "Failed to add product", description: err.message, variant: "destructive" });
                            },
                          });
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        if (!newProductName.trim()) return;
                        createProductMutation.mutate({ name: newProductName.trim() }, {
                          onSuccess: () => {
                            setNewProductName("");
                            toast({ title: "Product added" });
                          },
                          onError: (err: Error) => {
                            toast({ title: "Failed to add product", description: err.message, variant: "destructive" });
                          },
                        });
                      }}
                      disabled={createProductMutation.isPending || !newProductName.trim()}
                    >
                      {createProductMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                )}

                <div className="divide-y">
                  {products?.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No products yet. Add your first product above.</p>
                  )}
                  {products?.map(product => (
                    <div key={product.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {product.name}
                        </span>
                        {product.category && (
                          <span className="text-xs text-gray-400">{product.category}</span>
                        )}
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm(`Delete product "${product.name}"? Existing lanes using this product will not be affected.`)) {
                              deleteProductMutation.mutate(product.id, {
                                onSuccess: () => toast({ title: "Product deleted" }),
                                onError: (err: Error) => toast({ title: "Failed to delete", description: err.message, variant: "destructive" }),
                              });
                            }
                          }}
                          disabled={deleteProductMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>
                  Overview of what each role can do in the system. Your role: <span className="font-semibold capitalize">{user?.role}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Permission</th>
                        {USER_ROLES.map(role => (
                          <th key={role} className={`text-center py-3 px-4 font-semibold capitalize ${user?.role === role ? 'bg-blue-50' : ''}`}>
                            {role}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(PERMISSIONS).map(([permission, roles]) => (
                        <tr key={permission} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{permission}</td>
                          {USER_ROLES.map(role => (
                            <td key={role} className={`text-center py-3 px-4 ${user?.role === role ? 'bg-blue-50' : ''}`}>
                              {roles[role as keyof typeof roles] ? (
                                <Check className="h-5 w-5 text-green-600 mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-red-400 mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value="company" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>Configure company details for quotes and exports</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" placeholder="Your Company Name" defaultValue="Quote Builder Inc." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Contact Email</Label>
                    <Input id="companyEmail" type="email" placeholder="contact@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Contact Phone</Label>
                    <Input id="companyPhone" placeholder="+1 (555) 000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Address</Label>
                    <Input id="companyAddress" placeholder="123 Business St, City, State" />
                  </div>
                  <Button variant="outline" disabled>
                    Save Company Info (Coming Soon)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Application Defaults</CardTitle>
                  <CardDescription>Configure default values for quote calculations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Default Drive Rate ($/km)</Label>
                      <Input type="number" step="0.01" placeholder="2.19" />
                    </div>
                    <div className="space-y-2">
                      <Label>Default Load/Unload Rate ($/hr)</Label>
                      <Input type="number" step="0.01" placeholder="65.00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Default Speed (km/h)</Label>
                      <Input type="number" placeholder="70" />
                    </div>
                    <div className="space-y-2">
                      <Label>Fuel Surcharge (%)</Label>
                      <Input type="number" step="0.1" placeholder="5.0" />
                    </div>
                  </div>
                  <Button variant="outline" disabled>
                    Save Defaults (Coming Soon)
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
