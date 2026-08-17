import { ChevronDown } from "lucide-react";

export type FaqItem = {
  question: string;
  answer: string;
};

type FaqAccordionProps = {
  items: FaqItem[];
};

/**
 * Accessible FAQ accordion using native <details>/<summary> elements.
 * No external dependency required; keyboard and screen-reader friendly.
 */
export function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <div className="w-full divide-y divide-neutral-100">
      {items.map((item, i) => (
        <details key={i} className="group">
          <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none text-base font-semibold text-neutral-900 [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown className="w-5 h-5 text-neutral-400 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <p className="text-neutral-600 leading-relaxed pb-5">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
