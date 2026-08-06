/**
 * Collector Wallet Component
 * Shows balance, transactions, and withdrawal CTA
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowUp, ArrowDown, Clock, Banknote, TrendingUp } from "lucide-react";

export type WalletData = {
  availableBalanceNgn: number;
  pendingBalanceNgn: number;
  withdrawableBalanceNgn: number;
  lifetimeEarningsNgn: number;
  recentTransactions: Array<{
    id: string;
    type: "earning" | "withdrawal" | "bonus" | "ecopoints";
    amountNgn: number;
    description: string;
    createdAt: string;
  }>;
};

type Props = {
  wallet: WalletData;
  onWithdraw: () => void;
};

const formatNgn = (v: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(v);

export function CollectorWalletCard({ wallet, onWithdraw }: Props) {
  return (
    <div className="space-y-4">
      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 bg-gradient-to-br from-[#145C25] to-[#1A7A30] text-white shadow-brand">
          <CardContent className="p-4">
            <p className="text-white/70 text-xs uppercase tracking-wider">Available</p>
            <p className="text-2xl font-extrabold mt-1">{formatNgn(wallet.availableBalanceNgn)}</p>
            <div className="flex items-center gap-1 mt-2 text-white/60 text-xs">
              <TrendingUp className="w-3 h-3" /> Lifetime: {formatNgn(wallet.lifetimeEarningsNgn)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-neutral-100">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
              <span className="font-bold">{formatNgn(wallet.pendingBalanceNgn)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500 flex items-center gap-1"><Banknote className="w-3 h-3" /> Withdrawable</span>
              <span className="font-bold text-[#145C25]">{formatNgn(wallet.withdrawableBalanceNgn)}</span>
            </div>
            <Button onClick={onWithdraw} size="sm" className="w-full bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl text-xs">
              <Wallet className="w-3 h-3 mr-1" /> Withdraw
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="text-sm font-bold text-neutral-700 mb-3">Recent Transactions</h3>
        <div className="space-y-2">
          {wallet.recentTransactions.slice(0, 5).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white border border-neutral-100">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  tx.type === "withdrawal" ? "bg-red-100" : "bg-green-100"
                }`}>
                  {tx.type === "withdrawal" ? (
                    <ArrowUp className="w-4 h-4 text-red-500" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold">{tx.description}</p>
                  <p className="text-xs text-neutral-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${tx.type === "withdrawal" ? "text-red-500" : "text-green-600"}`}>
                  {tx.type === "withdrawal" ? "-" : "+"}{formatNgn(tx.amountNgn)}
                </p>
                <Badge className="text-[10px] capitalize">{tx.type}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
