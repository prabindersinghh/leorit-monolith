import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

interface ColorSelectorProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  required?: boolean;
  locked?: boolean;
  lockReason?: string;
}

const colors = [
  { id: "white", name: "White", hex: "#FFFFFF" },
  { id: "black", name: "Black", hex: "#1a1a1a" },
  { id: "navy", name: "Navy Blue", hex: "#1e3a5f" },
  { id: "grey", name: "Grey", hex: "#6b7280" },
  { id: "maroon", name: "Maroon", hex: "#800000" },
  { id: "red", name: "Red", hex: "#dc2626" },
  { id: "royal_blue", name: "Royal Blue", hex: "#2563eb" },
  { id: "green", name: "Green", hex: "#16a34a" },
  { id: "yellow", name: "Yellow", hex: "#facc15" },
  { id: "orange", name: "Orange", hex: "#f97316" },
  { id: "pink", name: "Pink", hex: "#ec4899" },
  { id: "purple", name: "Purple", hex: "#9333ea" },
];

const ColorSelector = ({ 
  selectedColor, 
  onColorSelect, 
  required = false,
  locked = false,
  lockReason = "Color cannot be changed after sample approval."
}: ColorSelectorProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">
          Select Color {required && <span className="text-destructive">*</span>}
        </Label>
        {locked && (
          <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            <Lock className="w-3 h-3" />
            <span>Locked</span>
          </div>
        )}
      </div>
      
      {locked && lockReason && (
        <p className="text-xs text-amber-600">
          <Lock className="w-3 h-3 inline mr-1" />
          {lockReason}
        </p>
      )}
      
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {colors.map((color) => {
          const isSelected = selectedColor === color.id;
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => !locked && onColorSelect(color.id)}
              disabled={locked}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                locked 
                  ? "opacity-60 cursor-not-allowed border-border bg-muted/30"
                  : isSelected
                    ? "border-foreground bg-muted/50"
                    : "border-border hover:border-foreground/50"
              }`}
              title={locked ? "Color is locked" : color.name}
            >
              <div 
                className="w-8 h-8 rounded-full border border-border shadow-sm"
                style={{ backgroundColor: color.hex }}
              />
              <span className="text-xs font-medium text-foreground truncate w-full text-center">
                {color.name}
              </span>
            </button>
          );
        })}
      </div>
      {selectedColor && (
        <p className="text-sm text-muted-foreground">
          Selected: {colors.find(c => c.id === selectedColor)?.name}
          {locked && " (locked)"}
        </p>
      )}
    </div>
  );
};

export default ColorSelector;
