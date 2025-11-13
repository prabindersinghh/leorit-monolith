import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import UploadBox from "@/components/UploadBox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Sparkles } from "lucide-react";

const StartOrder = () => {
  const [step, setStep] = useState(1);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="buyer" />
      
      <main className="ml-64 flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Start New Order</h1>
            <p className="text-muted-foreground">Create a custom bulk apparel order in 5 simple steps</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    s === step ? "bg-foreground text-background" :
                    s < step ? "bg-gray-300 text-foreground" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {s}
                  </div>
                  {s < 5 && <div className={`w-20 h-1 mx-2 ${s < step ? "bg-gray-300" : "bg-gray-100"}`} />}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Product</span>
              <span>Design</span>
              <span>CSV Data</span>
              <span>Fabric</span>
              <span>Payment</span>
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-card border border-border rounded-xl p-8">
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-foreground">Select Product Type</h2>
                <div className="grid grid-cols-2 gap-4">
                  {["T-Shirts", "Hoodies", "Caps", "Bags", "Jackets", "Custom"].map((product) => (
                    <button
                      key={product}
                      className="p-6 border border-border rounded-xl hover:border-foreground hover:bg-gray-50 transition-all text-left"
                    >
                      <h3 className="font-semibold text-foreground mb-1">{product}</h3>
                      <p className="text-xs text-muted-foreground">Custom bulk production</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">Upload Design</h2>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                    <Sparkles className="w-4 h-4 text-foreground" />
                    <span className="text-sm font-medium text-foreground">AI Mockup Ready</span>
                  </div>
                </div>
                
                <UploadBox
                  label="Design File"
                  description="PNG, JPG, SVG up to 10MB"
                  accept="image/*"
                  onFileSelect={setDesignFile}
                />

                {designFile && (
                  <div className="p-6 bg-gray-50 rounded-xl border border-border">
                    <p className="text-sm text-muted-foreground mb-2">AI-Generated Mockup Preview</p>
                    <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-gray-500">Mockup will appear here</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-foreground">Upload Order CSV</h2>
                <UploadBox
                  label="CSV File"
                  description="Contains names, sizes, quantities"
                  accept=".csv"
                  onFileSelect={setCsvFile}
                />

                {csvFile && (
                  <div className="p-6 bg-gray-50 rounded-xl border border-border">
                    <h3 className="font-semibold text-foreground mb-3">Validation Results</h3>
                    <div className="space-y-2 text-sm">
                      <p className="text-green-600">✓ 500 valid entries</p>
                      <p className="text-green-600">✓ All sizes valid (S, M, L, XL)</p>
                      <p className="text-green-600">✓ No duplicate names</p>
                      <p className="text-muted-foreground">Total Quantity: 500 units</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-foreground">Select Fabric & Specifications</h2>
                
                <div className="space-y-4">
                  <div>
                    <Label>Fabric Type</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select fabric" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cotton">100% Cotton</SelectItem>
                        <SelectItem value="polyester">Polyester Blend</SelectItem>
                        <SelectItem value="organic">Organic Cotton</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>GSM (Fabric Weight)</Label>
                    <Input type="number" placeholder="180" className="mt-1" />
                  </div>

                  <div>
                    <Label>Estimated Quantity</Label>
                    <Input type="number" value="500" readOnly className="mt-1 bg-gray-50" />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-foreground">Payment & Escrow</h2>
                
                <div className="p-6 bg-gray-50 rounded-xl border border-border space-y-4">
                  <div className="flex justify-between">
                    <span className="text-foreground">Order Total</span>
                    <span className="font-bold text-foreground">$12,500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground">50% Advance (Escrow)</span>
                    <span className="font-bold text-foreground">$6,250</span>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Your payment is held in escrow and released only after QC approval.
                    </p>
                  </div>
                </div>

                <Button className="w-full bg-foreground text-background hover:bg-gray-800">
                  Confirm & Pay $6,250
                </Button>
              </div>
            )}

            <div className="flex justify-between mt-8 pt-6 border-t border-border">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                >
                  Previous
                </Button>
              )}
              {step < 5 && (
                <Button
                  className="ml-auto bg-foreground text-background hover:bg-gray-800"
                  onClick={() => setStep(step + 1)}
                >
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StartOrder;
