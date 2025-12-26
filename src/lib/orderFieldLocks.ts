/**
 * Order Field Locking based on order_state
 * 
 * Enforces read-only fields after specific state transitions:
 * - Buyer notes → read-only after SUBMITTED
 * - Fabric / color / specs → read-only after SAMPLE_APPROVED
 * - Quantity → locked after SUBMITTED
 * 
 * This is ADD-ONLY enforcement logic.
 */

import { OrderState, getStateIndex, ORDER_STATES } from './orderStateMachineV2';

/**
 * Field categories that can be locked
 */
export type LockableField = 
  | 'buyer_notes'
  | 'fabric_type'
  | 'selected_color'
  | 'quantity'
  | 'design_size'
  | 'product_type'
  | 'shipping_address';

/**
 * Lock thresholds - after which state each field becomes read-only
 */
const FIELD_LOCK_THRESHOLDS: Record<LockableField, OrderState> = {
  buyer_notes: 'SUBMITTED',
  quantity: 'SUBMITTED',
  fabric_type: 'SAMPLE_APPROVED',
  selected_color: 'SAMPLE_APPROVED',
  design_size: 'SAMPLE_APPROVED',
  product_type: 'SUBMITTED',
  shipping_address: 'DISPATCHED',
};

/**
 * Human-readable labels for locked fields
 */
const FIELD_LABELS: Record<LockableField, string> = {
  buyer_notes: 'Buyer Notes',
  quantity: 'Quantity',
  fabric_type: 'Fabric Type',
  selected_color: 'Color',
  design_size: 'Design Size',
  product_type: 'Product Type',
  shipping_address: 'Shipping Address',
};

/**
 * Check if a field is locked based on current order state
 * @param field - The field to check
 * @param currentState - Current order state
 * @returns boolean - True if field is locked (read-only)
 */
export function isFieldLocked(
  field: LockableField,
  currentState: OrderState | null | undefined
): boolean {
  if (!currentState) {
    return false; // No state = not locked (DRAFT or new order)
  }
  
  const lockThreshold = FIELD_LOCK_THRESHOLDS[field];
  if (!lockThreshold) {
    return false;
  }
  
  const currentIndex = getStateIndex(currentState);
  const thresholdIndex = getStateIndex(lockThreshold);
  
  // Field is locked if current state is at or past the threshold
  return currentIndex >= thresholdIndex;
}

/**
 * Check if buyer notes are locked
 * Locked after: SUBMITTED
 */
export function isBuyerNotesLocked(currentState: OrderState | null | undefined): boolean {
  return isFieldLocked('buyer_notes', currentState);
}

/**
 * Check if quantity is locked
 * Locked after: SUBMITTED
 */
export function isQuantityLocked(currentState: OrderState | null | undefined): boolean {
  return isFieldLocked('quantity', currentState);
}

/**
 * Check if fabric selection is locked
 * Locked after: SAMPLE_APPROVED
 */
export function isFabricLocked(currentState: OrderState | null | undefined): boolean {
  return isFieldLocked('fabric_type', currentState);
}

/**
 * Check if color selection is locked
 * Locked after: SAMPLE_APPROVED
 */
export function isColorLocked(currentState: OrderState | null | undefined): boolean {
  return isFieldLocked('selected_color', currentState);
}

/**
 * Check if product specs are locked (fabric, color, design size)
 * Locked after: SAMPLE_APPROVED
 */
export function areSpecsLocked(currentState: OrderState | null | undefined): boolean {
  return isFabricLocked(currentState) && isColorLocked(currentState);
}

/**
 * Check if product type is locked
 * Locked after: SUBMITTED
 */
export function isProductTypeLocked(currentState: OrderState | null | undefined): boolean {
  return isFieldLocked('product_type', currentState);
}

/**
 * Check if shipping address is locked
 * Locked after: DISPATCHED
 */
export function isShippingLocked(currentState: OrderState | null | undefined): boolean {
  return isFieldLocked('shipping_address', currentState);
}

/**
 * Get lock status for multiple fields at once
 * @param currentState - Current order state
 * @returns Object with lock status for each field
 */
export function getFieldLockStatus(currentState: OrderState | null | undefined): Record<LockableField, boolean> {
  return {
    buyer_notes: isFieldLocked('buyer_notes', currentState),
    quantity: isFieldLocked('quantity', currentState),
    fabric_type: isFieldLocked('fabric_type', currentState),
    selected_color: isFieldLocked('selected_color', currentState),
    design_size: isFieldLocked('design_size', currentState),
    product_type: isFieldLocked('product_type', currentState),
    shipping_address: isFieldLocked('shipping_address', currentState),
  };
}

/**
 * Get reason why a field is locked
 * @param field - The locked field
 * @returns Human-readable lock reason
 */
export function getFieldLockReason(field: LockableField): string {
  const threshold = FIELD_LOCK_THRESHOLDS[field];
  const label = FIELD_LABELS[field];
  
  switch (threshold) {
    case 'SUBMITTED':
      return `${label} cannot be changed after order submission.`;
    case 'SAMPLE_APPROVED':
      return `${label} is locked after sample approval to maintain manufacturing consistency.`;
    case 'DISPATCHED':
      return `${label} cannot be changed after order is dispatched.`;
    default:
      return `${label} is locked at this stage.`;
  }
}

/**
 * Get all locked fields for current state
 * @param currentState - Current order state
 * @returns Array of locked field names with reasons
 */
export function getLockedFields(currentState: OrderState | null | undefined): Array<{
  field: LockableField;
  label: string;
  reason: string;
}> {
  if (!currentState) return [];
  
  const lockedFields: Array<{ field: LockableField; label: string; reason: string }> = [];
  
  for (const field of Object.keys(FIELD_LOCK_THRESHOLDS) as LockableField[]) {
    if (isFieldLocked(field, currentState)) {
      lockedFields.push({
        field,
        label: FIELD_LABELS[field],
        reason: getFieldLockReason(field),
      });
    }
  }
  
  return lockedFields;
}

/**
 * Validate if an update to a field is allowed
 * @param field - Field being updated
 * @param currentState - Current order state
 * @returns Object with allowed flag and optional error message
 */
export function validateFieldUpdate(
  field: LockableField,
  currentState: OrderState | null | undefined
): { allowed: boolean; error?: string } {
  if (isFieldLocked(field, currentState)) {
    return {
      allowed: false,
      error: getFieldLockReason(field),
    };
  }
  return { allowed: true };
}

/**
 * Check if order is in editable state (before SUBMITTED)
 * @param currentState - Current order state
 * @returns boolean - True if order can be edited
 */
export function isOrderEditable(currentState: OrderState | null | undefined): boolean {
  if (!currentState) return true;
  return currentState === 'DRAFT';
}

/**
 * Get edit restriction message for current state
 * @param currentState - Current order state
 * @returns Human-readable restriction message
 */
export function getEditRestrictionMessage(currentState: OrderState | null | undefined): string | null {
  if (!currentState || currentState === 'DRAFT') {
    return null;
  }
  
  if (getStateIndex(currentState) >= getStateIndex('SAMPLE_APPROVED')) {
    return 'This order has been approved. Specifications are locked for manufacturing consistency.';
  }
  
  if (getStateIndex(currentState) >= getStateIndex('SUBMITTED')) {
    return 'This order has been submitted. Some fields are now read-only.';
  }
  
  return null;
}
