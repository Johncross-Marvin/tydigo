import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShoppingBag, Send, CheckCircle2 } from "lucide-react";

const PartnerRequestPage = () => {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/partner/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Request Materials</h1>
      </header>

      <main className="max-w-md mx-auto p-4 sm:p-6">
        {!sent ? (
          <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Material Type</label>
                  <Input placeholder="e.g., Crushed Plastic (PET)" className="h-12 rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Quantity (kg)</label>
                  <Input type="number" placeholder="500" className="h-12 rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Preferred Price per kg (₦)</label>
                  <Input type="number" placeholder="150" className="h-12 rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Delivery Address</label>
                  <Input placeholder="Your facility address" className="h-12 rounded-xl" />
                </div>
              </div>
              <Button onClick={() => setSent(true)} className="w-full h-14 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-2xl">
                <Send className="w-4 h-4 mr-2" /> Submit Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-brand-lg rounded-2xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-[#145C25]" />
              </div>
              <h2 className="text-xl font-extrabold text-neutral-900">Request Submitted!</h2>
              <p className="text-neutral-500">Your material request has been sent to suppliers.</p>
              <Link to="/partner/dashboard">
                <Button className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PartnerRequestPage;
