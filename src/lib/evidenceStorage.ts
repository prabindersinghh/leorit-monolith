import { supabase } from "@/integrations/supabase/client";

export type EvidenceStage = 'sample' | 'bulk' | 'delivery' | 'specification';
export type UploaderRole = 'buyer' | 'manufacturer' | 'admin';

export interface EvidenceItem {
  orderId: string;
  manufacturerId?: string;
  evidenceType: string;
  stage: EvidenceStage;
  fileUrl?: string;
  fileName?: string;
  description?: string;
  uploaderRole: UploaderRole;
  uploaderId?: string;
  metadata?: Record<string, any>;
}

/**
 * Store evidence for an order.
 * Each evidence item is tagged with order_id, manufacturer_id, stage, date, uploader_role.
 */
export async function storeEvidence(evidence: EvidenceItem): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('order_evidence')
      .insert({
        order_id: evidence.orderId,
        manufacturer_id: evidence.manufacturerId || null,
        evidence_type: evidence.evidenceType,
        stage: evidence.stage,
        file_url: evidence.fileUrl || null,
        file_name: evidence.fileName || null,
        description: evidence.description || null,
        uploader_role: evidence.uploaderRole,
        uploader_id: evidence.uploaderId || null,
        metadata: evidence.metadata || null,
      });

    if (error) {
      console.error('Failed to store evidence:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error storing evidence:', err);
    return { success: false, error: 'Unknown error' };
  }
}

/**
 * Store multiple evidence items for an order.
 */
export async function storeMultipleEvidence(items: EvidenceItem[]): Promise<{ success: boolean; error?: string }> {
  try {
    const rows = items.map(evidence => ({
      order_id: evidence.orderId,
      manufacturer_id: evidence.manufacturerId || null,
      evidence_type: evidence.evidenceType,
      stage: evidence.stage,
      file_url: evidence.fileUrl || null,
      file_name: evidence.fileName || null,
      description: evidence.description || null,
      uploader_role: evidence.uploaderRole,
      uploader_id: evidence.uploaderId || null,
      metadata: evidence.metadata || null,
    }));

    const { error } = await supabase.from('order_evidence').insert(rows);

    if (error) {
      console.error('Failed to store evidence:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error storing evidence:', err);
    return { success: false, error: 'Unknown error' };
  }
}

/**
 * Store specification evidence (design files, size charts, etc.)
 */
export async function storeSpecificationEvidence(
  orderId: string,
  buyerId: string,
  files: { url: string; name: string; type: string }[]
): Promise<void> {
  const evidenceItems: EvidenceItem[] = files.map(file => ({
    orderId,
    evidenceType: file.type,
    stage: 'specification' as EvidenceStage,
    fileUrl: file.url,
    fileName: file.name,
    uploaderRole: 'buyer' as UploaderRole,
    uploaderId: buyerId,
  }));

  await storeMultipleEvidence(evidenceItems);
}

/**
 * Store QC video evidence
 */
export async function storeQCEvidence(
  orderId: string,
  manufacturerId: string,
  videoUrl: string,
  stage: 'sample' | 'bulk'
): Promise<void> {
  await storeEvidence({
    orderId,
    manufacturerId,
    evidenceType: `${stage}_qc_video`,
    stage,
    fileUrl: videoUrl,
    uploaderRole: 'manufacturer',
    uploaderId: manufacturerId,
  });
}

/**
 * Store QC approval/rejection evidence with feedback
 */
export async function storeQCDecisionEvidence(
  orderId: string,
  buyerId: string,
  stage: 'sample' | 'bulk',
  decision: 'approved' | 'rejected',
  feedback?: string,
  structuredFeedback?: string
): Promise<void> {
  await storeEvidence({
    orderId,
    evidenceType: `${stage}_qc_${decision}`,
    stage,
    uploaderRole: 'buyer',
    uploaderId: buyerId,
    description: feedback,
    metadata: {
      decision,
      structured_feedback: structuredFeedback,
      timestamp: new Date().toISOString(),
    }
  });
}

/**
 * Store admin QC feedback evidence (structured format)
 */
export async function storeAdminQCFeedback(
  orderId: string,
  adminId: string,
  stage: 'sample' | 'bulk',
  structuredFeedback: string
): Promise<void> {
  await storeEvidence({
    orderId,
    evidenceType: `admin_${stage}_qc_feedback`,
    stage,
    uploaderRole: 'admin',
    uploaderId: adminId,
    description: structuredFeedback,
    metadata: {
      format: 'structured',
      timestamp: new Date().toISOString(),
    }
  });
}

/**
 * Store Google Drive link evidence
 */
export async function storeGoogleDriveEvidence(
  orderId: string,
  buyerId: string,
  driveLink: string
): Promise<void> {
  await storeEvidence({
    orderId,
    evidenceType: 'google_drive_link',
    stage: 'specification',
    fileUrl: driveLink,
    uploaderRole: 'buyer',
    uploaderId: buyerId,
    metadata: {
      link_type: 'google_drive',
    }
  });
}

/**
 * Get all evidence for an order
 */
export async function getOrderEvidence(orderId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('order_evidence')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to get evidence:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error getting evidence:', err);
    return [];
  }
}
