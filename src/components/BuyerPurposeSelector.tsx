import { Package, Shirt, Scissors } from "lucide-react";

export type BuyerPurpose = "merch_bulk" | "blank_apparel" | "fabric_only";

interface BuyerPurposeSelectorProps {
  selectedPurpose: BuyerPurpose | null;
  onSelect: (purpose: BuyerPurpose) => void;
}

const purposes = [
  {
    id: "merch_bulk" as BuyerPurpose,
    icon: Package,
    title: "Merch / Bulk Apparel",
    description: "Campus merch, events, clubs, teams",
    color: "border-primary",
  },
  {
    id: "blank_apparel" as BuyerPurpose,
    icon: Shirt,
    title: "Blank Apparel (No Printing)",
    description: "Plain T-shirts / hoodies for brands",
    color: "border-blue-500",
  },
  {
    id: "fabric_only" as BuyerPurpose,
    icon: Scissors,
    title: "Fabric / Cloth Only",
    description: "Raw fabric sourcing (GSM-based)",
    color: "border-amber-500",
  },
];

const BuyerPurposeSelector = ({ selectedPurpose, onSelect }: BuyerPurposeSelectorProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">What are you buying for?</h2>
        <p className="text-muted-foreground">Select your order type to help us route your request correctly</p>
      </div>

      <div className="grid gap-4">
        {purposes.map((purpose) => {
          const Icon = purpose.icon;
          const isSelected = selectedPurpose === purpose.id;
          
          return (
            <button
              key={purpose.id}
              onClick={() => onSelect(purpose.id)}
              className={`w-full p-6 border-2 rounded-xl transition-all text-left flex items-start gap-4 ${
                isSelected
                  ? `${purpose.color} bg-muted/50`
                  : "border-border hover:border-foreground/50 hover:bg-muted/30"
              }`}
            >
              <div className={`p-3 rounded-lg ${isSelected ? "bg-foreground text-background" : "bg-muted text-foreground"}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg mb-1">{purpose.title}</h3>
                <p className="text-sm text-muted-foreground">{purpose.description}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                isSelected ? "border-foreground bg-foreground" : "border-muted-foreground/50"
              }`}>
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-background" />}
              </div>
            </button>
          );
        })}
      </div>

      {selectedPurpose && (
        <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          {selectedPurpose === "merch_bulk" && (
            <p>You'll upload designs, CSVs, and choose fabrics for custom printed apparel.</p>
          )}
          {selectedPurpose === "blank_apparel" && (
            <p>Design upload and mockups will be skipped. You'll select colors, sizes, and fabric specifications.</p>
          )}
          {selectedPurpose === "fabric_only" && (
            <p>You'll proceed directly to fabric/GSM selection, color, quantity, and shipping.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BuyerPurposeSelector;
