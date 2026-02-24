"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, MessageCircle, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = {
  role: "user" | "bot"
  text: string
}

const QUICK_QA = [
  {
    question: "How to pay maintenance?",
    answer: "Go to Account and click on Pay Maintenance. Select month and complete payment.",
  },
  {
    question: "How to raise a complaint?",
    answer: "Open Service Provider, add complaint details, and submit. You can track status there.",
  },
  {
    question: "How to vote in polls?",
    answer: "Go to Voter Poll, choose one option, and click Submit Vote to save your response.",
  },
  {
    question: "How to check notices?",
    answer: "Open Notice from the sidebar to view all latest society notices and announcements.",
  },
]

export default function ChatbotWidget() {
  const THINKING_DELAY_MS = 3400
  const THINKING_STEPS = ["Understanding question", "Planning response", "Drafting answer"]

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hi, I am Society AI Assistant. Ask a quick question below." },
  ])
  const [isThinking, setIsThinking] = useState(false)
  const [typingText, setTypingText] = useState("")
  const [thinkingStep, setThinkingStep] = useState(0)

  const thinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const thinkingStepRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const typeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const box = scrollRef.current
    if (!box) return
    box.scrollTop = box.scrollHeight
  }, [messages, isThinking, typingText, isOpen])

  useEffect(() => {
    return () => {
      if (thinkTimerRef.current) clearTimeout(thinkTimerRef.current)
      if (thinkingStepRef.current) clearInterval(thinkingStepRef.current)
      if (typeTimerRef.current) clearInterval(typeTimerRef.current)
    }
  }, [])

  const askQuestion = (question: string, answer: string) => {
    const currentRequestId = ++requestIdRef.current

    if (thinkTimerRef.current) clearTimeout(thinkTimerRef.current)
    if (thinkingStepRef.current) clearInterval(thinkingStepRef.current)
    if (typeTimerRef.current) clearInterval(typeTimerRef.current)

    setMessages((prev) => [...prev, { role: "user", text: question }])
    setIsThinking(true)
    setTypingText("")
    setThinkingStep(0)

    thinkingStepRef.current = setInterval(() => {
      setThinkingStep((prev) => (prev + 1) % THINKING_STEPS.length)
    }, 1000)

    thinkTimerRef.current = setTimeout(() => {
      if (requestIdRef.current !== currentRequestId) return

      setIsThinking(false)
      if (thinkingStepRef.current) clearInterval(thinkingStepRef.current)
      let i = 0

      typeTimerRef.current = setInterval(() => {
        if (requestIdRef.current !== currentRequestId) {
          if (typeTimerRef.current) clearInterval(typeTimerRef.current)
          return
        }

        i += 1
        const next = answer.slice(0, i)
        setTypingText(next)

        if (i >= answer.length) {
          if (typeTimerRef.current) clearInterval(typeTimerRef.current)
          setMessages((prev) => [...prev, { role: "bot", text: answer }])
          setTypingText("")
        }
      }, 16)
    }, THINKING_DELAY_MS)
  }

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[min(92vw,380px)] rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#161923] shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.06] px-4 py-3 bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-500/10 dark:to-sky-500/10">
            <div className="flex items-center gap-2">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                <Bot className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 rounded-full bg-cyan-500 p-0.5">
                  <Sparkles className="h-2.5 w-2.5" />
                </span>
              </div>
              <div>
                <span className="block text-[13px] font-semibold text-gray-900 dark:text-white">
                  Society AI Assistant
                </span>
                <span className="block text-[10.5px] text-gray-500 dark:text-gray-400">
                  Smart support chat
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="max-h-[48vh] space-y-2 overflow-y-auto px-3 py-3">
            {messages.map((m, idx) => (
              <div key={`${m.role}-${idx}`} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("flex items-start gap-2 max-w-[88%]", m.role === "user" && "flex-row-reverse")}>
                  {m.role === "bot" && (
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed",
                      m.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-gray-200"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl bg-gray-100 px-3 py-2.5 text-[12px] text-gray-600 dark:bg-white/[0.06] dark:text-gray-300 min-w-[190px]">
                    <div className="font-medium">{THINKING_STEPS[thinkingStep]}...</div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:240ms]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {typingText && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2 max-w-[88%]">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl bg-gray-100 px-3 py-2 text-[12.5px] text-gray-700 dark:bg-white/[0.06] dark:text-gray-200">
                    {typingText}
                    <span className="ml-0.5 inline-block h-3 w-[1.5px] animate-pulse bg-indigo-500 align-middle" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-white/[0.06] px-3 py-3">
            <p className="mb-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">Quick Questions</p>
            <div className="grid grid-cols-1 gap-1.5">
              {QUICK_QA.map((qa) => (
                <button
                  key={qa.question}
                  onClick={() => askQuestion(qa.question, qa.answer)}
                  disabled={isThinking || Boolean(typingText)}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-left text-[12px] text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 dark:hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {qa.question}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((p) => !p)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-lg transition-all hover:from-indigo-500 hover:to-cyan-400"
        title="Open AI Chatbot"
      >
        <div className="relative">
          <MessageCircle className="h-5 w-5" />
          <Sparkles className="absolute -right-1.5 -top-1.5 h-3 w-3" />
        </div>
      </button>
    </>
  )
}
