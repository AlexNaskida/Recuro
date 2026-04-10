import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type CheckListProps = {
  items: string[];
};

export default function CheckList({ items }: CheckListProps) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-3 text-sm leading-6 text-text-secondary"
        >
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#c7eadf] bg-[#eefaf6] text-[#0f7f68] shadow-[0_6px_16px_-12px_rgba(15,127,104,0.85)]">
            <Check className={cn("h-3 w-3 stroke-[2.75]")} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
