import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Recycle,
  Truck,
  Shield,
  Leaf,
  MapPin,
  Clock,
  CreditCard,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Award,
  Globe,
  Users,
} from "lucide-react";
import { useSeo, seoConfig } from "@/lib/seo";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { AppInstallBanner } from "@/components/public/AppInstallBanner";
import { ScrollMediaStage } from "@/components/public/ScrollMediaStage";
import { RolePathways } from "@/components/public/RolePathways";
import { EarnFeature } from "@/components/public/EarnFeature";
import { CoveragePreview } from "@/components/public/CoveragePreview";
import { FaqAccordion } from "@/components/public/FaqAccordion";

const Index = () => {
  useSeo(seoConfig.home);

  const howItWorks = [
    {
      step: "01",
      icon: MapPin,
      title: "Choose your path",
      desc: "Tell us whether you need waste collection, want to earn, or process materials.",
    },
    {
      step: "02",
      icon: Clock,
      title: "Schedule or accept",
      desc: "Book a pickup at home, or accept jobs and routes as a collector.",
    },
    {
      step: "03",
      icon: Truck,
      title: "Track in real time",
      desc: "Follow your collector or your route with live status and proof of service.",
    },
    {
      step: "04",
      icon: Award,
      title: "Measure the impact",
      desc: "See waste diverted, materials recovered, and rewards earned.",
    },
  ];

  const outcomes = [
    {
      icon: Truck,
      title: "Convenient collection",
      desc: "On-demand and scheduled pickup for homes, estates, and businesses.",
    },
    {
      icon: Shield,
      title: "Verified service",
      desc: "KYC-verified collectors and transparent proof of service on every job.",
    },
    {
      icon: Recycle,
      title: "Material recovery",
      desc: "Recyclables and organic waste routed to the right processing partners.",
    },
    {
      icon: BarChart3,
      title: "Transparent operations",
      desc: "Clear reporting for estates, businesses, and government oversight.",
    },
    {
      icon: Leaf,
      title: "Environmental impact",
      desc: "Track waste diverted from landfill and carbon offset over time.",
    },
    {
      icon: CreditCard,
      title: "Earn and get paid",
      desc: "Collectors and operators earn transparently with weekly payouts.",
    },
  ];

  const faqs = [
    {
      question: "How do I schedule a waste pickup?",
      answer:
        "Create a household account, enter your pickup address, choose your waste type, and select a time window. A verified collector will be assigned to you.",
    },
    {
      question: "Which account types require verification?",
      answer:
        "Collectors, recyclers, organic partners, fleet operators, corporate partners, and government agencies require verification before full access. Households, estates, and businesses are activated automatically after onboarding.",
    },
    {
      question: "How do collectors get paid?",
      answer:
        "Collectors see the price for each job before accepting it, and earnings are paid out weekly to their linked bank account.",
    },
    {
      question: "Where is Tydigo available?",
      answer:
        "Tydigo is currently active in Abuja and piloting in Lagos. We are expanding — you can request Tydigo for your city.",
    },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <PublicHeader transparent />

      {/* ── Editorial hero ── */}
      <section className="relative bg-[#0A2F14] text-white pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Badge className="bg-white/10 text-green-200 mb-6 px-4 py-1.5 rounded-full border border-white/10">
              Waste collection, recycling & recovery
            </Badge>
            <h1 className="text-display font-extrabold text-white mb-6">
              Cleaner homes.
              <br />
              <span className="text-amber-400">Smarter cities.</span>
            </h1>
            <p className="text-lg text-green-200/90 max-w-xl leading-relaxed mb-8">
              Tydigo connects households, estates, businesses, collectors, and
              recyclers to make waste collection simpler and cities cleaner.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/signup">
                <Button className="w-full sm:w-auto h-12 px-7 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0A2F14] font-bold text-base">
                  Get started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/earn/collector">
                <Button
                  className="w-full sm:w-auto h-12 px-7 rounded-xl bg-white text-[#0A2F14] font-bold text-base hover:bg-green-50 active:scale-[0.98] transition-all duration-200"
                >
                  Earn with Tydigo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Scroll-reactive media stage ── */}
      <section className="bg-[#0A2F14] pb-8">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollMediaStage alt="Tydigo waste collection and recycling operations">
            <div className="max-w-md">
              <p className="text-white font-semibold text-lg mb-1">
                From pickup to recovery
              </p>
              <p className="text-white/80 text-sm">
                Every job is tracked, verified, and routed to the right place.
              </p>
            </div>
          </ScrollMediaStage>
        </div>
      </section>

      {/* ── Role pathways ── */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <Badge className="bg-green-100 text-[#145C25] mb-4 px-4 py-1.5 rounded-full">
              One platform, many paths
            </Badge>
            <h2 className="text-h2 font-extrabold text-neutral-900 mb-4">
              How will you use Tydigo?
            </h2>
            <p className="text-neutral-500 text-lg">
              Whether you need service, want to earn, process materials, or
              partner with us, there's a path for you.
            </p>
          </div>
          <RolePathways />
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 lg:py-28 bg-neutral-50">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <Badge className="bg-green-100 text-[#145C25] mb-4 px-4 py-1.5 rounded-full">
              How it works
            </Badge>
            <h2 className="text-h2 font-extrabold text-neutral-900 mb-4">
              Simple, from start to finish
            </h2>
          </div>

          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((item) => (
              <li key={item.step} className="relative">
                <div className="rounded-2xl bg-white border border-neutral-100 p-6 h-full">
                  <div className="text-5xl font-black text-neutral-100 mb-4">{item.step}</div>
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-[#145C25]" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">{item.title}</h3>
                  <p className="text-neutral-500 leading-relaxed">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Outcomes ── */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <Badge className="bg-green-100 text-[#145C25] mb-4 px-4 py-1.5 rounded-full">
              What Tydigo does
            </Badge>
            <h2 className="text-h2 font-extrabold text-neutral-900 mb-4">
              Built for real outcomes
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {outcomes.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-neutral-100 p-6 hover:border-[#145C25]/20 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-[#145C25]" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1.5">{item.title}</h3>
                <p className="text-neutral-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Earn feature (dark) ── */}
      <EarnFeature />

      {/* ── Coverage ── */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <Badge className="bg-green-100 text-[#145C25] mb-4 px-4 py-1.5 rounded-full">
              Where we operate
            </Badge>
            <h2 className="text-h2 font-extrabold text-neutral-900 mb-4">
              Cities we serve
            </h2>
            <p className="text-neutral-500 text-lg">
              Tydigo is growing across Nigeria. See where we're active and
              request your city.
            </p>
          </div>
          <CoveragePreview />
        </div>
      </section>

      {/* ── Safety & trust ── */}
      <section className="py-20 lg:py-28 bg-neutral-50">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-green-100 text-[#145C25] mb-4 px-4 py-1.5 rounded-full">
                Safety & trust
              </Badge>
              <h2 className="text-h2 font-extrabold text-neutral-900 mb-4">
                Verified, safe, and accountable
              </h2>
              <p className="text-neutral-500 text-lg mb-6">
                Every collector is KYC-verified. Every job is tracked with
                proof of service. Every partner is reviewed before they operate.
              </p>
              <ul className="space-y-3">
                {[
                  "KYC-verified collectors and operators",
                  "Transparent proof of service on every pickup",
                  "Reviewed recyclers and organic partners",
                  "Clear incident reporting and support",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#145C25] shrink-0 mt-0.5" />
                    <span className="text-neutral-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Users, label: "Households & estates", value: "Service" },
                { icon: Truck, label: "Collectors & fleets", value: "Earn" },
                { icon: Recycle, label: "Recyclers & organic", value: "Recover" },
                { icon: Globe, label: "Partners & government", value: "Oversee" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white border border-neutral-100 p-5">
                  <item.icon className="w-6 h-6 text-[#145C25] mb-3" />
                  <p className="text-sm text-neutral-500">{item.label}</p>
                  <p className="font-bold text-neutral-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-green-100 text-[#145C25] mb-4 px-4 py-1.5 rounded-full">
              FAQ
            </Badge>
            <h2 className="text-h2 font-extrabold text-neutral-900 mb-4">
              Frequently asked questions
            </h2>
          </div>
          <FaqAccordion items={faqs} />
          <div className="text-center mt-8">
            <Link
              to="/support"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#145C25] hover:underline"
            >
              Visit the help centre
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── App install ── */}
      <AppInstallBanner />

      {/* ── Footer ── */}
      <PublicFooter />
    </div>
  );
};

export default Index;
