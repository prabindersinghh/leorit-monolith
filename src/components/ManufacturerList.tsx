import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/DataTable";
import ManufacturerPerformanceMetrics from "@/components/ManufacturerPerformanceMetrics";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react";

const ManufacturerList = () => {
  const { toast } = useToast();
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedManufacturer, setExpandedManufacturer] = useState<string | null>(null);

  const fetchManufacturers = async () => {
    try {
      const { data, error } = await supabase
        .from("manufacturer_verifications")
        .select("*")
        .eq("soft_onboarded", true)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setManufacturers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load manufacturers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManufacturers();
  }, []);

  const toggleExpand = (userId: string) => {
    setExpandedManufacturer(prev => prev === userId ? null : userId);
  };

  const columns = [
    {
      header: "Company Name",
      accessor: "company_name",
    },
    {
      header: "City",
      accessor: "city",
    },
    {
      header: "State",
      accessor: "state",
    },
    {
      header: "Capacity",
      accessor: "capacity",
    },
    {
      header: "Verified",
      accessor: "verified",
      cell: (value: boolean) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      header: "Soft Onboarded",
      accessor: "soft_onboarded",
      cell: (value: boolean) => (
        <Badge variant="outline">{value ? "Yes" : "No"}</Badge>
      ),
    },
    {
      header: "Created",
      accessor: "submitted_at",
      cell: (value: string) => format(new Date(value), "dd MMM yyyy"),
    },
    {
      header: "Performance",
      accessor: "user_id",
      cell: (value: string) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(value);
          }}
          className="flex items-center gap-1"
        >
          <BarChart3 className="h-4 w-4" />
          {expandedManufacturer === value ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">Loading manufacturers...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>All Manufacturers</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={manufacturers} />
        </CardContent>
      </Card>

      {/* Expanded Performance Metrics */}
      {expandedManufacturer && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <ManufacturerPerformanceMetrics manufacturerId={expandedManufacturer} />
        </div>
      )}

      {/* Performance Summary for All Manufacturers */}
      <ManufacturerPerformanceMetrics showSummary />
    </div>
  );
};

export default ManufacturerList;
