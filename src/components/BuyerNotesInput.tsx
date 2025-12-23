import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare } from "lucide-react";

interface BuyerNotesInputProps {
  notes: string;
  onChange: (notes: string) => void;
  disabled?: boolean;
}

const BuyerNotesInput = ({ notes, onChange, disabled = false }: BuyerNotesInputProps) => {
  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-semibold">
          Additional instructions for manufacturing (optional)
        </Label>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="E.g., specific stitching requirements, packaging preferences, quality notes..."
        className="min-h-[100px] resize-none"
        maxLength={1000}
        disabled={disabled}
      />
      <p className="text-xs text-muted-foreground">
        {notes.length}/1000 characters • These notes will be visible to the manufacturer
      </p>
    </div>
  );
};

export default BuyerNotesInput;
