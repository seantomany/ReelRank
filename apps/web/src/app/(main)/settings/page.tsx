"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, LogOut, User, Mail, AtSign, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [username, setUsername] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const res = await api.auth.verify();
      if (res.data) {
        setUsername(res.data.username ?? "");
        setPhotoUrl(res.data.photoUrl ?? null);
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    const canvas = document.createElement("canvas");
    const img = document.createElement("img");
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = async () => {
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

        const res = await apiFetch<{ photoUrl: string }>("/api/auth/photo", {
          method: "POST",
          body: JSON.stringify({ photoUrl: dataUrl }),
        });
        if (res.error) {
          toast.error(res.error);
        } else {
          setPhotoUrl(dataUrl);
          toast.success("Profile photo updated");
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await api.auth.updateProfile({ username: username.trim() });
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Profile updated");
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <Link
        href="/profile"
        className="flex items-center gap-1.5 text-sm text-[#888] hover:text-[#e8e8e8] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Profile
      </Link>

      <h1 className="text-lg font-semibold text-[#e8e8e8] mb-6">Settings</h1>

      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block h-5 w-5 border-2 border-[#ff2d55] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile Photo */}
          <section className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-[#888]">Profile Photo</p>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full bg-[#111] border border-[rgba(255,255,255,0.08)] flex items-center justify-center overflow-hidden shrink-0">
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <span className="text-xl text-[#888]">{user?.email?.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 text-sm text-[#ff2d55] hover:text-[#e8e8e8] transition-colors cursor-pointer">
                  <Camera className="w-4 h-4" />
                  {photoUrl ? "Change photo" : "Upload photo"}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
                <p className="text-xs text-[#888] mt-1">Square image recommended, max 2MB</p>
              </div>
            </div>
          </section>

          {/* Account Info */}
          <section className="space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-[#888]">Account</p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)]">
                <Mail className="w-4 h-4 text-[#555]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#888]">Email</p>
                  <p className="text-sm text-[#e8e8e8] truncate">{user?.email}</p>
                </div>
              </div>

              <div className="py-2 px-3 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3">
                  <AtSign className="w-4 h-4 text-[#555]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#888]">Username</p>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Set a username"
                      className="w-full bg-transparent text-sm text-[#e8e8e8] placeholder:text-[#555] outline-none mt-0.5"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)]">
                <User className="w-4 h-4 text-[#555]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#888]">Display Name</p>
                  <p className="text-sm text-[#e8e8e8]">{user?.displayName ?? user?.email?.split("@")[0]}</p>
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </section>

          {/* Sign Out */}
          <section className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full py-3 px-3 rounded-lg text-sm text-red-400 hover:bg-[#111] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
