import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Leaf, Recycle, TrendingDown, Download, Globe } from "lucide-react";

const AdminImpactPage = () => {
  const metrics = [
    { icon: Recycle, label: "Total Waste Diverted", value: "1,280 tons", sub: "From landfills this year" },
    { icon: Leaf, label: "CO2 Emissions Saved", value: "3,450 tons", sub: "Equivalent to 15,000 trees" },
    { icon: TrendingDown, label: "Landfill Reduction", value: "42%", sub: "Year-over-year improvement" },
    { icon: Globe, label: "Communities Served", value: "127", sub: "Across 12 states" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/admin/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Impact & ESG Report</h1>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          {metrics.map((metric, i) => (
            <Card key={i} className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                  <metric.icon className="w-6 h-6 text-[#145C25]" />
                </div>
                <p className="text-3xl font-extrabold text-neutral-900">{metric.value}</p>
                <p className="text-sm text-neutral-500 mt-1">{metric.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
          <CardContent className="p-6 text-center">
            <h3 className="font-bold text-neutral-900 mb-2">Download Full ESG Report</h3>
            <p className="text-sm text-neutral-500 mb-4">Comprehensive sustainability report for stakeholders.</p>
            <Button className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
              <Download className="w-4 h-4 mr-2" /> Download PDF Report
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminImpactPage;
