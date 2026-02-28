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
  Plus, X, RefreshCw, Globe, Lock, ChevronDown, ChevronUp,
  Upload, CheckCircle2, Clock, AlertCircle, XCircle,
  MessageSquare, Loader2, Calendar, Tag, Eye,
  Paperclip, Send,
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

const CATEGORIES = ["Plumbing", "Electrical", "Security", "Lift", "Cleanliness", "Noise", "Parking", "Internet", "Water", "Other"]

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  Open:       "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
  InProgress: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
  Resolved:   "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
  Closed:     "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] border-gray-300 dark:border-white/[0.1]",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border", STATUS_STYLE[status] ?? STATUS_STYLE.Open)}>
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

// ── Complaint card ────────────────────────────────────────────────────────────
function ComplaintCard({
  complaint,
  showReplies,
  expanded,
  onToggle,
}: {
  complaint: Complaint
  showReplies: boolean
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className={cn(
      "bg-white dark:bg-[#0f1117] rounded-2xl border shadow-sm overflow-hidden transition-all",
      complaint.status === "Resolved" ? "border-emerald-200 dark:border-emerald-500/20"
      : complaint.status === "InProgress" ? "border-blue-200 dark:border-blue-500/20"
      : "border-gray-200 dark:border-white/[0.07]"
    )}>
      <div className="px-4 sm:px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl border shrink-0",
              complaint.visibility === "Private"
                ? "bg-slate-100 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20"
                : "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20"
            )}>
              {complaint.visibility === "Private"
                ? <Lock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                : <Globe className="h-4 w-4 text-orange-500 dark:text-orange-400" />}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-gray-900 dark:text-white truncate">{complaint.title}</p>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <StatusBadge status={complaint.status} />
                {complaint.category && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500 border border-gray-200 dark:border-white/[0.08]">
                    <Tag className="h-2.5 w-2.5" />{complaint.category}
                  </span>
                )}
                <span className="text-[10.5px] text-gray-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{fmt(complaint.createdDate)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {showReplies && complaint.replies.length > 0 && (
              <span className="flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
                <MessageSquare className="h-3 w-3" />{complaint.replies.length}
              </span>
            )}
            <button onClick={onToggle}
              className="h-8 w-8 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-orange-600 hover:border-orange-300 transition-all">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/40 dark:bg-white/[0.02] px-4 sm:px-5 py-4 space-y-4 animate-[fadeInUp_0.2s_ease_both]">
          <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">{complaint.description}</p>

          {complaint.photoUrl && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Paperclip className="h-3 w-3" />Attached Photo
              </p>
              <img src={complaint.photoUrl} alt="complaint" className="rounded-xl max-h-52 object-cover border border-gray-200 dark:border-white/[0.09] shadow-sm" />
            </div>
          )}

          {/* Admin replies — only shown to complaint owner */}
          {showReplies && complaint.replies.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" />Admin Replies
              </p>
              {complaint.replies.map(r => (
                <div key={r.id} className="rounded-xl border border-orange-100 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/[0.05] px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11.5px] font-bold text-orange-700 dark:text-orange-400">{r.adminName}</p>
                    <span className="text-[10px] text-gray-400">{fmtT(r.createdDate)}</span>
                  </div>
                  <p className="text-[12.5px] text-gray-700 dark:text-gray-300 leading-relaxed">{r.reply}</p>
                  {r.newStatus && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400">Status changed to:</span>
                      <StatusBadge status={r.newStatus} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function UserComplaintsPage() {
  const [myComplaints,    setMine]    = useState<Complaint[]>([])
  const [publicComplaints,setPub]     = useState<Complaint[]>([])
  const [loading,          setLoading] = useState(true)
  const [tab,              setTab]     = useState<"mine" | "board" | "new">("mine")
  const [expanded,         setExp]     = useState<Set<number>>(new Set())
  const [saving,           setSaving]  = useState(false)
  const [photoFile,        setPhoto]   = useState<File | null>(null)
  const [preview,          setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title:       "",
    description: "",
    category:    "",
    visibility:  "Public" as "Public" | "Private",
  })

  // ── Load data ──────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const [mr, pr] = await Promise.all([
        api.get<ApiRes<Complaint[]>>("/ComplaintUser/GetMyComplaints"),
        api.get<ApiRes<Complaint[]>>("/ComplaintUser/GetPublicComplaints"),
      ])
      setMine(mr.data?.result ?? [])
      setPub(pr.data?.result ?? [])
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggle = (id: number) => setExp(s => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error("Max 5 MB"); return }
    setPhoto(f)
    setPreview(URL.createObjectURL(f))
  }

  // ── Submit complaint ───────────────────────────────────────────────────────
  const submitComplaint = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required")
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append("Title",       form.title)
      fd.append("Description", form.description)
      fd.append("Category",    form.category)
      fd.append("Visibility",  form.visibility)
      if (photoFile) fd.append("photo", photoFile)

      const r = await api.post<ApiRes>("/ComplaintUser/Raise", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      if (r.data?.isSuccess) {
        toast.success("Complaint submitted!")
        setForm({ title: "", description: "", category: "", visibility: "Public" })
        setPhoto(null)
        setPreview(null)
        setTab("mine")
        load()
      } else {
        toast.error(r.data?.resMsg ?? "Failed")
      }
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#fdf7f2] dark:bg-[#0a0907]">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-[#0d0b09] border-b border-gray-200 dark:border-white/[0.06] px-4 sm:px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-[16px] font-bold text-gray-900 dark:text-white">Complaints</h1>
              <p className="text-[11px] text-gray-400 hidden sm:block">Raise a complaint · track status · view community board</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="h-8 px-3 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 rounded-xl">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex -mb-px mt-3 overflow-x-auto">
          {([
            ["mine",  `My Complaints (${myComplaints.length})`],
            ["board", `Community Board (${publicComplaints.length})`],
            ["new",   "+ New Complaint"],
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn(
                "px-4 sm:px-5 py-2 border-b-2 text-[12px] sm:text-[12.5px] font-semibold whitespace-nowrap transition-all shrink-0",
                tab === id
                  ? "border-orange-500 text-orange-600 dark:text-orange-400"
                  : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600"
              )}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-3">

          {/* ── New complaint form ── */}
          {tab === "new" && (
            <div className="bg-white dark:bg-[#0f1117] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm overflow-hidden animate-[fadeInUp_0.25s_ease_both]">
              <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-400" />
              <div className="px-5 py-5 space-y-4">
                <p className="text-[14px] font-bold text-gray-900 dark:text-white">Raise a Complaint</p>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Title *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Brief complaint title"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-gray-50 dark:bg-[#1a1d27] text-[13px] text-gray-800 dark:text-gray-100 outline-none focus:border-orange-400 placeholder:text-gray-400" />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Description *</label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the issue in detail…"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-gray-50 dark:bg-[#1a1d27] text-[13px] text-gray-800 dark:text-gray-100 outline-none focus:border-orange-400 resize-none placeholder:text-gray-400" />
                </div>

                {/* Category + Visibility */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Category</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-gray-50 dark:bg-[#1a1d27] text-[12.5px] text-gray-800 dark:text-gray-100 outline-none focus:border-orange-400">
                      <option value="">Select…</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Visibility</label>
                    <div className="grid grid-cols-2 gap-1.5 h-11">
                      {(["Public", "Private"] as const).map(v => (
                        <button key={v} onClick={() => setForm(f => ({ ...f, visibility: v }))}
                          className={cn(
                            "h-full rounded-xl border text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all",
                            form.visibility === v
                              ? v === "Public"
                                ? "bg-orange-500 border-orange-500 text-white"
                                : "bg-slate-700 border-slate-700 text-white"
                              : "border-gray-200 dark:border-white/[0.09] text-gray-600 dark:text-gray-300 bg-white dark:bg-[#1a1d27]"
                          )}>
                          {v === "Public" ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}{v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Visibility hint */}
                <div className={cn(
                  "flex items-start gap-2 px-3 py-2.5 rounded-xl border text-[11.5px]",
                  form.visibility === "Public"
                    ? "bg-orange-50 dark:bg-orange-500/[0.07] border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-400"
                    : "bg-slate-50 dark:bg-slate-500/[0.07] border-slate-200 dark:border-slate-500/20 text-slate-700 dark:text-slate-400"
                )}>
                  {form.visibility === "Public"
                    ? <Globe className="h-4 w-4 shrink-0 mt-0.5" />
                    : <Lock className="h-4 w-4 shrink-0 mt-0.5" />}
                  <p>{form.visibility === "Public"
                    ? "All residents can see this on the community board. Your name is hidden."
                    : "Only admin can see this complaint. Other residents cannot view it."}</p>
                </div>

                {/* Photo upload */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Photo (optional · max 5 MB)</label>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
                  {!preview ? (
                    <button onClick={() => fileRef.current?.click()}
                      className="w-full h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/[0.12] flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-orange-400 hover:text-orange-500 transition-all bg-gray-50 dark:bg-white/[0.02]">
                      <Upload className="h-5 w-5" />
                      <span className="text-[12px] font-semibold">Click to upload a photo</span>
                    </button>
                  ) : (
                    <div className="relative w-fit">
                      <img src={preview} alt="preview" className="rounded-xl max-h-40 object-cover border border-gray-200 dark:border-white/[0.09] shadow-sm" />
                      <button onClick={() => { setPhoto(null); setPreview(null) }}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.01]">
                <Button variant="outline" onClick={() => setTab("mine")}
                  className="h-9 px-4 text-[12.5px] rounded-xl border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-600">Cancel</Button>
                <Button onClick={submitComplaint} disabled={saving}
                  className="flex-1 sm:flex-none h-9 px-6 text-[12.5px] font-bold rounded-xl bg-orange-500 hover:bg-orange-400 text-white gap-2 shadow-[0_4px_12px_rgba(249,115,22,0.35)] disabled:opacity-50">
                  {saving
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</>
                    : <><Send className="h-4 w-4" />Submit Complaint</>}
                </Button>
              </div>
            </div>
          )}

          {/* ── My complaints ── */}
          {tab === "mine" && (
            loading
              ? [1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-white dark:bg-[#0f1117] border border-gray-100 dark:border-white/[0.05] animate-pulse" />)
              : myComplaints.length === 0
                ? (
                  <div className="flex flex-col items-center py-16 gap-3 text-center">
                    <AlertCircle className="h-12 w-12 text-gray-200 dark:text-gray-700" />
                    <p className="text-[14px] font-bold text-gray-400">No complaints raised yet</p>
                    <Button onClick={() => setTab("new")} size="sm"
                      className="h-8 px-4 text-[12px] font-bold rounded-xl bg-orange-500 hover:bg-orange-400 text-white gap-1.5">
                      <Plus className="h-3.5 w-3.5" />Raise a Complaint
                    </Button>
                  </div>
                )
                : myComplaints.map((c, i) => (
                  <div key={c.id} className="animate-[fadeInUp_0.25s_ease_both]" style={{ animationDelay: `${i * 50}ms` }}>
                    <ComplaintCard
                      complaint={c}
                      showReplies={true}
                      expanded={expanded.has(c.id)}
                      onToggle={() => toggle(c.id)} />
                  </div>
                ))
          )}

          {/* ── Community board — public only, no names ── */}
          {tab === "board" && (
            loading
              ? [1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-white dark:bg-[#0f1117] border border-gray-100 dark:border-white/[0.05] animate-pulse" />)
              : publicComplaints.length === 0
                ? (
                  <div className="flex flex-col items-center py-16 gap-3 text-center">
                    <Globe className="h-12 w-12 text-gray-200 dark:text-gray-700" />
                    <p className="text-[14px] font-bold text-gray-400">No public complaints yet</p>
                  </div>
                )
                : (
                  <>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-500/[0.07] border border-orange-200 dark:border-orange-500/20">
                      <Eye className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      <p className="text-[12px] text-orange-700 dark:text-orange-400">Resident identities are hidden on the community board.</p>
                    </div>
                    {publicComplaints.map((c, i) => (
                      <div key={c.id} className="animate-[fadeInUp_0.25s_ease_both]" style={{ animationDelay: `${i * 50}ms` }}>
                        <ComplaintCard
                          complaint={c}
                          showReplies={false}
                          expanded={expanded.has(c.id)}
                          onToggle={() => toggle(c.id)} />
                      </div>
                    ))}
                  </>
                )
          )}

        </div>
      </div>

      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}