import { supabase } from "@/integrations/supabase/client";

export type OrderFileType = 'spec' | 'qc_sample' | 'qc_bulk' | 'delivery';
export type UploadedBy = 'admin' | 'manufacturer' | 'system' | 'buyer';

export interface OrderFile {
  id: string;
  order_id: string;
  file_type: OrderFileType;
  file_url: string;
  file_name: string;
  uploaded_by: UploadedBy;
  created_at: string;
}

/**
 * Upload a file to the structured orders bucket and track it in order_files table.
 * Path structure: orders/{order_id}/{file_type}/{filename}
 */
export async function uploadOrderFile(
  orderId: string,
  fileType: OrderFileType,
  file: File,
  uploadedBy: UploadedBy
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  try {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${orderId}/${fileType}/${timestamp}_${sanitizedName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('orders')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[orderFileStorage] Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Track in order_files table
    const { error: dbError } = await supabase
      .from('order_files')
      .insert({
        order_id: orderId,
        file_type: fileType,
        file_url: uploadData.path,
        file_name: file.name,
        uploaded_by: uploadedBy,
      });

    if (dbError) {
      console.error('[orderFileStorage] DB insert error:', dbError);
      // File uploaded but tracking failed - still return success
      // The file is in storage, just not tracked
    }

    return { success: true, fileUrl: uploadData.path };
  } catch (err: any) {
    console.error('[orderFileStorage] Unexpected error:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * Track an existing file in the order_files table (for backward compatibility with existing uploads)
 */
export async function trackExistingFile(
  orderId: string,
  fileType: OrderFileType,
  fileUrl: string,
  fileName: string,
  uploadedBy: UploadedBy
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('order_files')
      .insert({
        order_id: orderId,
        file_type: fileType,
        file_url: fileUrl,
        file_name: fileName,
        uploaded_by: uploadedBy,
      });

    if (error) {
      console.error('[orderFileStorage] Track file error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[orderFileStorage] Unexpected error:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * Get all files for an order, optionally filtered by type
 */
export async function getOrderFiles(
  orderId: string,
  fileType?: OrderFileType
): Promise<OrderFile[]> {
  try {
    let query = supabase
      .from('order_files')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (fileType) {
      query = query.eq('file_type', fileType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[orderFileStorage] Get files error:', error);
      return [];
    }

    return (data || []) as OrderFile[];
  } catch (err) {
    console.error('[orderFileStorage] Unexpected error:', err);
    return [];
  }
}

/**
 * Generate a signed URL for viewing/downloading a file
 */
export async function getSignedUrl(
  fileUrl: string,
  bucket: string = 'orders',
  options?: { download?: boolean }
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileUrl, 3600, options);

    if (error) {
      console.error('[orderFileStorage] Signed URL error:', error);
      return null;
    }

    return data?.signedUrl ?? null;
  } catch (err) {
    console.error('[orderFileStorage] Unexpected error:', err);
    return null;
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

/**
 * Check if file is an image
 */
export function isImageFile(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
}

/**
 * Check if file is a video
 */
export function isVideoFile(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return ['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogg'].includes(ext);
}

/**
 * Check if file is a 3D model
 */
export function is3DModelFile(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return ['glb', 'gltf'].includes(ext);
}

/**
 * Check if file is a document
 */
export function isDocumentFile(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'].includes(ext);
}

/**
 * Get file type label for display
 */
export function getFileTypeLabel(fileType: OrderFileType): string {
  const labels: Record<OrderFileType, string> = {
    spec: 'Specifications',
    qc_sample: 'Sample QC',
    qc_bulk: 'Bulk QC',
    delivery: 'Delivery Proof',
  };
  return labels[fileType] || fileType;
}

/**
 * Get file type badge color
 */
export function getFileTypeBadgeColor(fileType: OrderFileType): string {
  const colors: Record<OrderFileType, string> = {
    spec: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    qc_sample: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    qc_bulk: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    delivery: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  };
  return colors[fileType] || 'bg-gray-100 text-gray-800';
}
