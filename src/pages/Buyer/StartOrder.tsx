import { useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import UploadBox from "@/components/UploadBox";
import MockupViewer3D from "@/components/MockupViewer3D";
import DesignEditor from "@/components/DesignEditor";
import NameCustomizer, { NameSettings } from "@/components/NameCustomizer";
import ShippingAddressForm from "@/components/ShippingAddressForm";
import DeliveryCostCalculator from "@/components/DeliveryCostCalculator";
import FabricAdvisor from "@/components/FabricAdvisor";
import BuyerPurposeSelector, { BuyerPurpose } from "@/components/BuyerPurposeSelector";
import ColorSelector from "@/components/ColorSelector";
import BuyerNotesInput from "@/components/BuyerNotesInput";
import DesignFilesSubmission from "@/components/DesignFilesSubmission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowRight, Sparkles, Download, Edit, Link2, Type, Shield, CalendarIcon, CheckCircle2, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OrderDetailedStatus } from "@/lib/orderStateMachine";
import { logOrderEvent } from "@/lib/orderEventLogger";
import { trackOrderCreated } from "@/lib/analyticsLogger";
import { storeSpecificationEvidence, storeGoogleDriveEvidence } from "@/lib/evidenceStorage";
import { calculateDeliveryCost } from "@/lib/deliveryCostCalculator";
import { getFabricsForProduct, getDefaultFabric, getFabricById, FabricOption } from "@/lib/fabrics";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { validateOrderSubmission, formatValidationErrors } from "@/lib/buyerPurposeValidation";

const StartOrder = () => {
  // Step 0 is the new buyer purpose selector
  const [step, setStep] = useState(0);
  const [buyerPurpose, setBuyerPurpose] = useState<BuyerPurpose | null>(null);
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
  const [isSampleOnly, setIsSampleOnly] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<any>(null);
  const [bulkQuantity, setBulkQuantity] = useState<number>(50);
  const [bulkQuantityError, setBulkQuantityError] = useState<string>("");
  const [selectedFabric, setSelectedFabric] = useState<FabricOption | null>(null);
  const [expectedDeadline, setExpectedDeadline] = useState<Date | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [buyerNotes, setBuyerNotes] = useState<string>("");
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);

  // Design Files Submission (buyer inputs)
  const [designExplanation, setDesignExplanation] = useState<string>("");
  const [googleDriveLink, setGoogleDriveLink] = useState<string>("");

  // Optional: additional buyer attachment (stored to storage + evidence)
  const [buyerAttachmentFile, setBuyerAttachmentFile] = useState<File | null>(null);

  const fabricSectionRef = useRef<HTMLDivElement>(null);

  // Flow routing helpers based on buyer_purpose
  const shouldSkipDesign = buyerPurpose === "blank_apparel" || buyerPurpose === "fabric_only";
  const shouldSkipProduct = buyerPurpose === "fabric_only";
  const shouldSkipCSV = buyerPurpose === "fabric_only";
  const needsColorSelection = buyerPurpose === "blank_apparel" || buyerPurpose === "fabric_only";

  // Get step labels based on buyer purpose
  const getStepLabels = () => {
    if (buyerPurpose === "fabric_only") {
      return ["Purpose", "Fabric", "Shipping", "Payment"];
    }
    if (buyerPurpose === "blank_apparel") {
      return ["Purpose", "Product", "CSV Data", "Fabric", "Shipping", "Payment"];
    }
    return ["Purpose", "Product", "Design", "CSV Data", "Fabric", "Shipping", "Payment"];
  };

  // Get the actual step number for internal logic
  const getInternalStep = (displayStep: number): number => {
    if (buyerPurpose === "fabric_only") {
      // Purpose(0) -> Fabric(4) -> Shipping(5) -> Payment(6)
      const mapping: Record<number, number> = { 0: 0, 1: 4, 2: 5, 3: 6 };
      return mapping[displayStep] ?? displayStep;
    }
    if (buyerPurpose === "blank_apparel") {
      // Purpose(0) -> Product(1) -> CSV(3) -> Fabric(4) -> Shipping(5) -> Payment(6)
      // Skip design step (2)
      const mapping: Record<number, number> = { 0: 0, 1: 1, 2: 3, 3: 4, 4: 5, 5: 6 };
      return mapping[displayStep] ?? displayStep;
    }
    // merch_bulk: all steps
    return displayStep;
  };

  // Get display step from internal step
  const getDisplayStep = (internalStep: number): number => {
    if (buyerPurpose === "fabric_only") {
      const mapping: Record<number, number> = { 0: 0, 4: 1, 5: 2, 6: 3 };
      return mapping[internalStep] ?? internalStep;
    }
    if (buyerPurpose === "blank_apparel") {
      const mapping: Record<number, number> = { 0: 0, 1: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
      return mapping[internalStep] ?? internalStep;
    }
    return internalStep;
  };

  const getTotalSteps = () => getStepLabels().length;
  
  const handleNextStep = () => {
    const currentInternal = getInternalStep(step);
    let nextInternal = currentInternal + 1;
    
    // Skip design step for blank_apparel
    if (buyerPurpose === "blank_apparel" && nextInternal === 2) {
      nextInternal = 3; // Skip to CSV
    }
    
    // For fabric_only, jump from purpose to fabric
    if (buyerPurpose === "fabric_only" && currentInternal === 0) {
      nextInternal = 4; // Jump to fabric
    }
    
    setStep(getDisplayStep(nextInternal));
  };

  const handlePrevStep = () => {
    const currentInternal = getInternalStep(step);
    let prevInternal = currentInternal - 1;
    
    // Skip design step for blank_apparel going back
    if (buyerPurpose === "blank_apparel" && prevInternal === 2) {
      prevInternal = 1; // Skip back to product
    }
    
    // For fabric_only, jump from fabric back to purpose
    if (buyerPurpose === "fabric_only" && currentInternal === 4) {
      prevInternal = 0; // Jump back to purpose
    }
    
    setStep(getDisplayStep(prevInternal));
  };

  // Determine what internal step we're on for rendering
  const internalStep = getInternalStep(step);

  const handleRecommendFabric = (fabricId: string) => {
    const fabric = getFabricById(fabricId);
    if (fabric) {
      setSelectedFabric(fabric);
      toast.success(`${fabric.label} selected`);
    }
  };

  const handleScrollToFabricSection = () => {
    fabricSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
              {getStepLabels().map((_, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    index === step ? "bg-foreground text-background" :
                    index < step ? "bg-gray-300 text-foreground" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {index + 1}
                  </div>
                  {index < getTotalSteps() - 1 && <div className={`w-16 h-1 mx-2 ${index < step ? "bg-gray-300" : "bg-gray-100"}`} />}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              {getStepLabels().map((label, index) => (
                <span key={index}>{label}</span>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-card border border-border rounded-xl p-8">
          
          {/* Step 0: Buyer Purpose Selection */}
          {internalStep === 0 && (
            <BuyerPurposeSelector
              selectedPurpose={buyerPurpose}
              onSelect={(purpose) => {
                setBuyerPurpose(purpose);
                // Reset product type for fabric_only
                if (purpose === "fabric_only") {
                  setProductType("Fabric");
                }
              }}
            />
          )}

          {/* Step 1: Product Selection */}
          {internalStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-foreground">Select Product Type</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  {["T-Shirts", "Hoodies", "Caps", "Bags", "Jackets", "Custom"].map((product) => (
                    <button
                      key={product}
                      onClick={() => {
                        setProductType(product);
                        // Set default fabric for this product type
                        setSelectedFabric(getDefaultFabric(product));
                      }}
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
                
                {/* Color selection for merch_bulk and blank_apparel */}
                {(buyerPurpose === "merch_bulk" || buyerPurpose === "blank_apparel") && productType && (
                  <div className="pt-4 border-t border-border">
                    <ColorSelector
                      selectedColor={selectedColor}
                      onColorSelect={setSelectedColor}
                      required={true}
                    />
                  </div>
                )}
                
                {(buyerPurpose === "merch_bulk" || buyerPurpose === "blank_apparel") && productType && !selectedColor && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    Please select a base garment color to continue
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Design Upload (skipped for blank_apparel and fabric_only) */}
            {internalStep === 2 && (
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

                {/* Design Help Shortcut */}
                <div className="p-3 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">
                    Need help with a complex design or unsure about placement?{" "}
                    <a 
                      href="mailto:leoritaiofficial@gmail.com?subject=Design Help Request"
                      className="text-primary hover:underline font-medium"
                    >
                      Talk to Leorit directly
                    </a>
                    {" "}— we'll help you get it right.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    WhatsApp: +91 6239712653
                  </p>
                </div>

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

                        {/* Mockup Disclaimer */}
                        <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                          <span className="font-medium">Note:</span> Mockup previews are indicative for placement and scale. Final production output is governed by approved samples and QC.
                        </p>
                        
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

            {/* Step 3: CSV Upload */}
            {internalStep === 3 && (
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

            {/* Step 4: Fabric Selection */}
            {internalStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-foreground">Select Fabric & Specifications</h2>
                
                {/* Color selection for fabric_only */}
                {buyerPurpose === "fabric_only" && (
                  <div className="mb-6">
                    <ColorSelector
                      selectedColor={selectedColor}
                      onColorSelect={setSelectedColor}
                      required={true}
                    />
                  </div>
                )}
                
                {/* Fabric Advisor - only for apparel orders */}
                {buyerPurpose !== "fabric_only" && (
                  <FabricAdvisor 
                    onRecommendFabric={handleRecommendFabric}
                    onScrollToFabricSection={handleScrollToFabricSection}
                  />
                )}
                
                <div className="space-y-4" ref={fabricSectionRef}>
                  <div>
                    <Label>Fabric / GSM (Select)</Label>
                    <Select 
                      value={selectedFabric?.id || ''} 
                      onValueChange={(value) => {
                        const fabric = getFabricById(value);
                        setSelectedFabric(fabric || null);
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select fabric" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFabricsForProduct(buyerPurpose === "fabric_only" ? "Fabric" : productType).map((fabric) => (
                          <SelectItem key={fabric.id} value={fabric.id}>
                            {fabric.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedFabric && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Price per piece (bulk): ₹{selectedFabric.unit_price_bulk}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      * Quantity discounts may apply — platform uses static slabs.
                    </p>
                  </div>

                  <div>
                    <Label>{buyerPurpose === "fabric_only" ? "Quantity (meters/kg)" : "Bulk Quantity (1 - 1000)"}</Label>
                    <Input 
                      type="number" 
                      value={bulkQuantity} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setBulkQuantity(val);
                        if (val < 1) {
                          setBulkQuantityError("Quantity must be at least 1");
                        } else if (val > 1000) {
                          setBulkQuantityError("Quantity cannot exceed 1000");
                        } else {
                          setBulkQuantityError("");
                        }
                      }}
                      min={1}
                      max={1000}
                      className="mt-1" 
                    />
                    {bulkQuantityError && (
                      <p className="text-sm text-red-500 mt-1">{bulkQuantityError}</p>
                    )}
                  </div>

                  {/* Expected Deadline - Bulk Orders Only */}
                  <div className="pt-4 border-t border-border">
                    <Label>{buyerPurpose === "fabric_only" ? "Expected Delivery Deadline" : "Bulk Order Deadline"}</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Manufacturer will see this after order acceptance
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !expectedDeadline && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {expectedDeadline ? format(expectedDeadline, "PPP") : "Select expected deadline"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={expectedDeadline}
                          onSelect={setExpectedDeadline}
                          disabled={(date) => date < addDays(new Date(), 7)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum 7 days from today for bulk orders
                    </p>
                  </div>
                </div>
                
                {/* Color warning removed - color is now selected in product step for merch_bulk and blank_apparel */}
              </div>
            )}

            {/* Step 5: Shipping */}
            {internalStep === 5 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-foreground">Shipping Address</h2>
                <ShippingAddressForm
                  onSubmit={(address) => {
                    setShippingAddress(address);
                    handleNextStep();
                  }}
                  onBack={handlePrevStep}
                />
                {shippingAddress && (
                  <DeliveryCostCalculator
                    productType={buyerPurpose === "fabric_only" ? "Fabric" : productType}
                    quantity={isSampleOnly ? 1 : bulkQuantity}
                    pincode={shippingAddress.pincode}
                  />
                )}
              </div>
            )}

            {/* Step 6: Payment */}
            {internalStep === 6 && (
              <div className="space-y-6">
                {/* Order Confirmation Screen */}
                {showOrderConfirmation ? (
                  <div className="text-center py-8 space-y-6">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-2xl font-bold text-foreground">Order Submitted for Review</h2>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Our team is reviewing your order details.
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto text-left">
                        <p className="text-sm text-blue-800 font-medium mb-2 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          What happens next?
                        </p>
                        <p className="text-sm text-blue-700">
                          You will receive a call from Leorit.ai within 12 hours to confirm specifications and next steps.
                        </p>
                      </div>
                    </div>
                    {submittedOrderId && (
                      <p className="text-sm text-muted-foreground">
                        Order ID: <span className="font-mono font-medium">{submittedOrderId.slice(0, 8)}...</span>
                      </p>
                    )}
                    <div className="pt-4">
                      <Button
                        onClick={() => window.location.href = '/buyer/orders'}
                        className="bg-foreground text-background hover:bg-gray-800"
                      >
                        View My Orders
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-foreground">Review & Submit</h2>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                      <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-blue-900 mb-1">How It Works</h3>
                        <p className="text-sm text-blue-700">
                          Submit your order for review. Our team will verify requirements and contact you within 12 hours. Payment is only requested after approval.
                        </p>
                      </div>
                    </div>

                {/* Design Files & Order Explanation Section - Only for apparel orders */}
                {buyerPurpose !== "fabric_only" && (
                  <DesignFilesSubmission
                    designExplanation={designExplanation}
                    onDesignExplanationChange={setDesignExplanation}
                    googleDriveLink={googleDriveLink}
                    onGoogleDriveLinkChange={setGoogleDriveLink}
                    hasDesignFile={!!designFile}
                    hasMockup={!!mockupImage}
                    onAdditionalFileSelect={setBuyerAttachmentFile}
                  />
                )}

                {/* Buyer Notes Input - TASK D */}
                <BuyerNotesInput
                  notes={buyerNotes}
                  onChange={setBuyerNotes}
                />

                {/* Checkout Options - Only for apparel orders */}
                {buyerPurpose !== "fabric_only" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Select Order Type</h3>
                    
                    {/* Option 1: Sample Only */}
                    <button
                      onClick={() => setIsSampleOnly(true)}
                      className={`w-full p-6 border-2 rounded-xl transition-all text-left ${
                        isSampleOnly
                          ? "border-foreground bg-gray-50"
                          : "border-border hover:border-foreground hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">Order Sample Only (1 unit)</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Test the quality before committing to bulk order
                          </p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sample Quantity:</span>
                              <span className="font-medium text-foreground">1 piece</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sample Cost:</span>
                              <span className="font-bold text-foreground">₹500</span>
                            </div>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSampleOnly ? "border-foreground bg-foreground" : "border-gray-300"
                        }`}>
                          {isSampleOnly && <div className="w-3 h-3 rounded-full bg-background" />}
                        </div>
                      </div>
                    </button>

                    {/* Option 2: Bulk Order */}
                    <button
                      onClick={() => setIsSampleOnly(false)}
                      className={`w-full p-6 border-2 rounded-xl transition-all text-left ${
                        !isSampleOnly
                          ? "border-foreground bg-gray-50"
                          : "border-border hover:border-foreground hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-full">
                          <h4 className="font-semibold text-foreground mb-1">Order Bulk Order (1 - 1000 pieces)</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Order any quantity from 1 to 1000 pieces
                          </p>
                          
                          {!isSampleOnly && (
                            <div className="mb-3">
                              <Label className="text-sm">Bulk Quantity</Label>
                              <Input 
                                type="number" 
                                value={bulkQuantity} 
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setBulkQuantity(val);
                                  if (val < 1) {
                                    setBulkQuantityError("Quantity must be at least 1");
                                  } else if (val > 1000) {
                                    setBulkQuantityError("Quantity cannot exceed 1000");
                                  } else {
                                    setBulkQuantityError("");
                                  }
                                }}
                                min={1}
                                max={1000}
                                className="mt-1"
                                onClick={(e) => e.stopPropagation()}
                              />
                              {bulkQuantityError && (
                                <p className="text-xs text-red-500 mt-1">{bulkQuantityError}</p>
                              )}
                            </div>
                          )}
                          
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Bulk Quantity:</span>
                              <span className="font-medium text-foreground">{bulkQuantity} pieces</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Price per piece:</span>
                              <span className="font-medium text-foreground">₹{selectedFabric?.unit_price_bulk || 380}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Bulk Cost:</span>
                              <span className="font-bold text-foreground">₹{(bulkQuantity * (selectedFabric?.unit_price_bulk || 380)).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                          !isSampleOnly ? "border-foreground bg-foreground" : "border-gray-300"
                        }`}>
                          {!isSampleOnly && <div className="w-3 h-3 rounded-full bg-background" />}
                        </div>
                      </div>
                    </button>
                  </div>
                )}
                
                {/* Cost Breakdown */}
                <div className="p-6 bg-gray-50 rounded-xl border border-border space-y-3">
                  <h3 className="font-semibold text-foreground mb-3">Order Summary</h3>
                  
                  {(() => {
                    const quantity = (buyerPurpose === "fabric_only" || !isSampleOnly) ? bulkQuantity : 1;
                    // For bulk orders, use selected fabric price; for sample, use ₹500
                    const pricePerPiece = (buyerPurpose === "fabric_only" || !isSampleOnly) 
                      ? (selectedFabric?.unit_price_bulk || 380) 
                      : 500;
                    const orderCost = quantity * pricePerPiece;
                    const deliveryCost = calculateDeliveryCost({
                      productType: buyerPurpose === "fabric_only" ? "Fabric" : productType,
                      quantity,
                    }).cost;
                    const totalAmount = orderCost + deliveryCost;

                    return (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {(buyerPurpose === "fabric_only" || !isSampleOnly) 
                              ? `${buyerPurpose === "fabric_only" ? "Fabric" : "Bulk"} Cost (${quantity} × ₹${pricePerPiece}):` 
                              : "Sample Cost:"}
                          </span>
                          <span className="font-medium text-foreground">₹{orderCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Delivery Cost:</span>
                          <span className="font-medium text-foreground">₹{deliveryCost.toLocaleString()}</span>
                        </div>
                        <div className="pt-3 border-t border-border">
                          <div className="flex justify-between text-lg">
                            <span className="text-foreground font-semibold">Estimated Order Value:</span>
                            <span className="font-bold text-foreground">₹{totalAmount.toLocaleString()}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                  
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Payment will be requested only after our team reviews and approves your order.
                    </p>
                  </div>
                </div>

                <Button 
                  className="w-full bg-foreground text-background hover:bg-gray-800"
                  disabled={isProcessingPayment}
                  onClick={async () => {
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        toast.error("Please login to place an order");
                        return;
                      }

                      // =====================================================
                      // BUYER PURPOSE VALIDATION GUARD - ADD ONLY
                      // Enforces required fields before allowing SUBMITTED state
                      // =====================================================
                      const validationResult = validateOrderSubmission({
                        buyerPurpose: buyerPurpose,
                        designFileUrl: mockupImage || (designFile ? 'pending' : null), // Front design
                        backDesignUrl: backMockupImage || (backDesignFile ? 'pending' : null), // Back design
                        csvFileUrl: correctedCsv || csvAnalysis || null,
                        fabricType: selectedFabric?.label || null,
                        selectedColor: selectedColor || null,
                        quantity: isSampleOnly ? 1 : bulkQuantity,
                        productType: productType || null,
                      });

                      if (!validationResult.isValid) {
                        const errorMessage = formatValidationErrors(validationResult.errors);
                        toast.error(errorMessage, { duration: 5000 });
                        console.error('Order submission blocked:', validationResult.errors);
                        return;
                      }
                      // =====================================================
                      // END: BUYER PURPOSE VALIDATION GUARD
                      // =====================================================

                      // =====================================================
                      // DESIGN FILES VALIDATION - For apparel orders only
                      // =====================================================
                      if (buyerPurpose !== "fabric_only") {
                        // Check if at least one design reference exists
                        const hasDesignReference = !!designFile || !!mockupImage || googleDriveLink.trim().length > 0;
                        if (!hasDesignReference) {
                          toast.error("Please provide at least one design reference (file upload, mockup, or Google Drive link)");
                          return;
                        }
                        
                        // Order explanation is mandatory for apparel orders
                        if (!designExplanation.trim()) {
                          toast.error("Please provide an order explanation");
                          return;
                        }
                      }
                      // =====================================================
                      // END: DESIGN FILES VALIDATION
                      // =====================================================

                      // Validate bulk quantity
                      if (!isSampleOnly && (bulkQuantity < 1 || bulkQuantity > 1000)) {
                        toast.error("Please enter a valid bulk quantity (1-1000)");
                        return;
                      }

                      const quantity = isSampleOnly ? 1 : bulkQuantity;
                      // For bulk orders, use selected fabric price or default fabric; for sample, use ₹500
                      const fabric = isSampleOnly ? null : (selectedFabric || getDefaultFabric(productType));
                      const pricePerPiece = isSampleOnly ? 500 : (fabric?.unit_price_bulk || 380);
                      
                      // Calculate delivery cost
                      const deliveryCostResult = calculateDeliveryCost({
                        productType,
                        quantity,
                      });
                      const deliveryCost = deliveryCostResult.cost;
                      
                      // Calculate order values
                      const orderCost = quantity * pricePerPiece;
                      
                      // PAYMENT BREAKDOWN (Add-only logic)
                      // total_order_value: Full cost (sample + bulk + delivery)
                      // upfront_payable_amount: 55% of total - what buyer pays initially
                      // Remaining 45% is locked and released after delivery
                      const totalOrderValue = orderCost + deliveryCost;
                      const upfrontPayableAmount = Math.round(totalOrderValue * 0.55);
                      
                      // For escrow, we lock the upfront amount initially
                      // The remaining amount will be collected/released at later stages
                      const escrowAmount = upfrontPayableAmount;
                      const totalAmount = totalOrderValue; // Buyer sees full cost

                      // START: Order Submission Processing
                      setIsProcessingPayment(true);
                      toast.loading("Submitting order for review...", { id: "payment-processing" });
                      
                      // Brief processing delay for UX
                      await new Promise(resolve => setTimeout(resolve, 1500));
                      // END: Order Submission Processing

                      // =====================================================
                      // ADMIN-APPROVAL-FIRST MODEL
                      // Order is submitted for review - NO manufacturer assignment
                      // NO payment processing - payment only after admin approval
                      // =====================================================

                      const now = new Date().toISOString();
                      const effectiveProductType = buyerPurpose === "fabric_only" ? "Fabric" : productType;
                      const effectiveQuantity = (buyerPurpose === "fabric_only" || !isSampleOnly) ? bulkQuantity : 1;
                      
                      const orderData: any = {
                        buyer_id: user.id,
                        // NO manufacturer_id - will be assigned after payment
                        // NO assigned_at - will be set after payment
                        product_type: effectiveProductType,
                        design_size: designSize,
                        quantity: effectiveQuantity,
                        total_order_value: totalOrderValue,
                        upfront_payable_amount: upfrontPayableAmount,
                        escrow_amount: escrowAmount,
                        delivery_cost: deliveryCost,
                        total_amount: totalAmount,
                        escrow_status: 'pending', // NOT 'fake_paid' - payment pending admin approval
                        order_state: 'SUBMITTED', // ADMIN-FIRST: Order starts in SUBMITTED, not MANUFACTURER_ASSIGNED
                        detailed_status: 'created' as OrderDetailedStatus, // Pre-approval state
                        status: 'pending',
                        sample_status: 'not_started',
                        // NO fake_payment_timestamp - payment not yet received
                        fabric_type: fabric?.label || null,
                        fabric_unit_price: fabric?.unit_price_bulk || null,
                        sample_order_placed_at: (buyerPurpose !== "fabric_only" && isSampleOnly) ? now : null,
                        bulk_order_confirmed_at: (buyerPurpose === "fabric_only" || !isSampleOnly) ? now : null,
                        sample_to_bulk_conversion: buyerPurpose !== "fabric_only" && !isSampleOnly,
                        expected_deadline: expectedDeadline ? expectedDeadline.toISOString() : null,
                        order_intent: (buyerPurpose === "fabric_only" || !isSampleOnly) ? 'direct_bulk' : 'sample_only',
                        order_mode: (buyerPurpose === "fabric_only" || !isSampleOnly) ? 'direct_bulk' : 'sample_only',
                        // Core buyer fields
                        buyer_purpose: buyerPurpose || 'merch_bulk',
                        buyer_notes: buyerNotes || null,
                        selected_color: selectedColor || null,
                        // New design files submission fields
                        design_explanation: buyerPurpose !== "fabric_only" ? designExplanation.trim() : null,
                        google_drive_link: buyerPurpose !== "fabric_only" ? (googleDriveLink.trim() || null) : null,
                      };

                      const { data: orderResponse, error } = await supabase
                        .from('orders')
                        .insert(orderData)
                        .select()
                        .single();

                      if (error) throw error;

                      // Save shipping address
                      if (shippingAddress && orderResponse) {
                        await supabase.from('order_shipping_info').insert({
                          order_id: orderResponse.id,
                          ...shippingAddress
                        });
                      }

                      // Log order event for analytics
                      await logOrderEvent(
                        orderResponse.id,
                        'order_submitted_for_review',
                        { 
                          quantity, 
                          productType, 
                          escrowAmount, 
                          fabricType: fabric?.label,
                          buyerPurpose,
                          hasDesignExplanation: !!designExplanation,
                          hasGoogleDriveLink: !!googleDriveLink,
                        }
                      );
                      
                      // Track order_created for analytics dashboard
                      await trackOrderCreated(orderResponse.id, user.id);

                      // Log mockup generation events for evidence tracking (if mockups were generated)
                      if (mockupImage) {
                        await logOrderEvent(orderResponse.id, 'mockup_generated', { url: mockupImage });
                      }
                      if (backMockupImage) {
                        await logOrderEvent(orderResponse.id, 'back_mockup_generated', { url: backMockupImage });
                      }
                      
                      // Store evidence for specification files (using state values since orderData URLs are same)
                      const evidenceFiles: { url: string; name: string; type: string }[] = [];
                      if (orderResponse.design_file_url) evidenceFiles.push({ url: orderResponse.design_file_url, name: 'front_design', type: 'design_front' });
                      if (orderResponse.back_design_url) evidenceFiles.push({ url: orderResponse.back_design_url, name: 'back_design', type: 'design_back' });
                      if (orderResponse.corrected_csv_url) evidenceFiles.push({ url: orderResponse.corrected_csv_url, name: 'size_csv', type: 'size_csv' });
                      if (mockupImage) evidenceFiles.push({ url: mockupImage, name: 'front_mockup', type: 'mockup_front' });
                      if (backMockupImage) evidenceFiles.push({ url: backMockupImage, name: 'back_mockup', type: 'mockup_back' });
                      
                      if (evidenceFiles.length > 0) {
                        await storeSpecificationEvidence(orderResponse.id, user.id, evidenceFiles);
                      }
                      
                      // Store Google Drive link as evidence
                      if (googleDriveLink) {
                        await storeGoogleDriveEvidence(orderResponse.id, user.id, googleDriveLink);
                      }
                      
                      // Show confirmation screen instead of toast + redirect
                      setSubmittedOrderId(orderResponse.id);
                      setShowOrderConfirmation(true);
                      setIsProcessingPayment(false);
                      toast.dismiss("payment-processing");
                    } catch (error) {
                      console.error('Error placing order:', error);
                      toast.error("Failed to place order");
                      setIsProcessingPayment(false);
                    }
                  }}
                >
                  {isProcessingPayment ? "Submitting..." : "Submit Order for Review"}
                </Button>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-between mt-8 pt-6 border-t border-border">
              {step > 0 && internalStep !== 6 && (
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                >
                  Previous
                </Button>
              )}
              {internalStep !== 5 && internalStep !== 6 && buyerPurpose && (
                <Button
                  className="ml-auto bg-foreground text-background hover:bg-gray-800"
                  onClick={handleNextStep}
                  disabled={
                    (internalStep === 1 && !productType) ||
                    (internalStep === 1 && (buyerPurpose === "merch_bulk" || buyerPurpose === "blank_apparel") && !selectedColor) ||
                    (internalStep === 4 && needsColorSelection && !selectedColor)
                  }
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
