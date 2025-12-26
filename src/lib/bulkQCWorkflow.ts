/**
 * Bulk QC Workflow Enforcement
 * 
 * Enforces state transitions for bulk QC workflow:
 * - Manufacturer must upload bulk QC video for BULK_QC_UPLOADED
 * - BULK_QC_UPLOADED required before READY_FOR_DISPATCH
 * - Buyer must Approve or Reject bulk QC
 * - Rejection requires mandatory reason
 * - All actions timestamped and logged
 * 
 * Bulk QC video requirements:
 * - Randomly sampled units
 * - Front + back views
 * - Print + stitching quality
 * - Packaging proof (sealed cartons, quantity visible)
 * 
 * This is ADD-ONLY enforcement logic.
 */

import { OrderState, canTransition } from './orderStateMachineV2';

export interface BulkQCOrder {
  id: string;
  order_state?: OrderState | null;
  detailed_status?: string | null;
  bulk_qc_video_url?: string | null;
  bulk_qc_uploaded_at?: string | null;
  bulk_qc_approved_at?: string | null;
  order_mode?: string | null;
  order_intent?: string | null;
  quantity?: number;
  sample_approved_at?: string | null;
}

export interface BulkQCTransitionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Bulk QC video requirements checklist
 */
export const BULK_QC_REQUIREMENTS = [
  'Randomly sampled units from the batch',
  'Front and back views of products',
  'Print quality close-up',
  'Stitching quality close-up',
  'Packaging proof (sealed cartons with quantity visible)',
] as const;

/**
 * Check if manufacturer can upload bulk QC
 * Requires: Order must be in BULK_IN_PRODUCTION state
 */
export function canUploadBulkQC(order: BulkQCOrder): BulkQCTransitionResult {
  const currentState = order.order_state;
  
  // Check current state allows transition
  if (currentState && !canTransition(currentState, 'BULK_QC_UPLOADED')) {
    return {
      allowed: false,
      reason: `Cannot upload bulk QC from current state: ${currentState}. Must be in BULK_IN_PRODUCTION.`,
    };
  }
  
  return { allowed: true };
}

/**
 * Validate that bulk QC video is present before allowing BULK_QC_UPLOADED
 */
export function validateBulkQCVideoUploaded(order: BulkQCOrder, newVideoUrl?: string): BulkQCTransitionResult {
  const hasExistingVideo = !!order.bulk_qc_video_url;
  
  if (!hasExistingVideo && !newVideoUrl) {
    return {
      allowed: false,
      reason: 'Bulk QC video is mandatory. Please upload a bulk QC video showing: randomly sampled units, front+back views, print+stitching quality, and packaging proof.',
    };
  }
  
  return { allowed: true };
}

/**
 * Check if order can transition to READY_FOR_DISPATCH
 * CRITICAL: BULK_QC_UPLOADED is required before READY_FOR_DISPATCH
 */
export function canTransitionToReadyForDispatch(order: BulkQCOrder): BulkQCTransitionResult {
  // Must have bulk QC video uploaded
  if (!order.bulk_qc_video_url) {
    return {
      allowed: false,
      reason: 'Cannot proceed to dispatch: Bulk QC video must be uploaded first.',
    };
  }
  
  // Must be in BULK_QC_UPLOADED state
  const currentState = order.order_state;
  if (currentState !== 'BULK_QC_UPLOADED') {
    return {
      allowed: false,
      reason: `Cannot proceed to dispatch from current state: ${currentState}. Must be in BULK_QC_UPLOADED.`,
    };
  }
  
  // Check state transition is valid
  if (currentState && !canTransition(currentState, 'READY_FOR_DISPATCH')) {
    return {
      allowed: false,
      reason: `Invalid state transition from ${currentState} to READY_FOR_DISPATCH.`,
    };
  }
  
  return { allowed: true };
}

/**
 * Check if buyer can approve bulk QC
 * Requires: Order must be in BULK_QC_UPLOADED state with video uploaded
 */
export function canApproveBulkQC(order: BulkQCOrder): BulkQCTransitionResult {
  // Must have bulk QC video uploaded
  if (!order.bulk_qc_video_url) {
    return {
      allowed: false,
      reason: 'Cannot approve: No bulk QC video has been uploaded yet.',
    };
  }
  
  // Check state - must be in BULK_QC_UPLOADED
  const currentState = order.order_state;
  if (currentState !== 'BULK_QC_UPLOADED') {
    return {
      allowed: false,
      reason: `Cannot approve bulk QC from current state: ${currentState}. Must be in BULK_QC_UPLOADED.`,
    };
  }
  
  return { allowed: true };
}

/**
 * Check if buyer can reject bulk QC
 * Requires: Order must be in BULK_QC_UPLOADED state AND reason must be provided
 */
export function canRejectBulkQC(order: BulkQCOrder, reason?: string): BulkQCTransitionResult {
  // Must have bulk QC video uploaded to reject it
  if (!order.bulk_qc_video_url) {
    return {
      allowed: false,
      reason: 'Cannot reject: No bulk QC video has been uploaded yet.',
    };
  }
  
  // Check state - must be in BULK_QC_UPLOADED
  const currentState = order.order_state;
  if (currentState !== 'BULK_QC_UPLOADED') {
    return {
      allowed: false,
      reason: `Cannot reject bulk QC from current state: ${currentState}. Must be in BULK_QC_UPLOADED.`,
    };
  }
  
  // Reason is mandatory for rejection
  if (!reason || reason.trim().length === 0) {
    return {
      allowed: false,
      reason: 'Rejection reason is mandatory. Please provide a reason for rejecting the bulk QC.',
    };
  }
  
  if (reason.trim().length < 10) {
    return {
      allowed: false,
      reason: 'Please provide a more detailed rejection reason (minimum 10 characters).',
    };
  }
  
  return { allowed: true };
}

/**
 * Create timestamp for bulk QC action
 */
export function createBulkQCTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Bulk QC Action types for logging
 */
export type BulkQCActionType = 
  | 'bulk_qc_uploaded'
  | 'bulk_qc_approved'
  | 'bulk_qc_rejected'
  | 'ready_for_dispatch';

/**
 * Create metadata for bulk QC action logging
 */
export function createBulkQCActionMetadata(
  actionType: BulkQCActionType,
  order: BulkQCOrder,
  additionalData?: Record<string, any>
): Record<string, any> {
  return {
    action: actionType,
    order_mode: order.order_mode,
    order_intent: order.order_intent,
    quantity: order.quantity,
    timestamp: createBulkQCTimestamp(),
    ...additionalData,
  };
}
