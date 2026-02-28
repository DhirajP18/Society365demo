"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Star, CheckCircle2, RefreshCw, Send, Lock, Loader2, Smile, MessageSquare } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type QType = "Rating" | "Text" | "YesNo" | "MultiChoice"

interface Question {
  id: number
  question: string
  questionType: QType
  options?: string
  isRequired: boolean
}

interface ApiRes<T = unknown> {
  isSuccess?: boolean
  resMsg?: string
  result?: T
}

// ── Star rating picker ────────────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"]
  return (
    <div className="flex items-center gap-1 mt-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 transition-transform hover:scale-110 active:scale-95">
          <Star className={cn(
            "h-8 w-8 transition-all",
            i <= (hover || value)
              ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
              : "text-gray-300 dark:text-gray-600"
          )} />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-[12px] font-bold text-amber-600 dark:text-amber-400">{labels[value]}</span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function UserFeedbackPage() {
  const [questions,  setQuestions]  = useState<Question[]>([])
  const [loading,    setLoading]    = useState(true)
  const [answers,    setAnswers]    = useState<Record<number, string>>({})
  const [summary,    setSummary]    = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get<ApiRes<Question[]>>("/FeedbackUser/GetQuestions")
      setQuestions(r.data?.result ?? [])
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const setAnswer = (qid: number, val: string) => setAnswers(a => ({ ...a, [qid]: val }))

  const submit = async () => {
    // Validate required questions
    const missing = questions.filter(q => q.isRequired && (!answers[q.id] || answers[q.id].trim() === ""))
    if (missing.length > 0) {
      toast.error(`Please answer ${missing.length} required question${missing.length > 1 ? "s" : ""}`)
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        summary: summary.trim() || null,
        answers: Object.entries(answers).map(([qid, answer]) => ({ questionId: +qid, answer })),
      }
      const r = await api.post<ApiRes>("/FeedbackUser/Submit", payload)
      if (r.data?.isSuccess) {
        setSubmitted(true)
        toast.success("Thank you for your feedback!")
      } else {
        toast.error(r.data?.resMsg ?? "Submission failed")
      }
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Thank-you screen ───────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#fdf4f5] dark:bg-[#0a070a] gap-6 p-6 text-center">
        <div className="relative">
          <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-[0_8px_32px_rgba(244,63,94,0.35)]">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white dark:border-[#0a070a]">
            <Smile className="h-4 w-4 text-white" />
          </div>
        </div>
        <div>
          <h2 className="text-[22px] font-black text-gray-900 dark:text-white">Thank you! 🎉</h2>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-2 max-w-xs">
            Your feedback was submitted anonymously. It helps us improve the society for everyone.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08]">
          <Lock className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[11.5px] text-gray-500 dark:text-gray-400">Your identity is completely anonymous</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#fdf4f5] dark:bg-[#0a070a]">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-[#0d0a0d] border-b border-gray-200 dark:border-white/[0.06] px-4 sm:px-6 py-5 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-black text-gray-900 dark:text-white">Society Feedback</h1>
            <p className="text-[12.5px] text-gray-500 dark:text-gray-400 mt-0.5">
              Share your thoughts honestly. All responses are completely anonymous.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 shrink-0">
            <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Anonymous</span>
          </div>
        </div>
      </div>

      {/* ── Questions ── */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-4">

          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-2xl bg-white dark:bg-[#0f1117] border border-gray-100 dark:border-white/[0.05] animate-pulse" />
            ))
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3 text-center">
              <MessageSquare className="h-12 w-12 text-gray-200 dark:text-gray-700" />
              <p className="text-[14px] font-bold text-gray-400">No feedback questions yet</p>
              <p className="text-[12.5px] text-gray-400 dark:text-gray-500">Admin hasn&apos;t published any feedback form yet. Check back later!</p>
            </div>
          ) : (
            <>
              {questions.map((q, i) => {
                const val = answers[q.id] ?? ""
                let opts: string[] = []
                if (q.questionType === "MultiChoice" && q.options) {
                  try { opts = JSON.parse(q.options) } catch { opts = q.options.split(",").map(s => s.trim()) }
                }

                return (
                  <div key={q.id}
                    className="bg-white dark:bg-[#0f1117] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm overflow-hidden animate-[fadeInUp_0.3s_ease_both]"
                    style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="h-0.5 bg-gradient-to-r from-rose-400 to-pink-400" />
                    <div className="px-5 py-5">
                      <p className="text-[14px] font-bold text-gray-800 dark:text-white mb-1">
                        {q.isRequired && <span className="text-rose-500 mr-1">*</span>}
                        {q.question}
                      </p>

                      {/* Rating */}
                      {q.questionType === "Rating" && (
                        <StarPicker value={+val || 0} onChange={v => setAnswer(q.id, String(v))} />
                      )}

                      {/* Free text */}
                      {q.questionType === "Text" && (
                        <textarea
                          rows={3}
                          value={val}
                          placeholder="Type your answer here…"
                          onChange={e => setAnswer(q.id, e.target.value)}
                          className="w-full mt-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-gray-50 dark:bg-[#1a1d27] text-[13px] text-gray-700 dark:text-gray-200 outline-none focus:border-rose-400 resize-none placeholder:text-gray-400 transition-colors" />
                      )}

                      {/* Yes / No */}
                      {q.questionType === "YesNo" && (
                        <div className="flex items-center gap-3 mt-3">
                          {["Yes", "No"].map(opt => (
                            <button key={opt} onClick={() => setAnswer(q.id, opt)}
                              className={cn(
                                "flex-1 h-11 rounded-xl border text-[13px] font-bold transition-all",
                                val === opt
                                  ? opt === "Yes"
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
                                    : "bg-rose-500 border-rose-500 text-white shadow-[0_4px_12px_rgba(244,63,94,0.3)]"
                                  : "border-gray-200 dark:border-white/[0.09] text-gray-600 dark:text-gray-300 bg-white dark:bg-[#1a1d27] hover:border-gray-300"
                              )}>
                              {opt === "Yes" ? "✅ Yes" : "❌ No"}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Multiple choice */}
                      {q.questionType === "MultiChoice" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                          {opts.map(opt => (
                            <button key={opt} onClick={() => setAnswer(q.id, opt)}
                              className={cn(
                                "h-10 px-4 rounded-xl border text-[12.5px] font-semibold text-left transition-all",
                                val === opt
                                  ? "bg-rose-500 border-rose-500 text-white shadow-[0_4px_12px_rgba(244,63,94,0.25)]"
                                  : "border-gray-200 dark:border-white/[0.09] text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1a1d27] hover:border-rose-300"
                              )}>
                              {val === opt && "✓ "}{opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Overall summary */}
              <div
                className="bg-white dark:bg-[#0f1117] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm overflow-hidden animate-[fadeInUp_0.3s_ease_both]"
                style={{ animationDelay: `${questions.length * 60}ms` }}>
                <div className="h-0.5 bg-gradient-to-r from-pink-400 to-rose-400" />
                <div className="px-5 py-5">
                  <p className="text-[14px] font-bold text-gray-800 dark:text-white mb-1">
                    Overall Summary <span className="text-[12px] font-normal text-gray-400">(optional)</span>
                  </p>
                  <p className="text-[12px] text-gray-400 dark:text-gray-500 mb-3">Any general thoughts or suggestions for the society management?</p>
                  <textarea
                    rows={4}
                    value={summary}
                    placeholder="Share any additional thoughts, suggestions, or feedback…"
                    onChange={e => setSummary(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-gray-50 dark:bg-[#1a1d27] text-[13px] text-gray-700 dark:text-gray-200 outline-none focus:border-rose-400 resize-none placeholder:text-gray-400 transition-colors" />
                </div>
              </div>

              {/* Submit bar */}
              <div className="sticky bottom-4 bg-white dark:bg-[#0f1117] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-lg px-5 py-4 flex items-center justify-between gap-3 animate-[fadeInUp_0.3s_ease_both]">
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="h-4 w-4 text-emerald-500 shrink-0" />
                  <p className="text-[11.5px] text-gray-500 dark:text-gray-400 truncate">100% anonymous — no name or identity is stored.</p>
                </div>
                <Button onClick={submit} disabled={submitting}
                  className="h-10 px-6 text-[13px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white gap-2 shadow-[0_4px_14px_rgba(244,63,94,0.35)] disabled:opacity-50 shrink-0">
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</>
                    : <><Send className="h-4 w-4" />Submit</>}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}