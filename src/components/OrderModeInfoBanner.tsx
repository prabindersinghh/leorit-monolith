// OrderModeInfoBanner - Displays informational text about order mode
// ADD-ONLY: This is a new component, no existing logic modified

import { Info } from "lucide-react";
import { getOrderMode, getOrderModeMessage, OrderMode } from "@/lib/orderModeUtils";

interface OrderModeInfoBannerProps {
  order: {
    order_mode?: OrderMode | null;
    order_intent?: string | null;
    quantity?: number;
  };
}

const OrderModeInfoBanner = ({ order }: OrderModeInfoBannerProps) => {
  const mode = getOrderMode(order);
  const message = getOrderModeMessage(mode);
  
  if (!message) return null;
  
  // Different styling based on mode
  const getBannerStyle = () => {
    switch (mode) {
      case 'sample_only':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'direct_bulk':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'sample_then_bulk':
      default:
        return 'bg-muted/50 border-border text-muted-foreground';
    }
  };
  
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg border ${getBannerStyle()}`}>
      <Info className="w-4 h-4 flex-shrink-0" />
      <p className="text-sm">{message}</p>
    </div>
  );
};

export default OrderModeInfoBanner;
