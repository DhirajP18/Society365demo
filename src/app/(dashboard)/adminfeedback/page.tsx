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
  Plus, Pencil, Trash2, RefreshCw, CheckCircle2, X, Send,
  Star, BarChart3, MessageSquare, GripVertical, ChevronDown,
  ChevronUp, Loader2, AlertTriangle, Users, TrendingUp,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type QType = "Rating" | "Text" | "YesNo" | "MultiChoice"

interface Question {
  id: number
  question: string
  questionType: QType
  options?: string
  isRequired: boolean
  sortOrder: number
  isPublished: boolean
  isActive: boolean
  responseCount: number
  averageRating: number
}

interface AnswerResult {
  questionId: number
  question: string
  questionType: string
  totalAnswers: number
  avgRating: number
  yesCount: number
  noCount: number
  choiceCounts: Record<string, number>
  textAnswers: string[]
}

interface Stats {
  totalSubmissions: number
  results: AnswerResult[]
  summaries: string[]
}

interface ApiRes<T = unknown> {
  isSuccess?: boolean
  resMsg?: string
  result?: T
}

const TYPE_INFO: Record<QType, { label: string; color: string; icon: string }> = {
  Rating:      { label: "Star Rating",      color: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30",       icon: "⭐" },
  Text:        { label: "Free Text",        color: "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30",             icon: "✏️" },
  YesNo:       { label: "Yes / No",         color: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30", icon: "✅" },
  MultiChoice: { label: "Multiple Choice",  color: "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30",  icon: "☑️" },
}

// ── Floating label input ──────────────────────────────────────────────────────
function FloatInput({
  label, value, onChange, as, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void
  as?: "textarea"; type?: string
}) {
  const [focused, setFocused] = useState(false)
  const active = focused || String(value).length > 0
  const base = cn(
    "w-full rounded-xl border text-[13px] outline-none transition-all bg-white dark:bg-[#1a1d27] text-gray-800 dark:text-gray-100",
    focused
      ? "border-rose-400 shadow-[0_0_0_3px_rgba(244,63,94,0.1)]"
      : "border-gray-200 dark:border-white/[0.09] hover:border-gray-300"
  )
  return (
    <div className="relative">
      {as === "textarea" ? (
        <textarea
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(base, "px-3 pt-5 pb-2 resize-none")}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(base, "h-11 px-3 pt-4 pb-1")}
        />
      )}
      <label className={cn(
        "pointer-events-none absolute left-3 font-medium transition-all duration-150 select-none",
        active
          ? "top-[5px] text-[10px] text-rose-500 tracking-wide"
          : as === "textarea"
            ? "top-3.5 text-[12.5px] text-gray-400"
            : "top-1/2 -translate-y-1/2 text-[12.5px] text-gray-400"
      )}>{label}</label>
    </div>
  )
}

// ── Stars display ─────────────────────────────────────────────────────────────
function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} className={cn(
          "h-3.5 w-3.5",
          i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600"
        )} />
      ))}
      <span className="ml-1 text-[11px] font-bold text-gray-600 dark:text-gray-300">{value.toFixed(1)}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminFeedbackPage() {
  const [tab,        setTab]      = useState<"questions" | "stats">("questions")
  const [questions,  setQ]        = useState<Question[]>([])
  const [stats,      setStats]    = useState<Stats | null>(null)
  const [loading,    setLoading]  = useState(true)
  const [publishing, setPub]      = useState(false)
  const [showForm,   setShowForm] = useState(false)
  const [editQ,      setEditQ]    = useState<Question | null>(null)
  const [delId,      setDelId]    = useState<number | null>(null)
  const [saving,     setSaving]   = useState(false)
  const [expandSubs, setExpSubs]  = useState(false)
  const [mcOptions,  setMCO]      = useState("")

  const [form, setForm] = useState({
    question:     "",
    questionType: "Rating" as QType,
    isRequired:   true,
    sortOrder:    0,
  })

  // ── Load data ──────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const [qRes, sRes] = await Promise.all([
        api.get<ApiRes<Question[]>>("/FeedbackAdmin/GetAllQuestions"),
        api.get<ApiRes<Stats>>("/FeedbackAdmin/GetStats"),
      ])
      setQ(qRes.data?.result ?? [])
      if (sRes.data?.result) setStats(sRes.data.result)
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({ question: "", questionType: "Rating", isRequired: true, sortOrder: 0 })
    setEditQ(null)
    setMCO("")
    setShowForm(false)
  }

  const openEdit = (q: Question) => {
    setEditQ(q)
    setForm({
      question: q.question, questionType: q.questionType,
      isRequired: q.isRequired, sortOrder: q.sortOrder,
    })
    if (q.options) {
      try { setMCO(JSON.parse(q.options).join(", ")) } catch { setMCO(q.options) }
    } else { setMCO("") }
    setShowForm(true)
  }

  const save = async () => {
    if (!form.question.trim()) { toast.error("Question text is required"); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        id: editQ?.id ?? 0,
        options: form.questionType === "MultiChoice" && mcOptions.trim()
          ? JSON.stringify(mcOptions.split(",").map(s => s.trim()).filter(Boolean))
          : null,
      }
      const r = editQ
        ? await api.put<ApiRes>("/FeedbackAdmin/UpdateQuestion", payload)
        : await api.post<ApiRes>("/FeedbackAdmin/InsertQuestion", payload)
      if (r.data?.isSuccess) {
        toast.success(editQ ? "Question updated!" : "Question added!")
        resetForm(); load()
      } else { toast.error(r.data?.resMsg ?? "Failed") }
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setSaving(false) }
  }

  const deleteQuestion = async () => {
    if (!delId) return
    try {
      await api.delete(`/FeedbackAdmin/DeleteQuestion/${delId}`)
      toast.success("Deleted"); setDelId(null); load()
    } catch (e) { toast.error(getApiMessage(e)) }
  }

  const publish = async () => {
    setPub(true)
    try {
      const r = await api.post<ApiRes>("/FeedbackAdmin/PublishQuestions", {})
      if (r.data?.isSuccess) { toast.success("Feedback published to all users!"); load() }
      else toast.error(r.data?.resMsg ?? "Failed")
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setPub(false) }
  }

  const card = "bg-white dark:bg-[#0f1117] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm"
  const publishedCount = questions.filter(q => q.isPublished).length

  return (
    <div className="flex flex-col h-full bg-[#fdf4f5] dark:bg-[#0a070a] overflow-auto">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-[#0d0a0d] border-b border-gray-200 dark:border-white/[0.06] px-4 sm:px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
              <BarChart3 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h1 className="text-[16px] font-bold text-gray-900 dark:text-white">Feedback Management</h1>
              <p className="text-[11px] text-gray-400 hidden sm:block">Design questions · publish to residents · view anonymous results</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={publish} disabled={publishing || questions.length === 0}
              className="h-8 px-3.5 text-[12px] font-bold rounded-xl gap-1.5 bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40">
              {publishing
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Publishing…</>
                : <><Send className="h-3.5 w-3.5" />{publishedCount > 0 ? "Re-publish" : "Publish"}</>}
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}
              className="h-8 px-3 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 rounded-xl">
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Stats chips */}
        {stats && (
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
              <Users className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              <span className="text-[12px] font-bold text-rose-700 dark:text-rose-400">{stats.totalSubmissions} responses</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.07]">
              <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-[12px] font-bold text-gray-600 dark:text-gray-300">{questions.length} questions</span>
            </div>
            {publishedCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400">{publishedCount} live</span>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex -mb-px mt-3">
          {(["questions", "stats"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                "px-5 py-2 border-b-2 text-[12.5px] font-semibold capitalize transition-all",
                tab === t ? "border-rose-500 text-rose-600 dark:text-rose-400" : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600"
              )}>
              {t === "questions" ? "Questions & Settings" : "Results & Stats"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-4">

        {/* ── Questions tab ── */}
        {tab === "questions" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] font-bold text-gray-600 dark:text-gray-300">
                {questions.length} question{questions.length !== 1 ? "s" : ""}
              </p>
              <Button size="sm" onClick={() => { resetForm(); setShowForm(!showForm) }}
                className="h-8 px-3.5 text-[12px] font-bold rounded-xl gap-1.5 bg-rose-600 hover:bg-rose-500 text-white">
                {showForm ? <><X className="h-3.5 w-3.5" />Cancel</> : <><Plus className="h-3.5 w-3.5" />Add Question</>}
              </Button>
            </div>

            {/* Question form */}
            {showForm && (
              <div className={cn(card, "overflow-hidden animate-[fadeInUp_0.25s_ease_both]")}>
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.05] bg-rose-50/60 dark:bg-rose-900/10">
                  <MessageSquare className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white">{editQ ? "Edit Question" : "New Question"}</p>
                </div>
                <div className="p-5 space-y-4">
                  <FloatInput label="Question text *" value={form.question} onChange={v => setForm(f => ({ ...f, question: v }))} as="textarea" />

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* Type */}
                    <div className="space-y-1.5">
                      <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Type</p>
                      <select value={form.questionType}
                        onChange={e => setForm(f => ({ ...f, questionType: e.target.value as QType }))}
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1d27] text-[12.5px] text-gray-800 dark:text-white outline-none">
                        {(Object.keys(TYPE_INFO) as QType[]).map(t => (
                          <option key={t} value={t}>{TYPE_INFO[t].icon} {TYPE_INFO[t].label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sort order */}
                    <div className="space-y-1.5">
                      <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Sort Order</p>
                      <input type="number" value={form.sortOrder}
                        onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))}
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1d27] text-[12.5px] text-gray-800 dark:text-white outline-none" />
                    </div>

                    {/* Required toggle */}
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div
                          className={cn("relative h-5 w-9 rounded-full transition-all", form.isRequired ? "bg-rose-500" : "bg-gray-300 dark:bg-gray-600")}
                          onClick={() => setForm(f => ({ ...f, isRequired: !f.isRequired }))}>
                          <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", form.isRequired ? "left-[18px]" : "left-0.5")} />
                        </div>
                        <span className="text-[12px] text-gray-600 dark:text-gray-300">Required</span>
                      </label>
                    </div>
                  </div>

                  {/* MultiChoice options */}
                  {form.questionType === "MultiChoice" && (
                    <FloatInput label="Options (comma separated) e.g. Excellent, Good, Average, Poor" value={mcOptions} onChange={setMCO} />
                  )}
                </div>

                <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.01]">
                  <Button variant="outline" onClick={resetForm}
                    className="h-9 px-4 text-[12.5px] rounded-xl border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-600">Cancel</Button>
                  <Button onClick={save} disabled={saving}
                    className="h-9 px-6 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white gap-1.5 disabled:opacity-50">
                    {saving
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</>
                      : <><CheckCircle2 className="h-3.5 w-3.5" />{editQ ? "Save Changes" : "Add Question"}</>}
                  </Button>
                </div>
              </div>
            )}

            {/* Question list */}
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-white dark:bg-[#0f1117] border border-gray-100 dark:border-white/[0.05] animate-pulse" />)}</div>
            ) : questions.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3 text-center">
                <MessageSquare className="h-10 w-10 text-gray-200 dark:text-gray-700" />
                <p className="text-[13px] font-semibold text-gray-400">No questions yet. Add your first feedback question.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={q.id}
                    className={cn(card, "overflow-hidden animate-[fadeInUp_0.25s_ease_both] hover:shadow-md transition-shadow")}
                    style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", TYPE_INFO[q.questionType]?.color)}>
                            {TYPE_INFO[q.questionType]?.icon} {TYPE_INFO[q.questionType]?.label}
                          </span>
                          {q.isRequired && (
                            <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">Required</span>
                          )}
                          {q.isPublished && (
                            <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">Live</span>
                          )}
                        </div>
                        <p className="text-[13px] font-semibold text-gray-800 dark:text-white mt-1 truncate">{q.question}</p>
                        {q.responseCount > 0 && (
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10.5px] text-gray-400">{q.responseCount} response{q.responseCount !== 1 ? "s" : ""}</span>
                            {q.questionType === "Rating" && <Stars value={q.averageRating} />}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(q)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-rose-600 hover:border-rose-300 transition-all">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => setDelId(q.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-rose-600 hover:border-rose-300 transition-all">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Stats tab ── */}
        {tab === "stats" && (
          !stats || stats.totalSubmissions === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-center">
              <TrendingUp className="h-10 w-10 text-gray-200 dark:text-gray-700" />
              <p className="text-[13px] font-semibold text-gray-400">No responses yet. Publish your feedback form first.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.results.map((r, i) => (
                <div key={r.questionId}
                  className={cn(card, "overflow-hidden animate-[fadeInUp_0.25s_ease_both]")}
                  style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div>
                        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", TYPE_INFO[r.questionType as QType]?.color)}>
                          {TYPE_INFO[r.questionType as QType]?.icon} {TYPE_INFO[r.questionType as QType]?.label}
                        </span>
                        <p className="text-[13.5px] font-bold text-gray-800 dark:text-white mt-1.5">{r.question}</p>
                      </div>
                      <span className="text-[11px] font-bold text-gray-400 shrink-0">{r.totalAnswers} answers</span>
                    </div>

                    {/* Rating */}
                    {r.questionType === "Rating" && (
                      <div className="flex items-center gap-4 bg-amber-50 dark:bg-amber-500/[0.07] border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3">
                        <div className="text-[32px] font-black text-amber-600 dark:text-amber-400">{r.avgRating.toFixed(1)}</div>
                        <div><Stars value={r.avgRating} /><p className="text-[11px] text-gray-400 mt-0.5">out of 5 stars</p></div>
                      </div>
                    )}

                    {/* YesNo */}
                    {r.questionType === "YesNo" && (
                      <div className="grid grid-cols-2 gap-2">
                        {[["Yes", r.yesCount, "emerald"], ["No", r.noCount, "rose"]].map(([label, count, c]) => {
                          const pct = r.totalAnswers > 0 ? Math.round((count as number) / r.totalAnswers * 100) : 0
                          return (
                            <div key={label as string}
                              className={cn("rounded-xl border p-3",
                                c === "emerald"
                                  ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                                  : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20")}>
                              <p className={cn("text-[11px] font-bold uppercase", c === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{label as string}</p>
                              <p className="text-[22px] font-black text-gray-800 dark:text-white">{count as number}</p>
                              <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 mt-1.5">
                                <div className={cn("h-full rounded-full", c === "emerald" ? "bg-emerald-500" : "bg-rose-500")} style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">{pct}%</p>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* MultiChoice */}
                    {r.questionType === "MultiChoice" && (
                      <div className="space-y-2">
                        {Object.entries(r.choiceCounts).map(([choice, count]) => {
                          const pct = r.totalAnswers > 0 ? Math.round(count / r.totalAnswers * 100) : 0
                          return (
                            <div key={choice}>
                              <div className="flex justify-between text-[12px] mb-1">
                                <span className="font-semibold text-gray-700 dark:text-gray-200">{choice}</span>
                                <span className="text-gray-400">{count} ({pct}%)</span>
                              </div>
                              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                                <div className="h-full rounded-full bg-rose-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Text answers */}
                    {r.questionType === "Text" && r.textAnswers.length > 0 && (
                      <div className="space-y-1.5 max-h-40 overflow-auto">
                        {r.textAnswers.map((a, i) => (
                          <p key={i} className="text-[12px] px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-gray-700 dark:text-gray-300 italic">{a}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Summaries accordion */}
              {stats.summaries.length > 0 && (
                <div className={cn(card, "overflow-hidden")}>
                  <button className="w-full flex items-center justify-between px-5 py-4" onClick={() => setExpSubs(!expandSubs)}>
                    <p className="text-[13.5px] font-bold text-gray-800 dark:text-white">User Summaries ({stats.summaries.length})</p>
                    {expandSubs ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </button>
                  {expandSubs && (
                    <div className="px-5 pb-5 space-y-2">
                      {stats.summaries.map((s, i) => (
                        <p key={i} className="text-[12.5px] px-4 py-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-500/[0.07] border border-rose-100 dark:border-rose-500/20 text-gray-700 dark:text-gray-300 italic">{s}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={delId !== null} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-4 bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <AlertDialogTitle className="text-[14px] font-bold">Delete Question?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-[12px] text-gray-500">All existing answers to this question will remain in the database.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-row mt-2">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteQuestion} className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}