import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        neutral: "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]",
        blue: "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]",
        teal: "border-[#99F6E4] bg-[#F0FDFA] text-[#0F766E]",
        verde: "border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]",
        ambar: "border-[#FDE68A] bg-[#FFFBEB] text-[#D97706]",
        rojo: "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]",
        gris: "border-[#E2E8F0] bg-[#F1F5F9] text-[#64748B]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
