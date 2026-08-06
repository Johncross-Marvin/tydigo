import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Building2, ArrowRight } from "lucide-react";

type SubscriptionPlansProps = {
  onSelect: (planId: string) => void;
};

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "₦25,000",
    period: "/month",
    description: "For small businesses with regular waste needs",
    features: [
      "Up to 10 pickups/month",
      "2 locations",
      "Standard scheduling",
      "Basic impact reports",
      "Email support",
    ],
    featured: false,
  },
  {
    id: "business",
    name: "Business",
    price: "₦75,000",
    period: "/month",
    description: "For growing businesses with multiple locations",
    features: [
      "Up to 50 pickups/month",
      "10 locations",
      "Priority scheduling",
      "Advanced impact reports",
      "Dedicated collector",
      "Phone & email support",
    ],
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with complex needs",
    features: [
      "Unlimited pickups",
      "Unlimited locations",
      "Custom scheduling",
      "API access",
      "Dedicated fleet",
      "24/7 support",
      "Compliance reporting",
    ],
    featured: false,
  },
];

export function SubscriptionPlans({ onSelect }: SubscriptionPlansProps) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className={`border-0 shadow-md rounded-2xl h-full flex flex-col ${
            plan.featured
              ? "ring-2 ring-[#145C25] shadow-brand-lg"
              : "shadow-neutral-200/30"
          }`}
        >
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-extrabold text-neutral-900">{plan.name}</h3>
              {plan.featured && (
                <Badge className="bg-[#145C25] text-white rounded-full">Popular</Badge>
              )}
            </div>
            <p className="text-sm text-neutral-500 mb-4">{plan.description}</p>
            <div className="mb-5">
              <span className="text-3xl font-black text-neutral-900">{plan.price}</span>
              <span className="text-neutral-500 text-sm">{plan.period}</span>
            </div>
            <div className="space-y-2.5 mb-6 flex-1">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-neutral-600">
                  <CheckCircle2 className="w-4 h-4 text-[#145C25] shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
            <Button
              onClick={() => onSelect(plan.id)}
              className={`w-full rounded-xl ${
                plan.featured
                  ? "bg-[#145C25] hover:bg-[#0F4A1E] text-white"
                  : "bg-neutral-900 hover:bg-neutral-800 text-white"
              }`}
            >
              {plan.id === "enterprise" ? "Contact Sales" : "Get Started"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
