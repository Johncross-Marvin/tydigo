import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Users,
  Ban,
  CheckCircle2,
  MoreHorizontal,
  Star,
} from "lucide-react";
import type { AdminUser, UserRole } from "@/lib/api";

type UserManagerProps = {
  users: AdminUser[];
  onSearch: (query: string) => void;
  onSuspend: (userId: string, suspend: boolean) => void;
  onViewDetails: (userId: string) => void;
};

const roleColors: Record<string, string> = {
  customer: "bg-blue-100 text-blue-600",
  household: "bg-blue-100 text-blue-600",
  collector: "bg-green-100 text-[#145C25]",
  fleet: "bg-green-100 text-[#145C25]",
  business: "bg-purple-100 text-purple-600",
  estate: "bg-purple-100 text-purple-600",
  corporate: "bg-purple-100 text-purple-600",
  recycler: "bg-amber-100 text-amber-600",
  organic_partner: "bg-amber-100 text-amber-600",
  partner: "bg-amber-100 text-amber-600",
  admin: "bg-red-100 text-red-600",
  government: "bg-red-100 text-red-600",
};

export function UserManager({ users, onSearch, onSuspend, onViewDetails }: UserManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    onSearch(searchQuery);
  };

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#145C25]" />
            <h3 className="font-bold text-neutral-900">User Management</h3>
          </div>
          <Badge className="bg-neutral-100 text-neutral-600 rounded-full">
            {users.length} users
          </Badge>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by name, phone, or email..."
              className="pl-10 rounded-xl"
            />
          </div>
          <Button onClick={handleSearch} variant="outline" className="rounded-xl">
            Search
          </Button>
        </div>

        {/* User list */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors"
            >
              <Avatar className="w-10 h-10 ring-2 ring-neutral-100 shrink-0">
                <AvatarFallback className="bg-green-100 text-[#145C25] font-bold">
                  {user.full_name?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-neutral-800 truncate">
                    {user.full_name}
                  </p>
                  <Badge className={`${roleColors[user.role] ?? "bg-neutral-100 text-neutral-600"} rounded-full text-[10px]`}>
                    {user.role}
                  </Badge>
                  {user.suspended && (
                    <Badge className="bg-red-100 text-red-600 rounded-full text-[10px]">Suspended</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
                  <span>{user.phone}</span>
                  <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {user.rating != null ? user.rating.toFixed(1) : "New"}
                  </span>
                  <span>{user.total_pickups} pickups</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSuspend(user.id, !user.suspended)}
                  className={`h-8 w-8 rounded-lg ${
                    user.suspended
                      ? "text-green-600 hover:bg-green-50"
                      : "text-red-400 hover:bg-red-50"
                  }`}
                >
                  {user.suspended ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Ban className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewDetails(user.id)}
                  className="h-8 w-8 rounded-lg"
                >
                  <MoreHorizontal className="w-4 h-4 text-neutral-400" />
                </Button>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-8">
              No users found.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
