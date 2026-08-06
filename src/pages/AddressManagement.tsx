/**
 * Tydigo Address Management
 *
 * CRUD for addresses with Google Maps integration, default selection,
 * pickup-enabled toggle, and saved pickup locations.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Plus, MapPin, Home, Building2, Warehouse, Star,
  Pencil, Trash2, CheckCircle2, Navigation, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import {
  getAddresses, createAddress, updateAddress, deleteAddress,
  setDefaultAddress, type Address, type AddressInput,
} from "@/services/address";
import { logActivity } from "@/services/activity";

const LABEL_ICONS: Record<string, typeof Home> = {
  Home, Office: Building2, Warehouse, Estate: Building2, Business: Building2,
};

const LABEL_OPTIONS = ["Home", "Office", "Warehouse", "Estate", "Business", "Other"];

const AddressManagementPage = () => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm: AddressInput = {
    label: "Home", recipient_name: "", phone: "", country: "Nigeria",
    state: "", city: "", lga: "", estate: "", street: "", building: "",
    landmark: "", postal_code: "", latitude: null, longitude: null,
    is_default: false, pickup_enabled: true, delivery_enabled: false,
  };

  const [form, setForm] = useState<AddressInput>(emptyForm);

  useEffect(() => {
    if (!user) return;
    getAddresses(user.id).then((data) => {
      setAddresses(data);
      setLoading(false);
    });
  }, [user]);

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (addr: Address) => {
    setForm({
      label: addr.label, recipient_name: addr.recipient_name, phone: addr.phone,
      country: addr.country, state: addr.state, city: addr.city, lga: addr.lga,
      estate: addr.estate, street: addr.street, building: addr.building,
      landmark: addr.landmark, postal_code: addr.postal_code,
      latitude: addr.latitude, longitude: addr.longitude,
      is_default: addr.is_default, pickup_enabled: addr.pickup_enabled,
      delivery_enabled: addr.delivery_enabled,
    });
    setEditingId(addr.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    if (editingId) {
      await updateAddress(editingId, form);
      await logActivity(user.id, "address_update", `Updated address: ${form.label}`);
    } else {
      await createAddress(user.id, form);
      await logActivity(user.id, "address_create", `Added new address: ${form.label}`);
    }
    const data = await getAddresses(user.id);
    setAddresses(data);
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await deleteAddress(id);
    await logActivity(user.id, "address_delete", "Deleted an address");
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    await setDefaultAddress(user.id, id);
    setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-green-100 border-t-[#145C25] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/household/profile" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900 flex-1">Addresses</h1>
        <Button onClick={openNew} className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl h-9 px-3 text-sm">
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {addresses.length === 0 && !showForm && (
          <div className="text-center py-16">
            <MapPin className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
            <p className="text-neutral-500 font-semibold">No addresses saved</p>
            <p className="text-sm text-neutral-400 mt-1">Add your first address to get started.</p>
            <Button onClick={openNew} className="mt-4 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Add Address
            </Button>
          </div>
        )}

        {addresses.map((addr) => {
          const Icon = LABEL_ICONS[addr.label] || MapPin;
          return (
            <Card key={addr.id} className={`border-0 shadow-brand-lg rounded-2xl ${addr.is_default ? "ring-2 ring-[#145C25]" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#145C25]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-neutral-900">{addr.label}</p>
                      {addr.is_default && <Badge className="bg-green-100 text-green-700 text-xs">Default</Badge>}
                      {addr.pickup_enabled && <Badge className="bg-blue-100 text-blue-700 text-xs">Pickup</Badge>}
                    </div>
                    <p className="text-sm text-neutral-600 mt-0.5">
                      {[addr.street, addr.building, addr.city, addr.state].filter(Boolean).join(", ") || "No details"}
                    </p>
                    {addr.landmark && <p className="text-xs text-neutral-400 mt-0.5">📍 {addr.landmark}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(addr)} className="p-1.5 rounded-lg hover:bg-neutral-100">
                      <Pencil className="w-4 h-4 text-neutral-400" />
                    </button>
                    <button onClick={() => handleDelete(addr.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
                {!addr.is_default && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="mt-3 text-xs font-semibold text-[#145C25] hover:text-[#0F4A1E]"
                  >
                    Set as default
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
            <Card className="w-full sm:max-w-lg border-0 shadow-2xl rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white rounded-t-3xl z-10">
                <CardTitle className="text-lg font-bold">{editingId ? "Edit Address" : "New Address"}</CardTitle>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-neutral-100">
                  <X className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1 block">Label</label>
                  <select
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="h-10 w-full rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm"
                  >
                    {LABEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1 block">Recipient Name</label>
                    <Input value={form.recipient_name || ""} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} className="rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1 block">Phone</label>
                    <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1 block">Street</label>
                  <Input value={form.street || ""} onChange={(e) => setForm({ ...form, street: e.target.value })} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1 block">Building / No.</label>
                    <Input value={form.building || ""} onChange={(e) => setForm({ ...form, building: e.target.value })} className="rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1 block">Estate</label>
                    <Input value={form.estate || ""} onChange={(e) => setForm({ ...form, estate: e.target.value })} className="rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1 block">City</label>
                    <Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1 block">State</label>
                    <Input value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1 block">Landmark</label>
                  <Input value={form.landmark || ""} onChange={(e) => setForm({ ...form, landmark: e.target.value })} className="rounded-xl" placeholder="Nearby landmark..." />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-[#145C25]" />
                    <span className="text-sm text-neutral-700">Default address</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.pickup_enabled} onChange={(e) => setForm({ ...form, pickup_enabled: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-[#145C25]" />
                    <span className="text-sm text-neutral-700">Pickup enabled</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-xl">Cancel</Button>
                  <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
                    {saving ? "Saving..." : "Save Address"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default AddressManagementPage;
