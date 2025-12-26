import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Auth
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";

// Buyer
import DashboardHome from "./pages/Buyer/DashboardHome";
import StartOrder from "./pages/Buyer/StartOrder";
import OrderTracking from "./pages/Buyer/OrderTracking";
import BuyerProfile from "./pages/Buyer/BuyerProfile";
import OrderDetails from "./pages/Buyer/OrderDetails";

// Manufacturer
import ManufacturerDashboard from "./pages/Manufacturer/ManufacturerDashboard";
import ManufacturerOrders from "./pages/Manufacturer/ManufacturerOrders";
import UploadQCProof from "./pages/Manufacturer/UploadQCProof";
import ManufacturerProfile from "./pages/Manufacturer/ManufacturerProfile";
import ManufacturerOrderDetails from "./pages/Manufacturer/OrderDetails";

// Admin
import AdminDashboard from "./pages/Admin/AdminDashboard";
import VerificationPanel from "./pages/Admin/VerificationPanel";
import DisputeCenter from "./pages/Admin/DisputeCenter";
import Analytics from "./pages/Admin/Analytics";
import AdminOrderDetails from "./pages/Admin/OrderDetails";
import Manufacturers from "./pages/Admin/Manufacturers";
import CommandCenter from "./pages/Admin/CommandCenter";

import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";

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
          <Route path="/buyer/dashboard" element={
            <ProtectedRoute allowedRoles={['buyer']}>
              <DashboardHome />
            </ProtectedRoute>
          } />
          <Route path="/buyer/start-order" element={
            <ProtectedRoute allowedRoles={['buyer']}>
              <StartOrder />
            </ProtectedRoute>
          } />
          <Route path="/buyer/orders" element={
            <ProtectedRoute allowedRoles={['buyer']}>
              <OrderTracking />
            </ProtectedRoute>
          } />
          <Route path="/buyer/order-tracking" element={
            <ProtectedRoute allowedRoles={['buyer']}>
              <OrderTracking />
            </ProtectedRoute>
          } />
          <Route path="/buyer/profile" element={
            <ProtectedRoute allowedRoles={['buyer']}>
              <BuyerProfile />
            </ProtectedRoute>
          } />
          <Route path="/buyer/order/:id" element={
            <ProtectedRoute allowedRoles={['buyer']}>
              <OrderDetails />
            </ProtectedRoute>
          } />

          {/* Manufacturer Routes */}
          <Route path="/manufacturer/dashboard" element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <ManufacturerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/manufacturer/orders" element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <ManufacturerOrders />
            </ProtectedRoute>
          } />
          <Route path="/manufacturer/qc" element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <UploadQCProof />
            </ProtectedRoute>
          } />
          <Route path="/manufacturer/profile" element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <ManufacturerProfile />
            </ProtectedRoute>
          } />
          <Route path="/manufacturer/order/:id" element={
            <ProtectedRoute allowedRoles={['manufacturer']}>
              <ManufacturerOrderDetails />
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/verification" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <VerificationPanel />
            </ProtectedRoute>
          } />
          <Route path="/admin/disputes" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DisputeCenter />
            </ProtectedRoute>
          } />
          <Route path="/admin/analytics" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Analytics />
            </ProtectedRoute>
          } />
          <Route path="/admin/order/:id" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminOrderDetails />
            </ProtectedRoute>
          } />
          <Route path="/admin/manufacturers" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Manufacturers />
            </ProtectedRoute>
          } />
          <Route path="/admin/command-center" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CommandCenter />
            </ProtectedRoute>
          } />

          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
