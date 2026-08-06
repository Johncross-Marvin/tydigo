/**
 * Tydigo Admin Onboarding CMS
 *
 * Manage onboarding journeys, steps, and content from the admin panel.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Pencil, Trash2, GripVertical, Eye, EyeOff,
  Save, X, CheckCircle2, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";

type Journey = {
  id: string;
  role: string;
  title: string;
  description: string | null;
  is_active: boolean;
};

type Step = {
  id: string;
  journey_id: string;
  step_number: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  icon: string | null;
  action_type: string;
  is_required: boolean;
  sort_order: number;
  estimated_minutes: number;
};

const AdminOnboardingPage = () => {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSupabaseAvailable() || !supabase) return;
    supabase
      .from("onboarding_journeys")
      .select("*")
      .order("role")
      .then(({ data }) => {
        setJourneys((data as Journey[]) || []);
        setLoading(false);
      });
  }, []);

  const loadSteps = async (journey: Journey) => {
    setSelectedJourney(journey);
    if (!supabase) return;
    const { data } = await supabase
      .from("onboarding_steps")
      .select("*")
      .eq("journey_id", journey.id)
      .order("sort_order");
    setSteps((data as Step[]) || []);
  };

  const toggleJourneyActive = async (journey: Journey) => {
    if (!supabase) return;
    await supabase
      .from("onboarding_journeys")
      .update({ is_active: !journey.is_active, updated_at: new Date().toISOString() })
      .eq("id", journey.id);
    setJourneys((prev) =>
      prev.map((j) => (j.id === journey.id ? { ...j, is_active: !j.is_active } : j)),
    );
  };

  const saveStep = async () => {
    if (!editingStep || !supabase) return;
    setSaving(true);
    if (editingStep.id) {
      await supabase.from("onboarding_steps").update(editingStep).eq("id", editingStep.id);
    }
    setEditingStep(null);
    setSaving(false);
    if (selectedJourney) loadSteps(selectedJourney);
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
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900">Onboarding Manager</h1>
            <p className="text-neutral-500 text-sm">Manage onboarding journeys and steps for all roles.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Journeys List */}
          <Card className="border-0 shadow-brand-lg rounded-3xl lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Journeys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {journeys.map((journey) => (
                <button
                  key={journey.id}
                  onClick={() => loadSteps(journey)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors ${
                    selectedJourney?.id === journey.id
                      ? "bg-green-50 border-2 border-[#145C25]"
                      : "bg-neutral-50 hover:bg-neutral-100 border-2 border-transparent"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-neutral-900 text-sm capitalize">{journey.role}</p>
                    <p className="text-xs text-neutral-500 truncate">{journey.title}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {journey.is_active ? (
                      <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
                    ) : (
                      <Badge className="bg-neutral-100 text-neutral-500 text-xs">Inactive</Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Steps */}
          <Card className="border-0 shadow-brand-lg rounded-3xl lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold">
                {selectedJourney ? `Steps — ${selectedJourney.role}` : "Select a Journey"}
              </CardTitle>
              {selectedJourney && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleJourneyActive(selectedJourney)}
                    className="rounded-xl"
                  >
                    {selectedJourney.is_active ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                    {selectedJourney.is_active ? "Disable" : "Enable"}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!selectedJourney ? (
                <div className="text-center py-8 text-neutral-400">
                  <p>Select a journey from the left to manage its steps.</p>
                </div>
              ) : steps.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  <p>No steps defined for this journey.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors"
                    >
                      <GripVertical className="w-4 h-4 text-neutral-300" />
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-xs font-bold text-[#145C25]">
                        {step.step_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-neutral-900 text-sm">{step.title}</p>
                        <p className="text-xs text-neutral-500 truncate">{step.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className="text-xs" variant={step.is_required ? "default" : "outline"}>
                          {step.is_required ? "Required" : "Optional"}
                        </Badge>
                        <Badge className="text-xs bg-blue-100 text-blue-700">{step.action_type}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingStep(step)}
                        className="text-neutral-400 hover:text-[#145C25]"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Step Modal */}
        {editingStep && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <Card className="w-full max-w-lg border-0 shadow-2xl rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold">Edit Step</CardTitle>
                <button onClick={() => setEditingStep(null)} className="p-1.5 rounded-lg hover:bg-neutral-100">
                  <X className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1 block">Title</label>
                  <Input
                    value={editingStep.title}
                    onChange={(e) => setEditingStep({ ...editingStep, title: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1 block">Subtitle</label>
                  <Input
                    value={editingStep.subtitle || ""}
                    onChange={(e) => setEditingStep({ ...editingStep, subtitle: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1 block">Description</label>
                  <Input
                    value={editingStep.description || ""}
                    onChange={(e) => setEditingStep({ ...editingStep, description: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1 block">Icon</label>
                    <Input
                      value={editingStep.icon || ""}
                      onChange={(e) => setEditingStep({ ...editingStep, icon: e.target.value })}
                      className="rounded-xl"
                      placeholder="Home, Truck, Award..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1 block">Action Type</label>
                    <select
                      value={editingStep.action_type}
                      onChange={(e) => setEditingStep({ ...editingStep, action_type: e.target.value })}
                      className="h-10 w-full rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm"
                    >
                      <option value="info">Info</option>
                      <option value="quiz">Quiz</option>
                      <option value="action">Action</option>
                      <option value="accept">Accept</option>
                      <option value="tutorial">Tutorial</option>
                      <option value="complete">Complete</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingStep.is_required}
                      onChange={(e) => setEditingStep({ ...editingStep, is_required: e.target.checked })}
                      className="h-4 w-4 rounded border-neutral-300 text-[#145C25]"
                    />
                    <span className="text-sm text-neutral-700">Required</span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setEditingStep(null)} className="flex-1 rounded-xl">
                    Cancel
                  </Button>
                  <Button onClick={saveStep} disabled={saving} className="flex-1 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
                    {saving ? "Saving..." : "Save Changes"}
                    <Save className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOnboardingPage;
