import type { InputHTMLAttributes, ReactElement } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): ReactElement {
  return <input className={cn("flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10", className)} {...props} />;
}
