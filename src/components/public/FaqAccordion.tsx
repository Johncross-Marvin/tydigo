import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type FaqItem = {
  question: string;
  answer: string;
};

type FaqAccordionProps = {
  items: FaqItem[];
};

export function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((item, i) => (
        <AccordionItem key={i} value={`faq-${i}`} className="border-b border-neutral-100">
          <AccordionTrigger className="text-left text-base font-semibold text-neutral-900 py-5 hover:no-underline">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="text-neutral-600 leading-relaxed pb-5">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
