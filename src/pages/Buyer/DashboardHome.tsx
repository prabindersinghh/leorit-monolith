import Sidebar from "@/components/Sidebar";
import DashboardCard from "@/components/DashboardCard";
import DataTable from "@/components/DataTable";
import { Package, Clock, CheckCircle, DollarSign } from "lucide-react";

const DashboardHome = () => {
  const stats = [
    { title: "Active Orders", value: "12", icon: Package, description: "In production" },
    { title: "Pending Samples", value: "3", icon: Clock, description: "Awaiting QC" },
    { title: "Completed", value: "47", icon: CheckCircle, description: "This month" },
    { title: "In Escrow", value: "$24,500", icon: DollarSign, description: "Protected funds" },
  ];

  const recentOrders = [
    { id: "ORD-001", product: "Cotton T-Shirts", quantity: 500, status: "Sample QC", date: "2025-01-10" },
    { id: "ORD-002", product: "Hoodies", quantity: 300, status: "In Production", date: "2025-01-08" },
    { id: "ORD-003", product: "Caps", quantity: 1000, status: "QC Approved", date: "2025-01-05" },
  ];

  const columns = [
    { header: "Order ID", accessor: "id" },
    { header: "Product", accessor: "product" },
    { header: "Quantity", accessor: "quantity" },
    { 
      header: "Status", 
      accessor: "status",
      cell: (value: string) => (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-foreground">
          {value}
        </span>
      )
    },
    { header: "Date", accessor: "date" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="buyer" />
      
      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your order overview.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <DashboardCard key={index} {...stat} />
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Recent Orders</h2>
            <DataTable columns={columns} data={recentOrders} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardHome;
