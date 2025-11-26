// Delivery cost calculation based on weight slabs

interface DeliveryCostParams {
  productType: string;
  quantity: number;
  buyerPincode?: string;
  manufacturerPincode?: string;
}

interface DeliveryCostResult {
  weight: number;
  cost: number;
  slabs: number;
}

// Product weights in kg
const PRODUCT_WEIGHTS: Record<string, number> = {
  "t-shirts": 0.25,
  "t-shirt": 0.25,
  "hoodies": 0.60,
  "hoodie": 0.60,
  "caps": 0.15,
  "cap": 0.15,
  "bags": 0.30,
  "bag": 0.30,
  "jackets": 0.70,
  "jacket": 0.70,
  "custom": 0.25, // default
};

export const calculateDeliveryCost = ({
  productType,
  quantity,
  buyerPincode,
  manufacturerPincode,
}: DeliveryCostParams): DeliveryCostResult => {
  // Get product weight (default to 0.25kg if not found)
  const productWeight =
    PRODUCT_WEIGHTS[productType.toLowerCase()] ||
    PRODUCT_WEIGHTS["custom"];

  // Calculate total weight
  const totalWeight = productWeight * quantity;

  // Calculate cost using slab formula
  let cost: number;
  let slabs: number;

  if (totalWeight <= 0.5) {
    cost = 35;
    slabs = 1;
  } else {
    slabs = Math.ceil(totalWeight / 0.5);
    cost = 35 + (slabs - 1) * 20;
  }

  return {
    weight: totalWeight,
    cost,
    slabs,
  };
};

// Format weight for display
export const formatWeight = (weight: number): string => {
  return `${weight.toFixed(2)} kg`;
};

// Format cost for display
export const formatCost = (cost: number): string => {
  return `₹${cost}`;
};
