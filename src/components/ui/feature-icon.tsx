import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface FeatureIconProps {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "primary" | "muted";
  className?: string;
}

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-14 w-14",
};

const iconSizeClasses = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-7 w-7",
};

const variantClasses = {
  default: "bg-grey-100 text-grey-500",
  primary: "bg-primary/10 text-primary",
  muted: "bg-grey-50 text-grey-400",
};

export function FeatureIcon({ 
  icon: Icon, 
  size = "md", 
  variant = "default",
  className 
}: FeatureIconProps) {
  return (
    <div
      className={cn(
        "rounded-2xl flex items-center justify-center",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <Icon className={cn(iconSizeClasses[size])} strokeWidth={1.5} />
    </div>
  );
}