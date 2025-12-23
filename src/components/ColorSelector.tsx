import { Label } from "@/components/ui/label";

interface ColorSelectorProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  required?: boolean;
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

const ColorSelector = ({ selectedColor, onColorSelect, required = false }: ColorSelectorProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">
        Select Color {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {colors.map((color) => {
          const isSelected = selectedColor === color.id;
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onColorSelect(color.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? "border-foreground bg-muted/50"
                  : "border-border hover:border-foreground/50"
              }`}
              title={color.name}
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
        </p>
      )}
    </div>
  );
};

export default ColorSelector;
