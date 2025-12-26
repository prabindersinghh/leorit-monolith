import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Lock } from "lucide-react";

interface BuyerNotesInputProps {
  notes: string;
  onChange: (notes: string) => void;
  disabled?: boolean;
  locked?: boolean;
  lockReason?: string;
}

const BuyerNotesInput = ({ 
  notes, 
  onChange, 
  disabled = false,
  locked = false,
  lockReason = "Notes cannot be changed after order submission."
}: BuyerNotesInputProps) => {
  const isReadOnly = disabled || locked;
  
  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">
            Additional instructions for manufacturing (optional)
          </Label>
        </div>
        {locked && (
          <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            <Lock className="w-3 h-3" />
            <span>Locked</span>
          </div>
        )}
      </div>
      <Textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isReadOnly ? "No additional notes provided" : "E.g., specific stitching requirements, packaging preferences, quality notes..."}
        className={`min-h-[100px] resize-none ${locked ? "bg-muted cursor-not-allowed" : ""}`}
        maxLength={1000}
        disabled={isReadOnly}
        readOnly={locked}
      />
      {locked ? (
        <p className="text-xs text-amber-600">
          <Lock className="w-3 h-3 inline mr-1" />
          {lockReason}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {notes.length}/1000 characters • These notes will be visible to the manufacturer
        </p>
      )}
    </div>
  );
};

export default BuyerNotesInput;
