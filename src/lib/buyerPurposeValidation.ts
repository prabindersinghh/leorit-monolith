/**
 * Buyer Purpose Validation Guards
 * 
 * Enforces REQUIRED fields before allowing order submission (SUBMITTED state).
 * This is ADD-ONLY - does not change existing UI steps.
 */

export type BuyerPurpose = 'merch_bulk' | 'blank_apparel' | 'fabric_only';

export interface OrderSubmissionData {
  buyerPurpose: BuyerPurpose | null;
  designFileUrl?: string | null;
  backDesignUrl?: string | null;
  csvFileUrl?: string | null;
  fabricType?: string | null;
  selectedColor?: string | null;
  quantity?: number | null;
  productType?: string | null;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Required fields per buyer purpose AT SUBMISSION TIME
 * NOTE: CSV is NOT required at submission - it's validated at bulk transition
 */
const REQUIRED_FIELDS: Record<BuyerPurpose, string[]> = {
  merch_bulk: ['designFile', 'fabric', 'quantity'], // CSV removed - validated at bulk transition
  blank_apparel: ['fabric', 'color', 'quantity'],
  fabric_only: ['fabric', 'quantity'],
};

/**
 * Human-readable field labels for error messages
 */
const FIELD_LABELS: Record<string, string> = {
  designFile: 'Design file',
  csv: 'CSV file with sizes/names',
  fabric: 'Fabric/GSM selection',
  color: 'Color selection',
  quantity: 'Quantity',
  productType: 'Product type',
};

/**
 * Validate order data before submission based on buyer purpose
 * @param data - Order submission data to validate
 * @returns ValidationResult with isValid flag and array of errors
 */
export function validateOrderSubmission(data: OrderSubmissionData): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Buyer purpose must be selected
  if (!data.buyerPurpose) {
    errors.push({
      field: 'buyerPurpose',
      message: 'Please select what you are buying for',
    });
    return { isValid: false, errors };
  }
  
  const requiredFields = REQUIRED_FIELDS[data.buyerPurpose];
  
  // Check each required field
  for (const field of requiredFields) {
    const error = validateField(field, data);
    if (error) {
      errors.push(error);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single field
 */
function validateField(field: string, data: OrderSubmissionData): ValidationError | null {
  const label = FIELD_LABELS[field] || field;
  
  switch (field) {
    case 'designFile':
      // For merch_bulk, at least ONE design file (front OR back) is required
      const hasAnyDesign = !!data.designFileUrl || !!data.backDesignUrl;
      if (!hasAnyDesign) {
        return {
          field: 'designFile',
          message: `${label} is required for merchandise/bulk orders (front or back)`,
        };
      }
      break;
      
    case 'csv':
      // For merch_bulk, CSV is required
      if (!data.csvFileUrl) {
        return {
          field: 'csv',
          message: `${label} is required for merchandise/bulk orders`,
        };
      }
      break;
      
    case 'fabric':
      // Fabric selection required for all purposes
      if (!data.fabricType) {
        return {
          field: 'fabric',
          message: `${label} is required`,
        };
      }
      break;
      
    case 'color':
      // Color required for blank_apparel
      if (!data.selectedColor) {
        return {
          field: 'color',
          message: `${label} is required for blank apparel orders`,
        };
      }
      break;
      
    case 'quantity':
      // Quantity must be valid
      if (!data.quantity || data.quantity < 1) {
        return {
          field: 'quantity',
          message: 'Please enter a valid quantity (minimum 1)',
        };
      }
      break;
  }
  
  return null;
}

/**
 * Get list of missing required fields for a buyer purpose
 * @param purpose - Buyer purpose
 * @param data - Current order data
 * @returns Array of missing field names
 */
export function getMissingFields(purpose: BuyerPurpose, data: OrderSubmissionData): string[] {
  const result = validateOrderSubmission({ ...data, buyerPurpose: purpose });
  return result.errors.map(e => e.field);
}

/**
 * Check if a specific field is required for a buyer purpose
 * @param purpose - Buyer purpose
 * @param field - Field name to check
 * @returns boolean - True if field is required
 */
export function isFieldRequired(purpose: BuyerPurpose, field: string): boolean {
  return REQUIRED_FIELDS[purpose]?.includes(field) ?? false;
}

/**
 * Get all required fields for a buyer purpose
 * @param purpose - Buyer purpose
 * @returns Array of required field names
 */
export function getRequiredFields(purpose: BuyerPurpose): string[] {
  return REQUIRED_FIELDS[purpose] || [];
}

/**
 * Format validation errors for display
 * @param errors - Array of validation errors
 * @returns Formatted string for toast/alert
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0].message;
  return `Please fix the following:\n• ${errors.map(e => e.message).join('\n• ')}`;
}

/**
 * Check if design is required for a buyer purpose
 * @param purpose - Buyer purpose
 * @returns boolean - True if design is required
 */
export function isDesignRequired(purpose: BuyerPurpose): boolean {
  return purpose === 'merch_bulk';
}

/**
 * Check if CSV is required for a buyer purpose AT SUBMISSION
 * NOTE: This returns false - CSV is validated at bulk transition, not submission
 * @param purpose - Buyer purpose
 * @returns boolean - Always false for submission (CSV validated at bulk transition)
 */
export function isCsvRequiredAtSubmission(purpose: BuyerPurpose): boolean {
  return false; // CSV is never required at submission
}

/**
 * Check if CSV is required for bulk production (merch orders with printing)
 * @param purpose - Buyer purpose
 * @returns boolean - True if CSV is required before bulk production
 */
export function isCsvRequiredForBulk(purpose: BuyerPurpose): boolean {
  return purpose === 'merch_bulk';
}

/**
 * Check if color is required for a buyer purpose
 * @param purpose - Buyer purpose
 * @returns boolean - True if color is required
 */
export function isColorRequired(purpose: BuyerPurpose): boolean {
  return purpose === 'blank_apparel';
}
