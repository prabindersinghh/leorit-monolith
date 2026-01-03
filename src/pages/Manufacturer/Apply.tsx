import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/leorit-logo.png";

const MANUFACTURING_CATEGORIES = [
  { id: "tshirts", label: "T-Shirts" },
  { id: "hoodies", label: "Hoodies" },
  { id: "apparel_stitching", label: "Apparel Stitching" },
  { id: "printing", label: "Printing (DTF / Screen / Sublimation)" },
  { id: "fabric_processing", label: "Fabric Processing" },
  { id: "fabric_supply", label: "Fabric Supply" },
  { id: "other", label: "Other" },
];

const ManufacturerApply = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    categories: [] as string[],
    otherCategory: "",
    capacity: "",
    yearsActive: "",
    notes: "",
  });

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      categories: checked
        ? [...prev.categories, categoryId]
        : prev.categories.filter(c => c !== categoryId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.companyName || !formData.contactName || !formData.phone || 
        !formData.email || !formData.city || !formData.state || 
        formData.categories.length === 0 || !formData.capacity) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare categories array - include "other" text if selected
      const categoriesArray = formData.categories.map(cat => {
        if (cat === "other" && formData.otherCategory) {
          return `Other: ${formData.otherCategory}`;
        }
        return MANUFACTURING_CATEGORIES.find(c => c.id === cat)?.label || cat;
      });

      const location = `${formData.city}, ${formData.state}`;

      const { error } = await supabase
        .from("manufacturer_onboarding_requests")
        .insert({
          company_name: formData.companyName.trim(),
          contact_name: formData.contactName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim().toLowerCase(),
          location: location,
          categories: categoriesArray,
          capacity: formData.capacity.trim(),
          years_active: formData.yearsActive.trim() || null,
          notes: formData.notes.trim() || null,
        });

      if (error) throw error;

      setIsSubmitted(true);
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmation screen after successful submission
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Leorit.ai" className="w-10 h-10 object-contain" />
              <span className="text-xl font-semibold text-foreground">Leorit.ai</span>
            </Link>
          </div>
        </header>

        <main className="py-16 px-6">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Application Submitted
            </h1>
            
            <p className="text-muted-foreground mb-8">
              Thank you for your interest in working with Leorit.ai.<br />
              Our team reviews every manufacturer manually to ensure quality and execution standards.
            </p>

            <Card className="border-border text-left mb-8">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  • Our operations team will contact you within 24 hours
                </p>
                <p className="text-muted-foreground text-sm">
                  • You may also email us directly with additional details
                </p>
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" />
              <a href="mailto:contact@leorit.xyz" className="hover:text-foreground transition-colors">
                contact@leorit.xyz
              </a>
            </div>

            <div className="mt-8">
              <Link to="/">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Leorit.ai" className="w-10 h-10 object-contain" />
            <span className="text-xl font-semibold text-foreground">Leorit.ai</span>
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      <main className="py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <Card className="border-border">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-3xl font-bold">Work With Leorit.ai</CardTitle>
              <p className="text-muted-foreground mt-2">
                Submit your details and our team will review your application
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground border-b border-border pb-2">
                    Basic Information
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company / Factory Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Enter company or factory name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactName">Owner / Primary Contact Name *</Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                      placeholder="Enter contact person's name"
                      required
                    />
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground border-b border-border pb-2">
                    Contact Details
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone / WhatsApp *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+91 XXXXX XXXXX"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="City"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="State"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Manufacturing Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground border-b border-border pb-2">
                    Manufacturing Details
                  </h3>
                  
                  <div className="space-y-3">
                    <Label>Manufacturing Categories * (select all that apply)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {MANUFACTURING_CATEGORIES.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={category.id}
                            checked={formData.categories.includes(category.id)}
                            onCheckedChange={(checked) => 
                              handleCategoryChange(category.id, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={category.id}
                            className="text-sm text-muted-foreground cursor-pointer"
                          >
                            {category.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    
                    {formData.categories.includes("other") && (
                      <Input
                        value={formData.otherCategory}
                        onChange={(e) => setFormData(prev => ({ ...prev, otherCategory: e.target.value }))}
                        placeholder="Please specify other category"
                        className="mt-2"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacity">Monthly Production Capacity *</Label>
                    <Input
                      id="capacity"
                      value={formData.capacity}
                      onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                      placeholder="e.g., 5,000 pcs / month"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="yearsActive">Years in Operation (optional)</Label>
                    <Input
                      id="yearsActive"
                      value={formData.yearsActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, yearsActive: e.target.value }))}
                      placeholder="e.g., 5 years"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground border-b border-border pb-2">
                    Additional Information
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Short Description / Remarks (optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Tell us about your factory, specializations, or any additional details..."
                      rows={4}
                    />
                  </div>
                </div>

                {/* What you get section */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-foreground">What you get with Leorit.ai:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                      <span>Qualified buyers with clear requirements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                      <span>Frozen specs — no last-minute changes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                      <span>Structured QC process</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                      <span>Payment certainty upon approval</span>
                    </li>
                  </ul>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ManufacturerApply;
