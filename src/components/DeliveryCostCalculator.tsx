import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calculateDeliveryCost, formatWeight, formatCost } from "@/lib/deliveryCostCalculator";

interface DeliveryCostCalculatorProps {
  productType: string;
  quantity: number;
  pincode?: string;
}

const DeliveryCostCalculator = ({ productType, quantity, pincode }: DeliveryCostCalculatorProps) => {
  const { weight, cost, slabs } = calculateDeliveryCost({
    productType,
    quantity,
    buyerPincode: pincode,
  });

  const isBulkOrder = quantity > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Estimate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Product Weight:</span>
          <Badge variant="secondary">{formatWeight(weight)}</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Quantity:</span>
          <span className="font-medium">{quantity} pcs</span>
        </div>
        {!isBulkOrder && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Weight Slabs:</span>
            <span className="font-medium">{slabs} slab{slabs > 1 ? 's' : ''}</span>
          </div>
        )}
        {pincode && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery Pincode:</span>
            <span className="font-medium">{pincode}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-semibold pt-2 border-t">
          <span>Delivery Cost:</span>
          <span className="text-primary">{formatCost(cost)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {isBulkOrder 
            ? "* Fixed bulk delivery charge" 
            : "* Slab-based pricing: ₹35 for first 0.5kg, ₹20 per additional 0.5kg slab"
          }
        </p>
      </CardContent>
    </Card>
  );
};

export default DeliveryCostCalculator;
