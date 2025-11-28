export interface FabricOption {
  id: string;
  label: string;
  unit_price_bulk: number;
  weight: number; // in kg
  category: 'hoodie' | 't-shirt' | 'default';
}

export const FABRIC_OPTIONS: FabricOption[] = [
  // HOODIE options
  {
    id: 'hoodie-400gsm',
    label: '400 GSM Fleece',
    unit_price_bulk: 380,
    weight: 0.60,
    category: 'hoodie'
  },
  {
    id: 'hoodie-350gsm',
    label: '350 GSM Fleece',
    unit_price_bulk: 320,
    weight: 0.60,
    category: 'hoodie'
  },
  {
    id: 'hoodie-300gsm',
    label: '300 GSM Fleece',
    unit_price_bulk: 280,
    weight: 0.60,
    category: 'hoodie'
  },
  // T-SHIRT options
  {
    id: 'tshirt-240gsm',
    label: '240 GSM Combed Cotton',
    unit_price_bulk: 260,
    weight: 0.25,
    category: 't-shirt'
  },
  {
    id: 'tshirt-220gsm',
    label: '220 GSM Cotton',
    unit_price_bulk: 235,
    weight: 0.25,
    category: 't-shirt'
  },
  {
    id: 'tshirt-180gsm',
    label: '180 GSM Cotton',
    unit_price_bulk: 210,
    weight: 0.25,
    category: 't-shirt'
  },
  // DEFAULT option
  {
    id: 'custom-default',
    label: 'Custom (default pricing)',
    unit_price_bulk: 380,
    weight: 0.25,
    category: 'default'
  }
];

export const getFabricsForProduct = (productType: string): FabricOption[] => {
  const lowerProduct = productType.toLowerCase();
  
  if (lowerProduct.includes('hoodie')) {
    return FABRIC_OPTIONS.filter(f => f.category === 'hoodie' || f.category === 'default');
  } else if (lowerProduct.includes('t-shirt') || lowerProduct.includes('tshirt')) {
    return FABRIC_OPTIONS.filter(f => f.category === 't-shirt' || f.category === 'default');
  }
  
  // For other products, return only default
  return FABRIC_OPTIONS.filter(f => f.category === 'default');
};

export const getDefaultFabric = (productType: string): FabricOption => {
  const lowerProduct = productType.toLowerCase();
  
  if (lowerProduct.includes('hoodie')) {
    return FABRIC_OPTIONS.find(f => f.id === 'hoodie-400gsm') || FABRIC_OPTIONS.find(f => f.category === 'default')!;
  } else if (lowerProduct.includes('t-shirt') || lowerProduct.includes('tshirt')) {
    return FABRIC_OPTIONS.find(f => f.id === 'tshirt-240gsm') || FABRIC_OPTIONS.find(f => f.category === 'default')!;
  }
  
  return FABRIC_OPTIONS.find(f => f.category === 'default')!;
};

export const getFabricById = (fabricId: string): FabricOption | undefined => {
  return FABRIC_OPTIONS.find(f => f.id === fabricId);
};
