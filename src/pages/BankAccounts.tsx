/**
 * Tydigo Bank Accounts Page
 *
 * Add, manage, and set default bank accounts for withdrawals.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Plus, CreditCard, Building2, Pencil, Trash2,
  CheckCircle2, Star, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import {
  getBankAccounts, addBankAccount, updateBankAccount, deleteBankAccount,
  setDefaultBankAccount, NIGERIAN_BANKS, type BankAccount,
} from "@/services/bank";
import { logActivity } from "@/services/activity";

const BankAccountsPage = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    bank_name: "", account_name: "", account_number: "", bank_code: "", is_default: false,
  });

  useEffect(() => {
    if (!user) return;
    getBankAccounts(user.id).then((data) => {
      setAccounts(data);
      setLoading(false);
    });
  }, [user]);

  const openNew = () => {
    setForm({ bank_name: "", account_name: "", account_number: "", bank_code: "", is_default: false });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (acc: BankAccount) => {
    setForm({
      bank_name: acc.bank_name, account_name: acc.account_name,
      account_number: acc.account_number, bank_code: acc.bank_code || "",
      is_default: acc.is_default,
    });
    setEditingId(acc.id);
    setShowForm(true);
  };

  const handleBankSelect = (bankName: string, bankCode: string) => {
    setForm({ ...form, bank_name: bankName, bank_code: bankCode });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    if (editingId) {
      await updateBankAccount(editingId, form);
      await logActivity(user.id, "bank_update", `Updated bank account: ${form.bank_name}`);
    } else {
      await addBankAccount(user.id, form);
      await logActivity(user.id, "bank_add", `Added bank account: ${form.bank_name}`);
    }
    const data = await getBankAccounts(user.id);
    setAccounts(data);
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await deleteBankAccount(id);
    await logActivity(user.id, "bank_delete", "Removed a bank account");
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    await setDefaultBankAccount(user.id, id);
    setAccounts((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
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
        <h1 className="font-bold text-neutral-900 flex-1">Bank Accounts</h1>
        <Button onClick={openNew} className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl h-9 px-3 text-sm">
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {accounts.length === 0 && !showForm && (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
            <p className="text-neutral-500 font-semibold">No bank accounts</p>
            <p className="text-sm text-neutral-400 mt-1">Add a bank account to receive withdrawals.</p>
            <Button onClick={openNew} className="mt-4 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Add Bank Account
            </Button>
          </div>
        )}

        {accounts.map((acc) => (
          <Card key={acc.id} className={`border-0 shadow-brand-lg rounded-2xl ${acc.is_default ? "ring-2 ring-[#145C25]" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-neutral-900">{acc.bank_name}</p>
                    {acc.is_default && <Badge className="bg-green-100 text-green-700 text-xs">Default</Badge>}
                    {acc.is_verified && <Badge className="bg-blue-100 text-blue-700 text-xs">Verified</Badge>}
                  </div>
                  <p className="text-sm text-neutral-600">{acc.account_name}</p>
                  <p className="text-sm text-neutral-500 font-mono">{acc.account_number}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(acc)} className="p-1.5 rounded-lg hover:bg-neutral-100">
                    <Pencil className="w-4 h-4 text-neutral-400" />
                  </button>
                  <button onClick={() => handleDelete(acc.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              {!acc.is_default && (
                <button onClick={() => handleSetDefault(acc.id)} className="mt-3 text-xs font-semibold text-[#145C25]">
                  Set as default
                </button>
              )}
            </CardContent>
          </Card>
        ))}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
            <Card className="w-full sm:max-w-lg border-0 shadow-2xl rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white rounded-t-3xl z-10">
                <CardTitle className="text-lg font-bold">{editingId ? "Edit Bank Account" : "Add Bank Account"}</CardTitle>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-neutral-100"><X className="w-5 h-5" /></button>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1 block">Bank</label>
                  <select
                    value={form.bank_name}
                    onChange={(e) => {
                      const bank = NIGERIAN_BANKS.find((b) => b.name === e.target.value);
                      handleBankSelect(e.target.value, bank?.code || "");
                    }}
                    className="h-10 w-full rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm"
                  >
                    <option value="">Select bank...</option>
                    {NIGERIAN_BANKS.map((b) => (
                      <option key={b.code} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1 block">Account Number</label>
                  <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} className="rounded-xl" maxLength={10} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1 block">Account Name</label>
                  <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} className="rounded-xl" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-[#145C25]" />
                  <span className="text-sm text-neutral-700">Set as default</span>
                </label>
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

export default BankAccountsPage;
