import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement {
  return <div className={cn("rounded-2xl border bg-card text-card-foreground shadow-sm", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement {
  return <div className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>): ReactElement {
  return <h3 className={cn("text-base font-semibold tracking-tight", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}
