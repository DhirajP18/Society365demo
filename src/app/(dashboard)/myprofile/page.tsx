"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  User, Mail, Phone, Building2, Home, Shield,
  Edit3, Save, X, KeyRound, Eye, EyeOff,
  CheckCircle2, Loader2, Lock, BadgeCheck,
  AlertCircle,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Profile {
  id:      number
  name:    string
  emailId: string
  mobile?: string
  floor?:  string
  flat?:   string
  role?:   string
  status?: string
}
interface ApiRes<T = unknown> { isSuccess?: boolean; resMsg?: string; result?: T }

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
  return (
    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl shrink-0
      bg-gradient-to-br from-violet-500 to-indigo-600
      flex items-center justify-center
      shadow-[0_8px_24px_rgba(109,40,217,0.25)]
      ring-4 ring-white dark:ring-slate-900">
      <span className="text-white font-black text-2xl sm:text-3xl tracking-tight">{initials}</span>
    </div>
  )
}

// ── Field label ────────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
      {children}
    </p>
  )
}

// ── Info row in view mode ─────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: {
  icon: React.ReactNode; label: string; value?: string
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="h-8 w-8 rounded-lg bg-violet-50 dark:bg-violet-500/10
        flex items-center justify-center shrink-0 text-violet-500 dark:text-violet-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <p className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
          {value || <span className="text-slate-300 dark:text-slate-600 font-normal italic">Not set</span>}
        </p>
      </div>
    </div>
  )
}

// ── Text input ────────────────────────────────────────────────────────────────
function TextInput({ label, value, onChange, placeholder, icon, readOnly }: {
  label: string; value: string; onChange?: (v: string) => void
  placeholder?: string; icon: React.ReactNode; readOnly?: boolean
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {icon}
        </div>
        <input
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={cn(
            "w-full h-11 pl-10 pr-4 rounded-xl text-[13px] transition-all outline-none",
            "border text-slate-800 dark:text-slate-200",
            readOnly
              ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-violet-400 dark:focus:border-violet-500 focus:ring-3 focus:ring-violet-100 dark:focus:ring-violet-900/30"
          )}
        />
      </div>
    </div>
  )
}

// ── Password input ────────────────────────────────────────────────────────────
function PwdInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••"}
          className="w-full h-11 pl-10 pr-11 rounded-xl text-[13px] transition-all outline-none
            bg-white dark:bg-slate-800
            border border-slate-200 dark:border-slate-700
            text-slate-800 dark:text-slate-200
            focus:border-violet-400 dark:focus:border-violet-500
            focus:ring-3 focus:ring-violet-100 dark:focus:ring-violet-900/30"
        />
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2
            text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

// ── Password input — no paste (for confirm field) ────────────────────────────
function PwdInputNoPaste({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          onPaste={e => e.preventDefault()}
          onCopy={e => e.preventDefault()}
          onCut={e => e.preventDefault()}
          placeholder={placeholder ?? "••••••••"}
          className="w-full h-11 pl-10 pr-11 rounded-xl text-[13px] transition-all outline-none
            bg-white dark:bg-slate-800
            border border-slate-200 dark:border-slate-700
            text-slate-800 dark:text-slate-200
            focus:border-violet-400 dark:focus:border-violet-500
            focus:ring-3 focus:ring-violet-100 dark:focus:ring-violet-900/30"
        />
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2
            text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

// ── Strength bar ──────────────────────────────────────────────────────────────
function StrengthBar({ password }: { password: string }) {
  const score = (() => {
    if (!password) return 0
    let s = 0
    if (password.length >= 6)             s++
    if (password.length >= 10)            s++
    if (/[A-Z]/.test(password))           s++
    if (/[0-9]/.test(password))           s++
    if (/[^A-Za-z0-9]/.test(password))   s++
    return s
  })()
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Excellent"]
  const colors = ["", "bg-red-400", "bg-amber-400", "bg-yellow-400", "bg-emerald-400", "bg-emerald-500"]
  const textColors = ["", "text-red-500", "text-amber-500", "text-yellow-600", "text-emerald-600", "text-emerald-600"]
  if (!password) return null
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all duration-300",
            i <= score ? colors[score] : "bg-slate-100 dark:bg-slate-700")} />
        ))}
      </div>
      <p className="text-[11px] text-slate-400">
        Password strength:{" "}
        <span className={cn("font-bold", textColors[score])}>{labels[score]}</span>
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const [profile,    setProfile]    = useState<Profile | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState<"profile" | "password">("profile")
  const [editing,    setEditing]    = useState(false)
  const [saving,     setSaving]     = useState(false)

  // Edit fields
  const [eName,   setEName]   = useState("")
  const [eMobile, setEMobile] = useState("")
  const [eFloor,  setEFloor]  = useState("")
  const [eFlat,   setEFlat]   = useState("")

  // Password fields
  const [oldPwd,  setOldPwd]  = useState("")
  const [newPwd,  setNewPwd]  = useState("")
  const [conPwd,  setConPwd]  = useState("")
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError,  setPwdError]  = useState("")

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const r = await api.get<ApiRes<Profile>>("/Profile/Get")
        if (r.data?.isSuccess && r.data.result) {
          const p = r.data.result
          setProfile(p)
          setEName(p.name); setEMobile(p.mobile ?? "")
          setEFloor(p.floor ?? ""); setEFlat(p.flat ?? "")
        }
      } catch { toast.error("Failed to load profile") }
      finally  { setLoading(false) }
    })()
  }, [])

  // ── Save profile ──────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!eName.trim()) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      const r = await api.put<ApiRes>("/Profile/Update", {
        name: eName.trim(), mobile: eMobile.trim() || null,
        floor: eFloor.trim() || null, flat: eFlat.trim() || null,
      })
      if (r.data?.isSuccess) {
        toast.success("Profile updated successfully!")
        setProfile(p => p ? {
          ...p, name: eName.trim(),
          mobile: eMobile || undefined, floor: eFloor || undefined, flat: eFlat || undefined,
        } : p)
        setEditing(false)
        try {
          const stored = localStorage.getItem("user")
          if (stored) {
            const u = JSON.parse(stored) as Record<string, string>
            u.name = eName.trim()
            localStorage.setItem("user", JSON.stringify(u))
          }
        } catch { /* ignore */ }
      } else { toast.error(r.data?.resMsg ?? "Update failed") }
    } catch { toast.error("Failed to save profile") }
    finally  { setSaving(false) }
  }

  const cancelEdit = () => {
    if (!profile) return
    setEName(profile.name); setEMobile(profile.mobile ?? "")
    setEFloor(profile.floor ?? ""); setEFlat(profile.flat ?? "")
    setEditing(false)
  }

  // ── Change password ───────────────────────────────────────────────────────
  const changePassword = async () => {
    setPwdError("")
    if (!oldPwd)             { setPwdError("Current password is required");        return }
    if (newPwd.length < 6)   { setPwdError("New password must be at least 6 characters"); return }
    if (newPwd !== conPwd)   { setPwdError("Passwords do not match");              return }
    if (oldPwd === newPwd)   { setPwdError("New password must differ from current"); return }
    setPwdSaving(true)
    try {
      const r = await api.post<ApiRes>("/Profile/ChangePassword", {
        oldPassword: oldPwd, newPassword: newPwd, confirmPassword: conPwd,
      })
      if (r.data?.isSuccess) {
        toast.success("Password changed successfully!")
        setOldPwd(""); setNewPwd(""); setConPwd("")
      } else { setPwdError(r.data?.resMsg ?? "Failed to change password") }
    } catch { setPwdError("Network error. Please try again.") }
    finally  { setPwdSaving(false) }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-full border-4 border-violet-200 border-t-violet-500 animate-spin" />
        <p className="text-[13px] text-slate-400">Loading your profile…</p>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-5">

        {/* ══════════════════════════════════════════
            PAGE TITLE
        ══════════════════════════════════════════ */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
            My Profile
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            View and manage your personal information
          </p>
        </div>

        {/* ══════════════════════════════════════════
            HERO / IDENTITY CARD
        ══════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

          {/* Subtle top accent stripe */}
          <div className="h-1.5 w-full bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400" />

          <div className="p-5 sm:p-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">

              {/* Avatar */}
              <Avatar name={profile?.name ?? "U"} />

              {/* Info */}
              <div className="flex-1 min-w-0 pt-1 sm:pt-0">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {profile?.name}
                </h2>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  {profile?.emailId}
                </p>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  {profile?.role && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-bold
                      bg-violet-50 dark:bg-violet-500/10
                      text-violet-700 dark:text-violet-400
                      border border-violet-200 dark:border-violet-500/20">
                      <Shield className="h-3 w-3" />
                      {profile.role}
                    </span>
                  )}
                  {profile?.status && (
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-bold border",
                      profile.status === "APPROVED"
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                        : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                    )}>
                      <BadgeCheck className="h-3 w-3" />
                      {profile.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick info chips — mobile: stacked, desktop: row */}
            {(profile?.mobile || profile?.flat || profile?.floor) && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-x-5 gap-y-2">
                {profile?.mobile && (
                  <div className="flex items-center gap-2 text-[12.5px] text-slate-500 dark:text-slate-400">
                    <Phone className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                    {profile.mobile}
                  </div>
                )}
                {(profile?.flat || profile?.floor) && (
                  <div className="flex items-center gap-2 text-[12.5px] text-slate-500 dark:text-slate-400">
                    <Home className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                    {[profile.flat && `Flat ${profile.flat}`, profile.floor && `Floor ${profile.floor}`].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            TABS
        ══════════════════════════════════════════ */}
        <div className="flex bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-1.5 gap-1.5">
          {(["profile", "password"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setEditing(false); setPwdError("") }}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-xl text-[13px] font-bold transition-all duration-200",
                tab === t
                  ? "bg-violet-600 text-white shadow-md shadow-violet-200 dark:shadow-violet-900/30"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}>
              {t === "profile" ? "Profile Info" : "Change Password"}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════
            TAB: PROFILE INFO
        ══════════════════════════════════════════ */}
        {tab === "profile" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200">Personal Information</p>
              </div>

              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-[12px] font-bold transition-all
                    border border-violet-200 dark:border-violet-500/30
                    bg-violet-50 dark:bg-violet-500/10
                    text-violet-700 dark:text-violet-400
                    hover:bg-violet-100 dark:hover:bg-violet-500/20">
                  <Edit3 className="h-3.5 w-3.5" />Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={cancelEdit}
                    className="h-8 px-3.5 rounded-xl text-[12px] font-bold transition-all
                      border border-slate-200 dark:border-slate-700
                      text-slate-500 dark:text-slate-400
                      hover:bg-slate-50 dark:hover:bg-slate-800">
                    Cancel
                  </button>
                  <button onClick={saveProfile} disabled={saving}
                    className="flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-[12px] font-bold transition-all
                      bg-violet-600 hover:bg-violet-500 text-white shadow-sm disabled:opacity-60">
                    {saving
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Save className="h-3.5 w-3.5" />}
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* Card body */}
            <div className="px-5 sm:px-6 py-5">
              {!editing ? (
                /* ── View mode ── */
                <div>
                  <InfoRow icon={<User  className="h-4 w-4" />} label="Full Name" value={profile?.name} />
                  <InfoRow icon={<Mail  className="h-4 w-4" />} label="Email Address" value={profile?.emailId} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Mobile Number" value={profile?.mobile} />
                  <InfoRow icon={<Building2 className="h-4 w-4" />} label="Floor" value={profile?.floor} />
                  <InfoRow icon={<Home  className="h-4 w-4" />} label="Flat Number" value={profile?.flat} />
                  <InfoRow icon={<Shield className="h-4 w-4" />} label="Role" value={profile?.role} />
                </div>
              ) : (
                /* ── Edit mode ── */
                <div className="space-y-4">
                  <TextInput label="Full Name *" value={eName} onChange={setEName}
                    placeholder="Your full name" icon={<User className="h-4 w-4" />} />

                  <TextInput label="Email Address" value={profile?.emailId ?? ""} readOnly
                    placeholder="" icon={<Mail className="h-4 w-4" />} />

                  {/* Mobile + Floor in 2 cols on desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextInput label="Mobile Number" value={eMobile} onChange={setEMobile}
                      placeholder="10-digit number" icon={<Phone className="h-4 w-4" />} />
                    <TextInput label="Floor" value={eFloor} onChange={setEFloor}
                      placeholder="e.g. Second" icon={<Building2 className="h-4 w-4" />} />
                  </div>

                  <TextInput label="Flat Number" value={eFlat} onChange={setEFlat}
                    placeholder="e.g. 304" icon={<Home className="h-4 w-4" />} />

                  {/* Email note */}
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl
                    bg-amber-50 dark:bg-amber-500/10
                    border border-amber-200 dark:border-amber-500/20">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">
                      Email address cannot be changed. Contact your administrator if needed.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: CHANGE PASSWORD
        ══════════════════════════════════════════ */}
        {tab === "password" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                <KeyRound className="h-4 w-4 text-rose-500 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200">Change Password</p>
                <p className="text-[11.5px] text-slate-400 dark:text-slate-500">Verify your current password first</p>
              </div>
            </div>

            {/* Card body */}
            <div className="px-5 sm:px-6 py-5 space-y-5">

              {/* Step 1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-violet-100 dark:bg-violet-500/20
                    text-violet-700 dark:text-violet-400 text-[10.5px] font-black
                    flex items-center justify-center shrink-0">1</span>
                  <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                    Verify current password
                  </span>
                </div>
                <PwdInput label="Current Password" value={oldPwd} onChange={setOldPwd}
                  placeholder="Enter your current password" />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                <span className="text-[11px] text-slate-400 font-medium px-1">then set new</span>
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-violet-100 dark:bg-violet-500/20
                    text-violet-700 dark:text-violet-400 text-[10.5px] font-black
                    flex items-center justify-center shrink-0">2</span>
                  <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                    Create new password
                  </span>
                </div>

                <PwdInput label="New Password" value={newPwd} onChange={setNewPwd}
                  placeholder="Minimum 6 characters" />
                <StrengthBar password={newPwd} />
                <PwdInputNoPaste label="Confirm New Password" value={conPwd} onChange={setConPwd}
                  placeholder="Repeat your new password" />

                {/* Match indicator */}
                {conPwd && (
                  <div className={cn("flex items-center gap-2 text-[12px] font-semibold",
                    newPwd === conPwd
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-500 dark:text-rose-400")}>
                    {newPwd === conPwd
                      ? <><CheckCircle2 className="h-4 w-4" />Passwords match</>
                      : <><X className="h-4 w-4" />Passwords do not match</>}
                  </div>
                )}
              </div>

              {/* Error banner */}
              {pwdError && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl
                  bg-rose-50 dark:bg-rose-500/10
                  border border-rose-200 dark:border-rose-500/20">
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  <p className="text-[12.5px] text-rose-700 dark:text-rose-400">{pwdError}</p>
                </div>
              )}

              {/* Submit */}
              <button onClick={changePassword} disabled={pwdSaving}
                className="w-full h-11 rounded-xl text-[13.5px] font-bold text-white transition-all
                  bg-violet-600 hover:bg-violet-500 active:bg-violet-700
                  shadow-[0_4px_16px_rgba(124,58,237,0.25)]
                  hover:shadow-[0_6px_20px_rgba(124,58,237,0.35)]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                  flex items-center justify-center gap-2">
                {pwdSaving
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Updating password…</>
                  : <><KeyRound className="h-4 w-4" />Change Password</>}
              </button>

              {/* Tips */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60
                border border-slate-200 dark:border-slate-700 px-4 py-3.5 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Tips for a strong password
                </p>
                {[
                  "Use at least 8 characters",
                  "Mix uppercase letters, numbers and symbols",
                  "Avoid using your name, email or birthdate",
                ].map(tip => (
                  <div key={tip} className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}