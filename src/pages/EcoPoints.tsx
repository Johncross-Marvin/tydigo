/**
 * EcoPoints Economy — Production Dashboard
 *
 * Full EcoPoints experience: wallet, tiers, badges, leaderboard,
 * challenges, referrals, and redemption — all backed by Supabase.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  ArrowLeft, Award, TrendingUp, Gift, Users,
  Trophy, Zap, Star, Crown,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import {
  getEcoWallet, getEcoTransactions, getEcoTiers, getCurrentTier,
  getEcoBadges, getUserBadges, getActiveChallenges,
  joinChallenge, getChallengeParticipants,
  getReferralCode, getReferrals,
  formatEcopoints, ecopointsToNaira,
  redeemEcoPoints,
  REDEMPTION_OPTIONS,
  type EcoTier, type EcoBadge, type UserEcoBadge,
  type EcoChallenge, type EcoChallengeParticipant,
  type ReferralCode, type Referral,
} from "@/services/ecopoints";

const formatNgn = (v: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(v);

const EcoPointsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("wallet");

  const profileId = user?.id;

  // Wallet
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["eco-wallet", profileId],
    queryFn: () => getEcoWallet(profileId!),
    enabled: !!profileId,
  });

  // Transactions
  const { data: transactions } = useQuery({
    queryKey: ["eco-transactions", profileId],
    queryFn: () => getEcoTransactions(profileId!, 50),
    enabled: !!profileId,
  });

  // Tiers
  const { data: tiers } = useQuery({
    queryKey: ["eco-tiers"],
    queryFn: getEcoTiers,
  });

  // Badges
  const { data: allBadges } = useQuery({
    queryKey: ["eco-badges"],
    queryFn: getEcoBadges,
  });
  const { data: userBadges } = useQuery({
    queryKey: ["user-eco-badges", profileId],
    queryFn: () => getUserBadges(profileId!),
    enabled: !!profileId,
  });

  // Challenges
  const { data: challenges } = useQuery({
    queryKey: ["eco-challenges"],
    queryFn: getActiveChallenges,
  });

  // Referrals
  const { data: referralCode } = useQuery({
    queryKey: ["referral-code", profileId],
    queryFn: () => getReferralCode(profileId!),
    enabled: !!profileId,
  });
  const { data: referrals } = useQuery({
    queryKey: ["referrals", profileId],
    queryFn: () => getReferrals(profileId!),
    enabled: !!profileId,
  });

  // Join challenge mutation
  const joinMutation = useMutation({
    mutationFn: (challengeId: string) => joinChallenge(challengeId, profileId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eco-challenges"] });
      toast.success("Challenge joined!");
    },
    onError: () => toast.error("Could not join challenge"),
  });

  // Redeem EcoPoints mutation (server-authoritative via RPC)
  const redeemMutation = useMutation({
    mutationFn: (option: { id: string; points: number; type: string; name: string }) =>
      redeemEcoPoints({
        profileId: profileId!,
        points: option.points,
        redemptionType: option.type,
        idempotencyKey: `redeem_${option.id}_${Date.now()}`,
        description: `Redeemed ${option.name}`,
      }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["eco-wallet", profileId] });
      queryClient.invalidateQueries({ queryKey: ["eco-transactions", profileId] });
      toast.success("EcoPoints redeemed successfully!");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not redeem EcoPoints"),
  });

  const currentPoints = wallet?.balance || 0;
  const lifetimePoints = wallet?.lifetime_earned || 0;
  const currentTier = tiers?.length ? getCurrentTier(tiers, lifetimePoints) : null;
  const nextTier = tiers?.length
    ? tiers[tiers.indexOf(currentTier!) + 1] || null
    : null;

  const earnedBadgeIds = new Set((userBadges || []).map((b) => b.badge_id));

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 h-14 flex items-center gap-3">
        <Link to="/household/dashboard" className="p-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">EcoPoints</h1>
        {currentTier && (
          <Badge className="ml-auto bg-green-100 text-green-700">
            {currentTier.name}
          </Badge>
        )}
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Balance Hero */}
        <Card className="border-0 bg-gradient-to-br from-[#145C25] via-[#1A7A30] to-[#0D3B1A] text-white shadow-brand-lg">
          <CardContent className="p-6 text-center">
            <p className="text-white/70 text-sm">Your EcoPoints Balance</p>
            {walletLoading ? (
              <div className="h-10 w-24 bg-white/20 rounded-lg animate-pulse mx-auto mt-2" />
            ) : (
              <p className="text-4xl font-black mt-2">{formatEcopoints(currentPoints)}</p>
            )}
            <p className="text-white/60 text-sm mt-1">≈ {formatNgn(ecopointsToNaira(currentPoints))} value</p>
            {currentTier && nextTier && (
              <div className="mt-4 bg-white/10 rounded-xl p-3">
                <div className="flex justify-between text-xs text-white/70 mb-1">
                  <span>{currentTier.name}</span>
                  <span>{nextTier.name}</span>
                </div>
                <Progress
                  value={Math.min(100, ((lifetimePoints - currentTier.minimum_lifetime_points) /
                    (nextTier.minimum_lifetime_points - currentTier.minimum_lifetime_points)) * 100)}
                  className="h-2 rounded-full bg-white/20 [&>div]:bg-amber-400"
                />
                <p className="text-xs text-white/50 mt-1">
                  {formatEcopoints(nextTier.minimum_lifetime_points - lifetimePoints)} pts to {nextTier.name}
                </p>
              </div>
            )}
            {currentTier && (
              <p className="text-xs text-white/40 mt-2">{currentTier.reward_multiplier}x reward multiplier active</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-4 h-4 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-extrabold">{formatEcopoints(wallet?.lifetime_earned || 0)}</p>
              <p className="text-[10px] text-neutral-500">Earned</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <Gift className="w-4 h-4 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-extrabold">{formatEcopoints(wallet?.lifetime_redeemed || 0)}</p>
              <p className="text-[10px] text-neutral-500">Redeemed</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <Star className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-extrabold">{currentTier?.reward_multiplier || 1}x</p>
              <p className="text-[10px] text-neutral-500">Multiplier</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-4 rounded-2xl bg-neutral-100 p-1">
            <TabsTrigger value="wallet" className="rounded-xl text-xs">Wallet</TabsTrigger>
            <TabsTrigger value="badges" className="rounded-xl text-xs">Badges</TabsTrigger>
            <TabsTrigger value="challenges" className="rounded-xl text-xs">Challenges</TabsTrigger>
            <TabsTrigger value="referrals" className="rounded-xl text-xs">Referrals</TabsTrigger>
          </TabsList>

          {/* Wallet Tab */}
          <TabsContent value="wallet" className="mt-4 space-y-4">
            {/* Transaction History */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {transactions?.length === 0 && (
                  <p className="text-sm text-neutral-400 text-center py-4">
                    No EcoPoints activity yet. Complete your first pickup to start earning!
                  </p>
                )}
                {(transactions || []).slice(0, 10).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        txn.points > 0 ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                      }`}>
                        {txn.points > 0 ? "+" : "-"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{txn.description || txn.transaction_type}</p>
                        <p className="text-[10px] text-neutral-400">
                          {new Date(txn.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${txn.points > 0 ? "text-green-600" : "text-amber-600"}`}>
                        {txn.points > 0 ? "+" : ""}{formatEcopoints(txn.points)}
                      </p>
                      <Badge variant="outline" className="text-[10px]">{txn.status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Redeem */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-500" /> Redeem
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {REDEMPTION_OPTIONS.map((r) => (
                  <button
                    key={r.id}
                    disabled={currentPoints < r.points || redeemMutation.isPending}
                    onClick={() => redeemMutation.mutate({ id: r.id, points: r.points, type: r.type, name: r.name })}
                    className="p-3 rounded-xl border-2 border-neutral-200 text-left hover:border-[#145C25] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <span className="text-2xl">{r.type === "discount" ? "💳" : r.type === "airtime" ? "📱" : r.type === "cashback" ? "💰" : "🌳"}</span>
                    <p className="text-sm font-bold mt-1">{r.name}</p>
                    <p className="text-xs text-neutral-500">{formatEcopoints(r.points)} pts</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {(allBadges || []).map((badge) => {
                const earned = earnedBadgeIds.has(badge.id);
                return (
                  <Card key={badge.id} className={`border-0 shadow-sm ${!earned ? "opacity-60" : ""}`}>
                    <CardContent className="p-4 text-center">
                      <span className="text-3xl">{badge.icon || "🏅"}</span>
                      <p className="text-sm font-bold mt-2">{badge.name}</p>
                      <p className="text-[10px] text-neutral-500">{badge.description}</p>
                      {earned ? (
                        <Badge className="mt-2 bg-green-100 text-green-700">Earned</Badge>
                      ) : (
                        <Badge variant="outline" className="mt-2 text-[10px] capitalize">{badge.rarity}</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {(!allBadges || allBadges.length === 0) && (
                <p className="col-span-2 text-sm text-neutral-400 text-center py-4">Badges coming soon!</p>
              )}
            </div>
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="mt-4 space-y-3">
            {(challenges || []).map((challenge) => (
              <Card key={challenge.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-sm">{challenge.title}</p>
                      <p className="text-xs text-neutral-500">{challenge.description}</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700">{formatEcopoints(challenge.reward_points)} pts</Badge>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-3">
                    <span>Target: {challenge.target_value} {challenge.target_metric}</span>
                    {challenge.ends_at && (
                      <span>Ends: {new Date(challenge.ends_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl text-xs"
                    onClick={() => joinMutation.mutate(challenge.id)}
                    disabled={joinMutation.isPending}
                  >
                    {joinMutation.isPending ? "Joining..." : "Join Challenge"}
                  </Button>
                </CardContent>
              </Card>
            ))}
            {(!challenges || challenges.length === 0) && (
              <p className="text-sm text-neutral-400 text-center py-8">
                No active challenges right now. Check back soon!
              </p>
            )}
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="mt-4 space-y-4">
            <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-violet-50">
              <CardContent className="p-4 flex items-center gap-4">
                <Users className="w-10 h-10 text-purple-500" />
                <div className="flex-1">
                  <p className="font-bold text-sm">Your Referral Code</p>
                  <p className="text-xs text-neutral-500">Share to earn 1,500 EcoPoints per verified referral</p>
                  <p className="text-sm font-mono font-bold bg-white rounded-lg px-3 py-1.5 mt-1 inline-block">
                    {referralCode?.code || "Loading..."}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs"
                  onClick={() => {
                    if (referralCode?.code) {
                      navigator.clipboard.writeText(`tydigo.com/r/${referralCode.code}`);
                      toast.success("Referral link copied!");
                    }
                  }}
                >
                  Share
                </Button>
              </CardContent>
            </Card>

            {/* Referral History */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Referral History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(referrals || []).map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium">Referral</p>
                      <p className="text-[10px] text-neutral-400">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${
                      ref.status === "rewarded" ? "bg-green-100 text-green-700" :
                      ref.status === "qualified" ? "bg-blue-100 text-blue-700" :
                      "bg-neutral-100 text-neutral-600"
                    }`}>
                      {ref.status}
                    </Badge>
                  </div>
                ))}
                {(!referrals || referrals.length === 0) && (
                  <p className="text-sm text-neutral-400 text-center py-4">
                    No referrals yet. Share your code to start earning!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default EcoPointsPage;
