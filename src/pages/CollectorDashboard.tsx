import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Truck, MapPin, Clock, Star, DollarSign,
  CheckCircle2, Navigation, Award, Bell,
} from "lucide-react";
import { api, formatNaira, formatWeight } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

const CollectorDashboardPage = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["pickups"],
    queryFn: api.listPickups,
  });
  const jobs = data?.pickups ?? [];
  const openJobs = jobs.filter((job) => job.status !== "completed");
  const completed = jobs.filter((job) => job.status === "completed").length;
  const potentialEarnings = openJobs.reduce((total, job) => total + Number(job.price_ngn), 0);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/role-selection" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Collector Dashboard</h1>
        <Button variant="ghost" size="icon" className="ml-auto rounded-xl">
          <Bell className="w-5 h-5 text-neutral-500" />
        </Button>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        <Card className="border-0 shadow-brand-lg rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white">
          <CardContent className="p-6">
            <p className="text-blue-200 text-sm">Available Route Value</p>
            <p className="text-4xl font-black tracking-tight mt-1">{formatNaira(potentialEarnings)}</p>
            <div className="flex gap-4 mt-3 text-sm text-blue-200">
              <span>{openJobs.length} open jobs</span>
              <span>{completed} completed</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Star, label: "Rating", value: (user?.rating ?? 5).toFixed(1) },
            { icon: CheckCircle2, label: "Completed", value: String(completed) },
            { icon: Award, label: "Open Value", value: formatNaira(potentialEarnings) },
          ].map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-4 text-center">
                <stat.icon className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-extrabold text-neutral-900">{stat.value}</p>
                <p className="text-xs text-neutral-500">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h2 className="font-bold text-neutral-900 mb-3">Open Pickup Jobs</h2>
          <div className="space-y-3">
            {isLoading && <div className="rounded-2xl bg-white p-6 text-center text-neutral-500">Loading saved pickup jobs...</div>}
            {!isLoading && openJobs.length === 0 && (
              <Card className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl">
                <CardContent className="p-6 text-center text-sm text-neutral-500">
                  No customer pickup jobs are available yet.
                </CardContent>
              </Card>
            )}
            {openJobs.map((job) => (
              <Card key={job.id} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-blue-100 text-blue-600 rounded-full text-xs">{job.pickup_code}</Badge>
                    <span className="text-sm font-bold text-[#145C25]">{formatNaira(job.price_ngn)}</span>
                  </div>
                  <div className="space-y-1.5 text-sm text-neutral-600 mb-3">
                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{job.address}</div>
                    <div className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" />{job.waste_type} - {formatWeight(Number(job.weight_kg))}</div>
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Window: {job.schedule_window}</div>
                  </div>
                  <Progress value={job.payment_status === "paid" ? 70 : 35} className="mb-3 h-1.5 rounded-full bg-neutral-100 [&>div]:bg-blue-600" />
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm">
                      <Navigation className="w-4 h-4 mr-1.5" /> Navigate
                    </Button>
                    <Button variant="outline" className="rounded-xl text-sm">Accept</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CollectorDashboardPage;
