import { cn } from "@/lib/utils";

type StatusVariant = "active" | "frozen" | "archived" | "trial" | "expired";

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  active: "status-badge status-active",
  frozen: "status-badge status-frozen",
  archived: "status-badge status-archived",
  trial: "status-badge bg-accent/10 text-accent",
  expired: "status-badge bg-destructive/10 text-destructive",
};

const defaultLabels: Record<StatusVariant, string> = {
  active: "Active",
  frozen: "Frozen",
  archived: "Archived",
  trial: "Trial",
  expired: "Expired",
};

export const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  return (
    <span className={cn(variantStyles[status])}>
      {label || defaultLabels[status]}
    </span>
  );
};
