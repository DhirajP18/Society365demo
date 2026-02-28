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
  Phone, Plus, Pencil, Trash2, X, RefreshCw, CheckCircle2,
  Loader2, MessageSquare, Search, ChevronDown, ChevronUp,
  Globe, EyeOff, Shield, Flame, Heart, Zap, Star, Send,
  AlertTriangle,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Contact {
  id: number
  label: string
  number: string
  category?: string
  iconName?: string
  sortOrder: number
  isActive: boolean
}

interface QueryAnswer {
  id: number
  answer: string
  createdDate: string
}

interface HelpQuery {
  id: number
  userId: number
  userName: string
  flatNo: string
  question: string
  isAnswered: boolean
  isPublicFAQ: boolean
  createdDate: string
  answer?: QueryAnswer
}

interface ApiRes<T = unknown> {
  isSuccess?: boolean
  resMsg?: string
  result?: T
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CONTACT_CATS = ["Safety", "Medical", "Women", "Society", "Utility"]

const ICON_OPTIONS: { value: string; icon: React.ReactNode; label: string }[] = [
  { value: "shield", icon: <Shield className="h-4 w-4" />,  label: "Shield" },
  { value: "flame",  icon: <Flame  className="h-4 w-4" />,  label: "Flame" },
  { value: "heart",  icon: <Heart  className="h-4 w-4" />,  label: "Heart" },
  { value: "phone",  icon: <Phone  className="h-4 w-4" />,  label: "Phone" },
  { value: "zap",    icon: <Zap    className="h-4 w-4" />,  label: "Zap" },
]

const CAT_STYLE: Record<string, string> = {
  Safety:  "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400",
  Medical: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400",
  Women:   "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-400",
  Society: "bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-400",
  Utility: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400",
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

// ── Floating label input ──────────────────────────────────────────────────────
function FloatInput({
  label, value, onChange, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "w-full h-11 px-3 pt-4 pb-1 rounded-xl border text-[13px] text-gray-800 dark:text-gray-100 outline-none transition-all bg-white dark:bg-[#1a1d27]",
          focused
            ? "border-teal-400 shadow-[0_0_0_3px_rgba(20,184,166,0.1)]"
            : "border-gray-200 dark:border-white/[0.09] hover:border-gray-300"
        )}
      />
      <label className={cn(
        "pointer-events-none absolute left-3 font-medium transition-all duration-150 select-none",
        active
          ? "top-[5px] text-[10px] text-teal-500 tracking-wide"
          : "top-1/2 -translate-y-1/2 text-[12.5px] text-gray-400"
      )}>{label}</label>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminHelpPage() {
  const [tab,       setTab]     = useState<"contacts" | "queries">("contacts")
  const [contacts,  setContacts]= useState<Contact[]>([])
  const [queries,   setQueries] = useState<HelpQuery[]>([])
  const [loading,   setLoading] = useState(true)
  const [search,    setSearch]  = useState("")
  const [expanded,  setExp]     = useState<Set<number>>(new Set())
  const [showCForm, setSCF]     = useState(false)
  const [editC,     setEditC]   = useState<Contact | null>(null)
  const [delCId,    setDelCId]  = useState<number | null>(null)
  const [delQId,    setDelQId]  = useState<number | null>(null)
  const [savingC,   setSavingC] = useState(false)
  const [sending,   setSending] = useState<number | null>(null)

  const [cForm, setCForm] = useState({
    label: "", number: "", category: "", iconName: "shield", sortOrder: 0,
  })

  // Answer form state per query
  const [answerForms, setAnswerForms] = useState<Record<number, { text: string; faq: boolean }>>({})

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const [cr, qr] = await Promise.all([
        api.get<ApiRes<Contact[]>>("/EmergencyContact/GetAll"),
        api.get<ApiRes<HelpQuery[]>>("/HelpQuery/GetAll"),
      ])
      setContacts(cr.data?.result ?? [])
      setQueries(qr.data?.result ?? [])
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const toggle = (id: number) => setExp(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const getAF = (id: number) => {
    if (answerForms[id]) return answerForms[id]
    const q = queries.find(x => x.id === id)
    return { text: q?.answer?.answer ?? "", faq: q?.isPublicFAQ ?? false }
  }
  const setAF = (id: number, patch: Partial<{ text: string; faq: boolean }>) =>
    setAnswerForms(f => ({ ...f, [id]: { ...getAF(id), ...patch } }))

  // ── Contact CRUD ───────────────────────────────────────────────────────────
  const resetCForm = () => {
    setCForm({ label: "", number: "", category: "", iconName: "shield", sortOrder: 0 })
    setEditC(null); setSCF(false)
  }

  const openEditContact = (c: Contact) => {
    setEditC(c)
    setCForm({ label: c.label, number: c.number, category: c.category ?? "", iconName: c.iconName ?? "shield", sortOrder: c.sortOrder })
    setSCF(true)
  }

  const saveContact = async () => {
    if (!cForm.label.trim() || !cForm.number.trim()) {
      toast.error("Label and number are required"); return
    }
    setSavingC(true)
    try {
      const payload = { ...cForm, id: editC?.id ?? 0, isActive: true }
      const r = editC
        ? await api.put<ApiRes>("/EmergencyContact/Update", payload)
        : await api.post<ApiRes>("/EmergencyContact/Insert", payload)
      if (r.data?.isSuccess) {
        toast.success(editC ? "Updated!" : "Contact added!")
        resetCForm(); load()
      } else { toast.error(r.data?.resMsg ?? "Failed") }
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setSavingC(false) }
  }

  const deleteContact = async () => {
    if (!delCId) return
    try {
      await api.delete(`/EmergencyContact/Delete/${delCId}`)
      toast.success("Removed"); setDelCId(null); load()
    } catch (e) { toast.error(getApiMessage(e)) }
  }

  // ── Query answer ───────────────────────────────────────────────────────────
  const saveAnswer = async (id: number) => {
    const f = getAF(id)
    if (!f.text.trim()) { toast.error("Answer is required"); return }
    setSending(id)
    try {
      const r = await api.post<ApiRes>("/HelpQuery/Answer", {
        queryId: id, answer: f.text, isPublicFAQ: f.faq,
      })
      if (r.data?.isSuccess) { toast.success("Answer saved!"); load() }
      else { toast.error(r.data?.resMsg ?? "Failed") }
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setSending(null) }
  }

  const toggleFAQ = async (id: number, isPublic: boolean) => {
    try {
      const r = await api.post<ApiRes>(`/HelpQuery/ToggleFAQ?queryId=${id}&isPublic=${isPublic}`, {})
      if (r.data?.isSuccess) { toast.success(r.data.resMsg ?? "Updated"); load() }
    } catch (e) { toast.error(getApiMessage(e)) }
  }

  const deleteQuery = async () => {
    if (!delQId) return
    try {
      await api.delete(`/HelpQuery/Delete/${delQId}`)
      toast.success("Deleted"); setDelQId(null); load()
    } catch (e) { toast.error(getApiMessage(e)) }
  }

  const filteredQ = queries.filter(q => {
    const s = search.trim().toLowerCase()
    return !s || `${q.userName} ${q.flatNo} ${q.question}`.toLowerCase().includes(s)
  })

  const pendingCount = queries.filter(q => !q.isAnswered).length
  const card = "bg-white dark:bg-[#0f1117] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm"

  return (
    <div className="flex flex-col h-full bg-[#f0f7f4] dark:bg-[#070a09]">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-[#090d0b] border-b border-gray-200 dark:border-white/[0.06] px-4 sm:px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20">
              <Phone className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-[16px] font-bold text-gray-900 dark:text-white">Help Management</h1>
              <p className="text-[11px] text-gray-400 hidden sm:block">Emergency contacts · answer resident queries · manage public FAQ</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="h-8 px-3 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 rounded-xl">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex -mb-px mt-3">
          {([
            ["contacts", `Emergency Contacts (${contacts.length})`],
            ["queries",  `User Queries (${queries.length})`],
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn(
                "px-5 py-2 border-b-2 text-[12.5px] font-semibold whitespace-nowrap transition-all",
                tab === id
                  ? "border-teal-500 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600"
              )}>
              {label}
              {id === "queries" && pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-black bg-amber-500 text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* ════════ CONTACTS TAB ════════ */}
          {tab === "contacts" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[12.5px] font-bold text-gray-600 dark:text-gray-300">
                  {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
                </p>
                <Button size="sm" onClick={() => { resetCForm(); setSCF(!showCForm) }}
                  className="h-8 px-3.5 text-[12px] font-bold rounded-xl gap-1.5 bg-teal-600 hover:bg-teal-500 text-white">
                  {showCForm ? <><X className="h-3.5 w-3.5" />Cancel</> : <><Plus className="h-3.5 w-3.5" />Add Contact</>}
                </Button>
              </div>

              {/* Contact form */}
              {showCForm && (
                <div className={cn(card, "overflow-hidden animate-[fadeInUp_0.25s_ease_both]")}>
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.05] bg-teal-50/60 dark:bg-teal-900/10">
                    <Phone className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <p className="text-[13px] font-bold text-gray-900 dark:text-white">
                      {editC ? "Edit Contact" : "Add Emergency Contact"}
                    </p>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FloatInput label="Label (e.g. Police)" value={cForm.label} onChange={v => setCForm(f => ({ ...f, label: v }))} />
                      <FloatInput label="Number (e.g. 100)" value={cForm.number} onChange={v => setCForm(f => ({ ...f, number: v }))} type="tel" />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Category</p>
                        <select value={cForm.category} onChange={e => setCForm(f => ({ ...f, category: e.target.value }))}
                          className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1d27] text-[12.5px] text-gray-800 dark:text-white outline-none">
                          <option value="">None</option>
                          {CONTACT_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Icon</p>
                        <select value={cForm.iconName} onChange={e => setCForm(f => ({ ...f, iconName: e.target.value }))}
                          className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1d27] text-[12.5px] text-gray-800 dark:text-white outline-none">
                          {ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Sort Order</p>
                        <input
                          type="number"
                          value={cForm.sortOrder}
                          onChange={e => setCForm(f => ({ ...f, sortOrder: +e.target.value }))}
                          className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1d27] text-[12.5px] text-gray-800 dark:text-white outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.01]">
                    <Button variant="outline" onClick={resetCForm}
                      className="h-9 px-4 text-[12.5px] rounded-xl border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-600">Cancel</Button>
                    <Button onClick={saveContact} disabled={savingC}
                      className="h-9 px-6 text-[12.5px] font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white gap-1.5 disabled:opacity-50">
                      {savingC
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</>
                        : <><CheckCircle2 className="h-3.5 w-3.5" />{editC ? "Save Changes" : "Add Contact"}</>}
                    </Button>
                  </div>
                </div>
              )}

              {/* Contact list */}
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-white dark:bg-[#0f1117] border border-gray-100 dark:border-white/[0.05] animate-pulse" />)
              ) : contacts.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-2 text-center">
                  <Phone className="h-10 w-10 text-gray-200 dark:text-gray-700" />
                  <p className="text-[13px] font-semibold text-gray-400">No contacts yet. Add emergency numbers.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((c, i) => {
                    const iconNode = ICON_OPTIONS.find(o => o.value === (c.iconName ?? "shield"))?.icon ?? <Phone className="h-4 w-4" />
                    const catStyle = CAT_STYLE[c.category ?? ""] ?? "bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-500/20"
                    return (
                      <div key={c.id}
                        className={cn(card, "px-4 py-3.5 flex items-center gap-3 animate-[fadeInUp_0.2s_ease_both] hover:shadow-md transition-shadow")}
                        style={{ animationDelay: `${i * 30}ms` }}>
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border shrink-0", catStyle)}>
                          {iconNode}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[13.5px] font-bold text-gray-900 dark:text-white">{c.label}</p>
                            {c.category && (
                              <span className={cn("text-[9.5px] font-black px-2 py-0.5 rounded-full border", catStyle)}>
                                {c.category}
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] font-mono font-bold text-teal-600 dark:text-teal-400">{c.number}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openEditContact(c)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-teal-600 hover:border-teal-300 transition-all">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={() => setDelCId(c.id)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-rose-600 hover:border-rose-300 transition-all">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ════════ QUERIES TAB ════════ */}
          {tab === "queries" && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search questions or resident…"
                    className="w-full h-8 pl-8 pr-7 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[11.5px] text-gray-700 dark:text-gray-200 outline-none focus:border-teal-400 placeholder:text-gray-400" />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-gray-400">
                  {filteredQ.filter(q => !q.isAnswered).length} unanswered · {filteredQ.filter(q => q.isPublicFAQ).length} in FAQ
                </span>
              </div>

              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-white dark:bg-[#0f1117] border border-gray-100 dark:border-white/[0.05] animate-pulse" />)
              ) : filteredQ.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-2 text-center">
                  <MessageSquare className="h-10 w-10 text-gray-200 dark:text-gray-700" />
                  <p className="text-[13px] font-semibold text-gray-400">No queries yet</p>
                </div>
              ) : filteredQ.map((q, i) => {
                const isExp = expanded.has(q.id)
                const af    = getAF(q.id)

                return (
                  <div key={q.id}
                    className={cn(
                      card, "overflow-hidden animate-[fadeInUp_0.25s_ease_both]",
                      !q.isAnswered ? "border-amber-200 dark:border-amber-500/20"
                      : q.isPublicFAQ ? "border-teal-200 dark:border-teal-500/20"
                      : ""
                    )}
                    style={{ animationDelay: `${i * 30}ms` }}>

                    <div className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">{q.userName}</span>
                            <span className="text-[10px] text-gray-400">Flat {q.flatNo}</span>
                            <span className="text-[10px] text-gray-400">{fmt(q.createdDate)}</span>
                            {!q.isAnswered ? (
                              <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">Pending</span>
                            ) : (
                              <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">Answered</span>
                            )}
                            {q.isPublicFAQ && (
                              <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20 flex items-center gap-1">
                                <Star className="h-2.5 w-2.5" />Public FAQ
                              </span>
                            )}
                          </div>
                          <p className="text-[13.5px] font-semibold text-gray-800 dark:text-white leading-relaxed">{q.question}</p>
                          {q.isAnswered && q.answer && !isExp && (
                            <p className="text-[12px] text-gray-400 mt-1 italic line-clamp-1">&ldquo;A: {q.answer.answer}&rdquo;</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setDelQId(q.id)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-rose-600 hover:border-rose-300 transition-all">
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <button onClick={() => toggle(q.id)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 transition-all">
                            {isExp ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExp && (
                      <div className="border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/40 dark:bg-white/[0.02] px-5 py-4 space-y-3 animate-[fadeInUp_0.2s_ease_both]">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                          <Send className="h-3.5 w-3.5" />{q.isAnswered ? "Edit Answer" : "Write Answer"}
                        </p>

                        <textarea
                          rows={3}
                          value={af.text}
                          onChange={e => setAF(q.id, { text: e.target.value })}
                          placeholder="Type your answer here…"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1d27] text-[13px] text-gray-800 dark:text-gray-100 outline-none focus:border-teal-400 resize-none placeholder:text-gray-400" />

                        {/* Public FAQ toggle */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <div
                              className={cn("relative h-5 w-9 rounded-full transition-all", af.faq ? "bg-teal-500" : "bg-gray-300 dark:bg-gray-600")}
                              onClick={() => setAF(q.id, { faq: !af.faq })}>
                              <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", af.faq ? "left-[18px]" : "left-0.5")} />
                            </div>
                            <div>
                              <span className="text-[12.5px] font-semibold text-gray-700 dark:text-gray-200">Show as Public FAQ</span>
                              <span className="text-[10.5px] text-gray-400 ml-1.5">— visible to all residents</span>
                            </div>
                          </label>

                          <Button
                            onClick={() => saveAnswer(q.id)}
                            disabled={sending === q.id || !af.text.trim()}
                            className="h-9 px-5 text-[12.5px] font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white gap-2 shadow-[0_4px_12px_rgba(20,184,166,0.3)] disabled:opacity-50">
                            {sending === q.id
                              ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                              : <><CheckCircle2 className="h-4 w-4" />Save Answer</>}
                          </Button>
                        </div>

                        {/* Quick FAQ visibility toggle after answered */}
                        {q.isAnswered && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[11px] text-gray-400">FAQ visibility:</span>
                            <button
                              onClick={() => toggleFAQ(q.id, !q.isPublicFAQ)}
                              className={cn(
                                "flex items-center gap-1.5 h-7 px-3 rounded-lg border text-[11px] font-bold transition-all",
                                q.isPublicFAQ
                                  ? "bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-400"
                                  : "border-gray-200 dark:border-white/[0.09] text-gray-500 bg-white dark:bg-[#1a1d27]"
                              )}>
                              {q.isPublicFAQ
                                ? <><Globe className="h-3 w-3" />Public</>
                                : <><EyeOff className="h-3 w-3" />Private</>}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* Delete contact dialog */}
      <AlertDialog open={delCId !== null} onOpenChange={() => setDelCId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-4 bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <AlertDialogTitle className="text-[14px] font-bold">Remove Contact?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-[12px] text-gray-500 mt-1">This contact will be removed from the emergency directory.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-row mt-2">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteContact} className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete query dialog */}
      <AlertDialog open={delQId !== null} onOpenChange={() => setDelQId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-4 bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <AlertDialogTitle className="text-[14px] font-bold">Delete Query?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-[12px] text-gray-500 mt-1">This question and its answer will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-row mt-2">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteQuery} className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}