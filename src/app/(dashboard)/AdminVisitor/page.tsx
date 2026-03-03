"use client"

import { useEffect, useRef, useState } from "react"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Users, UserCheck, UserX, RefreshCw, QrCode, LogOut,
  Clock, Phone, Briefcase, Home, CheckCircle2, X,
  Loader2, AlertTriangle, Search, CalendarDays,
  ChevronDown, Timer, BarChart3, Trash2, Mail, MessageSquare,
} from "lucide-react"
import QRCode from "react-qr-code"

// ── Types ─────────────────────────────────────────────────────────────────────
interface VisitorEntry {
  id: number
  visitorName:   string
  mobileNo:      string
  designation?:  string
  visitingUserId?: number
  visitingName:  string
  visitingFlat:  string
  inTime:        string
  outTime?:      string
  status:        "Active" | "Out"
  notifyEmail:   boolean
  notifySMS:     boolean
  tokenId?:      number
  tokenUsed:     boolean
}

interface VisitorToken {
  id:       number
  token:    string
  formUrl:  string
  expiresAt: string
}

interface Stats {
  totalToday:   number
  activeNow:    number
  outToday:     number
  totalAllTime: number
}

interface ApiRes<T = unknown> { isSuccess?: boolean; resMsg?: string; result?: T }

// ── Helpers ────────────────────────────────────────────────────────────────────
//  After — converts to IST automatically
const toUTC = (d: string) => new Date(d.endsWith("Z") ? d : d + "Z")

// ── Then update all three functions ─────────────────────────────────────────
const fmtTime = (d: string) =>
  toUTC(d).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
    timeZone: "Asia/Kolkata"
  })

const fmtDate = (d: string) =>
  toUTC(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    timeZone: "Asia/Kolkata"
  })

const elapsed = (inTime: string) => {
  const mins = Math.floor((Date.now() - toUTC(inTime).getTime()) / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`
}

// ── QR Modal ───────────────────────────────────────────────────────────────────
function QRModal({
  token, onClose, onSubmitted,
}: {
  token: VisitorToken
  onClose: () => void
  onSubmitted: () => void
}) {
  const [used,       setUsed]    = useState(false)
  const [countdown,  setCountdown] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown to expiry
  useEffect(() => {
    const update = () => {
      const secs = Math.max(0, Math.floor((new Date(token.expiresAt).getTime() - Date.now()) / 1000))
      setCountdown(secs)
      if (secs === 0 && pollRef.current) clearInterval(pollRef.current)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [token.expiresAt])

  // Poll for form submission (every 3s)
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.get<ApiRes<VisitorEntry[]>>("/VisitorAdmin/GetAll?todayOnly=true")
        const entries = r.data?.result ?? []
        const match = entries.find(e => e.tokenId === token.id && e.tokenUsed)
        if (match) {
          setUsed(true)
          clearInterval(pollRef.current!)
          setTimeout(() => { onSubmitted(); onClose() }, 2500)
        }
      } catch { /* silent */ }
    }, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [token.id])

  const mins = Math.floor(countdown / 60)
  const secs = countdown % 60
  const expired = countdown === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-[#141820] rounded-3xl border border-gray-200 dark:border-white/[0.09] shadow-2xl w-full max-w-sm overflow-hidden animate-[fadeInUp_0.25s_ease_both]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
              <QrCode className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-[14px] font-bold text-gray-900 dark:text-white">Visitor QR Code</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-5">

          {/* QR or success state */}
          {used ? (
            <div className="flex flex-col items-center gap-3 py-4 animate-[fadeInUp_0.3s_ease_both]">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10 border-2 border-emerald-400">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-[15px] font-bold text-emerald-700 dark:text-emerald-400">Form Submitted!</p>
              <p className="text-[12.5px] text-gray-400 text-center">Visitor entry recorded. Closing…</p>
            </div>
          ) : expired ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/10 border-2 border-rose-300">
                <AlertTriangle className="h-8 w-8 text-rose-500" />
              </div>
              <p className="text-[14px] font-bold text-rose-600 dark:text-rose-400">QR Code Expired</p>
              <p className="text-[12.5px] text-gray-400 text-center">Generate a new QR code for the visitor.</p>
            </div>
          ) : (
            <>
              {/* QR */}
              <div className="p-3 rounded-2xl bg-white border-2 border-gray-200 shadow-inner">
                <QRCode value={token.formUrl} size={200} />
              </div>

              {/* Instruction */}
              <p className="text-[12px] text-gray-500 dark:text-gray-400 text-center">
                Ask the visitor to scan this QR with their phone camera or Google Lens
              </p>

              {/* Countdown */}
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border text-[12.5px] font-bold",
                countdown <= 120
                  ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400"
                  : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400"
              )}>
                <Timer className="h-3.5 w-3.5" />
                Expires in {mins}:{String(secs).padStart(2, "0")}
              </div>

              {/* Polling indicator */}
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Waiting for visitor to fill the form…
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Visitor row card ───────────────────────────────────────────────────────────
function VisitorCard({
  v,
  onOut,
  onDelete,
}: {
  v: VisitorEntry
  onOut: () => void
  onDelete: () => void
}) {
  const isActive = v.status === "Active"

  return (
    <div className={cn(
      "bg-white dark:bg-[#0f1117] rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md animate-[fadeInUp_0.25s_ease_both]",
      isActive
        ? "border-emerald-200 dark:border-emerald-500/20"
        : "border-gray-200 dark:border-white/[0.07] opacity-80"
    )}>
      {/* Status accent bar */}
      <div className={cn("h-0.5", isActive
        ? "bg-gradient-to-r from-emerald-400 to-teal-400"
        : "bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600"
      )} />

      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <p className="text-[14.5px] font-black text-gray-900 dark:text-white">{v.visitorName}</p>
              {/* Status pill */}
              {isActive ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/[0.08]">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />Out
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              <p className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-gray-400">
                <Phone className="h-3 w-3 shrink-0" />{v.mobileNo}
              </p>
              {v.designation && (
                <p className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-gray-400">
                  <Briefcase className="h-3 w-3 shrink-0" />{v.designation}
                </p>
              )}
              <p className="flex items-center gap-1.5 text-[12px] text-gray-600 dark:text-gray-300 font-semibold">
                <Home className="h-3 w-3 shrink-0 text-blue-500" />
                {v.visitingName} {v.visitingFlat ? `(${v.visitingFlat})` : ""}
              </p>
            </div>

            {/* Time info */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <Clock className="h-3 w-3" />In: {fmtTime(v.inTime)}
              </span>
              {v.outTime && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <LogOut className="h-3 w-3" />Out: {fmtTime(v.outTime)}
                </span>
              )}
              {isActive && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <Timer className="h-3 w-3" />{elapsed(v.inTime)} inside
                </span>
              )}
              {/* Notification badges */}
              <div className="flex items-center gap-1 ml-auto">
                {v.notifyEmail && (
                  <span title="Email sent" className="h-5 w-5 flex items-center justify-center rounded bg-blue-50 dark:bg-blue-500/10 text-blue-500">
                    <Mail className="h-3 w-3" />
                  </span>
                )}
                {v.notifySMS && (
                  <span title="SMS sent" className="h-5 w-5 flex items-center justify-center rounded bg-violet-50 dark:bg-violet-500/10 text-violet-500">
                    <MessageSquare className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1.5 shrink-0">
            {isActive && (
              <Button size="sm" onClick={onOut}
                className="h-8 px-3 text-[12px] font-bold rounded-xl gap-1.5 bg-rose-600 hover:bg-rose-500 text-white shadow-sm">
                <LogOut className="h-3.5 w-3.5" />Out
              </Button>
            )}
            <button onClick={onDelete}
              className="h-7 w-7 self-end flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-rose-600 hover:border-rose-300 transition-all">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function VisitorAdminPage() {
  const [visitors,  setVisitors] = useState<VisitorEntry[]>([])
  const [stats,     setStats]    = useState<Stats | null>(null)
  const [loading,   setLoading]  = useState(true)
  const [generating,setGen]      = useState(false)
  const [activeQR,  setActiveQR] = useState<VisitorToken | null>(null)
  const [delId,     setDelId]    = useState<number | null>(null)
  const [outId,     setOutId]    = useState<number | null>(null)
  const [search,    setSearch]   = useState("")
  const [todayOnly, setTodayOnly]= useState(true)

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const [vr, sr] = await Promise.all([
        api.get<ApiRes<VisitorEntry[]>>(`/VisitorAdmin/GetAll?todayOnly=${todayOnly}`),
        api.get<ApiRes<Stats>>("/VisitorAdmin/GetStats"),
      ])
      setVisitors(vr.data?.result ?? [])
      if (sr.data?.result) setStats(sr.data.result)
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [todayOnly])

  // ── Generate QR ────────────────────────────────────────────────────────────
  const generateQR = async () => {
    setGen(true)
    try {
      const r = await api.post<ApiRes<VisitorToken>>("/VisitorAdmin/GenerateToken", {})
      if (r.data?.isSuccess && r.data.result) {
        setActiveQR(r.data.result)
      } else {
        toast.error(r.data?.resMsg ?? "Failed to generate QR")
      }
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setGen(false)
    }
  }

  // ── Mark out ───────────────────────────────────────────────────────────────
  const markOut = async () => {
    if (!outId) return
    try {
      const r = await api.post<ApiRes>(`/VisitorAdmin/MarkOut/${outId}`, {})
      if (r.data?.isSuccess) {
        toast.success("Visitor marked as Out")
        setOutId(null)
        // Optimistic update
        setVisitors(prev => prev.map(v =>
          v.id === outId
            ? { ...v, status: "Out", outTime: new Date().toISOString() }
            : v
        ))
        if (stats) setStats(s => s ? { ...s, activeNow: s.activeNow - 1, outToday: s.outToday + 1 } : s)
      } else {
        toast.error(r.data?.resMsg ?? "Failed")
      }
    } catch (e) {
      toast.error(getApiMessage(e))
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteEntry = async () => {
    if (!delId) return
    try {
      await api.delete(`/VisitorAdmin/Delete/${delId}`)
      toast.success("Deleted")
      setDelId(null)
      setVisitors(prev => prev.filter(v => v.id !== delId))
    } catch (e) {
      toast.error(getApiMessage(e))
    }
  }

  // ── Filtered visitors ──────────────────────────────────────────────────────
  const filtered = visitors.filter(v =>
    !search.trim() ||
    v.visitorName.toLowerCase().includes(search.toLowerCase()) ||
    v.mobileNo.includes(search) ||
    v.visitingName.toLowerCase().includes(search.toLowerCase()) ||
    v.visitingFlat.toLowerCase().includes(search.toLowerCase())
  )

  const active = filtered.filter(v => v.status === "Active")
  const out    = filtered.filter(v => v.status === "Out")

  const card = "bg-white dark:bg-[#0f1117] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm"

  return (
    <div className="flex flex-col h-full bg-[#f0f4ff] dark:bg-[#07080f] overflow-auto">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-[#0a0c14] border-b border-gray-200 dark:border-white/[0.06] px-4 sm:px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-[17px] font-bold text-gray-900 dark:text-white">Visitor Management</h1>
              <p className="text-[11px] text-gray-400">Generate QR · track arrivals · manage exits</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}
              className="h-8 px-3 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 rounded-xl">
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
            <Button size="sm" onClick={generateQR} disabled={generating}
              className="h-9 px-4 text-[12.5px] font-bold rounded-xl gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-md">
              {generating
                ? <><Loader2 className="h-4 w-4 animate-spin" />Generating…</>
                : <><QrCode className="h-4 w-4" />New Visitor QR</>}
            </Button>
          </div>
        </div>

        {/* Stats chips */}
        {stats && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {[
              { label: "Today",     value: stats.totalToday,   cls: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400",       icon: <CalendarDays className="h-3.5 w-3.5" /> },
              { label: "Inside Now",value: stats.activeNow,    cls: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400", icon: <UserCheck className="h-3.5 w-3.5" /> },
              { label: "Exited",    value: stats.outToday,     cls: "bg-gray-100 dark:bg-white/[0.06] border-gray-200 dark:border-white/[0.07] text-gray-600 dark:text-gray-400",     icon: <UserX className="h-3.5 w-3.5" /> },
              { label: "All Time",  value: stats.totalAllTime, cls: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-400", icon: <BarChart3 className="h-3.5 w-3.5" /> },
            ].map(s => (
              <div key={s.label} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-bold", s.cls)}>
                {s.icon}{s.value} {s.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-4">

        {/* Search + filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search visitor, mobile, resident…"
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#0f1117] text-[12.5px] text-gray-800 dark:text-white outline-none focus:border-blue-400 placeholder:text-gray-400"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f1117]">
            <div
              className={cn("relative h-4 w-7 rounded-full transition-all", todayOnly ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600")}
              onClick={() => setTodayOnly(v => !v)}>
              <div className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all", todayOnly ? "left-[14px]" : "left-0.5")} />
            </div>
            <span className="text-[12px] text-gray-600 dark:text-gray-300 font-medium">Today only</span>
          </label>
        </div>

        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-white dark:bg-[#0f1117] border border-gray-100 dark:border-white/[0.05] animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <Users className="h-12 w-12 text-gray-200 dark:text-gray-700" />
            <p className="text-[14px] font-bold text-gray-400">No visitors {todayOnly ? "today" : "found"}</p>
            <p className="text-[12.5px] text-gray-400">Click &ldquo;New Visitor QR&rdquo; to check in a visitor</p>
          </div>
        ) : (
          <>
            {/* Active visitors */}
            {active.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    Inside Now ({active.length})
                  </p>
                </div>
                {active.map((v, i) => (
                  <div key={v.id} style={{ animationDelay: `${i * 40}ms` }}>
                    <VisitorCard v={v} onOut={() => setOutId(v.id)} onDelete={() => setDelId(v.id)} />
                  </div>
                ))}
              </div>
            )}

            {/* Out visitors */}
            {out.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mt-2">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Exited ({out.length})
                  </p>
                </div>
                {out.map((v, i) => (
                  <div key={v.id} style={{ animationDelay: `${i * 40}ms` }}>
                    <VisitorCard v={v} onOut={() => setOutId(v.id)} onDelete={() => setDelId(v.id)} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* QR Modal */}
      {activeQR && (
        <QRModal
          token={activeQR}
          onClose={() => setActiveQR(null)}
          onSubmitted={load}
        />
      )}

      {/* Out confirmation dialog */}
      <AlertDialog open={outId !== null} onOpenChange={() => setOutId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-4 bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                <LogOut className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <AlertDialogTitle className="text-[14px] font-bold">Mark as Out?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-[12px] text-gray-500">
              This will record the exit time and change the visitor&apos;s status to Out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-row mt-2">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={markOut} className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white">
              Mark Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete dialog */}
      <AlertDialog open={delId !== null} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-4 bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <AlertDialogTitle className="text-[14px] font-bold">Delete Entry?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-[12px] text-gray-500">
              This visitor entry will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-row mt-2">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteEntry} className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}
