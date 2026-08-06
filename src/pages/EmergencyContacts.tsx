/**
 * Tydigo Emergency Contacts Page
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Plus, PhoneCall, User, Pencil, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import {
  getEmergencyContacts, addEmergencyContact, updateEmergencyContact,
  deleteEmergencyContact, RELATIONSHIP_OPTIONS, type EmergencyContact,
} from "@/services/emergency";
import { logActivity } from "@/services/activity";

const EmergencyContactsPage = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "", relationship: "Friend", phone: "", email: "", priority: 1,
  });

  useEffect(() => {
    if (!user) return;
    getEmergencyContacts(user.id).then((data) => {
      setContacts(data);
      setLoading(false);
    });
  }, [user]);

  const openNew = () => {
    setForm({ full_name: "", relationship: "Friend", phone: "", email: "", priority: 1 });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (c: EmergencyContact) => {
    setForm({
      full_name: c.full_name, relationship: c.relationship,
      phone: c.phone, email: c.email || "", priority: c.priority,
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    if (editingId) {
      await updateEmergencyContact(editingId, form);
      await logActivity(user.id, "emergency_update", `Updated emergency contact: ${form.full_name}`);
    } else {
      await addEmergencyContact(user.id, form);
      await logActivity(user.id, "emergency_add", `Added emergency contact: ${form.full_name}`);
    }
    const data = await getEmergencyContacts(user.id);
    setContacts(data);
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await deleteEmergencyContact(id);
    await logActivity(user.id, "emergency_delete", "Removed an emergency contact");
    setContacts((prev) => prev.filter((c) => c.id !== id));
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
        <h1 className="font-bold text-neutral-900 flex-1">Emergency Contacts</h1>
        <Button onClick={openNew} className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl h-9 px-3 text-sm">
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {contacts.length === 0 && !showForm && (
          <div className="text-center py-16">
            <PhoneCall className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
            <p className="text-neutral-500 font-semibold">No emergency contacts</p>
            <p className="text-sm text-neutral-400 mt-1">Add contacts to be reached in case of emergency.</p>
            <Button onClick={openNew} className="mt-4 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Add Contact
            </Button>
          </div>
        )}

        {contacts.map((c) => (
          <Card key={c.id} className="border-0 shadow-brand-lg rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <PhoneCall className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-neutral-900">{c.full_name}</p>
                    <Badge className="bg-neutral-100 text-neutral-600 text-xs">{c.relationship}</Badge>
                    <Badge className="text-xs" variant="outline">P{c.priority}</Badge>
                  </div>
                  <p className="text-sm text-neutral-600">{c.phone}</p>
                  {c.email && <p className="text-xs text-neutral-500">{c.email}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-neutral-100">
                    <Pencil className="w-4 h-4 text-neutral-400" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
            <Card className="w-full sm:max-w-lg border-0 shadow-2xl rounded-t-3xl sm:rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold">{editingId ? "Edit Contact" : "Add Contact"}</CardTitle>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-neutral-100"><X className="w-5 h-5" /></button>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1 block">Full Name</label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1 block">Relationship</label>
                    <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="h-10 w-full rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm">
                      {RELATIONSHIP_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1 block">Priority</label>
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="h-10 w-full rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm">
                      {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>Priority {p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1 block">Phone</label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1 block">Email (optional)</label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-xl">Cancel</Button>
                  <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
                    {saving ? "Saving..." : "Save"}
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

export default EmergencyContactsPage;
