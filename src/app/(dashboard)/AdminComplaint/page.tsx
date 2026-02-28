"use client"

import { useEffect, useState } from "react"
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
  RefreshCw, Search, X, Filter, AlertCircle, Globe, Lock,
  Tag, Calendar, MessageSquare, ChevronDown, ChevronUp,
  Send, Loader2, CheckCircle2, Clock, XCircle, AlertTriangle,
  Trash2, User, Home,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Reply {
  id: number
  adminName: string
  reply: string
  newStatus?: string
  createdDate: string
}

interface Complaint {
  id: number
  userId: number
  userName: string
  flatNo: string
  title: string
  description: string
  category?: string
  photoUrl?: string
  visibility: string
  status: string
  createdDate: string
  replies: Reply[]
}

interface ApiRes<T = unknown> {
  isSuccess?: boolean
  resMsg?: string
  result?: T
}

const STATUSES   = ["Open", "InProgress", "Resolved", "Closed"]
const CATEGORIES = ["Plumbing", "Electrical", "Security", "Lift", "Cleanliness", "Noise", "Parking", "Internet", "Water", "Other"]

// Status config: what transitions are allowed
const STATUS_CONF: Record<string, { color: string; next: string[] }> = {
  Open:       { color: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",            next: ["InProgress", "Resolved", "Closed"] },
  InProgress: { color: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",                  next: ["Resolved", "Closed"] },
  Resolved:   { color: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20", next: ["Closed", "Open"] },
  Closed:     { color: "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] border-gray-300 dark:border-white/[0.1]",                 next: ["Open"] },
}

function StatusBadge({ status }: { status: string }) {
  const conf = STATUS_CONF[status] ?? STATUS_CONF.Open
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border", conf.color)}>
      {status === "Open"       && <Clock className="h-2.5 w-2.5" />}
      {status === "InProgress" && <Loader2 className="h-2.5 w-2.5" />}
      {status === "Resolved"   && <CheckCircle2 className="h-2.5 w-2.5" />}
      {status === "Closed"     && <XCircle className="h-2.5 w-2.5" />}
      {status}
    </span>
  )
}

const fmt  = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
const fmtT = (d: string) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminComplaintsPage() {
  const [complaints, setAll]     = useState<Complaint[]>([])
  const [loading,    setLoading] = useState(true)
  const [search,     setSearch]  = useState("")
  const [fStatus,    setFStatus] = useState("")
  const [fVis,       setFVis]    = useState("")
  const [fCat,       setFCat]    = useState("")
  const [expanded,   setExp]     = useState<Set<number>>(new Set())
  const [delId,      setDelId]   = useState<number | null>(null)
  const [imgModal,   setImgModal]= useState<string | null>(null)

  // Reply form state per complaint: { text, newStatus }
  const [replyForms, setReplyForms] = useState<Record<number, { text: string; newStatus: string }>>({})
  const [sending,    setSending]    = useState<number | null>(null)

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (fStatus) params.set("status",     fStatus)
      if (fVis)    params.set("visibility", fVis)
      if (fCat)    params.set("category",   fCat)
      const r = await api.get<ApiRes<Complaint[]>>(`/ComplaintAdmin/GetAll?${params}`)
      setAll(r.data?.result ?? [])
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ────────────────────────────────────────────────────────────────
  const toggle = (id: number) => setExp(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const getReplyForm = (id: number) => replyForms[id] ?? { text: "", newStatus: "" }
  const setReplyForm = (id: number, patch: Partial<{ text: string; newStatus: string }>) =>
    setReplyForms(f => ({ ...f, [id]: { ...getReplyForm(id), ...patch } }))

  const sendReply = async (id: number) => {
    const f = getReplyForm(id)
    if (!f.text.trim()) { toast.error("Reply text is required"); return }
    setSending(id)
    try {
      const r = await api.post<ApiRes>("/ComplaintAdmin/Reply", {
        complaintId: id,
        reply: f.text,
        newStatus: f.newStatus || null,
      })
      if (r.data?.isSuccess) {
        toast.success("Reply sent!")
        setReplyForms(forms => ({ ...forms, [id]: { text: "", newStatus: "" } }))
        load()
      } else { toast.error(r.data?.resMsg ?? "Failed") }
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setSending(null) }
  }

  const deleteComplaint = async () => {
    if (!delId) return
    try {
      await api.delete(`/ComplaintAdmin/Delete/${delId}`)
      toast.success("Deleted"); setDelId(null); load()
    } catch (e) { toast.error(getApiMessage(e)) }
  }

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = complaints.filter(c => {
    const q = search.trim().toLowerCase()
    return !q || `${c.userName} ${c.flatNo} ${c.title} ${c.category ?? ""}`.toLowerCase().includes(q)
  })

  const stats = {
    open:       complaints.filter(c => c.status === "Open").length,
    inProgress: complaints.filter(c => c.status === "InProgress").length,
    resolved:   complaints.filter(c => c.status === "Resolved").length,
    closed:     complaints.filter(c => c.status === "Closed").length,
  }

  return (
    <div className="flex flex-col h-full bg-[#fdf7f2] dark:bg-[#0a0907]">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-[#0d0b09] border-b border-gray-200 dark:border-white/[0.06] px-4 sm:px-6 py-4 shrink-0 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-[16px] font-bold text-gray-900 dark:text-white">Complaints Management</h1>
              <p className="text-[11px] text-gray-400 hidden sm:block">View all complaints · reply · update status</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="h-8 px-3 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 rounded-xl">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Quick-filter stat cards */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Open",        val: stats.open,       color: "text-amber-700 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",       key: "Open" },
            { label: "In Progress", val: stats.inProgress, color: "text-blue-700 dark:text-blue-400",      bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",           key: "InProgress" },
            { label: "Resolved",    val: stats.resolved,   color: "text-emerald-700 dark:text-emerald-400",bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",key: "Resolved" },
            { label: "Closed",      val: stats.closed,     color: "text-gray-600 dark:text-gray-400",      bg: "bg-gray-100 dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.07]",         key: "Closed" },
          ].map(s => (
            <button key={s.key}
              onClick={() => { setFStatus(fStatus === s.key ? "" : s.key); }}
              className={cn("rounded-xl border px-3 py-2.5 text-left hover:shadow-md transition-all", s.bg,
                fStatus === s.key && "ring-2 ring-orange-400 ring-offset-1")}>
              <p className="text-[9.5px] font-bold uppercase tracking-wide text-gray-400 truncate">{s.label}</p>
              <p className={cn("text-[20px] font-black", s.color)}>{s.val}</p>
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-gray-400 shrink-0" />

          <select value={fStatus} onChange={e => setFStatus(e.target.value)}
            className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[11.5px] text-gray-700 dark:text-gray-200 outline-none">
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={fVis} onChange={e => setFVis(e.target.value)}
            className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[11.5px] text-gray-700 dark:text-gray-200 outline-none">
            <option value="">Public + Private</option>
            <option value="Public">Public Only</option>
            <option value="Private">Private Only</option>
          </select>

          <select value={fCat} onChange={e => setFCat(e.target.value)}
            className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[11.5px] text-gray-700 dark:text-gray-200 outline-none">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <Button size="sm" onClick={load} disabled={loading}
            className="h-8 px-4 text-[11.5px] font-bold rounded-lg bg-orange-600 hover:bg-orange-500 text-white">
            Apply
          </Button>

          {(fStatus || fVis || fCat) && (
            <button onClick={() => { setFStatus(""); setFVis(""); setFCat("") }}
              className="h-8 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] text-[11.5px] text-gray-400 hover:text-rose-600 flex items-center gap-1">
              <X className="h-3 w-3" />Clear
            </button>
          )}

          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search resident / flat / title…"
              className="h-8 pl-8 pr-7 w-48 sm:w-60 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[11.5px] text-gray-700 dark:text-gray-200 outline-none focus:border-orange-400 placeholder:text-gray-400" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Complaint list ── */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-3">

          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-white dark:bg-[#0f1117] border border-gray-100 dark:border-white/[0.05] animate-pulse" />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-center">
              <AlertCircle className="h-12 w-12 text-gray-200 dark:text-gray-700" />
              <p className="text-[13px] font-semibold text-gray-400">No complaints found for the selected filters</p>
            </div>
          ) : filtered.map((c, i) => {
            const isExp   = expanded.has(c.id)
            const rForm   = getReplyForm(c.id)
            const allowed = STATUS_CONF[c.status]?.next ?? []

            return (
              <div key={c.id}
                className={cn(
                  "bg-white dark:bg-[#0f1117] rounded-2xl border shadow-sm overflow-hidden animate-[fadeInUp_0.25s_ease_both]",
                  c.status === "Open" ? "border-amber-200 dark:border-amber-500/20"
                  : c.status === "InProgress" ? "border-blue-200 dark:border-blue-500/20"
                  : c.status === "Resolved" ? "border-emerald-200 dark:border-emerald-500/20"
                  : "border-gray-200 dark:border-white/[0.07]"
                )}
                style={{ animationDelay: `${i * 30}ms` }}>

                {/* Card header */}
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Visibility icon */}
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl border shrink-0",
                        c.visibility === "Private"
                          ? "bg-slate-100 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20"
                          : "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20"
                      )}>
                        {c.visibility === "Private"
                          ? <Lock className="h-4 w-4 text-slate-500" />
                          : <Globe className="h-4 w-4 text-orange-500" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Resident info — admin only */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-200">
                            <User className="h-3 w-3 text-orange-500" />{c.userName}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                            <Home className="h-3 w-3" />Flat {c.flatNo}
                          </span>
                          <span className={cn(
                            "text-[9px] font-black px-1.5 py-0.5 rounded-full border",
                            c.visibility === "Private"
                              ? "bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-500/30"
                              : "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20"
                          )}>{c.visibility}</span>
                        </div>

                        <p className="text-[14px] font-bold text-gray-900 dark:text-white">{c.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <StatusBadge status={c.status} />
                          {c.category && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500 border border-gray-200 dark:border-white/[0.08]">
                              <Tag className="h-2.5 w-2.5" />{c.category}
                            </span>
                          )}
                          <span className="text-[10.5px] text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />{fmt(c.createdDate)}
                          </span>
                          {c.photoUrl && (
                            <button
                              onClick={() => setImgModal(c.photoUrl!)}
                              className="text-[10.5px] text-teal-500 flex items-center gap-1 hover:underline">
                              📷 Photo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {c.replies.length > 0 && (
                        <span className="flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
                          <MessageSquare className="h-3 w-3" />{c.replies.length}
                        </span>
                      )}
                      <button onClick={() => setDelId(c.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-rose-600 hover:border-rose-300 transition-all">
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => toggle(c.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 transition-all">
                        {isExp ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded section */}
                {isExp && (
                  <div className="border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/40 dark:bg-white/[0.02] px-5 py-4 space-y-4 animate-[fadeInUp_0.2s_ease_both]">
                    <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">{c.description}</p>

                    {c.photoUrl && (
                      <img
                        src={c.photoUrl} alt="complaint"
                        onClick={() => setImgModal(c.photoUrl!)}
                        className="rounded-xl max-h-52 object-cover border border-gray-200 dark:border-white/[0.09] shadow-sm cursor-pointer hover:opacity-90 transition-opacity" />
                    )}

                    {/* Previous replies */}
                    {c.replies.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">Previous Replies</p>
                        {c.replies.map(r => (
                          <div key={r.id} className="rounded-xl border border-orange-100 dark:border-orange-500/20 bg-orange-50/40 dark:bg-orange-500/[0.04] px-4 py-3">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400">{r.adminName}</p>
                              <span className="text-[10px] text-gray-400">{fmtT(r.createdDate)}</span>
                            </div>
                            <p className="text-[12.5px] text-gray-700 dark:text-gray-300">{r.reply}</p>
                            {r.newStatus && (
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-400">Status →</span>
                                <StatusBadge status={r.newStatus} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply form */}
                    <div className="rounded-xl border border-orange-200 dark:border-orange-500/20 bg-white dark:bg-[#0f1117] p-4 space-y-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                        <Send className="h-3.5 w-3.5" />Reply to {c.userName}
                      </p>

                      <textarea
                        rows={3}
                        value={rForm.text}
                        onChange={e => setReplyForm(c.id, { text: e.target.value })}
                        placeholder="Type your reply…"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-gray-50 dark:bg-[#1a1d27] text-[13px] text-gray-800 dark:text-gray-100 outline-none focus:border-orange-400 resize-none placeholder:text-gray-400" />

                      {/* Status change buttons */}
                      {allowed.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-gray-400 shrink-0">Change status:</span>
                          <div className="flex gap-1.5 flex-wrap">
                            {allowed.map(ns => (
                              <button key={ns}
                                onClick={() => setReplyForm(c.id, { newStatus: rForm.newStatus === ns ? "" : ns })}
                                className={cn(
                                  "h-7 px-3 rounded-lg border text-[11px] font-bold transition-all",
                                  rForm.newStatus === ns
                                    ? "bg-orange-500 border-orange-500 text-white"
                                    : "border-gray-200 dark:border-white/[0.09] text-gray-600 dark:text-gray-300 bg-white dark:bg-[#1a1d27] hover:border-orange-300"
                                )}>
                                → {ns}
                              </button>
                            ))}
                            {rForm.newStatus && (
                              <button onClick={() => setReplyForm(c.id, { newStatus: "" })}
                                className="h-7 px-2 rounded-lg border border-gray-200 dark:border-white/[0.09] text-[11px] text-gray-400">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={() => sendReply(c.id)}
                        disabled={sending === c.id || !rForm.text.trim()}
                        className="h-9 px-5 text-[12.5px] font-bold rounded-xl bg-orange-500 hover:bg-orange-400 text-white gap-2 shadow-[0_4px_12px_rgba(249,115,22,0.3)] disabled:opacity-50">
                        {sending === c.id
                          ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</>
                          : <><Send className="h-4 w-4" />Send Reply</>}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Photo lightbox */}
      {imgModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setImgModal(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={imgModal} alt="complaint photo" className="rounded-2xl w-full object-contain max-h-[80vh] shadow-2xl" />
            <button onClick={() => setImgModal(null)}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={delId !== null} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-4 bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <AlertDialogTitle className="text-[14px] font-bold">Delete Complaint?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-[12px] text-gray-500 mt-1">This will permanently remove the complaint and all its replies.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-row mt-2">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteComplaint} className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}