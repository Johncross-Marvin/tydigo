import { type LucideIcon, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const sizeClasses = {
    sm: "p-6",
    md: "p-10",
    lg: "p-16",
  };

  const iconSizes = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl bg-neutral-50 border border-dashed border-neutral-200",
        sizeClasses[size],
        className,
      )}
    >
      <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        <Icon className={cn("text-neutral-400", iconSizes[size])} />
      </div>
      <h3 className="text-lg font-bold text-neutral-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-500 max-w-xs mb-4">{description}</p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function EmptyStateInline({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-4">
      <Icon className="w-12 h-12 text-neutral-300 mb-3" />
      <p className="font-semibold text-neutral-600">{title}</p>
      {description && (
        <p className="text-sm text-neutral-400 mt-1 max-w-xs">{description}</p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          variant="outline"
          size="sm"
          className="mt-4 rounded-xl"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
