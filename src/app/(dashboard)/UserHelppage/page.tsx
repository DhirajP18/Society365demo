"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Phone, Shield, Flame, Heart, Zap, RefreshCw, Send,
  Loader2, MessageSquare, CheckCircle2, Clock, HelpCircle,
  BookOpen, PhoneCall, Sparkles, ChevronRight,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Contact {
  id: number
  label: string
  number: string
  category?: string
  iconName?: string
}

interface MyQuery {
  id: number
  question: string
  isAnswered: boolean
  createdDate: string
  answer?: { answer: string; createdDate: string }
}

interface FAQ {
  queryId: number
  question: string
  answer: string
}

interface ApiRes<T = unknown> {
  isSuccess?: boolean
  resMsg?: string
  result?: T
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  shield: <Shield className="h-5 w-5" />,
  flame:  <Flame  className="h-5 w-5" />,
  heart:  <Heart  className="h-5 w-5" />,
  phone:  <Phone  className="h-5 w-5" />,
  zap:    <Zap    className="h-5 w-5" />,
}

const CAT_CARD_STYLE: Record<string, string> = {
  Safety:  "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400",
  Medical: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400",
  Women:   "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-400",
  Society: "bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-400",
  Utility: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400",
}

const fmt  = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
const fmtT = (d: string) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function UserHelpPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [myQueries,setMyQ]      = useState<MyQuery[]>([])
  const [faqs,     setFaqs]     = useState<FAQ[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<"emergency" | "ask" | "faq">("emergency")
  const [question, setQuestion] = useState("")
  const [sending,  setSending]  = useState(false)

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const [cr, qr, fr] = await Promise.all([
        api.get<ApiRes<Contact[]>>("/EmergencyContact/GetAll"),
        api.get<ApiRes<MyQuery[]>>("/HelpQuery/GetMyQueries"),
        api.get<ApiRes<FAQ[]>>("/HelpQuery/GetPublicFAQ"),
      ])
      setContacts(cr.data?.result ?? [])
      setMyQ(qr.data?.result ?? [])
      setFaqs(fr.data?.result ?? [])
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── Submit question ────────────────────────────────────────────────────────
  const askQuestion = async () => {
    if (!question.trim()) { toast.error("Please type your question"); return }
    setSending(true)
    try {
      const r = await api.post<ApiRes>("/HelpQuery/Ask", { question })
      if (r.data?.isSuccess) {
        toast.success("Question submitted! Admin will answer soon.")
        setQuestion("")
        setTab("ask")
        load()
      } else {
        toast.error(r.data?.resMsg ?? "Failed")
      }
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setSending(false)
    }
  }

  const unansweredCount = myQueries.filter(q => !q.isAnswered).length

  return (
    <div className="flex flex-col h-full bg-[#f0f7f4] dark:bg-[#070a09]">

      {/* ── Hero header with gradient ── */}
      <div className="bg-gradient-to-br from-teal-600 to-emerald-700 dark:from-teal-900 dark:to-emerald-950 px-4 sm:px-6 pt-6 pb-0 shrink-0">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 border border-white/30 shrink-0">
              <HelpCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-[18px] font-black text-white">Help &amp; Support</h1>
              <p className="text-[11.5px] text-teal-100/80">Emergency contacts · ask questions · browse FAQ</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="h-8 px-3 border-white/30 bg-white/10 hover:bg-white/20 text-white rounded-xl">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 overflow-x-auto">
          {([
            ["emergency", <PhoneCall key="e" className="h-3.5 w-3.5" />, "Emergency",    contacts.length],
            ["ask",       <MessageSquare key="a" className="h-3.5 w-3.5" />, "Ask a Question", myQueries.length],
            ["faq",       <BookOpen key="f" className="h-3.5 w-3.5" />, "FAQ",           faqs.length],
          ] as const).map(([id, icon, label, count]) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-4 sm:px-5 py-2.5 border-b-2 text-[12px] sm:text-[12.5px] font-semibold whitespace-nowrap transition-all shrink-0",
                tab === id ? "border-white text-white" : "border-transparent text-teal-100/70 hover:text-teal-100"
              )}>
              {icon}{label}
              {(count as number) > 0 && (
                <span className={cn(
                  "inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9.5px] font-black",
                  tab === id ? "bg-white text-teal-700" : "bg-white/20 text-white"
                )}>
                  {count as number}
                </span>
              )}
              {id === "ask" && unansweredCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-400 text-[9px] font-black text-white ml-0.5">
                  {unansweredCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* ════════ EMERGENCY CONTACTS ════════ */}
          {tab === "emergency" && (
            loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-24 rounded-2xl bg-white dark:bg-[#0f1117] border border-gray-100 dark:border-white/[0.05] animate-pulse" />
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3 text-center">
                <Phone className="h-12 w-12 text-gray-200 dark:text-gray-700" />
                <p className="text-[14px] font-bold text-gray-400">Emergency contacts not set up yet</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Tap-to-call grid */}
                <div>
                  <p className="text-[10.5px] font-black uppercase tracking-widest text-gray-400 mb-3">Tap to call immediately</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {contacts.map((c, i) => {
                      const cardStyle = CAT_CARD_STYLE[c.category ?? ""] ?? "bg-gray-50 dark:bg-gray-500/10 border-gray-200 dark:border-gray-500/20 text-gray-700 dark:text-gray-300"
                      const iconNode  = ICON_MAP[c.iconName ?? "phone"] ?? <Phone className="h-5 w-5" />
                      return (
                        <a key={c.id} href={`tel:${c.number}`}
                          className={cn(
                            "group rounded-2xl border p-4 flex flex-col items-start gap-2 hover:shadow-md active:scale-95 transition-all cursor-pointer select-none animate-[fadeInUp_0.25s_ease_both]",
                            cardStyle
                          )}
                          style={{ animationDelay: `${i * 40}ms` }}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/60 dark:bg-black/20 shadow-sm">
                              {iconNode}
                            </div>
                          </div>
                          <div>
                            <p className="text-[12.5px] font-black leading-tight">{c.label}</p>
                            <p className="text-[15px] font-black font-mono mt-0.5 group-hover:underline">{c.number}</p>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-bold opacity-60">
                            <PhoneCall className="h-3 w-3" />Tap to call
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          )}

          {/* ════════ ASK A QUESTION ════════ */}
          {tab === "ask" && (
            <>
              {/* Submit question */}
              <div className="bg-white dark:bg-[#0f1117] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm overflow-hidden animate-[fadeInUp_0.25s_ease_both]">
                <div className="h-1 bg-gradient-to-r from-teal-400 to-emerald-400" />
                <div className="px-5 py-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 shrink-0">
                      <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-gray-900 dark:text-white">Ask the Admin</p>
                      <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
                        Your question will be answered privately. Admin may also add it to the public FAQ.
                      </p>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="Type your question here… e.g. What are the pool timings? How to book the community hall?"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-gray-50 dark:bg-[#1a1d27] text-[13px] text-gray-800 dark:text-gray-100 outline-none focus:border-teal-400 resize-none placeholder:text-gray-400 transition-colors" />

                  <Button
                    onClick={askQuestion}
                    disabled={sending || !question.trim()}
                    className="mt-3 h-10 px-6 text-[13px] font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white gap-2 shadow-[0_4px_14px_rgba(20,184,166,0.35)] disabled:opacity-50">
                    {sending
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</>
                      : <><Send className="h-4 w-4" />Submit Question</>}
                  </Button>
                </div>
              </div>

              {/* My previous questions */}
              {myQueries.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Your Previous Questions</p>
                  {myQueries.map((q, i) => (
                    <div key={q.id}
                      className={cn(
                        "bg-white dark:bg-[#0f1117] rounded-2xl border shadow-sm overflow-hidden animate-[fadeInUp_0.25s_ease_both]",
                        q.isAnswered
                          ? "border-emerald-200 dark:border-emerald-500/20"
                          : "border-amber-200 dark:border-amber-500/20"
                      )}
                      style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="px-5 py-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-[13.5px] font-semibold text-gray-800 dark:text-white leading-relaxed">{q.question}</p>
                          {q.isAnswered ? (
                            <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shrink-0 text-[9.5px] font-black rounded-full px-2 hover:bg-emerald-50">
                              Answered
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shrink-0 text-[9.5px] font-black rounded-full px-2 hover:bg-amber-50 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />Pending
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10.5px] text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />Asked {fmt(q.createdDate)}
                        </p>

                        {/* Admin answer */}
                        {q.isAnswered && q.answer && (
                          <div className="mt-3 rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/[0.05] px-4 py-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-[10px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Admin&apos;s Answer</span>
                            </div>
                            <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">{q.answer.answer}</p>
                            <p className="text-[10px] text-gray-400 mt-2">Answered {fmtT(q.answer.createdDate)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ════════ PUBLIC FAQ ════════ */}
          {tab === "faq" && (
            <>
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-teal-50 dark:bg-teal-500/[0.07] border border-teal-200 dark:border-teal-500/20">
                <BookOpen className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <p className="text-[12.5px] text-teal-700 dark:text-teal-400">
                  These questions were asked by residents and answered by the admin. Tap any question to expand.
                </p>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-14 rounded-2xl bg-white dark:bg-[#0f1117] border border-gray-100 dark:border-white/[0.05] animate-pulse" />
                  ))}
                </div>
              ) : faqs.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 text-center">
                  <BookOpen className="h-12 w-12 text-gray-200 dark:text-gray-700" />
                  <p className="text-[14px] font-bold text-gray-400">No FAQs yet</p>
                  <p className="text-[12.5px] text-gray-400 dark:text-gray-500">Ask a question — the admin may add it to the public FAQ!</p>
                  <Button size="sm" onClick={() => setTab("ask")}
                    className="h-8 px-4 text-[12px] font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />Ask a Question
                  </Button>
                </div>
              ) : (
                <>
                  {/* shadcn Accordion */}
                  <Accordion type="multiple" className="space-y-2">
                    {faqs.map((f, i) => (
                      <AccordionItem
                        key={f.queryId}
                        value={String(f.queryId)}
                        className={cn(
                          "bg-white dark:bg-[#0f1117] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm overflow-hidden",
                          "animate-[fadeInUp_0.25s_ease_both]",
                          "data-[state=open]:border-teal-300 dark:data-[state=open]:border-teal-500/30 transition-all"
                        )}
                        style={{ animationDelay: `${i * 40}ms` }}>
                        <AccordionTrigger className="px-5 py-4 hover:no-underline group">
                          <div className="flex items-start gap-3 text-left w-full">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 shrink-0 mt-0.5">
                              <HelpCircle className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <p className="flex-1 text-[13.5px] font-semibold text-gray-800 dark:text-white group-data-[state=open]:text-teal-700 dark:group-data-[state=open]:text-teal-400 transition-colors leading-relaxed">
                              {f.question}
                            </p>
                            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-90 mt-1" />
                          </div>
                        </AccordionTrigger>

                        <AccordionContent>
                          <div className="px-5 pb-4 pt-0">
                            <div className="ml-10 rounded-xl bg-teal-50/60 dark:bg-teal-500/[0.07] border border-teal-100 dark:border-teal-500/20 px-4 py-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                                <span className="text-[10px] font-black uppercase tracking-wide text-teal-600 dark:text-teal-400">Answer</span>
                              </div>
                              <p className="text-[13.5px] text-gray-700 dark:text-gray-200 leading-relaxed">{f.answer}</p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {/* CTA to ask more */}
                  <div
                    className="flex items-center justify-between px-5 py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white animate-[fadeInUp_0.3s_ease_both]"
                    style={{ animationDelay: `${faqs.length * 40 + 100}ms` }}>
                    <div>
                      <p className="text-[13px] font-bold">Didn&apos;t find your answer?</p>
                      <p className="text-[11.5px] text-teal-100/80 mt-0.5">Ask the admin directly</p>
                    </div>
                    <Button onClick={() => setTab("ask")} size="sm"
                      className="h-8 px-4 text-[12px] font-bold rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/30 gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />Ask Now
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}