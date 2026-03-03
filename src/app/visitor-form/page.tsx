// app/visitor-form/page.tsx
// ── PUBLIC PAGE — No auth required. Visitor scans QR and lands here. ──────────
"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  User, Phone, Briefcase, Home, Mail, MessageSquare,
  CheckCircle2, Loader2, AlertTriangle, Clock, QrCode,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Resident {
  id:       number
  name:     string
  flatNo:   string
  mobileNo?: string
  email?:   string
}

type PageState = "loading" | "form" | "success" | "expired" | "used" | "invalid"

// ── Floating label input ──────────────────────────────────────────────────────
function FloatInput({
  label, value, onChange, type = "text", icon, required,
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; icon: React.ReactNode; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
        {icon}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        className={cn(
          "w-full h-12 pl-9 pr-3 pt-4 pb-1 rounded-xl border text-[13px] outline-none transition-all",
          "bg-white dark:bg-[#1a1d27] text-gray-800 dark:text-gray-100",
          focused
            ? "border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
            : "border-gray-200 dark:border-white/[0.09] hover:border-gray-300"
        )}
      />
      <label className={cn(
        "pointer-events-none absolute left-9 font-medium transition-all duration-150 select-none",
        active
          ? "top-[5px] text-[10px] text-blue-500 tracking-wide"
          : "top-1/2 -translate-y-1/2 text-[12.5px] text-gray-400"
      )}>
        {label}{required ? " *" : ""}
      </label>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function VisitorFormPage() {
  const params      = useSearchParams()
  const token       = params.get("token") ?? ""
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL

  const [state,      setState]     = useState<PageState>("loading")
  const [residents,  setResidents] = useState<Resident[]>([])
  const [submitting, setSubmitting]= useState(false)
  const [entryId,    setEntryId]   = useState<number | null>(null)

  // Form fields
  const [name,        setName]       = useState("")
  const [mobile,      setMobile]     = useState("")
  const [designation, setDesig]      = useState("")
  const [visiting,    setVisiting]   = useState<number>(0)
  const [notifyEmail, setNotifyEmail]= useState(true)
  const [notifySMS,   setNotifySMS]  = useState(false)
  const [error,       setError]      = useState("")

  // ── Validate token on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setState("invalid"); return }

    ;(async () => {
      try {
        const r = await fetch(`${apiBase}/VisitorPublic/GetFormData?token=${token}`)
        const data = await r.json()

        if (!r.ok) {
          if (data.code === "EXPIRED")    { setState("expired"); return }
          if (data.code === "USED")       { setState("used");    return }
          setState("invalid"); return
        }

        setResidents(data.result ?? [])
        setState("form")
      } catch {
        setState("invalid")
      }
    })()
  }, [token, apiBase])

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim())      { setError("Please enter your name");       return }
    if (!mobile.trim())    { setError("Please enter your mobile number"); return }
    if (visiting <= 0)     { setError("Please select the person you are visiting"); return }

    setSubmitting(true)
    try {
      const r = await fetch(`${apiBase}/VisitorPublic/Submit`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, visitorName: name.trim(), mobileNo: mobile.trim(),
          designation: designation.trim() || null,
          visitingUserId: visiting, notifyEmail, notifySMS,
        }),
      })
      const data = await r.json()

      if (data.isSuccess) {
        setEntryId(data.result)
        setState("success")
      } else {
        setError(data.resMsg ?? "Something went wrong. Please try again.")
      }
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────
  const selectedResident = residents.find(r => r.id === visiting)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-[#07080f] dark:via-[#0a0c14] dark:to-[#080a12] flex flex-col items-center justify-start px-4 py-8">

      {/* Society logo / header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30">
          <QrCode className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-[16px] font-black text-gray-900 dark:text-white">Visitor Check-In</p>
          <p className="text-[11.5px] text-gray-400">Society Management System</p>
        </div>
      </div>

      <div className="w-full max-w-md">

        {/* ── Loading ── */}
        {state === "loading" && (
          <div className="bg-white dark:bg-[#0f1117] rounded-3xl border border-gray-200 dark:border-white/[0.07] shadow-xl p-10 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            <p className="text-[14px] font-semibold text-gray-500">Validating QR code…</p>
          </div>
        )}

        {/* ── Invalid ── */}
        {state === "invalid" && (
          <div className="bg-white dark:bg-[#0f1117] rounded-3xl border border-gray-200 dark:border-white/[0.07] shadow-xl p-8 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-rose-500" />
            </div>
            <p className="text-[17px] font-black text-gray-800 dark:text-white">Invalid QR Code</p>
            <p className="text-[13px] text-gray-400 leading-relaxed">
              This QR code is not valid. Please ask security to generate a new one.
            </p>
          </div>
        )}

        {/* ── Expired ── */}
        {state === "expired" && (
          <div className="bg-white dark:bg-[#0f1117] rounded-3xl border border-amber-200 dark:border-amber-500/20 shadow-xl p-8 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <p className="text-[17px] font-black text-gray-800 dark:text-white">QR Code Expired</p>
            <p className="text-[13px] text-gray-400 leading-relaxed">
              This QR code has expired (valid for 30 minutes).
              Please ask security to generate a fresh one.
            </p>
          </div>
        )}

        {/* ── Already used ── */}
        {state === "used" && (
          <div className="bg-white dark:bg-[#0f1117] rounded-3xl border border-emerald-200 dark:border-emerald-500/20 shadow-xl p-8 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-[17px] font-black text-gray-800 dark:text-white">Already Checked In</p>
            <p className="text-[13px] text-gray-400 leading-relaxed">
              This QR code has already been used for check-in.
              Please contact security if you need assistance.
            </p>
          </div>
        )}

        {/* ── Success ── */}
        {state === "success" && (
          <div className="bg-white dark:bg-[#0f1117] rounded-3xl border border-emerald-200 dark:border-emerald-500/20 shadow-xl overflow-hidden animate-[fadeInUp_0.35s_ease_both]">
            <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
            <div className="p-8 flex flex-col items-center gap-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_8px_24px_rgba(52,211,153,0.4)] animate-[popIn_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)_both]">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <div>
                <p className="text-[20px] font-black text-gray-900 dark:text-white">Welcome!</p>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Your entry has been recorded successfully.
                  {selectedResident && (
                    <span className="block mt-1 font-semibold text-gray-700 dark:text-gray-300">
                      {selectedResident.name} has been notified.
                    </span>
                  )}
                </p>
              </div>

              {/* Checkin details recap */}
              <div className="w-full space-y-2 mt-2">
                {[
                  { label: "Your Name",   value: name,                      icon: <User className="h-3.5 w-3.5" /> },
                  { label: "Mobile",      value: mobile,                    icon: <Phone className="h-3.5 w-3.5" /> },
                  { label: "Visiting",    value: selectedResident ? `${selectedResident.name} (${selectedResident.flatNo})` : "", icon: <Home className="h-3.5 w-3.5" /> },
                  { label: "Check-in",    value: new Date().toLocaleTimeString("en-IN", { 
  hour: "2-digit", minute: "2-digit", hour12: true,
  timeZone: "Asia/Kolkata"
}), icon: <Clock className="h-3.5 w-3.5" /> },
                ].filter(r => r.value).map(row => (
                  <div key={row.label} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06]">
                    <span className="text-gray-400">{row.icon}</span>
                    <span className="text-[11px] text-gray-400 w-16 shrink-0">{row.label}</span>
                    <span className="text-[13px] font-semibold text-gray-800 dark:text-white flex-1">{row.value}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11.5px] text-gray-400 mt-2">
                Please proceed to the reception. Security will guide you.
              </p>
            </div>
          </div>
        )}

        {/* ── Form ── */}
        {state === "form" && (
          <div className="bg-white dark:bg-[#0f1117] rounded-3xl border border-gray-200 dark:border-white/[0.07] shadow-xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400" />

            <div className="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06]">
              <p className="text-[16px] font-black text-gray-900 dark:text-white">Please fill in your details</p>
              <p className="text-[12px] text-gray-400 mt-0.5">All fields marked * are required</p>
            </div>

            <form onSubmit={submit} className="px-6 py-5 space-y-4">

              {/* Name */}
              <FloatInput
                label="Full Name" value={name} onChange={setName}
                icon={<User className="h-4 w-4" />} required
              />

              {/* Mobile */}
              <FloatInput
                label="Mobile Number" value={mobile} onChange={setMobile}
                type="tel" icon={<Phone className="h-4 w-4" />} required
              />

              {/* Designation */}
              <FloatInput
                label="Designation / Purpose of Visit" value={designation} onChange={setDesig}
                icon={<Briefcase className="h-4 w-4" />}
              />

              {/* Visiting resident select */}
              <div className="space-y-1.5">
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
                  <Home className="h-3.5 w-3.5" />Who are you visiting? *
                </p>
                <select
                  value={visiting}
                  onChange={e => setVisiting(+e.target.value)}
                  className={cn(
                    "w-full h-11 px-3 rounded-xl border text-[13px] outline-none transition-all",
                    "bg-white dark:bg-[#1a1d27] text-gray-800 dark:text-white",
                    visiting > 0
                      ? "border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                      : "border-gray-200 dark:border-white/[0.09]"
                  )}>
                  <option value={0} disabled>Select a resident…</option>
                  {residents.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.flatNo ? `— Flat ${r.flatNo}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notify preferences */}
              <div className="rounded-xl border border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] px-4 py-3.5 space-y-2.5">
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Notify resident via</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={cn("relative h-5 w-9 rounded-full transition-all", notifyEmail ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600")}
                    onClick={() => setNotifyEmail(v => !v)}>
                    <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", notifyEmail ? "left-[18px]" : "left-0.5")} />
                  </div>
                  <Mail className="h-4 w-4 text-blue-500" />
                  <span className="text-[13px] text-gray-700 dark:text-gray-200">Email notification</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={cn("relative h-5 w-9 rounded-full transition-all", notifySMS ? "bg-violet-500" : "bg-gray-300 dark:bg-gray-600")}
                    onClick={() => setNotifySMS(v => !v)}>
                    <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", notifySMS ? "left-[18px]" : "left-0.5")} />
                  </div>
                  <MessageSquare className="h-4 w-4 text-violet-500" />
                  <span className="text-[13px] text-gray-700 dark:text-gray-200">SMS notification</span>
                  <span className="text-[10px] text-gray-400">(if configured)</span>
                </label>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                  <p className="text-[12.5px] text-rose-700 dark:text-rose-400">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "w-full h-12 rounded-xl text-[14px] font-bold text-white transition-all",
                  "bg-gradient-to-r from-blue-600 to-indigo-600",
                  "hover:from-blue-500 hover:to-indigo-500",
                  "shadow-[0_4px_14px_rgba(59,130,246,0.4)]",
                  "disabled:opacity-50 disabled:shadow-none",
                  "flex items-center justify-center gap-2"
                )}>
                {submitting
                  ? <><Loader2 className="h-5 w-5 animate-spin" />Submitting…</>
                  : <><CheckCircle2 className="h-5 w-5" />Complete Check-In</>}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <p className="text-[11px] text-gray-400 text-center mt-6">
          Powered by Society Management System · Your data is secure
        </p>
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes popIn { from { opacity:0; transform:scale(0.5) } to { opacity:1; transform:scale(1) } }
      `}</style>
    </div>
  )
}