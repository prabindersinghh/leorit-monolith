import { Shield, Check, Clock } from "lucide-react";

interface EscrowStatusBadgeProps {
  status: 'pending' | 'fake_paid' | 'fake_released';
  amount?: number;
  compact?: boolean;
}

const EscrowStatusBadge = ({ status, amount, compact = false }: EscrowStatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'fake_paid':
        return {
          icon: Shield,
          text: compact ? 'In Escrow' : 'Protected in Escrow',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600'
        };
      case 'fake_released':
        return {
          icon: Check,
          text: compact ? 'Released' : 'Escrow Released',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600'
        };
      default:
        return {
          icon: Clock,
          text: compact ? 'Pending' : 'Payment Pending',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-600'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <Icon className={`w-4 h-4 ${config.iconColor}`} />
      <div>
        <div className={`text-sm font-semibold ${config.textColor}`}>
          {config.text}
        </div>
        {amount !== undefined && (
          <div className={`text-xs ${config.textColor} opacity-75`}>
            ₹{amount.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default EscrowStatusBadge;
