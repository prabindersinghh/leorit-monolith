import Sidebar from "@/components/Sidebar";
import DashboardCard from "@/components/DashboardCard";
import { Shield, Users, AlertCircle, TrendingUp } from "lucide-react";

const AdminDashboard = () => {
  const stats = [
    { title: "Active Manufacturers", value: "47", icon: Users, description: "Verified" },
    { title: "Pending Verifications", value: "12", icon: Shield, description: "Awaiting review" },
    { title: "Active Disputes", value: "3", icon: AlertCircle, description: "Requires action" },
    { title: "Platform Growth", value: "+24%", icon: TrendingUp, description: "This quarter" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="admin" />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Platform oversight and management</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <DashboardCard key={index} {...stat} />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {[
                  "New manufacturer verification request",
                  "Dispute opened for ORD-089",
                  "QC proof uploaded by MFG-012",
                  "Payment released for ORD-045",
                ].map((activity, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-foreground rounded-full" />
                    <p className="text-sm text-foreground">{activity}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">System Health</h2>
              <div className="space-y-4">
                {[
                  { label: "API Status", value: "Operational", status: "ok" },
                  { label: "Database", value: "Healthy", status: "ok" },
                  { label: "Storage", value: "84% Used", status: "warning" },
                  { label: "AI Services", value: "Online", status: "ok" },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <span className={`text-sm font-medium ${
                      item.status === "ok" ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
