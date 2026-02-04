import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/DataTable";
import ManufacturerPerformanceMetrics from "@/components/ManufacturerPerformanceMetrics";
import ManufacturerPauseControl from "@/components/ManufacturerPauseControl";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, BarChart3, PauseCircle, Settings } from "lucide-react";

const ManufacturerList = () => {
  const { toast } = useToast();
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedManufacturer, setExpandedManufacturer] = useState<string | null>(null);
  const [showPauseControl, setShowPauseControl] = useState<string | null>(null);

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
      cell: (value: string, row: any) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{value}</span>
          {row.paused && (
            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
              <PauseCircle className="w-3 h-3 mr-1" />
              Paused
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: "Email",
      accessor: "email",
      cell: (value: string) => value || <span className="text-muted-foreground italic">Not set</span>,
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
      header: "Status",
      accessor: "verified",
      cell: (value: boolean, row: any) => (
        <div className="flex flex-col gap-1">
          <Badge variant={value ? "default" : "secondary"}>
            {value ? "Verified" : "Soft Onboarded"}
          </Badge>
          {row.paused && (
            <span className="text-xs text-amber-600">Cannot receive orders</span>
          )}
        </div>
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
    {
      header: "Actions",
      accessor: "user_id",
      cell: (value: string) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowPauseControl(prev => prev === value ? null : value);
          }}
          className="flex items-center gap-1"
        >
          <Settings className="h-4 w-4" />
          Manage
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

      {/* Pause Control Panel */}
      {showPauseControl && (() => {
        const mfr = manufacturers.find(m => m.user_id === showPauseControl);
        if (!mfr) return null;
        return (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <ManufacturerPauseControl 
              manufacturer={mfr} 
              onUpdate={() => {
                fetchManufacturers();
                setShowPauseControl(null);
              }} 
            />
          </div>
        );
      })()}

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
