import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Recycle,
  Truck,
  Star,
  Shield,
  Leaf,
  MapPin,
  Clock,
  CreditCard,
  BarChart3,
  Users,
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
  Phone,
  ChevronRight,
  Award,
  Globe,
  Sparkles,
} from "lucide-react";
import { IMAGE_IDS, gdUrl } from "@/lib/images";

const Index = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ── NAVBAR ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-green-100"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-brand">
                <Recycle className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[#145C25] tracking-tight">
                Wasti<span className="text-amber-500">Go</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              {["How It Works", "Features", "Impact", "Pricing"].map(
                (item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm font-medium text-neutral-600 hover:text-[#145C25] transition-colors"
                  >
                    {item}
                  </a>
                )
              )}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" className="text-neutral-700">
                  Sign In
                </Button>
              </Link>
              <Link to="/login">
                <Button className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl px-6 shadow-brand">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-green-50"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-neutral-700" />
              ) : (
                <Menu className="w-6 h-6 text-neutral-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-green-100 shadow-lg">
            <div className="px-4 py-4 space-y-3">
              {["How It Works", "Features", "Impact", "Pricing"].map(
                (item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                    className="block py-2 text-neutral-600 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item}
                  </a>
                )
              )}
              <div className="pt-3 border-t border-green-100 space-y-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full rounded-xl">
                    Sign In
                  </Button>
                </Link>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="relative min-h-screen flex items-center bg-gradient-hero overflow-hidden pt-16 lg:pt-20">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Glow orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left content */}
            <div className="space-y-8">
              <Badge className="bg-green-500/20 text-green-200 border-green-400/30 px-4 py-1.5 text-sm rounded-full">
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                Nigeria's #1 Waste Management Platform
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
                Smart Waste
                <br />
                <span className="text-amber-400">Management</span> for
                <br />
                a Cleaner Future
              </h1>

              <p className="text-lg text-green-100/80 max-w-lg leading-relaxed">
                Schedule pickups, earn EcoPoints, track collectors in real-time,
                and join thousands of households making Nigeria cleaner — one
                pickup at a time.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login">
                  <Button className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-[#0A2F14] font-bold text-base px-8 py-6 rounded-2xl shadow-lg shadow-amber-500/25 transition-all hover:scale-105">
                    <Phone className="w-5 h-5 mr-2" />
                    Start with Phone Number
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10 rounded-2xl px-8 py-6"
                  >
                    <Recycle className="w-5 h-5 mr-2" />
                    How It Works
                  </Button>
                </a>
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Avatar
                      key={i}
                      className="w-9 h-9 border-2 border-[#0A2F14] ring-2 ring-green-500/30"
                    >
                      <AvatarFallback className="bg-green-600 text-white text-xs">
                        U{i}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <p className="text-sm text-green-200">
                    Trusted by <strong>50,000+</strong> households
                  </p>
                </div>
              </div>
            </div>

            {/* Right - App mockup */}
            <div className="relative">
              <div className="relative mx-auto max-w-sm">
                {/* Glow behind phone */}
                <div className="absolute inset-0 bg-gradient-to-b from-green-400/30 to-amber-400/20 blur-3xl rounded-full scale-150" />

                {/* Phone frame */}
                <div className="relative bg-[#0A1F10] rounded-[2.5rem] p-3 border-2 border-green-700/50 shadow-2xl shadow-green-900/40">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10" />
                  <div className="rounded-[2rem] overflow-hidden bg-white">
                    <img
                      src={gdUrl(IMAGE_IDS.dashboard)}
                      alt="WastiGo App Dashboard"
                      className="w-full h-auto"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Floating cards */}
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-brand-lg p-4 animate-bounce-slow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-[#145C25]" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Collector</p>
                      <p className="text-sm font-bold text-neutral-800">
                        Ibrahim M. — en route
                      </p>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-brand-lg p-4 animate-bounce-slow animation-delay-2000">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Award className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">EcoPoints</p>
                      <p className="text-sm font-bold text-neutral-800">
                        12,450 pts
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 60C240 120 480 0 720 30C960 60 1200 0 1440 45V120H0V60Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge className="bg-green-100 text-[#145C25] mb-4 px-4 py-1.5 rounded-full">
              Simple Process
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight mb-4">
              How WastiGo Works
            </h2>
            <p className="text-neutral-500 text-lg">
              Four simple steps to turn your waste into value. It's never been
              easier to keep your environment clean.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                icon: Phone,
                title: "Sign Up",
                desc: "Register with your phone number in under 60 seconds. No email or password needed.",
                color: "bg-green-100 text-[#145C25]",
              },
              {
                step: "02",
                icon: MapPin,
                title: "Schedule Pickup",
                desc: "Choose your waste type, set a pickup time, and confirm your location on the map.",
                color: "bg-blue-100 text-blue-600",
              },
              {
                step: "03",
                icon: Truck,
                title: "Collector Arrives",
                desc: "Track your collector in real-time. Get notified when they're nearby.",
                color: "bg-amber-100 text-amber-600",
              },
              {
                step: "04",
                icon: Award,
                title: "Earn Rewards",
                desc: "Earn EcoPoints for every pickup. Redeem for cash, airtime, or household items.",
                color: "bg-purple-100 text-purple-600",
              },
            ].map((item, i) => (
              <div key={i} className="relative group">
                <Card className="relative overflow-hidden border-0 shadow-lg shadow-neutral-200/50 hover:shadow-brand-lg transition-all duration-300 rounded-2xl h-full">
                  <CardContent className="p-6 pt-8">
                    <div className="absolute top-0 right-0 text-7xl font-black text-neutral-50 group-hover:text-green-50 transition-colors">
                      {item.step}
                    </div>
                    <div
                      className={`relative w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-5`}
                    >
                      <item.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-neutral-500 leading-relaxed">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 z-10">
                    <ChevronRight className="w-6 h-6 text-neutral-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 lg:py-28 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge className="bg-green-100 text-[#145C25] mb-4 px-4 py-1.5 rounded-full">
              Powerful Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight mb-4">
              Everything You Need
            </h2>
            <p className="text-neutral-500 text-lg">
              From real-time tracking to rewards redemption, WastiGo has all the
              tools for modern waste management.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: MapPin,
                title: "Real-Time GPS Tracking",
                desc: "Watch your collector approach on a live map. Know exactly when they'll arrive.",
              },
              {
                icon: CreditCard,
                title: "Secure Payments",
                desc: "Pay with Paystack, bank transfer, or use your EcoPoints. Fully encrypted.",
              },
              {
                icon: Star,
                title: "EcoPoints Rewards",
                desc: "Earn points for every pickup. Redeem for cash, airtime, or shopping vouchers.",
              },
              {
                icon: BarChart3,
                title: "Impact Dashboard",
                desc: "See your carbon footprint reduction, waste diverted from landfills, and more.",
              },
              {
                icon: Shield,
                title: "Verified Collectors",
                desc: "All collectors are KYC-verified. Rate your experience after every pickup.",
              },
              {
                icon: Globe,
                title: "Community Challenges",
                desc: "Join neighborhood challenges. Compete with friends and earn bonus points.",
              },
            ].map((feature, i) => (
              <Card
                key={i}
                className="border-0 shadow-md shadow-neutral-200/30 hover:shadow-brand transition-all duration-300 rounded-2xl group"
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-green-50 group-hover:bg-green-100 flex items-center justify-center mb-4 transition-colors">
                    <feature.icon className="w-6 h-6 text-[#145C25]" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-500 leading-relaxed">
                    {feature.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── APP SCREENSHOTS ── */}
      <section className="py-20 lg:py-28 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge className="bg-green-100 text-[#145C25] mb-4 px-4 py-1.5 rounded-full">
              App Preview
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight mb-4">
              Beautiful, Intuitive Design
            </h2>
            <p className="text-neutral-500 text-lg">
              Every screen crafted for simplicity and speed. See the app in
              action.
            </p>
          </div>

          {/* Scrolling phone mockups */}
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide">
            {[
              { src: IMAGE_IDS.dashboard, label: "Dashboard" },
              { src: IMAGE_IDS.tracking, label: "Live Tracking" },
              { src: IMAGE_IDS.requestPickup, label: "Request Pickup" },
              { src: IMAGE_IDS.ecopoints, label: "EcoPoints" },
              { src: IMAGE_IDS.payment, label: "Payments" },
              { src: IMAGE_IDS.completion, label: "Completion" },
            ].map((screen, i) => (
              <div
                key={i}
                className="snap-center shrink-0 first:ml-4 last:mr-4"
              >
                <div className="w-64 sm:w-72 rounded-[2rem] overflow-hidden shadow-brand-lg border-4 border-neutral-200">
                  <img
                    src={gdUrl(screen.src)}
                    alt={screen.label}
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <p className="text-center mt-3 text-sm font-semibold text-neutral-600">
                  {screen.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES SECTION ── */}
      <section className="py-20 lg:py-28 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge className="bg-green-100 text-[#145C25] mb-4 px-4 py-1.5 rounded-full">
              For Everyone
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight mb-4">
              Choose Your Role
            </h2>
            <p className="text-neutral-500 text-lg">
              WastiGo serves the entire waste management ecosystem.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                icon: Users,
                title: "Household",
                desc: "Schedule pickups & earn rewards",
                color: "bg-green-100 text-[#145C25]",
              },
              {
                icon: Truck,
                title: "Collector",
                desc: "Accept jobs & grow earnings",
                color: "bg-blue-100 text-blue-600",
              },
              {
                icon: BarChart3,
                title: "Business",
                desc: "Bulk waste management solutions",
                color: "bg-purple-100 text-purple-600",
              },
              {
                icon: Recycle,
                title: "Partner",
                desc: "Supply recyclable materials",
                color: "bg-amber-100 text-amber-600",
              },
              {
                icon: Shield,
                title: "Admin",
                desc: "Manage platform operations",
                color: "bg-red-100 text-red-600",
              },
            ].map((role, i) => (
              <Link to="/login" key={i}>
                <Card className="border-0 shadow-md shadow-neutral-200/30 hover:shadow-brand transition-all duration-300 rounded-2xl cursor-pointer h-full hover:-translate-y-1">
                  <CardContent className="p-6 text-center">
                    <div
                      className={`w-14 h-14 rounded-2xl ${role.color} flex items-center justify-center mx-auto mb-4`}
                    >
                      <role.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-1">
                      {role.title}
                    </h3>
                    <p className="text-sm text-neutral-500">{role.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── IMPACT COUNTERS ── */}
      <section id="impact" className="py-20 lg:py-28 bg-gradient-brand text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Our Growing Impact
            </h2>
            <p className="text-green-200 text-lg">
              Together, we're making Nigeria cleaner and greener.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: "50K+", label: "Active Households", icon: Users },
              { value: "250K+", label: "Pickups Completed", icon: Truck },
              { value: "1.2M kg", label: "Waste Recycled", icon: Recycle },
              { value: "₦45M+", label: "Rewards Paid Out", icon: Award },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-8 h-8 text-amber-400" />
                </div>
                <div className="text-4xl font-black tracking-tight mb-2">
                  {stat.value}
                </div>
                <div className="text-green-200 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge className="bg-green-100 text-[#145C25] mb-4 px-4 py-1.5 rounded-full">
              Testimonials
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight mb-4">
              Loved by Thousands
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Amina B.",
                role: "Household User, Abuja",
                text: "WastiGo has completely changed how I manage waste. The collectors are always on time and I've earned over 15,000 EcoPoints!",
              },
              {
                name: "Ibrahim M.",
                role: "Collector, Lagos",
                text: "Since joining WastiGo, my monthly earnings have tripled. The app makes it easy to find pickups and plan my route.",
              },
              {
                name: "Mr. Okonkwo",
                role: "Business Owner, Kano",
                text: "We switched our entire office complex to WastiGo. The bulk pickup scheduling and impact reports are excellent.",
              },
            ].map((testimonial, i) => (
              <Card
                key={i}
                className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl"
              >
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="w-4 h-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <p className="text-neutral-600 leading-relaxed mb-4">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-green-100 text-[#145C25] font-bold">
                        {testimonial.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-neutral-900 text-sm">
                        {testimonial.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 lg:py-28 bg-neutral-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Card className="border-0 bg-gradient-brand text-white rounded-3xl overflow-hidden shadow-brand-lg">
            <CardContent className="p-10 sm:p-16">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                Ready to Make a Difference?
              </h2>
              <p className="text-green-200 text-lg mb-8 max-w-lg mx-auto">
                Join 50,000+ households already using WastiGo. Sign up in 60
                seconds with just your phone number.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/login">
                  <Button className="bg-amber-500 hover:bg-amber-400 text-[#0A2F14] font-bold text-base px-8 py-6 rounded-2xl shadow-lg shadow-amber-500/25">
                    <Phone className="w-5 h-5 mr-2" />
                    Get Started Free
                  </Button>
                </Link>
              </div>
              <div className="mt-6 flex items-center justify-center gap-4 text-sm text-green-200">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> No password needed
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> 60-second signup
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Free to start
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0A2F14] text-green-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Recycle className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-xl font-bold text-white">
                  Wasti<span className="text-amber-400">Go</span>
                </span>
              </div>
              <p className="text-sm text-green-300 leading-relaxed">
                Smart waste management for a cleaner, greener Nigeria.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Product</h4>
              <div className="space-y-2 text-sm">
                {["How It Works", "Features", "Pricing", "Download App"].map(
                  (item) => (
                    <a
                      key={item}
                      href="#"
                      className="block text-green-300 hover:text-white transition-colors"
                    >
                      {item}
                    </a>
                  )
                )}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Company</h4>
              <div className="space-y-2 text-sm">
                {["About Us", "Blog", "Careers", "Contact"].map((item) => (
                  <a
                    key={item}
                    href="#"
                    className="block text-green-300 hover:text-white transition-colors"
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <div className="space-y-2 text-sm">
                {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
                  (item) => (
                    <a
                      key={item}
                      href="#"
                      className="block text-green-300 hover:text-white transition-colors"
                    >
                      {item}
                    </a>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-green-700/50 pt-8 text-center text-sm text-green-400">
            &copy; {new Date().getFullYear()} WastiGo. All rights reserved. Made
            with <Leaf className="w-3.5 h-3.5 inline text-green-400" /> in
            Nigeria.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
