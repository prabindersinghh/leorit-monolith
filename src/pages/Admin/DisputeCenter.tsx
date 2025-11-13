import Sidebar from "@/components/Sidebar";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

const DisputeCenter = () => {
  const disputes = [
    {
      id: "DIS-001",
      order: "ORD-089",
      buyer: "Acme Retail",
      manufacturer: "Elite Textiles",
      issue: "Quality mismatch",
      escrow: "$8,500",
      opened: "2025-01-13",
    },
    {
      id: "DIS-002",
      order: "ORD-092",
      buyer: "Brand X",
      manufacturer: "Premium Apparel",
      issue: "Late delivery",
      escrow: "$12,000",
      opened: "2025-01-10",
    },
  ];

  const columns = [
    { header: "Dispute ID", accessor: "id" },
    { header: "Order", accessor: "order" },
    { header: "Buyer", accessor: "buyer" },
    { header: "Manufacturer", accessor: "manufacturer" },
    { header: "Issue", accessor: "issue" },
    { header: "Escrow", accessor: "escrow" },
    { header: "Opened", accessor: "opened" },
    {
      header: "Actions",
      accessor: "id",
      cell: () => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4 mr-1" />
            Review
          </Button>
          <Button variant="outline" size="sm">
            Resolve
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="admin" />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Dispute Center</h1>
            <p className="text-muted-foreground">Manage order disputes and escrow decisions</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <DataTable columns={columns} data={disputes} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DisputeCenter;
