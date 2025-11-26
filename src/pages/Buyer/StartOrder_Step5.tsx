// This file contains step 5 (Shipping Address) for StartOrder
import ShippingAddressForm from "@/components/ShippingAddressForm";
import DeliveryCostCalculator from "@/components/DeliveryCostCalculator";
import SizeChartUpload from "@/components/SizeChartUpload";

interface Step5Props {
  productType: string;
  onShippingSubmit: (address: any) => void;
  onBack: () => void;
  orderId?: string;
}

const StartOrderStep5 = ({ productType, onShippingSubmit, onBack, orderId }: Step5Props) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Shipping & Additional Details</h2>
      
      <ShippingAddressForm onSubmit={onShippingSubmit} onBack={onBack} />
      
      {orderId && (
        <SizeChartUpload orderId={orderId} />
      )}
    </div>
  );
};

export default StartOrderStep5;
