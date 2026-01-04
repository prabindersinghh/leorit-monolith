import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEventName =
  | 'homepage_visit'
  | 'buyer_cta_click'
  | 'manufacturer_cta_click'
  | 'order_created'
  | 'sample_qc_approved'
  | 'bulk_qc_approved';

export type UserRole = 'buyer' | 'manufacturer' | 'admin' | 'anonymous';

/**
 * Logs an analytics event to the analytics_events table.
 * This is add-only instrumentation - silent fail on error.
 */
export async function logAnalyticsEvent(
  eventName: AnalyticsEventName,
  options?: {
    orderId?: string;
    userId?: string;
    userRole?: UserRole;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        event_name: eventName,
        order_id: options?.orderId || null,
        user_id: options?.userId || null,
        user_role: options?.userRole || 'anonymous',
        metadata: options?.metadata || null,
      });

    if (error) {
      console.error('Failed to log analytics event:', error);
    }
  } catch (err) {
    // Silent fail - analytics logging should not break main functionality
    console.error('Error logging analytics event:', err);
  }
}

/**
 * Track homepage visit (anonymous allowed)
 */
export async function trackHomepageVisit(): Promise<void> {
  await logAnalyticsEvent('homepage_visit', {
    userRole: 'anonymous',
    metadata: {
      referrer: document.referrer || null,
      url: window.location.href,
    }
  });
}

/**
 * Track buyer CTA click (Start an Order button)
 */
export async function trackBuyerCTAClick(): Promise<void> {
  await logAnalyticsEvent('buyer_cta_click', {
    userRole: 'anonymous',
    metadata: {
      source: 'homepage',
    }
  });
}

/**
 * Track manufacturer CTA click (Apply as Manufacturer button)
 */
export async function trackManufacturerCTAClick(): Promise<void> {
  await logAnalyticsEvent('manufacturer_cta_click', {
    userRole: 'anonymous',
    metadata: {
      source: 'homepage',
    }
  });
}

/**
 * Track order creation
 */
export async function trackOrderCreated(orderId: string, buyerId: string): Promise<void> {
  await logAnalyticsEvent('order_created', {
    orderId,
    userId: buyerId,
    userRole: 'buyer',
    metadata: {
      timestamp: new Date().toISOString(),
    }
  });
}

/**
 * Track sample QC approved
 */
export async function trackSampleQCApproved(orderId: string, buyerId: string): Promise<void> {
  await logAnalyticsEvent('sample_qc_approved', {
    orderId,
    userId: buyerId,
    userRole: 'buyer',
    metadata: {
      timestamp: new Date().toISOString(),
    }
  });
}

/**
 * Track bulk QC approved
 */
export async function trackBulkQCApproved(orderId: string, buyerId: string): Promise<void> {
  await logAnalyticsEvent('bulk_qc_approved', {
    orderId,
    userId: buyerId,
    userRole: 'buyer',
    metadata: {
      timestamp: new Date().toISOString(),
    }
  });
}
