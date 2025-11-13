import Sidebar from "@/components/Sidebar";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Eye, Download } from "lucide-react";

const OrderTracking = () => {
  const orders = [
    {
      id: "ORD-001",
      product: "Cotton T-Shirts",
      quantity: 500,
      status: "Sample QC",
      escrow: "$6,250",
      date: "2025-01-10",
    },
    {
      id: "ORD-002",
      product: "Hoodies",
      quantity: 300,
      status: "In Production",
      escrow: "$9,000",
      date: "2025-01-08",
    },
    {
      id: "ORD-003",
      product: "Caps",
      quantity: 1000,
      status: "QC Approved",
      escrow: "$0 (Released)",
      date: "2025-01-05",
    },
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
      ),
    },
    { header: "Escrow", accessor: "escrow" },
    { header: "Date", accessor: "date" },
    {
      header: "Actions",
      accessor: "id",
      cell: () => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="buyer" />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Order Tracking</h1>
            <p className="text-muted-foreground">Monitor all your bulk orders and samples</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <DataTable columns={columns} data={orders} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderTracking;
