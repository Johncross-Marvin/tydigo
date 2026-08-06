/**
 * Digital Receipt Component
 * 
 * Displays a detailed receipt for a completed pickup.
 * Supports PDF download, email, and QR code.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Mail, QrCode, Printer, CheckCircle2 } from "lucide-react";

export type ReceiptData = {
  receiptNumber: string;
  pickupReference: string;
  customerName: string;
  collectorName?: string;
  wasteType: string;
  estimatedWeightKg: number;
  verifiedWeightKg: number;
  subtotalNgn: number;
  discountNgn: number;
  ecopointsUsed: number;
  serviceFeeNgn: number;
  platformFeeNgn: number;
  totalNgn: number;
  ecopointsEarned: number;
  paymentMethod: string;
  paymentReference: string;
  pickupAddress: string;
  completedAt: string;
};

type Props = {
  receipt: ReceiptData;
  onDownload?: () => void;
  onEmail?: () => void;
};

export function DigitalReceipt({ receipt, onDownload, onEmail }: Props) {
  const formatNgn = (v: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(v);

  return (
    <Card className="border-0 shadow-brand-lg rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#145C25] to-[#1A7A30] p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs uppercase tracking-wider">Receipt</p>
            <p className="text-xl font-bold mt-1">#{receipt.receiptNumber}</p>
          </div>
          <div className="text-right">
            <QrCode className="w-12 h-12 text-white/80" />
            <p className="text-xs text-white/70 mt-1">{receipt.pickupReference}</p>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-5">
        {/* Status */}
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <span className="text-sm font-semibold text-green-700">Payment Confirmed</span>
        </div>

        {/* Pickup Details */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Pickup Details</h3>
          <div className="bg-neutral-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Waste Type</span><span className="font-semibold">{receipt.wasteType}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Est. Weight</span><span className="font-semibold">{receipt.estimatedWeightKg} kg</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Verified Weight</span><span className="font-semibold">{receipt.verifiedWeightKg} kg</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Address</span><span className="font-semibold text-right max-w-[180px] truncate">{receipt.pickupAddress}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Completed</span><span className="font-semibold">{new Date(receipt.completedAt).toLocaleDateString("en-NG", { dateStyle: "long" })}</span></div>
            {receipt.collectorName && (
              <div className="flex justify-between"><span className="text-neutral-500">Collector</span><span className="font-semibold">{receipt.collectorName}</span></div>
            )}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Price Breakdown</h3>
          <div className="bg-neutral-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span className="font-semibold">{formatNgn(receipt.subtotalNgn)}</span></div>
            {receipt.discountNgn > 0 && (
              <div className="flex justify-between"><span className="text-green-600">EcoPoints Discount ({receipt.ecopointsUsed} pts)</span><span className="font-semibold text-green-600">-{formatNgn(receipt.discountNgn)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-neutral-500">Service Fee</span><span className="font-semibold">{formatNgn(receipt.serviceFeeNgn)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Platform Fee</span><span className="font-semibold">{formatNgn(receipt.platformFeeNgn)}</span></div>
            <div className="flex justify-between font-bold text-neutral-900 pt-2 border-t border-neutral-200">
              <span>Total</span>
              <span className="text-[#145C25] text-lg">{formatNgn(receipt.totalNgn)}</span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Payment</h3>
          <div className="bg-neutral-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Method</span><span className="font-semibold capitalize">{receipt.paymentMethod}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Reference</span><span className="font-semibold text-xs">{receipt.paymentReference}</span></div>
          </div>
        </div>

        {/* EcoPoints Earned */}
        {receipt.ecopointsEarned > 0 && (
          <div className="p-4 bg-amber-50 rounded-xl flex items-center gap-3">
            <span className="text-2xl">🪙</span>
            <div>
              <p className="font-bold text-amber-700">+{receipt.ecopointsEarned.toLocaleString()} EcoPoints earned!</p>
              <p className="text-xs text-amber-600">Added to your wallet</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onDownload}>
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onEmail}>
            <Mail className="w-4 h-4 mr-2" /> Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
