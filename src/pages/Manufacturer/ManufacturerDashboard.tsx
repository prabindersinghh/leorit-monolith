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
  const [manufacturerId, setManufacturerId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [notApproved, setNotApproved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkManufacturerProfileAndFetchOrders();

    // Setup realtime subscription only if we have a manufacturer ID
    let channel: any = null;
    
    if (manufacturerId) {
      channel = supabase
        .channel('manufacturer-dashboard')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
          },
          () => {
            fetchOrders(manufacturerId);
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [manufacturerId]);

  /**
   * NON-DESTRUCTIVE LINKAGE FIX:
   * 1. Get logged-in user's email from auth
   * 2. Find manufacturer profile by email in manufacturer_verifications
   * 3. AUTO-LINK: If email matches and user_id is not linked, set user_id = auth.user.id
   * 4. Use manufacturer's PRIMARY KEY (id) to fetch orders - NOT user_id
   */
  const checkManufacturerProfileAndFetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        setLoading(false);
        return;
      }
      
      setUserId(user.id);

      // Step 1: Find manufacturer profile by EMAIL
      const { data: manufacturerProfile, error: profileError } = await supabase
        .from('manufacturer_verifications')
        .select('id, user_id, company_name, verified, soft_onboarded, paused, email')
        .eq('email', user.email)
        .maybeSingle();

      // If no profile found by email, manufacturer is not in the system
      if (!manufacturerProfile) {
        console.log('[ManufacturerDashboard] No manufacturer profile found for email:', user.email);
        setNotApproved(true);
        setLoading(false);
        return;
      }

      // Step 2: AUTO-LINK - If user_id is not set to this auth user, link them now
      // This is a one-time automatic linking step when manufacturer first logs in
      if (manufacturerProfile.user_id !== user.id) {
        console.log('[ManufacturerDashboard] Auto-linking manufacturer account:', {
          email: user.email,
          oldUserId: manufacturerProfile.user_id,
          newUserId: user.id
        });
        
        const { error: linkError } = await supabase
          .from('manufacturer_verifications')
          .update({ user_id: user.id })
          .eq('id', manufacturerProfile.id);
        
        if (linkError) {
          console.error('[ManufacturerDashboard] Failed to auto-link account:', linkError);
          // Continue anyway - we can still show the dashboard using the profile's id
        } else {
          console.log('[ManufacturerDashboard] Successfully linked manufacturer account');
        }
      }

      // Check if paused
      if (manufacturerProfile.paused) {
        toast.error("Your manufacturer account is currently paused");
        setLoading(false);
        return;
      }

      // Step 3: Use manufacturer's PRIMARY KEY (id) for order queries
      // Orders are assigned using manufacturer_verifications.id, NOT user_id
      const mfgId = manufacturerProfile.id;
      setManufacturerId(mfgId);
      console.log('[ManufacturerDashboard] Found manufacturer profile, using id:', mfgId);

      // Check if onboarding is completed
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_type')
        .eq('id', user.id)
        .maybeSingle();

      if (profile && !profile.onboarding_completed) {
        setShowOnboarding(true);
      }

      await fetchOrders(mfgId);
    } catch (error) {
      console.error('Error checking manufacturer profile:', error);
      setLoading(false);
    }
  };

  /**
   * Fetch orders using the manufacturer's user_id from manufacturer_verifications
   * NOT auth.user.id
   */
  const fetchOrders = async (mfgId: string) => {
    try {
      console.log('[ManufacturerDashboard] Fetching orders for manufacturer_id:', mfgId);
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('manufacturer_id', mfgId)
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
      if (manufacturerId) fetchOrders(manufacturerId);
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error("Failed to accept order");
    }
  };

  const handleDeclineOrder = async (orderId: string) => {
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
      if (manufacturerId) fetchOrders(manufacturerId);
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
