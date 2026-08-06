import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";

type QualityVerificationProps = {
  batchId: string;
  material: string;
  onRate: (batchId: string, rating: number, notes?: string) => void;
};

export function QualityVerification({ batchId, material, onRate }: QualityVerificationProps) {
  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <h3 className="font-bold text-neutral-900 mb-2">Quality Verification</h3>
        <p className="text-sm text-neutral-500 mb-4">
          Rate the quality of the received <span className="font-medium capitalize">{material.replace(/_/g, " ")}</span> batch.
        </p>

        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onRate(batchId, star)}
              className="p-1 rounded-lg hover:bg-amber-50 transition-colors"
            >
              <Star className="w-8 h-8 text-amber-300 hover:text-amber-400 fill-current" />
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => onRate(batchId, 4, "Good quality")}
            variant="outline"
            className="flex-1 rounded-xl border-green-200 text-green-600 hover:bg-green-50"
          >
            <ThumbsUp className="w-4 h-4 mr-1.5" />
            Good Quality
          </Button>
          <Button
            onClick={() => onRate(batchId, 2, "Below expectations")}
            variant="outline"
            className="flex-1 rounded-xl border-red-200 text-red-500 hover:bg-red-50"
          >
            <ThumbsDown className="w-4 h-4 mr-1.5" />
            Poor Quality
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
