/**
 * Order Delay Flags Component
 * 
 * Displays computed delay metrics on orders for admin visibility.
 * Shows acceptance delay, sample QC delay, bulk QC delay, delivery delay.
 * 
 * ADD-ONLY: No scoring UI, just raw data display.
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface OrderDelayFlagsProps {
  order: {
    acceptance_delay_hours?: number | null;
    sample_qc_delay_hours?: number | null;
    bulk_qc_delay_hours?: number | null;
    delivery_delay_hours?: number | null;
    assigned_at?: string | null;
    manufacturer_accept_time?: string | null;
    sample_production_started_at?: string | null;
    sample_qc_uploaded_at?: string | null;
    sample_approved_at?: string | null;
    bulk_qc_uploaded_at?: string | null;
    dispatched_at?: string | null;
    delivered_at?: string | null;
  };
  compact?: boolean;
}

// Threshold constants (in hours)
const THRESHOLDS = {
  acceptance: { warning: 24, critical: 48 },      // 24h warning, 48h critical
  sampleQC: { warning: 72, critical: 120 },       // 3 days warning, 5 days critical
  bulkQC: { warning: 168, critical: 336 },        // 7 days warning, 14 days critical
  delivery: { warning: 72, critical: 120 },       // 3 days warning, 5 days critical
};

const formatHours = (hours: number | null | undefined): string => {
  if (hours === null || hours === undefined) return '-';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
};

const getDelayStatus = (
  hours: number | null | undefined, 
  threshold: { warning: number; critical: number }
): 'ok' | 'warning' | 'critical' | 'pending' => {
  if (hours === null || hours === undefined) return 'pending';
  if (hours >= threshold.critical) return 'critical';
  if (hours >= threshold.warning) return 'warning';
  return 'ok';
};

const getStatusColor = (status: 'ok' | 'warning' | 'critical' | 'pending'): string => {
  switch (status) {
    case 'ok': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'warning': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'pending': return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
  }
};

const getStatusIcon = (status: 'ok' | 'warning' | 'critical' | 'pending') => {
  switch (status) {
    case 'ok': return <CheckCircle2 className="w-3 h-3" />;
    case 'warning': return <Clock className="w-3 h-3" />;
    case 'critical': return <AlertTriangle className="w-3 h-3" />;
    case 'pending': return <Clock className="w-3 h-3" />;
  }
};

const OrderDelayFlags = ({ order, compact = false }: OrderDelayFlagsProps) => {
  const delays = [
    {
      key: 'acceptance',
      label: 'Accept',
      fullLabel: 'Acceptance Delay',
      hours: order.acceptance_delay_hours,
      threshold: THRESHOLDS.acceptance,
      hasData: !!order.manufacturer_accept_time,
      tooltip: 'Time from assignment to manufacturer acceptance',
    },
    {
      key: 'sampleQC',
      label: 'Sample QC',
      fullLabel: 'Sample QC Delay',
      hours: order.sample_qc_delay_hours,
      threshold: THRESHOLDS.sampleQC,
      hasData: !!order.sample_qc_uploaded_at,
      tooltip: 'Time from production start to sample QC upload',
    },
    {
      key: 'bulkQC',
      label: 'Bulk QC',
      fullLabel: 'Bulk QC Delay',
      hours: order.bulk_qc_delay_hours,
      threshold: THRESHOLDS.bulkQC,
      hasData: !!order.bulk_qc_uploaded_at,
      tooltip: 'Time from sample approval to bulk QC upload',
    },
    {
      key: 'delivery',
      label: 'Delivery',
      fullLabel: 'Delivery Time',
      hours: order.delivery_delay_hours,
      threshold: THRESHOLDS.delivery,
      hasData: !!order.delivered_at,
      tooltip: 'Time from dispatch to delivery',
    },
  ];

  // Filter to only show relevant delays (where data exists or is expected)
  const relevantDelays = delays.filter(d => d.hasData || d.hours !== null);

  if (relevantDelays.length === 0) {
    return null;
  }

  if (compact) {
    // Compact view - just show badges with warnings/criticals
    const hasIssues = relevantDelays.some(d => {
      const status = getDelayStatus(d.hours, d.threshold);
      return status === 'warning' || status === 'critical';
    });

    if (!hasIssues) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Delays
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              {relevantDelays.map(d => {
                const status = getDelayStatus(d.hours, d.threshold);
                if (status !== 'warning' && status !== 'critical') return null;
                return (
                  <div key={d.key} className="flex items-center gap-2 text-xs">
                    {getStatusIcon(status)}
                    <span>{d.fullLabel}: {formatHours(d.hours)}</span>
                  </div>
                );
              })}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full view - show all delays with status
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Delay Metrics
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {delays.map(d => {
          const status = d.hasData ? getDelayStatus(d.hours, d.threshold) : 'pending';
          return (
            <TooltipProvider key={d.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`p-2 rounded-lg ${getStatusColor(status)} cursor-help`}>
                    <div className="flex items-center gap-1 mb-1">
                      {getStatusIcon(status)}
                      <span className="text-xs font-medium">{d.label}</span>
                    </div>
                    <div className="text-sm font-bold">
                      {d.hasData ? formatHours(d.hours) : '-'}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{d.tooltip}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Warning: {formatHours(d.threshold.warning)} | Critical: {formatHours(d.threshold.critical)}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};

export default OrderDelayFlags;
