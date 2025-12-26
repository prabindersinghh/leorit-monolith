/**
 * Sample QC Workflow Enforcement
 * 
 * Enforces state transitions for sample QC workflow:
 * - Manufacturer must upload QC video for SAMPLE_QC_UPLOADED
 * - Buyer can Approve, Reject (reason mandatory), Request revision (reason mandatory)
 * - BULK_UNLOCKED only after SAMPLE_APPROVED
 * - All actions timestamped and logged
 * 
 * This is ADD-ONLY enforcement logic.
 */

import { OrderState, canTransition } from './orderStateMachineV2';

export interface SampleQCOrder {
  id: string;
  order_state?: OrderState | null;
  detailed_status?: string | null;
  qc_video_url?: string | null;
  qc_files?: string[] | null;
  sample_qc_video_url?: string | null;
  qc_uploaded_at?: string | null;
  sample_approved_at?: string | null;
  order_mode?: string | null;
  order_intent?: string | null;
}

export interface QCTransitionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if manufacturer can transition to SAMPLE_QC_UPLOADED
 * Requires: QC video must be uploaded
 */
export function canUploadSampleQC(order: SampleQCOrder): QCTransitionResult {
  // Check current state allows transition
  const currentState = order.order_state;
  if (currentState && !canTransition(currentState, 'SAMPLE_QC_UPLOADED')) {
    return {
      allowed: false,
      reason: `Cannot upload QC from current state: ${currentState}. Must be in SAMPLE_IN_PROGRESS.`,
    };
  }
  
  return { allowed: true };
}

/**
 * Validate that QC video is present before allowing SAMPLE_QC_UPLOADED
 */
export function validateQCVideoUploaded(order: SampleQCOrder, newVideoUrl?: string): QCTransitionResult {
  const hasExistingVideo = !!(
    order.qc_video_url ||
    order.sample_qc_video_url ||
    (order.qc_files && order.qc_files.length > 0)
  );
  
  if (!hasExistingVideo && !newVideoUrl) {
    return {
      allowed: false,
      reason: 'QC video is mandatory. Please upload a sample QC video before proceeding.',
    };
  }
  
  return { allowed: true };
}

/**
 * Check if buyer can approve sample
 * Requires: Order must be in SAMPLE_QC_UPLOADED state
 */
export function canApproveSample(order: SampleQCOrder): QCTransitionResult {
  const currentState = order.order_state;
  
  // Must have QC video uploaded
  const hasVideo = !!(
    order.qc_video_url ||
    order.sample_qc_video_url ||
    (order.qc_files && order.qc_files.length > 0)
  );
  
  if (!hasVideo) {
    return {
      allowed: false,
      reason: 'Cannot approve: No QC video has been uploaded yet.',
    };
  }
  
  // Check state transition
  if (currentState && !canTransition(currentState, 'SAMPLE_APPROVED')) {
    return {
      allowed: false,
      reason: `Cannot approve from current state: ${currentState}. Must be in SAMPLE_QC_UPLOADED.`,
    };
  }
  
  return { allowed: true };
}

/**
 * Check if buyer can reject sample
 * Requires: Order must be in SAMPLE_QC_UPLOADED state AND reason must be provided
 */
export function canRejectSample(order: SampleQCOrder, reason?: string): QCTransitionResult {
  const currentState = order.order_state;
  
  // Must have QC video uploaded to reject it
  const hasVideo = !!(
    order.qc_video_url ||
    order.sample_qc_video_url ||
    (order.qc_files && order.qc_files.length > 0)
  );
  
  if (!hasVideo) {
    return {
      allowed: false,
      reason: 'Cannot reject: No QC video has been uploaded yet.',
    };
  }
  
  // Reason is mandatory for rejection
  if (!reason || reason.trim().length === 0) {
    return {
      allowed: false,
      reason: 'Rejection reason is mandatory. Please provide a reason for rejecting the sample.',
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
 * Check if buyer can request revision
 * Requires: Order must be in SAMPLE_QC_UPLOADED state AND reason must be provided
 */
export function canRequestRevision(order: SampleQCOrder, reason?: string): QCTransitionResult {
  const currentState = order.order_state;
  
  // Must have QC video uploaded to request revision
  const hasVideo = !!(
    order.qc_video_url ||
    order.sample_qc_video_url ||
    (order.qc_files && order.qc_files.length > 0)
  );
  
  if (!hasVideo) {
    return {
      allowed: false,
      reason: 'Cannot request revision: No QC video has been uploaded yet.',
    };
  }
  
  // Reason is mandatory for revision request
  if (!reason || reason.trim().length === 0) {
    return {
      allowed: false,
      reason: 'Revision reason is mandatory. Please specify what needs to be revised.',
    };
  }
  
  if (reason.trim().length < 10) {
    return {
      allowed: false,
      reason: 'Please provide more details about the revision needed (minimum 10 characters).',
    };
  }
  
  return { allowed: true };
}

/**
 * Check if bulk production can be unlocked
 * CRITICAL: BULK_UNLOCKED only after SAMPLE_APPROVED
 */
export function canUnlockBulk(order: SampleQCOrder): QCTransitionResult {
  // Sample must be approved first
  if (!order.sample_approved_at) {
    return {
      allowed: false,
      reason: 'Bulk production cannot be unlocked: Sample must be approved first.',
    };
  }
  
  // Check state transition
  const currentState = order.order_state;
  if (currentState && !canTransition(currentState, 'BULK_UNLOCKED')) {
    return {
      allowed: false,
      reason: `Cannot unlock bulk from current state: ${currentState}. Must be in SAMPLE_APPROVED.`,
    };
  }
  
  return { allowed: true };
}

/**
 * Create timestamp for QC action
 */
export function createQCTimestamp(): string {
  return new Date().toISOString();
}

/**
 * QC Action types for logging
 */
export type QCActionType = 
  | 'sample_qc_uploaded'
  | 'sample_approved'
  | 'sample_rejected'
  | 'sample_revision_requested'
  | 'bulk_unlocked';

/**
 * Create metadata for QC action logging
 */
export function createQCActionMetadata(
  actionType: QCActionType,
  order: SampleQCOrder,
  additionalData?: Record<string, any>
): Record<string, any> {
  return {
    action: actionType,
    order_mode: order.order_mode,
    order_intent: order.order_intent,
    timestamp: createQCTimestamp(),
    ...additionalData,
  };
}
