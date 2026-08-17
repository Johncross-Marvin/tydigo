import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  ShieldAlert,
  Inbox,
} from "lucide-react";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import {
  listPendingApplications,
  reviewApplication,
  type RegistrationApplication,
} from "@/services/registration";

type ApplicantProfile = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  default_city: string | null;
  username: string | null;
  account_type: string | null;
};

type ApplicationWithProfile = RegistrationApplication & {
  profile?: ApplicantProfile | null;
};

const AdminKycPage = () => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-verification-queue"],
    queryFn: async (): Promise<ApplicationWithProfile[]> => {
      if (!isSupabaseAvailable() || !supabase) return [];

      const applications = await listPendingApplications();
      if (applications.length === 0) return [];

      // Resolve applicant profiles safely
      const profileIds = applications.map((a) => a.profile_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone, email, default_city, username, account_type")
        .in("id", profileIds);

      const profileMap = new Map<string, ApplicantProfile>();
      (profiles ?? []).forEach((p) => profileMap.set(p.id, p as ApplicantProfile));

      return applications.map((app) => ({
        ...app,
        profile: profileMap.get(app.profile_id) ?? null,
      }));
    },
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: (applicationId: string) => reviewApplication(applicationId, "approved"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-verification-queue"] });
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      reviewApplication(id, "rejected", notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-verification-queue"] });
      setRejectingId(null);
      setRejectNotes("");
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const applications = data ?? [];

  const handleApprove = (id: string) => {
    setActionError(null);
    approveMutation.mutate(id);
  };

  const handleReject = (id: string) => {
    if (!rejectNotes.trim()) {
      setActionError("Reviewer notes are required when rejecting an application.");
      return;
    }
    setActionError(null);
    rejectMutation.mutate({ id, notes: rejectNotes.trim() });
  };

  const formatDetails = (details: Record<string, unknown>) => {
    const entries = Object.entries(details).filter(
      ([, v]) => v !== null && v !== undefined && v !== "",
    );
    if (entries.length === 0) return null;
    return entries;
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/admin/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Account Verification</h1>
        <Badge className="ml-auto bg-amber-100 text-amber-700 rounded-full">
          {applications.length} pending
        </Badge>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-3">
        {isLoading && (
          <div className="rounded-2xl bg-white p-8 text-center text-neutral-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading verification queue...
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error instanceof Error ? error.message : "Unable to load verification queue."}
          </div>
        )}

        {actionError && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            {actionError}
          </div>
        )}

        {!isLoading && !error && applications.length === 0 && (
          <Card className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl">
            <CardContent className="p-10 text-center text-neutral-500">
              <Inbox className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
              <p className="font-semibold text-neutral-700">No pending applications</p>
              <p className="text-sm mt-1">
                New verification requests will appear here for review.
              </p>
            </CardContent>
          </Card>
        )}

        {applications.map((app) => {
          const isExpanded = expandedId === app.id;
          const details = formatDetails(app.details);
          const isRejecting = rejectingId === app.id;

          return (
            <Card key={app.id} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12 shrink-0">
                    <AvatarFallback className="bg-[#145C25]/10 text-[#145C25] font-bold">
                      {(app.profile?.full_name ?? "U").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-neutral-900 text-sm">
                        {app.profile?.full_name ?? "Unknown applicant"}
                      </p>
                      <Badge className="bg-blue-100 text-blue-700 rounded-full text-[10px] capitalize">
                        {app.account_type.replace(/_/g, " ")}
                      </Badge>
                      {app.status === "changes_requested" && (
                        <Badge className="bg-purple-100 text-purple-700 rounded-full text-[10px]">
                          Changes requested
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-neutral-500 mt-1 space-y-0.5">
                      {app.profile?.phone && <p>{app.profile.phone}</p>}
                      {app.profile?.email && <p>{app.profile.email}</p>}
                      {app.profile?.default_city && (
                        <p className="capitalize">{app.profile.default_city}</p>
                      )}
                      <p className="flex items-center gap-1 text-neutral-400">
                        <Clock className="w-3 h-3" />
                        Submitted {new Date(app.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(app.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="rounded-lg h-8 bg-[#145C25] hover:bg-[#0F4A1E] text-white"
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span className="ml-1">Approve</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRejectingId(isRejecting ? null : app.id);
                        setRejectNotes("");
                      }}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="rounded-lg h-8 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span className="ml-1">Reject</span>
                    </Button>
                  </div>
                </div>

                {isRejecting && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Explain why this application is being rejected or what changes are required..."
                      className="rounded-xl text-sm min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReject(app.id)}
                        disabled={rejectMutation.isPending}
                        className="rounded-lg h-8 bg-red-600 hover:bg-red-700 text-white"
                      >
                        {rejectMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Confirm rejection"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRejectingId(null)}
                        className="rounded-lg h-8"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {details && details.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : app.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      {isExpanded ? "Hide details" : "View details"}
                    </button>

                    {isExpanded && (
                      <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl bg-neutral-50 p-3">
                        {details.map(([key, value]) => (
                          <div key={key} className="text-xs">
                            <dt className="text-neutral-400 capitalize">
                              {key.replace(/_/g, " ")}
                            </dt>
                            <dd className="text-neutral-800 font-medium break-words">
                              {Array.isArray(value) ? value.join(", ") : String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
};

export default AdminKycPage;
