import Sidebar from "@/components/Sidebar";
import DataTable from "@/components/DataTable";
import SampleQCReview from "@/components/SampleQCReview";
import { Button } from "@/components/ui/button";
import { Eye, Download } from "lucide-react";
import { useState } from "react";

const OrderTracking = () => {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

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
      cell: (value: string) => (
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedOrder(value)}
          >
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
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar userRole="buyer" />

      <main className="flex-1 p-8 w-[calc(100%-16rem)] ml-64">
        <div className="max-w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Order Tracking</h1>
            <p className="text-muted-foreground">Monitor all your bulk orders and samples</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <DataTable columns={columns} data={orders} />
          </div>

          {/* Sample QC Section */}
          {selectedOrder && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Sample QC Review</h2>
              <SampleQCReview 
                orderId={selectedOrder}
                videoUrl={selectedOrder === "ORD-001" ? "mock-video-url" : undefined}
                status="pending"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OrderTracking;
