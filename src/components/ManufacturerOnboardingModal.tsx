import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Factory, Package, Video, Truck, FileCheck, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logSystemEvent } from "@/lib/systemLogger";
import { useNavigate } from "react-router-dom";

interface ManufacturerOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const STEPS = [
  {
    title: "Welcome to Leorit.ai",
    description: "Your gateway to consistent orders",
    icon: Sparkles,
    content: (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">
          You've been selected to join our network of trusted manufacturers.
          Let's walk through how the platform works.
        </p>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">100+</div>
            <div className="text-xs text-muted-foreground">Active Buyers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">₹50L+</div>
            <div className="text-xs text-muted-foreground">Orders Monthly</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">24h</div>
            <div className="text-xs text-muted-foreground">Avg. Payment</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Your Factory Profile",
    description: "What we need from you",
    icon: Factory,
    content: (
      <div className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Factory Information</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Company name and location</li>
            <li>• Production capacity (units/month)</li>
            <li>• Specializations (T-shirts, hoodies, etc.)</li>
          </ul>
        </div>
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Quality Standards</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Consistent stitch quality</li>
            <li>• Accurate color matching</li>
            <li>• Clean finishing</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    title: "Order Workflow",
    description: "How orders come to you",
    icon: Package,
    content: (
      <div className="space-y-3">
        {[
          { step: 1, title: "Order Assigned", desc: "Admin assigns order based on your capacity" },
          { step: 2, title: "Accept Order", desc: "Review specs and accept within 24 hours" },
          { step: 3, title: "Sample Production", desc: "Create sample for buyer approval" },
          { step: 4, title: "Bulk Production", desc: "After sample approval, produce full order" },
        ].map((item) => (
          <Card key={item.step} className="border border-border">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {item.step}
              </div>
              <div>
                <div className="font-medium text-sm">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    ),
  },
  {
    title: "QC Requirements",
    description: "Quality control is mandatory",
    icon: Video,
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Video className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <div className="font-medium text-sm">QC Video Required</div>
            <div className="text-xs text-muted-foreground">
              Upload a video showing finished products before dispatch
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <FileCheck className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <div className="font-medium text-sm">Buyer Approval</div>
            <div className="text-xs text-muted-foreground">
              Wait for buyer to approve QC before shipping
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Package className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <div className="font-medium text-sm">Packaging Proof</div>
            <div className="text-xs text-muted-foreground">
              Video proof of packing before dispatch
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            ⚠️ Skipping QC or shipping without approval will result in payment delays
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Payment & Delivery",
    description: "How you get paid",
    icon: Truck,
    content: (
      <div className="space-y-4">
        <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">Payment Terms</h4>
          <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
            <li>• 55% upfront (held in escrow)</li>
            <li>• 45% after delivery confirmation</li>
            <li>• Payment released within 24 hours of confirmation</li>
          </ul>
        </div>
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Delivery Coordination</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Admin schedules pickup</li>
            <li>• Courier assigned by platform</li>
            <li>• You provide tracking updates</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    title: "Accept Terms",
    description: "Acknowledge platform requirements",
    icon: CheckCircle2,
    requiresAcceptance: true,
  },
];

const ManufacturerOnboardingModal = ({ isOpen, onClose, userId }: ManufacturerOnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigate = useNavigate();

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const CurrentIcon = STEPS[currentStep].icon;
  const isLastStep = currentStep === STEPS.length - 1;
  const currentStepData = STEPS[currentStep];

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleComplete = async () => {
    if (!termsAccepted) {
      toast.error("Please accept the terms to continue");
      return;
    }

    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_type: 'manufacturer',
        })
        .eq('id', userId);

      if (error) throw error;

      await logSystemEvent({
        actorRole: 'manufacturer',
        actorId: userId,
        eventType: 'onboarding_completed',
        entityType: 'user',
        entityId: userId,
        metadata: { onboarding_type: 'manufacturer' },
      });

      toast.success("Welcome! You're ready to receive orders.");
      onClose();
      navigate('/manufacturer/orders');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error("Failed to complete onboarding");
    } finally {
      setIsCompleting(false);
    }
  };

  const TermsContent = (
    <div className="space-y-4">
      <div className="bg-muted/50 p-4 rounded-lg max-h-48 overflow-y-auto text-sm">
        <h4 className="font-medium mb-2">Platform Terms</h4>
        <ul className="text-muted-foreground space-y-2">
          <li>✓ I will maintain quality standards for all orders</li>
          <li>✓ I will upload QC videos before requesting dispatch</li>
          <li>✓ I will not ship without buyer approval</li>
          <li>✓ I understand payment is released after delivery confirmation</li>
          <li>✓ I will respond to orders within 24 hours</li>
          <li>✓ I will communicate any delays promptly</li>
        </ul>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="terms"
          checked={termsAccepted}
          onCheckedChange={(checked) => setTermsAccepted(checked === true)}
        />
        <label
          htmlFor="terms"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          I accept the platform terms and commit to quality standards
        </label>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <CurrentIcon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">{currentStepData.title}</DialogTitle>
          <DialogDescription>{currentStepData.description}</DialogDescription>
        </DialogHeader>

        <Progress value={progress} className="h-1 mb-4" />

        <div className="min-h-[280px] py-2">
          {'requiresAcceptance' in currentStepData && currentStepData.requiresAcceptance
            ? TermsContent
            : currentStepData.content}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-1">
            {STEPS.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <Button 
            onClick={handleNext} 
            disabled={isCompleting || (isLastStep && !termsAccepted)}
          >
            {isLastStep ? (
              isCompleting ? "Starting..." : "Start Working"
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManufacturerOnboardingModal;
