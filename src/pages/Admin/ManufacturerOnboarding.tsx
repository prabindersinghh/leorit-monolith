import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface OnboardingRequest {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  location: string;
  categories: string[];
  capacity: string;
  years_active: string | null;
  notes: string | null;
  submitted_at: string;
  status: string;
}

const ManufacturerOnboarding = () => {
  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("manufacturer_onboarding_requests")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching onboarding requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Manufacturer Onboarding Requests</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Manufacturer Onboarding Requests</h1>
        <p className="text-muted-foreground mt-1">
          Review incoming manufacturer applications
        </p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No onboarding requests yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{request.company_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {request.contact_name} • {request.location}
                    </p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(request.status)}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{request.phone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{request.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Capacity:</span>
                    <p className="font-medium">{request.capacity}</p>
                  </div>
                  {request.years_active && (
                    <div>
                      <span className="text-muted-foreground">Years Active:</span>
                      <p className="font-medium">{request.years_active}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Submitted:</span>
                    <p className="font-medium">
                      {format(new Date(request.submitted_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">Categories:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {request.categories.map((category, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                {request.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Notes:</span>
                    <p className="text-sm mt-1 bg-muted/50 p-3 rounded-md">
                      {request.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManufacturerOnboarding;
