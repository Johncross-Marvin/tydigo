import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, CheckCircle2, XCircle, Eye } from "lucide-react";

const AdminKycPage = () => {
  const pending = [
    { name: "Ibrahim Musa", role: "Collector", id: "KYC-1042", date: "May 27, 2025", doc: "National ID" },
    { name: "Fatima Sule", role: "Collector", id: "KYC-1043", date: "May 27, 2025", doc: "Driver's License" },
    { name: "GreenCycle Ltd", role: "Partner", id: "KYC-1044", date: "May 26, 2025", doc: "CAC Certificate" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/admin/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">KYC Verification</h1>
        <Badge className="ml-auto bg-red-100 text-red-600 rounded-full">{pending.length} pending</Badge>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-3">
        {pending.map((item, i) => (
          <Card key={i} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl">
            <CardContent className="p-4 flex items-center gap-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-neutral-100 text-neutral-600 font-bold">
                  {item.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-neutral-900 text-sm">{item.name}</p>
                <p className="text-xs text-neutral-500">{item.role} • {item.doc}</p>
                <p className="text-xs text-neutral-400">{item.id} — {item.date}</p>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="rounded-lg h-8 w-8 p-0">
                  <Eye className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" className="rounded-lg h-8 w-8 p-0 bg-[#145C25] hover:bg-[#0F4A1E]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="rounded-lg h-8 w-8 p-0 border-red-200 text-red-600">
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default AdminKycPage;
