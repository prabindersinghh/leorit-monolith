/**
 * Order State Machine V2 - Strict Linear State Transitions
 * 
 * This is ADD-ONLY and does not replace the existing orderStateMachine.ts
 * Server-side enforcement is done via database triggers.
 * This file provides client-side helpers for UI and validation.
 */

import { logOrderEvent } from './orderEventLogger';
import { BuyerPurpose, isCsvRequiredForBulk } from './buyerPurposeValidation';

// Order states in strict linear order
export type OrderState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'MANUFACTURER_ASSIGNED'
  | 'SAMPLE_IN_PROGRESS'
  | 'SAMPLE_QC_UPLOADED'
  | 'SAMPLE_APPROVED'
  | 'BULK_UNLOCKED'
  | 'BULK_IN_PRODUCTION'
  | 'BULK_QC_UPLOADED'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'COMPLETED';

// All states in order (for progress tracking)
export const ORDER_STATES: OrderState[] = [
  'DRAFT',
  'SUBMITTED',
  'MANUFACTURER_ASSIGNED',
  'SAMPLE_IN_PROGRESS',
  'SAMPLE_QC_UPLOADED',
  'SAMPLE_APPROVED',
  'BULK_UNLOCKED',
  'BULK_IN_PRODUCTION',
  'BULK_QC_UPLOADED',
  'READY_FOR_DISPATCH',
  'DISPATCHED',
  'DELIVERED',
  'COMPLETED',
];

// Valid transitions map (mirrors server-side logic)
const VALID_TRANSITIONS: Record<OrderState, OrderState[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['MANUFACTURER_ASSIGNED'],
  MANUFACTURER_ASSIGNED: ['SAMPLE_IN_PROGRESS'],
  SAMPLE_IN_PROGRESS: ['SAMPLE_QC_UPLOADED'],
  SAMPLE_QC_UPLOADED: ['SAMPLE_APPROVED'],
  SAMPLE_APPROVED: ['BULK_UNLOCKED', 'COMPLETED'], // Can complete if sample-only order
  BULK_UNLOCKED: ['BULK_IN_PRODUCTION'],
  BULK_IN_PRODUCTION: ['BULK_QC_UPLOADED'],
  BULK_QC_UPLOADED: ['READY_FOR_DISPATCH'],
  READY_FOR_DISPATCH: ['DISPATCHED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
};

// Human-readable labels for each state
export const STATE_LABELS: Record<OrderState, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  MANUFACTURER_ASSIGNED: 'Manufacturer Assigned',
  SAMPLE_IN_PROGRESS: 'Sample In Progress',
  SAMPLE_QC_UPLOADED: 'Sample QC Uploaded',
  SAMPLE_APPROVED: 'Sample Approved',
  BULK_UNLOCKED: 'Bulk Unlocked',
  BULK_IN_PRODUCTION: 'Bulk In Production',
  BULK_QC_UPLOADED: 'Bulk QC Uploaded',
  READY_FOR_DISPATCH: 'Ready for Dispatch',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
};

// State colors for UI badges
export const STATE_COLORS: Record<OrderState, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-700 border-blue-300',
  MANUFACTURER_ASSIGNED: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  SAMPLE_IN_PROGRESS: 'bg-purple-100 text-purple-700 border-purple-300',
  SAMPLE_QC_UPLOADED: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  SAMPLE_APPROVED: 'bg-green-100 text-green-700 border-green-300',
  BULK_UNLOCKED: 'bg-teal-100 text-teal-700 border-teal-300',
  BULK_IN_PRODUCTION: 'bg-orange-100 text-orange-700 border-orange-300',
  BULK_QC_UPLOADED: 'bg-amber-100 text-amber-700 border-amber-300',
  READY_FOR_DISPATCH: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  DISPATCHED: 'bg-sky-100 text-sky-700 border-sky-300',
  DELIVERED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  COMPLETED: 'bg-green-200 text-green-800 border-green-400',
};

/**
 * Check if a state transition is valid
 * @param from - Current state
 * @param to - Target state
 * @returns boolean - True if transition is allowed
 */
export function canTransition(from: OrderState | null | undefined, to: OrderState): boolean {
  // If no current state, only DRAFT is allowed
  if (!from) {
    return to === 'DRAFT';
  }
  
  const allowedTransitions = VALID_TRANSITIONS[from];
  return allowedTransitions?.includes(to) ?? false;
}

/**
 * Get all valid next states from current state
 * @param currentState - Current order state
 * @returns Array of valid next states
 */
export function getValidNextStates(currentState: OrderState | null | undefined): OrderState[] {
  if (!currentState) {
    return ['DRAFT'];
  }
  return VALID_TRANSITIONS[currentState] || [];
}

/**
 * Check if an order is in a terminal state (no further transitions)
 * @param state - Current order state
 * @returns boolean - True if state is terminal
 */
export function isTerminalState(state: OrderState): boolean {
  return VALID_TRANSITIONS[state]?.length === 0;
}

/**
 * Check if buyer can edit the order (only in DRAFT state)
 * @param state - Current order state
 * @returns boolean - True if buyer can edit
 */
export function canBuyerEdit(state: OrderState | null | undefined): boolean {
  return !state || state === 'DRAFT';
}

/**
 * Check if order is locked (buyer edits are not allowed)
 * @param state - Current order state
 * @returns boolean - True if order is locked
 */
export function isOrderLocked(state: OrderState | null | undefined): boolean {
  return !canBuyerEdit(state);
}

/**
 * Get the progress percentage based on current state
 * @param state - Current order state
 * @returns number - Progress percentage (0-100)
 */
export function getStateProgress(state: OrderState | null | undefined): number {
  if (!state) return 0;
  const index = ORDER_STATES.indexOf(state);
  if (index === -1) return 0;
  return Math.round((index / (ORDER_STATES.length - 1)) * 100);
}

/**
 * Check if sample approval is required before a state
 * Enforces: SAMPLE_APPROVED is mandatory before BULK_UNLOCKED
 * @param targetState - Target state to transition to
 * @param currentState - Current state
 * @returns boolean - True if sample must be approved first
 */
export function requiresSampleApproval(targetState: OrderState): boolean {
  const bulkStates: OrderState[] = [
    'BULK_UNLOCKED',
    'BULK_IN_PRODUCTION',
    'BULK_QC_UPLOADED',
    'READY_FOR_DISPATCH',
  ];
  return bulkStates.includes(targetState);
}

/**
 * Check if bulk QC is required before a state
 * Enforces: BULK_QC_UPLOADED required before READY_FOR_DISPATCH
 * @param targetState - Target state to transition to
 * @returns boolean - True if bulk QC must be uploaded first
 */
export function requiresBulkQC(targetState: OrderState): boolean {
  const dispatchStates: OrderState[] = [
    'READY_FOR_DISPATCH',
    'DISPATCHED',
    'DELIVERED',
  ];
  return dispatchStates.includes(targetState);
}

/**
 * Get state index for ordering/comparison
 * @param state - Order state
 * @returns number - Index in state progression (-1 if not found)
 */
export function getStateIndex(state: OrderState | null | undefined): number {
  if (!state) return -1;
  return ORDER_STATES.indexOf(state);
}

/**
 * Check if state A comes before state B
 * @param stateA - First state
 * @param stateB - Second state
 * @returns boolean - True if stateA comes before stateB
 */
export function isStateBefore(stateA: OrderState, stateB: OrderState): boolean {
  return getStateIndex(stateA) < getStateIndex(stateB);
}

/**
 * Check if state A comes after state B
 * @param stateA - First state
 * @param stateB - Second state
 * @returns boolean - True if stateA comes after stateB
 */
export function isStateAfter(stateA: OrderState, stateB: OrderState): boolean {
  return getStateIndex(stateA) > getStateIndex(stateB);
}

/**
 * Log a state transition event (wrapper for analytics)
 * @param orderId - Order ID
 * @param fromState - Previous state
 * @param toState - New state
 */
export async function logStateTransition(
  orderId: string,
  fromState: OrderState | null,
  toState: OrderState
): Promise<void> {
  await logOrderEvent(orderId, 'state_transition' as any, {
    from_state: fromState,
    to_state: toState,
    client_timestamp: new Date().toISOString(),
  });
}

/**
 * Validate a proposed state transition and return error message if invalid
 * @param from - Current state
 * @param to - Target state
 * @returns string | null - Error message if invalid, null if valid
 */
export function validateTransition(
  from: OrderState | null | undefined,
  to: OrderState
): string | null {
  if (canTransition(from, to)) {
    return null;
  }
  
  if (!from) {
    return `Orders must start in DRAFT state. Cannot create order in ${to} state.`;
  }
  
  if (isTerminalState(from)) {
    return `Order is in terminal state (${STATE_LABELS[from]}). No further transitions allowed.`;
  }
  
  const validNext = getValidNextStates(from);
  if (validNext.length === 0) {
    return `No valid transitions from ${STATE_LABELS[from]}.`;
  }
  
  return `Invalid transition: ${STATE_LABELS[from]} → ${STATE_LABELS[to]}. Valid next states: ${validNext.map(s => STATE_LABELS[s]).join(', ')}.`;
}

// ============= CSV VALIDATION GUARDS =============

export interface CsvValidationData {
  orderId: string;
  buyerPurpose: BuyerPurpose | null;
  csvFileUrl?: string | null;
  correctedCsvUrl?: string | null;
}

export interface CsvValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if CSV is required for bulk production based on buyer purpose
 * CSV is ONLY required for merch_bulk orders (orders with printing)
 * @param buyerPurpose - The buyer's order purpose
 * @returns boolean - True if CSV is required for bulk transition
 */
export function requiresCsvForBulk(buyerPurpose: BuyerPurpose | null): boolean {
  if (!buyerPurpose) return false;
  return isCsvRequiredForBulk(buyerPurpose);
}

/**
 * Check if order has valid CSV uploaded
 * @param data - CSV validation data
 * @returns boolean - True if CSV is present
 */
export function hasCsvUploaded(data: CsvValidationData): boolean {
  return !!(data.csvFileUrl || data.correctedCsvUrl);
}

/**
 * Validate if order can transition to bulk states (BULK_UNLOCKED or BULK_IN_PRODUCTION)
 * CSV is required ONLY for merch_bulk orders
 * 
 * @param targetState - Target state to transition to
 * @param data - CSV validation data including order context
 * @returns CsvValidationResult with allowed flag and reason if blocked
 */
export function validateCsvForBulkTransition(
  targetState: OrderState,
  data: CsvValidationData
): CsvValidationResult {
  // Only validate for bulk transition states
  const bulkTransitionStates: OrderState[] = ['BULK_UNLOCKED', 'BULK_IN_PRODUCTION'];
  if (!bulkTransitionStates.includes(targetState)) {
    return { allowed: true };
  }
  
  // Check if CSV is required for this order type
  if (!requiresCsvForBulk(data.buyerPurpose)) {
    // CSV not required for blank_apparel, fabric_only, sample_only
    return { allowed: true };
  }
  
  // For merch_bulk orders, CSV must be uploaded before bulk production
  if (!hasCsvUploaded(data)) {
    return {
      allowed: false,
      reason: 'CSV required before bulk production. Please upload CSV with sizes and names.',
    };
  }
  
  return { allowed: true };
}

/**
 * Log CSV upload event
 * @param orderId - Order ID
 * @param csvUrl - URL of uploaded CSV
 */
export async function logCsvUploaded(orderId: string, csvUrl: string): Promise<void> {
  await logOrderEvent(orderId, 'csv_uploaded', {
    csv_url: csvUrl,
    uploaded_at: new Date().toISOString(),
  });
}

/**
 * Log CSV validation gate passed (bulk transition allowed)
 * @param orderId - Order ID
 * @param targetState - Target state being transitioned to
 */
export async function logCsvValidationPassed(orderId: string, targetState: OrderState): Promise<void> {
  await logOrderEvent(orderId, 'csv_validation_passed', {
    target_state: targetState,
    validated_at: new Date().toISOString(),
  });
}

/**
 * Log CSV validation blocked (bulk transition denied)
 * @param orderId - Order ID
 * @param targetState - Target state that was blocked
 * @param reason - Reason for blocking
 */
export async function logCsvValidationBlocked(
  orderId: string,
  targetState: OrderState,
  reason: string
): Promise<void> {
  await logOrderEvent(orderId, 'csv_validation_blocked', {
    target_state: targetState,
    reason,
    blocked_at: new Date().toISOString(),
  });
}

/**
 * Full validation for bulk state transition including CSV check
 * Combines standard transition validation with CSV guard
 * 
 * @param from - Current state
 * @param to - Target state
 * @param csvData - CSV validation data
 * @returns string | null - Error message if invalid, null if valid
 */
export function validateBulkTransitionWithCsv(
  from: OrderState | null | undefined,
  to: OrderState,
  csvData: CsvValidationData
): string | null {
  // First check standard transition validity
  const transitionError = validateTransition(from, to);
  if (transitionError) {
    return transitionError;
  }
  
  // Then check CSV guard for bulk transitions
  const csvResult = validateCsvForBulkTransition(to, csvData);
  if (!csvResult.allowed) {
    return csvResult.reason || 'CSV validation failed';
  }
  
  return null;
}
