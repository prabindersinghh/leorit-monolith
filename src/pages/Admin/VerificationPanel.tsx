import Sidebar from "@/components/Sidebar";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

const VerificationPanel = () => {
  const pendingVerifications = [
    {
      id: "MFG-047",
      company: "Elite Textiles Ltd",
      location: "Mumbai, India",
      capacity: "10,000/month",
      submitted: "2025-01-12",
    },
    {
      id: "MFG-048",
      company: "Premium Apparel Co",
      location: "Dhaka, Bangladesh",
      capacity: "15,000/month",
      submitted: "2025-01-11",
    },
  ];

  const columns = [
    { header: "ID", accessor: "id" },
    { header: "Company", accessor: "company" },
    { header: "Location", accessor: "location" },
    { header: "Capacity", accessor: "capacity" },
    { header: "Submitted", accessor: "submitted" },
    {
      header: "Actions",
      accessor: "id",
      cell: () => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
            <CheckCircle className="w-4 h-4 mr-1" />
            Approve
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
            <XCircle className="w-4 h-4 mr-1" />
            Deny
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Manufacturer Verification</h1>
            <p className="text-muted-foreground">Review and approve manufacturer applications</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <DataTable columns={columns} data={pendingVerifications} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerificationPanel;
