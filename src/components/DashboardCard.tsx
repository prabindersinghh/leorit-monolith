import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: string;
  className?: string;
}

const DashboardCard = ({ title, value, icon: Icon, description, trend, className }: DashboardCardProps) => {
  return (
    <div className={cn("bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm font-medium mb-2">{title}</p>
          <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <p className="text-xs text-foreground/60 mt-2">{trend}</p>
          )}
        </div>
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-gray-900" />
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;
