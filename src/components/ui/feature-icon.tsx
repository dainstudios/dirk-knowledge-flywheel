import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface FeatureIconProps {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const iconSizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function FeatureIcon({ icon: Icon, size = "md", className }: FeatureIconProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-primary-soft flex items-center justify-center",
        sizeClasses[size],
        className
      )}
    >
      <Icon className={cn("text-primary", iconSizeClasses[size])} />
    </div>
  );
}
