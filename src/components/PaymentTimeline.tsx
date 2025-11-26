import { format } from "date-fns";
import { Clock, Shield, CheckCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentTimelineProps {
  orderCreatedAt: string;
  fakePaymentTimestamp?: string | null;
  escrowLockedTimestamp?: string | null;
  sampleProductionStartedAt?: string | null;
  qcUploadedAt?: string | null;
  sampleApprovedAt?: string | null;
  escrowReleasedTimestamp?: string | null;
  escrowAmount?: number;
}

const PaymentTimeline = ({
  orderCreatedAt,
  fakePaymentTimestamp,
  escrowLockedTimestamp,
  sampleProductionStartedAt,
  qcUploadedAt,
  sampleApprovedAt,
  escrowReleasedTimestamp,
  escrowAmount = 500,
}: PaymentTimelineProps) => {
  const formatTimestamp = (timestamp?: string | null) => {
    if (!timestamp) return "Pending";
    return format(new Date(timestamp), "MMM dd, yyyy 'at' hh:mm a");
  };

  const timelineEvents = [
    {
      label: "Order Created",
      timestamp: orderCreatedAt,
      icon: Clock,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      completed: true,
    },
    {
      label: "Escrow Payment Received",
      timestamp: fakePaymentTimestamp,
      icon: Shield,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      completed: !!fakePaymentTimestamp,
      amount: escrowAmount,
      description: `₹${escrowAmount} deducted from Buyer Wallet → Transferred to Escrow`,
    },
    {
      label: "Marked Accepted by Manufacturer",
      timestamp: escrowLockedTimestamp,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      completed: !!escrowLockedTimestamp,
      description: "Escrow Locked: Awaiting QC Upload",
    },
    {
      label: "Sample Production Started",
      timestamp: sampleProductionStartedAt,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      completed: !!sampleProductionStartedAt,
    },
    {
      label: "QC Uploaded",
      timestamp: qcUploadedAt,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      completed: !!qcUploadedAt,
    },
    {
      label: "Buyer Approved",
      timestamp: sampleApprovedAt,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      completed: !!sampleApprovedAt,
    },
    {
      label: "Escrow Released to Manufacturer",
      timestamp: escrowReleasedTimestamp,
      icon: ArrowRight,
      color: "text-green-600",
      bgColor: "bg-green-100",
      completed: !!escrowReleasedTimestamp,
      amount: escrowAmount,
      description: `₹${escrowAmount} Released from Escrow → Manufacturer Wallet`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Payment Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timelineEvents.map((event, index) => {
            const Icon = event.icon;
            return (
              <div
                key={index}
                className={`flex items-start gap-4 ${
                  event.completed ? "opacity-100" : "opacity-50"
                }`}
              >
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full ${event.bgColor} flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${event.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{event.label}</p>
                    {event.amount && event.completed && (
                      <span className="text-sm font-bold text-green-600">
                        ₹{event.amount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTimestamp(event.timestamp)}
                  </p>
                  {event.description && event.completed && (
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentTimeline;
