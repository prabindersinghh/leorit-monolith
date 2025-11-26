import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DeliveryCostCalculatorProps {
  productType: string;
  pincode: string;
}

const DeliveryCostCalculator = ({ productType, pincode }: DeliveryCostCalculatorProps) => {
  // Dummy calculation
  const getWeight = (type: string) => {
    if (type.toLowerCase().includes("hoodie")) return 0.6;
    return 0.25; // T-shirt default
  };

  const calculateCost = (weight: number, pincode: string) => {
    const distance = parseInt(pincode) % 1000; // Dummy distance calculation
    const baseCost = weight * 100;
    const distanceCost = (distance / 10) * 2;
    return Math.min(Math.max(baseCost + distanceCost, 60), 120);
  };

  const weight = getWeight(productType);
  const cost = calculateCost(weight, pincode);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Estimate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Product Weight:</span>
          <Badge variant="secondary">{weight} kg</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Delivery Pincode:</span>
          <span className="font-medium">{pincode}</span>
        </div>
        <div className="flex justify-between text-lg font-semibold pt-2 border-t">
          <span>Delivery Cost:</span>
          <span className="text-primary">₹{cost.toFixed(0)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          * Cost calculated based on weight and distance. Final charges may vary.
        </p>
      </CardContent>
    </Card>
  );
};

export default DeliveryCostCalculator;
