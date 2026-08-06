/**
 * Tydigo Edit Profile Page
 *
 * Edit personal information: name, bio, DOB, gender, language, timezone, avatar.
 */

import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Save, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth-provider";
import { getProfile, updateProfile, uploadAvatar, deleteAvatar, syncProfileCompletion, type Profile } from "@/services/profile";
import { logActivity } from "@/services/activity";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "ha", label: "Hausa" },
  { code: "yo", label: "Yorùbá" },
  { code: "ig", label: "Igbo" },
  { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" },
  { code: "sw", label: "Kiswahili" },
];

const TIMEZONES = [
  "Africa/Lagos", "Africa/Nairobi", "Africa/Johannesburg",
  "Africa/Cairo", "Africa/Accra", "Africa/Dakar",
];

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    date_of_birth: "",
    gender: "",
    language: "en",
    timezone: "Africa/Lagos",
  });

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then((p) => {
      if (!p) return;
      setProfile(p);
      setForm({
        full_name: p.full_name || "",
        bio: p.bio || "",
        date_of_birth: p.date_of_birth || "",
        gender: p.gender || "",
        language: p.language || "en",
        timezone: p.timezone || "Africa/Lagos",
      });
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await updateProfile(user.id, form);
    await syncProfileCompletion(user.id);
    await logActivity(user.id, "profile_update", "Updated profile information");
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const url = await uploadAvatar(user.id, file);
    if (url) {
      setProfile((prev) => prev ? { ...prev, avatar_url: url } : prev);
      await logActivity(user.id, "avatar_update", "Updated profile photo");
    }
    setUploading(false);
  };

  const handleAvatarDelete = async () => {
    if (!user) return;
    await deleteAvatar(user.id);
    setProfile((prev) => prev ? { ...prev, avatar_url: null } : prev);
    await logActivity(user.id, "avatar_delete", "Removed profile photo");
  };

  const initials = (form.full_name || "TU")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/household/profile" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900 flex-1">Edit Profile</h1>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl h-9 px-4 text-sm"
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : saving ? "Saving..." : "Save"}
        </Button>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Avatar */}
        <Card className="border-0 shadow-brand-lg rounded-3xl">
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24 ring-4 ring-green-100">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-green-100 text-[#145C25] font-bold text-3xl">{initials}</AvatarFallback>
              </Avatar>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
                  <div className="h-6 w-6 rounded-full border-2 border-green-100 border-t-[#145C25] animate-spin" />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => fileRef.current?.click()} className="rounded-xl" disabled={uploading}>
                <Camera className="w-4 h-4 mr-2" /> Upload Photo
              </Button>
              {profile?.avatar_url && (
                <Button variant="outline" onClick={handleAvatarDelete} className="rounded-xl text-red-500 border-red-200 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" /> Remove
                </Button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card className="border-0 shadow-brand-lg rounded-3xl">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-neutral-700 mb-1 block">Full Name</label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-semibold text-neutral-700 mb-1 block">Bio</label>
              <Input value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="rounded-xl" placeholder="Tell us about yourself..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1 block">Date of Birth</label>
                <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1 block">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="h-10 w-full rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non_binary">Non-binary</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1 block">Language</label>
                <select
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  className="h-10 w-full rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1 block">Timezone</label>
                <select
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  className="h-10 w-full rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EditProfilePage;
