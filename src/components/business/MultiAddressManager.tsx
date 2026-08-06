import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Plus, Trash2, Edit3 } from "lucide-react";

type Location = {
  id: string;
  address: string;
  label: string;
};

type MultiAddressManagerProps = {
  locations: Location[];
  onAdd: (address: string, label: string) => void;
  onRemove: (id: string) => void;
};

export function MultiAddressManager({ locations, onAdd, onRemove }: MultiAddressManagerProps) {
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const handleAdd = () => {
    if (!newAddress.trim() || !newLabel.trim()) return;
    onAdd(newAddress.trim(), newLabel.trim());
    setNewAddress("");
    setNewLabel("");
  };

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <h3 className="font-bold text-neutral-900 mb-4">Pickup Locations</h3>

        {/* Existing locations */}
        <div className="space-y-2 mb-4">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50"
            >
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-[#145C25]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-800">{loc.label}</p>
                <p className="text-xs text-neutral-500 truncate">{loc.address}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(loc.id)}
                className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg h-8 w-8"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {locations.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-4">
              No locations added yet.
            </p>
          )}
        </div>

        {/* Add new */}
        <div className="space-y-3 p-4 rounded-xl bg-neutral-50">
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-1 block">Location Label</Label>
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g., Main Office, Warehouse A"
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-1 block">Address</Label>
            <Input
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Enter full address"
              className="rounded-xl"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!newAddress.trim() || !newLabel.trim()}
            className="w-full bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
