import { Badge } from "@/components/ui/badge";
import { Package, Shirt, Scissors } from "lucide-react";
import type { BuyerPurpose } from "./BuyerPurposeSelector";

interface BuyerPurposeBadgeProps {
  purpose: BuyerPurpose | null | undefined;
  showIcon?: boolean;
  size?: "sm" | "default";
}

const purposeConfig = {
  merch_bulk: {
    label: "Merch Bulk",
    icon: Package,
    variant: "default" as const,
  },
  blank_apparel: {
    label: "Blank Apparel",
    icon: Shirt,
    variant: "secondary" as const,
  },
  fabric_only: {
    label: "Fabric Only",
    icon: Scissors,
    variant: "outline" as const,
  },
};

const BuyerPurposeBadge = ({ purpose, showIcon = true, size = "default" }: BuyerPurposeBadgeProps) => {
  if (!purpose || !purposeConfig[purpose]) {
    return null;
  }

  const config = purposeConfig[purpose];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={size === "sm" ? "text-xs" : ""}
    >
      {showIcon && <Icon className={`${size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} mr-1`} />}
      {config.label}
    </Badge>
  );
};

export default BuyerPurposeBadge;
