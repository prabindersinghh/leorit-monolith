import Sidebar from "@/components/Sidebar";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

const ManufacturerOrders = () => {
  const activeOrders = [
    {
      id: "ORD-101",
      buyer: "Acme Retail",
      product: "T-Shirts",
      quantity: 500,
      progress: "Sample Phase",
      deadline: "2025-01-25",
    },
    {
      id: "ORD-102",
      buyer: "Fashion Co",
      product: "Hoodies",
      quantity: 300,
      progress: "In Production",
      deadline: "2025-01-30",
    },
  ];

  const columns = [
    { header: "Order ID", accessor: "id" },
    { header: "Buyer", accessor: "buyer" },
    { header: "Product", accessor: "product" },
    { header: "Quantity", accessor: "quantity" },
    {
      header: "Progress",
      accessor: "progress",
      cell: (value: string) => (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-foreground">
          {value}
        </span>
      ),
    },
    { header: "Deadline", accessor: "deadline" },
    {
      header: "Actions",
      accessor: "id",
      cell: () => (
        <Button variant="ghost" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Upload QC
        </Button>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="manufacturer" />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">My Orders</h1>
            <p className="text-muted-foreground">Track and manage production orders</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <DataTable columns={columns} data={activeOrders} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManufacturerOrders;
