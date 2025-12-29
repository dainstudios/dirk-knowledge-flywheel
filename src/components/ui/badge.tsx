import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Default is now muted grey
        default: "border-transparent bg-grey-100 text-grey-500",
        // Secondary is slightly darker grey
        secondary: "border-transparent bg-grey-200 text-secondary-foreground",
        // Primary/highlight - use ONLY for important emphasis
        primary: "border-transparent bg-primary text-primary-foreground",
        // Soft primary - subtle orange tint
        soft: "border-transparent bg-primary/10 text-primary",
        // Outlined - subtle border
        outline: "border-grey-200 text-grey-500 bg-transparent",
        // Destructive
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        // Success
        success: "border-transparent bg-success/10 text-success",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };