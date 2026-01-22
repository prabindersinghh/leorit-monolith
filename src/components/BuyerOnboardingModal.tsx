import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Package, FileImage, CreditCard, Shield, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logSystemEvent } from "@/lib/systemLogger";
import { useNavigate } from "react-router-dom";

interface BuyerOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const STEPS = [
  {
    title: "Welcome to Leorit.ai",
    description: "Your trusted partner for custom apparel manufacturing",
    icon: Sparkles,
    content: (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">
          We connect you with verified manufacturers to bring your designs to life.
          Let's get you started!
        </p>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">500+</div>
            <div className="text-xs text-muted-foreground">Orders Completed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">98%</div>
            <div className="text-xs text-muted-foreground">Satisfaction Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">24/7</div>
            <div className="text-xs text-muted-foreground">Support</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "How It Works",
    description: "Simple 4-step process",
    icon: Package,
    content: (
      <div className="space-y-3">
        {[
          { step: 1, title: "Create Order", desc: "Upload your designs and specifications" },
          { step: 2, title: "Get Sample", desc: "Review sample before bulk production" },
          { step: 3, title: "Approve & Pay", desc: "Secure escrow payment protection" },
          { step: 4, title: "Receive Delivery", desc: "Track and receive your order" },
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
    title: "Prepare Your Files",
    description: "What you'll need for your order",
    icon: FileImage,
    content: (
      <div className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Design Files</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• High-resolution PNG or PDF (300 DPI recommended)</li>
            <li>• Front and back designs if applicable</li>
            <li>• Color codes or Pantone references</li>
          </ul>
        </div>
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Size Distribution (for bulk orders)</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• CSV file with name, size, quantity columns</li>
            <li>• Template available during order creation</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    title: "Quality Control",
    description: "Your satisfaction is guaranteed",
    icon: CheckCircle2,
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
          <div>
            <div className="font-medium text-sm">Sample Review</div>
            <div className="text-xs text-muted-foreground">
              Approve a sample before bulk production starts
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
          <div>
            <div className="font-medium text-sm">QC Video</div>
            <div className="text-xs text-muted-foreground">
              Receive video proof of completed production
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
          <div>
            <div className="font-medium text-sm">Reject & Revise</div>
            <div className="text-xs text-muted-foreground">
              Request revisions if quality doesn't meet expectations
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Secure Payments",
    description: "Your money is protected",
    icon: CreditCard,
    content: (
      <div className="space-y-4">
        <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-700 dark:text-green-400">Escrow Protection</span>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400">
            Your payment is held securely until you approve the final delivery.
            Manufacturers only receive payment after you confirm satisfaction.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Payment is split into two parts:</p>
          <ul className="mt-2 space-y-1">
            <li>• 55% upfront (held in escrow)</li>
            <li>• 45% after QC approval & delivery</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    title: "You're All Set!",
    description: "Start creating your first order",
    icon: Sparkles,
    content: (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <p className="text-muted-foreground">
          You're ready to create your first order. Our team is here to help you
          every step of the way.
        </p>
        <div className="bg-muted/50 p-4 rounded-lg text-sm">
          <p className="font-medium">Need help?</p>
          <p className="text-muted-foreground">Contact us at support@leorit.ai</p>
        </div>
      </div>
    ),
  },
];

const BuyerOnboardingModal = ({ isOpen, onClose, userId }: BuyerOnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const navigate = useNavigate();

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const CurrentIcon = STEPS[currentStep].icon;
  const isLastStep = currentStep === STEPS.length - 1;

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
    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_type: 'buyer',
        })
        .eq('id', userId);

      if (error) throw error;

      await logSystemEvent({
        actorRole: 'buyer',
        actorId: userId,
        eventType: 'onboarding_completed',
        entityType: 'user',
        entityId: userId,
        metadata: { onboarding_type: 'buyer' },
      });

      toast.success("Welcome aboard! Let's create your first order.");
      onClose();
      navigate('/buyer/start-order');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error("Failed to complete onboarding");
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <CurrentIcon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">{STEPS[currentStep].title}</DialogTitle>
          <DialogDescription>{STEPS[currentStep].description}</DialogDescription>
        </DialogHeader>

        <Progress value={progress} className="h-1 mb-4" />

        <div className="min-h-[280px] py-2">
          {STEPS[currentStep].content}
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

          <Button onClick={handleNext} disabled={isCompleting}>
            {isLastStep ? (
              isCompleting ? "Starting..." : "Create First Order"
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

export default BuyerOnboardingModal;
