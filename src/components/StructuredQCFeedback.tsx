/**
 * Structured QC Feedback Component (Admin-Only)
 * 
 * Mandatory admin-only text field for every QC decision.
 * Required for any QC rejection.
 * 
 * Format:
 * Defect Type:
 * Severity:
 * Location:
 * Evidence reference:
 * Required fix:
 * Notes:
 */

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

interface StructuredQCFeedbackProps {
  value: string;
  onChange: (value: string) => void;
  isRequired?: boolean;
  stage?: 'sample' | 'bulk';
  readOnly?: boolean;
}

const FEEDBACK_TEMPLATE = `Defect Type:
Severity:
Location:
Evidence reference:
Required fix:
Notes:`;

const StructuredQCFeedback = ({ 
  value, 
  onChange, 
  isRequired = false, 
  stage = 'sample',
  readOnly = false 
}: StructuredQCFeedbackProps) => {
  const [internalValue, setInternalValue] = useState(value || FEEDBACK_TEMPLATE);

  useEffect(() => {
    if (value) {
      setInternalValue(value);
    } else if (!readOnly) {
      setInternalValue(FEEDBACK_TEMPLATE);
      onChange(FEEDBACK_TEMPLATE);
    }
  }, [value, readOnly]);

  const handleChange = (newValue: string) => {
    setInternalValue(newValue);
    onChange(newValue);
  };

  // Validate that required fields are filled
  const validateFeedback = (text: string): boolean => {
    if (!isRequired) return true;
    
    const lines = text.split('\n');
    const requiredFields = ['Defect Type:', 'Severity:', 'Location:', 'Required fix:'];
    
    for (const field of requiredFields) {
      const line = lines.find(l => l.startsWith(field));
      if (!line) return false;
      const value = line.replace(field, '').trim();
      if (!value || value.length < 2) return false;
    }
    
    return true;
  };

  const isValid = validateFeedback(internalValue);

  if (readOnly) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">
          QC Feedback (Structured)
        </Label>
        <div className="p-4 bg-muted rounded-lg">
          <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
            {value || 'No feedback provided'}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground">
          QC Feedback (Structured) {isRequired && <span className="text-red-500">*</span>}
        </Label>
        <span className="text-xs text-muted-foreground">
          {stage === 'sample' ? 'Sample' : 'Bulk'} QC
        </span>
      </div>
      
      <Textarea
        value={internalValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={FEEDBACK_TEMPLATE}
        className={`min-h-40 font-mono text-sm ${
          isRequired && !isValid ? 'border-red-300 focus:border-red-500' : ''
        }`}
      />

      {isRequired && (
        <div className="flex items-start gap-2 text-xs">
          <AlertCircle className={`w-4 h-4 mt-0.5 ${isValid ? 'text-green-500' : 'text-amber-500'}`} />
          <p className={isValid ? 'text-green-600' : 'text-amber-600'}>
            {isValid 
              ? 'Required fields filled. This data will be used for ML training.'
              : 'Fill in Defect Type, Severity, Location, and Required fix fields.'}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        This structured feedback will be stored permanently and used for quality analytics and ML labeling.
      </p>
    </div>
  );
};

export default StructuredQCFeedback;
