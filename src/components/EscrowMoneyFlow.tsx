import { ArrowRight, Shield, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface EscrowMoneyFlowProps {
  stage: "payment" | "locked" | "released";
  amount: number;
  animated?: boolean;
}

const EscrowMoneyFlow = ({
  stage,
  amount,
  animated = false,
}: EscrowMoneyFlowProps) => {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (animated) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [animated, stage]);

  const getContent = () => {
    switch (stage) {
      case "payment":
        return {
          title: "Payment to Escrow",
          description: `₹${amount} deducted from Buyer Wallet → Transferred to Escrow`,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          icon: Shield,
        };
      case "locked":
        return {
          title: "Escrow Locked",
          description: "Awaiting QC Upload & Buyer Approval",
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          icon: Shield,
        };
      case "released":
        return {
          title: "Payment Released",
          description: `₹${amount} Released from Escrow → Manufacturer Wallet`,
          color: "text-green-600",
          bgColor: "bg-green-50",
          icon: Wallet,
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  return (
    <Card className={`${content.bgColor} border-2 ${showAnimation ? "animate-pulse" : ""}`}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full bg-white flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${content.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className={`font-bold text-lg ${content.color}`}>
                {content.title}
              </h3>
              {showAnimation && (
                <ArrowRight className={`w-5 h-5 ${content.color} animate-bounce`} />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {content.description}
            </p>
          </div>
          <div className={`text-2xl font-bold ${content.color}`}>
            ₹{amount}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EscrowMoneyFlow;
