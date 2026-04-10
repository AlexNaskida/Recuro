import { Check } from "lucide-react";

type CheckListProps = {
  items: string[];
};

export default function CheckList({ items }: CheckListProps) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-3 text-sm text-text-secondary"
        >
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-light text-green">
            <Check className="h-3 w-3 stroke-[2.5]" />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
