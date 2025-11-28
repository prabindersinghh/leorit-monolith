import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Lightbulb, ArrowRight } from "lucide-react";

interface FabricAdvisorProps {
  onRecommendFabric: (fabricId: string) => void;
  onScrollToFabricSection: () => void;
}

const FabricAdvisor = ({ onRecommendFabric, onScrollToFabricSection }: FabricAdvisorProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  const qaData = [
    {
      question: "What is GSM?",
      answer: "GSM (grams per square meter) measures fabric weight. Higher GSM → thicker, warmer, and costlier garments. Useful for winter hoodies."
    },
    {
      question: "Which hoodie for North India winter?",
      answer: "Recommend 400 GSM fleece — warmest, minimal shrinkage, great for campus use. Typical bulk unit price for this fabric on the platform: ₹380. Best for 1–200 qty."
    },
    {
      question: "Which hoodie if budget is tight?",
      answer: "Recommend 300–350 GSM — lighter and cheaper, good for large bulk runs. Slightly less warm than 400 GSM."
    },
    {
      question: "What is the difference between combed cotton and polycotton?",
      answer: "Combed cotton = softer, better print; polycotton = cheaper, more durable. Choose combed for premium feel."
    },
    {
      question: "What is shrinkage?",
      answer: "Shrinkage is expected % after first wash. Medium-quality cotton shrinks ~2–4%; pre-shrunk fabrics shrink less."
    }
  ];

  const handleQuickAction = (action: string, fabricId?: string) => {
    if (fabricId) {
      onRecommendFabric(fabricId);
    }
    onScrollToFabricSection();
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-primary/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Fabric Advisor</CardTitle>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition-transform ${
                  isOpen ? "transform rotate-180" : ""
                }`}
              />
            </div>
            <CardDescription>
              Get help choosing the right fabric for your order
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Quick Action Buttons */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Quick Recommendations</h4>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto py-2 px-3 text-left"
                  onClick={() => handleQuickAction("recommend-400", "hoodie-400gsm")}
                >
                  <ArrowRight className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">Recommend winter hoodie (400 GSM)</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto py-2 px-3 text-left"
                  onClick={() => handleQuickAction("recommend-300", "hoodie-300gsm")}
                >
                  <ArrowRight className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">Recommend budget hoodie (300 GSM)</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto py-2 px-3 text-left"
                  onClick={() => handleQuickAction("show-options")}
                >
                  <ArrowRight className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">Show fabric price options</span>
                </Button>
              </div>
            </div>

            {/* Q&A Section */}
            <div className="space-y-2 pt-4 border-t border-border">
              <h4 className="text-sm font-semibold text-foreground">Common Questions</h4>
              <div className="space-y-2">
                {qaData.map((qa, index) => (
                  <div key={index} className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-auto py-2 px-3 text-left font-normal hover:bg-primary/10"
                      onClick={() => setSelectedQuestion(selectedQuestion === qa.question ? null : qa.question)}
                    >
                      <span className="text-sm text-primary mr-2">Q:</span>
                      <span className="text-sm">{qa.question}</span>
                    </Button>
                    {selectedQuestion === qa.question && (
                      <div className="ml-6 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">A: </span>
                          {qa.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default FabricAdvisor;
