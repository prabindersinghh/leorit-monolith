import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardCard from "@/components/DashboardCard";
import DataTable from "@/components/DataTable";
import { Package, Clock, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ManufacturerOnboardingModal from "@/components/ManufacturerOnboardingModal";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ManufacturerDashboard = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [notApproved, setNotApproved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkManufacturerProfileAndFetchOrders();
  }, []);

  // Setup realtime subscription when userId is available
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('manufacturer-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  /**
   * PROPER RELATIONAL LINKAGE:
   * 1. Get logged-in user from auth
   * 2. Find manufacturer profile by linked_user_id in approved_manufacturers
   * 3. AUTO-LINK: If not linked, try linking via email match
   * 4. Use manufacturer's PRIMARY KEY (id) for order queries
   * 5. Orders may have manufacturer_id as either:
   *    - auth.user.id (legacy)
   *    - approved_manufacturers.id 
   *    - manufacturer_verifications.id
   */
  const checkManufacturerProfileAndFetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        setLoading(false);
        return;
      }
      
      setUserId(user.id);

      // Step 1: Try to find manufacturer profile by linked_user_id first
      let { data: manufacturerProfile, error: profileError } = await supabase
        .from('approved_manufacturers')
        .select('id, email, company_name, verified, linked_user_id')
        .eq('linked_user_id', user.id)
        .maybeSingle();

      // Step 2: If not found by linked_user_id, try by email for auto-linking
      if (!manufacturerProfile) {
        const { data: emailMatch } = await supabase
          .from('approved_manufacturers')
          .select('id, email, company_name, verified, linked_user_id')
          .eq('email', user.email)
          .maybeSingle();
        
        if (emailMatch && emailMatch.verified && !emailMatch.linked_user_id) {
          // Auto-link this manufacturer account
          console.log('[ManufacturerDashboard] Auto-linking manufacturer via email:', user.email);
          
          const { error: linkError } = await supabase
            .from('approved_manufacturers')
            .update({ linked_user_id: user.id })
            .eq('id', emailMatch.id);
          
          if (!linkError) {
            console.log('[ManufacturerDashboard] Successfully linked manufacturer account');
            manufacturerProfile = { ...emailMatch, linked_user_id: user.id };
          } else {
            console.error('[ManufacturerDashboard] Failed to auto-link:', linkError);
          }
        }
      }

      // If still no profile, manufacturer is not approved
      if (!manufacturerProfile) {
        console.log('[ManufacturerDashboard] No approved manufacturer found for:', user.email);
        setNotApproved(true);
        setLoading(false);
        return;
      }

      // Verify the account is properly verified
      if (!manufacturerProfile.verified) {
        console.log('[ManufacturerDashboard] Manufacturer not verified:', user.email);
        setNotApproved(true);
        setLoading(false);
        return;
      }

      // Manufacturer profile verified - log for debugging
      console.log('[ManufacturerDashboard] Verified manufacturer:', manufacturerProfile.company_name);

      // Check if onboarding is completed
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_type')
        .eq('id', user.id)
        .maybeSingle();

      if (profile && !profile.onboarding_completed) {
        setShowOnboarding(true);
      }

      // Fetch orders where manufacturer_id = auth.user.id
      // This is the correct pattern since admin assigns linked_user_id to orders
      await fetchOrders(user.id);
    } catch (error) {
      console.error('Error checking manufacturer profile:', error);
      setLoading(false);
    }
  };

  /**
   * Fetch orders where manufacturer_id = auth.user.id
   * This is the correct pattern since admin assigns linked_user_id to orders
   */
  const fetchOrders = async (authUserId: string) => {
    try {
      console.log('[ManufacturerDashboard] Fetching orders for auth user:', authUserId);
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('manufacturer_id', authUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ManufacturerDashboard] Error fetching orders:', error);
        throw error;
      }
      
      console.log('[ManufacturerDashboard] Found orders:', data?.length || 0);
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'accepted',
          detailed_status: 'accepted_by_manufacturer',
          manufacturer_accept_time: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Order accepted successfully");
      fetchOrders(userId);
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error("Failed to accept order");
    }
  };

  const handleDeclineOrder = async (orderId: string) => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'rejected_by_manufacturer',
          detailed_status: 'rejected_by_manufacturer',
          manufacturer_id: null,
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Order declined");
      fetchOrders(userId);
    } catch (error) {
      console.error('Error declining order:', error);
      toast.error("Failed to decline order");
    }
  };

  // Show "not approved" message if manufacturer profile doesn't exist
  if (notApproved) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar userRole="manufacturer" />
        <main className="ml-64 flex-1 p-8">
          <div className="max-w-2xl mx-auto mt-20">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Account Not Approved</AlertTitle>
              <AlertDescription>
                Your manufacturer account is not yet approved by admin. 
                Please contact support if you believe this is an error.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => 
    o.order_state === 'MANUFACTURER_ASSIGNED' || o.status === 'pending'
  ).slice(0, 5);

  // Calculate real stats
  const activeOrders = orders.filter(o => 
    ['accepted', 'sample_in_production', 'bulk_in_production'].includes(o.status) ||
    ['SAMPLE_IN_PROGRESS', 'BULK_IN_PRODUCTION', 'BULK_QC_UPLOADED', 'PAYMENT_CONFIRMED'].includes(o.order_state)
  ).length;

  const pendingCount = orders.filter(o => 
    o.status === 'pending' || o.order_state === 'MANUFACTURER_ASSIGNED'
  ).length;

  // Calculate on-time rate from actual order data
  const completedOrders = orders.filter(o => 
    o.order_state === 'COMPLETED' || o.status === 'completed'
  );
  const onTimeOrders = completedOrders.filter(o => {
    if (!o.delivered_at || !o.estimated_delivery_date) return true;
    return new Date(o.delivered_at) <= new Date(o.estimated_delivery_date);
  });
  const onTimeRate = completedOrders.length > 0 
    ? Math.round((onTimeOrders.length / completedOrders.length) * 100)
    : 100;

  // Calculate escrow released (completed orders)
  const releasedAmount = orders
    .filter(o => o.order_state === 'COMPLETED' || o.escrow_status === 'fake_released')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const stats = [
    { title: "Active Orders", value: activeOrders.toString(), icon: Package, description: "In progress" },
    { title: "Pending Acceptance", value: pendingCount.toString(), icon: Clock, description: "New requests" },
    { title: "On-Time Rate", value: `${onTimeRate}%`, icon: TrendingUp, description: completedOrders.length > 0 ? `${onTimeOrders.length}/${completedOrders.length} orders` : "No completed orders" },
    { 
      title: "Escrow Released", 
      value: `₹${releasedAmount.toLocaleString()}`, 
      icon: DollarSign, 
      description: "Completed orders" 
    },
  ];

  const columns = [
    { header: "Order ID", accessor: "id", cell: (value: string) => value.slice(0, 8) },
    { header: "Product", accessor: "product_type" },
    { header: "Quantity", accessor: "quantity" },
    { header: "State", accessor: "order_state", cell: (value: string) => (
      <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
        {value || 'PENDING'}
      </span>
    )},
    { 
      header: "Created", 
      accessor: "created_at",
      cell: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      header: "Actions",
      accessor: "id",
      cell: (value: string, row: any) => (
        <div className="flex gap-2">
          {(row.order_state === 'MANUFACTURER_ASSIGNED' || row.status === 'pending') && (
            <>
              <button 
                className="px-4 py-1 bg-foreground text-background rounded-lg text-sm hover:bg-foreground/80"
                onClick={() => handleAcceptOrder(value)}
              >
                Accept
              </button>
              <button 
                className="px-4 py-1 border border-border rounded-lg text-sm hover:bg-muted"
                onClick={() => handleDeclineOrder(value)}
              >
                Decline
              </button>
            </>
          )}
          {row.order_state !== 'MANUFACTURER_ASSIGNED' && row.status !== 'pending' && (
            <button 
              className="px-4 py-1 bg-primary/10 text-primary rounded-lg text-sm hover:bg-primary/20"
              onClick={() => navigate(`/manufacturer/orders/${value}`)}
            >
              View
            </button>
          )}
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
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : pendingOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending orders. New orders will appear here when assigned.
              </div>
            ) : (
              <DataTable columns={columns} data={pendingOrders} />
            )}
          </div>
        </div>
      </main>

      {/* Manufacturer Onboarding Modal */}
      {userId && (
        <ManufacturerOnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          userId={userId}
        />
      )}
    </div>
  );
};

export default ManufacturerDashboard;
