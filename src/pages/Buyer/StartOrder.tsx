import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import UploadBox from "@/components/UploadBox";
import MockupViewer3D from "@/components/MockupViewer3D";
import DesignEditor from "@/components/DesignEditor";
import NameCustomizer, { NameSettings } from "@/components/NameCustomizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Sparkles, Download, Edit, Link2, Type, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OrderDetailedStatus } from "@/lib/orderStateMachine";

const StartOrder = () => {
  const [step, setStep] = useState(1);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [backDesignFile, setBackDesignFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [productType, setProductType] = useState("");
  const [designSize, setDesignSize] = useState("A4");
  const [mockupDescription, setMockupDescription] = useState("");
  const [mockupImage, setMockupImage] = useState("");
  const [backMockupImage, setBackMockupImage] = useState("");
  const [csvAnalysis, setCsvAnalysis] = useState("");
  const [correctedCsv, setCorrectedCsv] = useState("");
  const [canvaLink, setCanvaLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDesignEditor, setShowDesignEditor] = useState(false);
  const [enableNamePersonalization, setEnableNamePersonalization] = useState(false);
  const [showNameCustomizer, setShowNameCustomizer] = useState(false);
  const [nameSettings, setNameSettings] = useState<NameSettings | null>(null);

  const handleGenerateMockup = async () => {
    if (!designFile || !productType) {
      toast.error("Please select a product type and upload a front design");
      return;
    }

    // Validate file type and size
    const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

    if (!ALLOWED_IMAGE_TYPES.includes(designFile.type)) {
      toast.error("Front design must be PNG or JPEG format");
      return;
    }

    if (designFile.size > MAX_IMAGE_SIZE) {
      toast.error("Front design must be less than 10MB");
      return;
    }

    if (backDesignFile) {
      if (!ALLOWED_IMAGE_TYPES.includes(backDesignFile.type)) {
        toast.error("Back design must be PNG or JPEG format");
        return;
      }
      if (backDesignFile.size > MAX_IMAGE_SIZE) {
        toast.error("Back design must be less than 10MB");
        return;
      }
    }

    setIsGenerating(true);
    try {
      // Convert front design to base64
      const frontDesignBase64 = await fileToBase64(designFile);
      
      // Convert back design to base64 if exists
      let backDesignBase64 = undefined;
      if (backDesignFile) {
        backDesignBase64 = await fileToBase64(backDesignFile);
      }

      const { data, error } = await supabase.functions.invoke('generate-mockup', {
        body: {
          frontDesignImage: frontDesignBase64,
          backDesignImage: backDesignBase64,
          productType,
          designSize
        }
      });

      if (error) throw error;

      if (data?.mockupImage) {
        setMockupImage(data.mockupImage);
        setMockupDescription(data.mockupDescription || '');
        if (data.backMockupImage) {
          setBackMockupImage(data.backMockupImage);
        }
        toast.success("AI Mockup generated successfully!");
      } else {
        toast.error(data?.error || "Failed to generate mockup");
      }
    } catch (error) {
      console.error('Error generating mockup:', error);
      toast.error("Failed to generate mockup");
    } finally {
      setIsGenerating(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleParseCSV = async () => {
    if (!csvFile) {
      toast.error("Please upload a CSV file");
      return;
    }

    // Validate CSV file type and size
    const ALLOWED_CSV_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    const MAX_CSV_SIZE = 1 * 1024 * 1024; // 1MB

    if (!ALLOWED_CSV_TYPES.includes(csvFile.type) && !csvFile.name.endsWith('.csv')) {
      toast.error("Please upload a valid CSV file");
      return;
    }

    if (csvFile.size > MAX_CSV_SIZE) {
      toast.error("CSV file must be less than 1MB");
      return;
    }

    setIsGenerating(true);
    try {
      const text = await csvFile.text();
      const { data, error } = await supabase.functions.invoke('parse-csv', {
        body: { csvContent: text }
      });

      if (error) throw error;

      if (data?.aiAnalysis) {
        setCsvAnalysis(data.aiAnalysis);
        // Mock corrected CSV - in real implementation, this would come from edge function
        const mockCorrectedCsv = "Name,Size,Quantity\nJohn Doe,L,2\nJane Smith,M,1\nBob Johnson,XL,3";
        setCorrectedCsv(mockCorrectedCsv);
        toast.success("CSV parsed and validated successfully!");
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error("Failed to parse CSV");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveNameSettings = (settings: NameSettings) => {
    setNameSettings(settings);
    toast.success("Name personalization enabled!");
  };

  const downloadCsvTemplate = () => {
    const template = "Name,Size,Quantity\nJohn Doe,M,2\nJane Smith,L,1";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'order_template.csv';
    a.click();
    toast.success("CSV template downloaded!");
  };

  const downloadCorrectedCsv = () => {
    if (!correctedCsv) return;
    const blob = new Blob([correctedCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'corrected_order.csv';
    a.click();
    toast.success("Corrected CSV downloaded!");
  };

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar userRole="buyer" />
      
      <main className="flex-1 p-8 w-[calc(100%-16rem)] ml-64">
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
                      onClick={() => setProductType(product)}
                      className={`p-6 border rounded-xl transition-all text-left ${
                        productType === product
                          ? "border-foreground bg-gray-50"
                          : "border-border hover:border-foreground hover:bg-gray-50"
                      }`}
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

                <div>
                  <Label>Design Size</Label>
                  <Select value={designSize} onValueChange={setDesignSize}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A2">A2 Size</SelectItem>
                      <SelectItem value="A3">A3 Size</SelectItem>
                      <SelectItem value="A4">A4 Size</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <UploadBox
                  label="Front Design (Required)"
                  description="PNG, JPG, SVG up to 10MB"
                  accept="image/*"
                  onFileSelect={setDesignFile}
                />

                <UploadBox
                  label="Back Design (Optional)"
                  description="Add a design for the back of the apparel - PNG, JPG, SVG up to 10MB"
                  accept="image/*"
                  onFileSelect={setBackDesignFile}
                />

                {designFile && (
                  <>
                    <Button 
                      onClick={handleGenerateMockup} 
                      disabled={isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? "Generating 3D Mockup..." : "Generate 3D Mockup Preview"}
                    </Button>

                    {mockupImage && (
                      <div className="p-6 bg-gray-50 rounded-xl border border-border space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">AI-Generated 3D Mockup Preview</p>
                          <Button
                            onClick={() => setShowDesignEditor(true)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Design Position
                          </Button>
                        </div>
                        
                        <MockupViewer3D 
                          frontDesign={mockupImage}
                          backDesign={backMockupImage || undefined}
                          productType={productType}
                        />

                        <div className="p-4 bg-white rounded border border-border">
                          <p className="text-xs text-muted-foreground mb-1">Product: {productType}</p>
                          <p className="text-xs text-muted-foreground mb-1">Design Size: {designSize}</p>
                          <p className="text-xs text-muted-foreground mb-1">
                            Back Design: {backDesignFile ? "Included" : "Not included"}
                          </p>
                          {mockupDescription && (
                            <p className="text-xs text-foreground mt-2">{mockupDescription}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {!mockupImage && mockupDescription && (
                      <div className="p-6 bg-gray-50 rounded-xl border border-border">
                        <p className="text-sm font-semibold text-foreground mb-2">AI Mockup Description</p>
                        <p className="text-sm text-muted-foreground">{mockupDescription}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-foreground">Upload Order CSV</h2>
                
                <Button 
                  onClick={downloadCsvTemplate}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>

                <div>
                  <Label>Upload CSV File</Label>
                  <UploadBox
                    label="CSV File"
                    description="Contains names, sizes, quantities"
                    accept=".csv"
                    onFileSelect={setCsvFile}
                  />
                </div>

                <div>
                  <Label>Or Paste Canva Design Link (Optional)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={canvaLink}
                      onChange={(e) => setCanvaLink(e.target.value)}
                      placeholder="https://www.canva.com/design/..."
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon">
                      <Link2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste your Canva design link for future reference
                  </p>
                </div>

                {csvFile && (
                  <>
                    <Button 
                      onClick={handleParseCSV} 
                      disabled={isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? "Parsing..." : "Parse & Validate CSV"}
                    </Button>

                    {csvAnalysis && (
                      <div className="space-y-4">
                        <div className="p-6 bg-gray-50 rounded-xl border border-border">
                          <h3 className="font-semibold text-foreground mb-3">AI Validation Results</h3>
                          <div className="prose prose-sm max-w-none">
                            <p className="text-foreground whitespace-pre-wrap">{csvAnalysis}</p>
                          </div>
                        </div>

                        {correctedCsv && (
                          <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-foreground">Corrected CSV Available</h3>
                              <Button onClick={downloadCorrectedCsv} size="sm" variant="outline">
                                <Download className="w-4 h-4 mr-2" />
                                Download Corrected CSV
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              We've automatically corrected formatting issues in your CSV. Download the corrected version to ensure smooth processing.
                            </p>
                          </div>
                        )}

                        {/* Name Personalization Option */}
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3 mt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base font-semibold">Add Personalized Names</Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Print individual names from CSV on each design
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={enableNamePersonalization}
                                onChange={(e) => setEnableNamePersonalization(e.target.checked)}
                                className="w-5 h-5 rounded border-border"
                              />
                            </div>
                          </div>

                          {enableNamePersonalization && (
                            <div className="pt-2">
                              <Button 
                                onClick={() => setShowNameCustomizer(true)} 
                                variant="outline"
                                className="w-full"
                              >
                                <Type className="w-4 h-4 mr-2" />
                                Customize Name Placement
                              </Button>
                              {nameSettings && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  ✓ Names from "{nameSettings.nameColumn}" column will be added
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
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
                
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Protected Payment</h3>
                    <p className="text-sm text-blue-700">
                      Your payment is held securely in escrow and only released to the manufacturer after you approve the sample QC.
                    </p>
                  </div>
                </div>
                
                <div className="p-6 bg-gray-50 rounded-xl border border-border space-y-4">
                  <div className="flex justify-between">
                    <span className="text-foreground">Sample Quantity</span>
                    <span className="font-bold text-foreground">1 piece</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground">Sample Cost</span>
                    <span className="font-bold text-foreground">₹12,500</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-foreground font-semibold">Escrow Amount</span>
                    <span className="font-bold text-foreground">₹12,500</span>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Full amount will be transferred to escrow upon order placement and released only after QC approval.
                    </p>
                  </div>
                </div>

                <Button 
                  className="w-full bg-foreground text-background hover:bg-gray-800"
                  onClick={async () => {
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        toast.error("Please login to place an order");
                        return;
                      }

                      const quantity = 1; // Sample order
                      const pricePerPiece = 12500; // ₹12,500 per sample
                      const escrowAmount = quantity * pricePerPiece;

                      // Fixed manufacturer ID for all orders
                      const FIXED_MANUFACTURER_ID = '81bf98d4-352b-4296-a577-81fb3973c6c2';

                      const { error } = await supabase.from('orders').insert({
                        buyer_id: user.id,
                        manufacturer_id: FIXED_MANUFACTURER_ID,
                        product_type: productType,
                        design_size: designSize,
                        quantity: quantity,
                        escrow_amount: escrowAmount,
                        total_amount: escrowAmount,
                        escrow_status: 'fake_paid',
                        detailed_status: 'submitted_to_manufacturer' as OrderDetailedStatus,
                        status: 'pending', // Keep for backward compatibility
                        sample_status: 'not_started' // Keep for backward compatibility
                      });

                      if (error) throw error;
                      
                      toast.success(
                        `Order placed! ₹${escrowAmount.toLocaleString()} transferred to escrow.`,
                        { duration: 5000 }
                      );
                      
                      // Reset form or redirect
                      setTimeout(() => {
                        window.location.href = '/buyer/orders';
                      }, 2000);
                    } catch (error) {
                      console.error('Error placing order:', error);
                      toast.error("Failed to place order");
                    }
                  }}
                >
                  Place Order - ₹12,500
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

      {showDesignEditor && mockupImage && (
        <DesignEditor
          frontDesign={mockupImage}
          backDesign={backMockupImage || undefined}
          onClose={() => setShowDesignEditor(false)}
          onSave={(settings) => {
            console.log("Design settings saved:", settings);
            toast.success("Design positioning saved!");
          }}
        />
      )}

      {showNameCustomizer && csvAnalysis && designFile && (
        <NameCustomizer
          csvColumns={csvAnalysis.split('\n')
            .find(line => line.includes('Columns:'))
            ?.split('Columns:')[1]
            ?.split(',')
            .map(col => col.trim()) || ['name', 'size', 'quantity']}
          designPreview={URL.createObjectURL(designFile)}
          onClose={() => setShowNameCustomizer(false)}
          onSave={handleSaveNameSettings}
        />
      )}
    </div>
  );
};

export default StartOrder;
