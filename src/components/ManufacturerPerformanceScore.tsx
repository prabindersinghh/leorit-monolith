import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Award } from "lucide-react";

interface PerformanceScoreProps {
  onTimeDeliveries: number;
  qcPassRate: number;
  totalDisputes: number;
  performanceScore: number;
}

const ManufacturerPerformanceScore = ({
  onTimeDeliveries,
  qcPassRate,
  totalDisputes,
  performanceScore,
}: PerformanceScoreProps) => {
  const getScoreBadge = (score: number) => {
    if (score >= 80) return { variant: "default" as const, label: "Excellent" };
    if (score >= 60) return { variant: "secondary" as const, label: "Good" };
    if (score >= 40) return { variant: "outline" as const, label: "Average" };
    return { variant: "destructive" as const, label: "Needs Improvement" };
  };

  const badge = getScoreBadge(performanceScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Performance Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-4xl font-bold">{performanceScore.toFixed(0)}</span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">On-Time Deliveries:</span>
            <span className="font-medium">{onTimeDeliveries}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">QC Pass Rate:</span>
            <span className="font-medium">{qcPassRate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Disputes:</span>
            <span className="font-medium">{totalDisputes}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground pt-2 border-t">
          Score = (On-time × 2) + (QC Pass Rate × 3) - (Disputes × 5)
        </p>
      </CardContent>
    </Card>
  );
};

export default ManufacturerPerformanceScore;
