import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const ManufacturerList = () => {
  const { toast } = useToast();
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    <Card>
      <CardHeader>
        <CardTitle>All Manufacturers</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={manufacturers} />
      </CardContent>
    </Card>
  );
};

export default ManufacturerList;
