import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt } from "lucide-react";

interface OrderCostBreakdownProps {
  orderValue: number;
  deliveryCost?: number;
  totalAmount: number;
  title?: string;
}

const OrderCostBreakdown = ({
  orderValue,
  deliveryCost,
  totalAmount,
  title = "Cost Breakdown",
}: OrderCostBreakdownProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Order Value:</span>
          <span className="font-semibold">₹{orderValue.toLocaleString()}</span>
        </div>
        {deliveryCost && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery Cost:</span>
            <span className="font-semibold">₹{deliveryCost}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold pt-2 border-t">
          <span>Total Amount:</span>
          <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCostBreakdown;
