import { Apple, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function FruitPlusIcon({ className }: Props) {
  return (
    <span className={cn("relative inline-flex size-4", className)} aria-hidden>
      <Apple className="size-4" />
      <span className="absolute -bottom-0.5 -right-1 size-2.5 rounded-full bg-primary text-primary-foreground grid place-items-center ring-1 ring-background">
        <Plus className="size-1.5 stroke-[3]" />
      </span>
    </span>
  );
}
