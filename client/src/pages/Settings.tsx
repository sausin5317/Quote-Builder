import { Layout } from "@/components/ui/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Settings() {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold text-gray-900">Settings</h1>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Defaults</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 mb-4">Manage global default values for calculations.</p>
              <Button variant="outline" disabled>Manage Defaults (Coming Soon)</Button>
            </CardContent>
          </Card>
          
           <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 mb-4">Update your profile information.</p>
              <Button variant="outline" disabled>Edit Profile (Coming Soon)</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
