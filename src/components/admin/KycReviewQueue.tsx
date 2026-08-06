import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
} from "lucide-react";
import type { KycDocument } from "@/lib/api";

type KycReviewQueueProps = {
  documents: Array<KycDocument & { name?: string; role?: string }>;
  onApprove: (documentId: string) => void;
  onReject: (documentId: string) => void;
  onView: (documentId: string) => void;
};

export function KycReviewQueue({ documents, onApprove, onReject, onView }: KycReviewQueueProps) {
  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#145C25]" />
            <h3 className="font-bold text-neutral-900">KYC Review Queue</h3>
          </div>
          <Badge className="bg-amber-100 text-amber-600 rounded-full">
            {documents.length} pending
          </Badge>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50"
            >
              <Avatar className="w-10 h-10 ring-2 ring-neutral-100 shrink-0">
                <AvatarFallback className="bg-amber-100 text-amber-600 font-bold">
                  {doc.name?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-800">
                  {doc.name ?? "Unknown User"}
                </p>
                <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                  <Badge className="bg-neutral-100 text-neutral-600 rounded-full text-[10px] capitalize">
                    {doc.document_type.replace(/_/g, " ")}
                  </Badge>
                  {doc.role && (
                    <Badge className="bg-blue-100 text-blue-600 rounded-full text-[10px]">
                      {doc.role}
                    </Badge>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onView(doc.id)}
                  className="h-8 w-8 rounded-lg"
                >
                  <Eye className="w-4 h-4 text-neutral-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onApprove(doc.id)}
                  className="h-8 w-8 rounded-lg text-green-600 hover:bg-green-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onReject(doc.id)}
                  className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {documents.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-8">
              No pending KYC documents to review.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
