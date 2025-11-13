import Sidebar from "@/components/Sidebar";
import DashboardCard from "@/components/DashboardCard";
import DataTable from "@/components/DataTable";
import { Package, Clock, TrendingUp, DollarSign } from "lucide-react";

const ManufacturerDashboard = () => {
  const stats = [
    { title: "Active Orders", value: "8", icon: Package, description: "In progress" },
    { title: "Pending Acceptance", value: "4", icon: Clock, description: "New requests" },
    { title: "On-Time Rate", value: "96%", icon: TrendingUp, description: "+2% this month" },
    { title: "Total Earnings", value: "$89,400", icon: DollarSign, description: "Last 30 days" },
  ];

  const pendingOrders = [
    { id: "ORD-101", buyer: "Acme Retail", product: "T-Shirts", quantity: 500, deadline: "15 days" },
    { id: "ORD-102", buyer: "Fashion Co", product: "Hoodies", quantity: 300, deadline: "20 days" },
    { id: "ORD-103", buyer: "Brand X", product: "Caps", quantity: 1000, deadline: "25 days" },
  ];

  const columns = [
    { header: "Order ID", accessor: "id" },
    { header: "Buyer", accessor: "buyer" },
    { header: "Product", accessor: "product" },
    { header: "Quantity", accessor: "quantity" },
    { header: "Deadline", accessor: "deadline" },
    {
      header: "Actions",
      accessor: "id",
      cell: () => (
        <div className="flex gap-2">
          <button className="px-4 py-1 bg-foreground text-background rounded-lg text-sm hover:bg-gray-800">
            Accept
          </button>
          <button className="px-4 py-1 border border-border rounded-lg text-sm hover:bg-gray-50">
            Decline
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="manufacturer" />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Manufacturer Dashboard</h1>
            <p className="text-muted-foreground">Manage production and incoming orders</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <DashboardCard key={index} {...stat} />
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Pending Order Requests</h2>
            <DataTable columns={columns} data={pendingOrders} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManufacturerDashboard;
