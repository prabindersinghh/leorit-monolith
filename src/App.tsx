import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";

// Buyer
import DashboardHome from "./pages/Buyer/DashboardHome";
import StartOrder from "./pages/Buyer/StartOrder";
import OrderTracking from "./pages/Buyer/OrderTracking";
import BuyerProfile from "./pages/Buyer/BuyerProfile";

// Manufacturer
import ManufacturerDashboard from "./pages/Manufacturer/ManufacturerDashboard";
import ManufacturerOrders from "./pages/Manufacturer/ManufacturerOrders";
import UploadQCProof from "./pages/Manufacturer/UploadQCProof";

// Admin
import AdminDashboard from "./pages/Admin/AdminDashboard";
import VerificationPanel from "./pages/Admin/VerificationPanel";
import DisputeCenter from "./pages/Admin/DisputeCenter";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Buyer Routes */}
          <Route path="/buyer/dashboard" element={<DashboardHome />} />
          <Route path="/buyer/start-order" element={<StartOrder />} />
          <Route path="/buyer/orders" element={<OrderTracking />} />
          <Route path="/buyer/profile" element={<BuyerProfile />} />

          {/* Manufacturer Routes */}
          <Route path="/manufacturer/dashboard" element={<ManufacturerDashboard />} />
          <Route path="/manufacturer/orders" element={<ManufacturerOrders />} />
          <Route path="/manufacturer/qc" element={<UploadQCProof />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/verification" element={<VerificationPanel />} />
          <Route path="/admin/disputes" element={<DisputeCenter />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
