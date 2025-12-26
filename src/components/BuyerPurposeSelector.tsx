import { Package, Shirt, Scissors, Sparkles, Mail, Phone, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

const CONTACT_EMAIL = "leoritaiofficial@gmail.com";
const CONTACT_EMAIL_ALT = "prabindersinghh@gmail.com";
const CONTACT_PHONE = "+91 6239712653";

const BuyerPurposeSelector = ({ selectedPurpose, onSelect }: BuyerPurposeSelectorProps) => {
  const [showComplexPanel, setShowComplexPanel] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyContacts = () => {
    const contactText = `Leorit Contact Details:
Email: ${CONTACT_EMAIL}
Alternate Email: ${CONTACT_EMAIL_ALT}
Phone / WhatsApp: ${CONTACT_PHONE}`;
    navigator.clipboard.writeText(contactText);
    setCopied(true);
    toast.success("Contact details copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

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
              onClick={() => {
                setShowComplexPanel(false);
                onSelect(purpose.id);
              }}
              className={`w-full p-6 border-2 rounded-xl transition-all text-left flex items-start gap-4 ${
                isSelected && !showComplexPanel
                  ? `${purpose.color} bg-muted/50`
                  : "border-border hover:border-foreground/50 hover:bg-muted/30"
              }`}
            >
              <div className={`p-3 rounded-lg ${isSelected && !showComplexPanel ? "bg-foreground text-background" : "bg-muted text-foreground"}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg mb-1">{purpose.title}</h3>
                <p className="text-sm text-muted-foreground">{purpose.description}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                isSelected && !showComplexPanel ? "border-foreground bg-foreground" : "border-muted-foreground/50"
              }`}>
                {isSelected && !showComplexPanel && <div className="w-2.5 h-2.5 rounded-full bg-background" />}
              </div>
            </button>
          );
        })}

        {/* Custom / Complex Requirement Option */}
        <button
          onClick={() => setShowComplexPanel(true)}
          className={`w-full p-6 border-2 rounded-xl transition-all text-left flex items-start gap-4 ${
            showComplexPanel
              ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20"
              : "border-border hover:border-purple-400 hover:bg-muted/30"
          }`}
        >
          <div className={`p-3 rounded-lg ${showComplexPanel ? "bg-purple-600 text-white" : "bg-muted text-foreground"}`}>
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-lg mb-1">Custom / Complex Requirement</h3>
            <p className="text-sm text-muted-foreground">Non-standard designs, special sizing, unique production needs</p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
            showComplexPanel ? "border-purple-600 bg-purple-600" : "border-muted-foreground/50"
          }`}>
            {showComplexPanel && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
          </div>
        </button>
      </div>

      {/* Complex Requirement Contact Panel */}
      {showComplexPanel && (
        <div className="mt-6 p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">We'll Handle This Personally</h4>
              <p className="text-sm text-muted-foreground">
                For complex or non-standard requirements, our team will assist you directly and process the order through Leorit with full QC and delivery control.
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-background rounded-lg border border-border">
              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground truncate">{CONTACT_EMAIL}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-background rounded-lg border border-border">
              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Alternate Email</p>
                <p className="text-sm font-medium text-foreground truncate">{CONTACT_EMAIL_ALT}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-background rounded-lg border border-border">
              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Phone / WhatsApp</p>
                <p className="text-sm font-medium text-foreground">{CONTACT_PHONE}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              asChild
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <a href={`mailto:${CONTACT_EMAIL}?subject=Custom Order Inquiry`}>
                <Mail className="w-4 h-4 mr-2" />
                Contact Leorit
              </a>
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCopyContacts}
              className="flex-1"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied!" : "Copy Contact Details"}
            </Button>
          </div>
        </div>
      )}

      {selectedPurpose && !showComplexPanel && (
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
