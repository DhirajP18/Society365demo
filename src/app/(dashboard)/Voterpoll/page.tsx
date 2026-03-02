"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  RefreshCw, CheckCircle2, Vote, Users,
  CalendarClock, History, ChevronLeft, ChevronRight,
  Trophy, AlertTriangle, BellRing, Loader2, BarChart3,
  Zap, PartyPopper,
} from "lucide-react"

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface PollResultVM {
  optionId: number; optionText: string; voteCount: number; percentage: number
}
interface PollWithResultVM {
  pollId: number; title: string; descriptions: string
  startDate: string; endDate: string; targetRole: string
  isMultipleAllowed: boolean; hasVoted: boolean
  votedOptionId?: number; totalVotes: number
  results: PollResultVM[]
}
type Res<T=unknown> = { isSuccess?:boolean; resMsg?:string; result?:T }

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fmt = (d?: string|null) => {
  if (!d) return "â€”"
  const dt = new Date(d)
  return isNaN(dt.getTime())?"â€”":dt.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})
}
const daysLeft = (e?: string|null): number|null => {
  if (!e) return null
  const diff = new Date(e).getTime()-Date.now()
  return Math.max(0, Math.ceil(diff/(1000*60*60*24)))
}

const PALETTE = [
  {bar:"from-violet-500 to-violet-600", ring:"ring-violet-300 dark:ring-violet-500/40", bg:"bg-violet-50 dark:bg-violet-500/10", text:"text-violet-700 dark:text-violet-300"},
  {bar:"from-indigo-500 to-indigo-600",  ring:"ring-indigo-300 dark:ring-indigo-500/40",  bg:"bg-indigo-50 dark:bg-indigo-500/10",  text:"text-indigo-700 dark:text-indigo-300"},
  {bar:"from-sky-500 to-sky-600",        ring:"ring-sky-300 dark:ring-sky-500/40",        bg:"bg-sky-50 dark:bg-sky-500/10",        text:"text-sky-700 dark:text-sky-300"},
  {bar:"from-emerald-500 to-emerald-600",ring:"ring-emerald-300 dark:ring-emerald-500/40",bg:"bg-emerald-50 dark:bg-emerald-500/10",text:"text-emerald-700 dark:text-emerald-300"},
  {bar:"from-amber-500 to-amber-600",    ring:"ring-amber-300 dark:ring-amber-500/40",    bg:"bg-amber-50 dark:bg-amber-500/10",    text:"text-amber-700 dark:text-amber-300"},
  {bar:"from-rose-500 to-rose-600",      ring:"ring-rose-300 dark:ring-rose-500/40",      bg:"bg-rose-50 dark:bg-rose-500/10",      text:"text-rose-700 dark:text-rose-300"},
]

// â”€â”€â”€ Result Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ResultBar({opt,total,myVote,isWinner,ci,show}:{
  opt:PollResultVM; total:number; myVote?:number
  isWinner:boolean; ci:number; show:boolean
}) {
  const pct   = total > 0 ? (opt.voteCount/total)*100 : 0
  const p     = PALETTE[ci%PALETTE.length]
  const isMe  = myVote===opt.optionId
  return (
    <div className={cn(
      "rounded-xl border transition-all duration-200 overflow-hidden",
      isWinner&&"ring-1 ring-amber-400/40",
      isMe?"border-violet-300 dark:border-violet-500/40 bg-violet-50/60 dark:bg-violet-500/[0.08]":
           "border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03]"
    )}>
      <div className="px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {isWinner&&<Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0"/>}
            {isMe&&!isWinner&&<CheckCircle2 className="h-3.5 w-3.5 text-violet-500 shrink-0"/>}
            <span className={cn("text-[13px] font-semibold truncate",
              isMe?"text-violet-700 dark:text-violet-300":"text-gray-700 dark:text-gray-200")}>
              {opt.optionText}
            </span>
            {isMe&&<span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-violet-200 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 shrink-0">Your Vote</span>}
          </div>
          <div className="shrink-0 text-right">
            <span className="text-[13.5px] font-black text-gray-800 dark:text-white">{Math.round(pct)}%</span>
            <span className="text-[10.5px] text-gray-400 dark:text-gray-500 ml-1">({opt.voteCount})</span>
          </div>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-white/[0.09] rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out",p.bar)}
            style={{width:show?`${pct}%`:"0%"}}/>
        </div>
      </div>
    </div>
  )
}

// â”€â”€â”€ Vote Option Button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function VoteBtn({opt,selected,onSelect,ci}:{
  opt:PollResultVM; selected:boolean; onSelect:()=>void; ci:number
}) {
  const p = PALETTE[ci%PALETTE.length]
  return (
    <button type="button" onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all duration-150 select-none",
        "hover:shadow-md active:scale-[0.99]",
        selected
          ?cn("border-violet-500 shadow-[0_0_0_3px_rgba(139,92,246,0.15)]",p.bg)
          :"border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:border-violet-300 dark:hover:border-violet-500/40"
      )}>
      <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
        selected?"border-violet-500 bg-violet-500":"border-gray-300 dark:border-gray-600")}>
        {selected&&<div className="h-2 w-2 rounded-full bg-white"/>}
      </div>
      <span className={cn("flex-1 text-[13px] sm:text-[13.5px] font-semibold",
        selected?p.text:"text-gray-700 dark:text-gray-200")}>
        {opt.optionText}
      </span>
      <div className={cn("h-4 w-1 rounded-full bg-gradient-to-b shrink-0",p.bar)}/>
    </button>
  )
}

// â”€â”€â”€ Poll Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PollCard({poll, onVoted}:{poll:PollWithResultVM; onVoted:(updated: PollWithResultVM)=>void}) {
  const [sel,    setSel]    = useState<number|null>(null)
  const [busy,   setBusy]   = useState(false)
  const [showR,  setShowR]  = useState(poll.hasVoted)
  const [anim,   setAnim]   = useState(poll.hasVoted)
  const [live,   setLive]   = useState(poll)

  // Keep local card state in sync when parent poll data changes
  useEffect(() => {
    setLive(poll)
    setShowR(poll.hasVoted)
  }, [poll])

  // â”€â”€ FIX 3: depend on showR so bars animate every time results become visible â”€â”€
  useEffect(() => {
    if (showR) {
      setAnim(false)
      const t = setTimeout(() => setAnim(true), 80)
      return () => clearTimeout(t)
    }
  }, [showR])

  // Background sync â€” called AFTER optimistic update is already shown
  const refresh = async () => {
    try {
      const r = await api.get<Res<PollWithResultVM>>(`/TblPollVote/GetPollResult/${live.pollId}`)
      if (r.data?.result) {
        setLive(r.data.result)
        onVoted(r.data.result)
        // Re-trigger bar animation with accurate server numbers
        setAnim(false)
        setTimeout(() => setAnim(true), 80)
      }
    } catch { /* silent â€” optimistic data is already showing */ }
  }

  const submit = async () => {
    if (!sel) return toast.error("Please choose an option")
    setBusy(true)
    try {
      const r = await api.post<Res>("/TblPollVote/Submit", { pollId: live.pollId, optionId: sel, description: "" })
      if (r.data?.isSuccess) {
        toast.success(r.data.resMsg ?? "Vote submitted!")

        const newTotal = live.totalVotes + 1
        const updatedResults = live.results.map(opt => {
          const newCount = opt.optionId === sel ? opt.voteCount + 1 : opt.voteCount
          return {
            ...opt,
            voteCount: newCount,
            percentage: Math.round((newCount / newTotal) * 100),
          }
        })

        const optimisticLive: PollWithResultVM = {
          ...live,
          hasVoted: true,
          votedOptionId: sel,
          totalVotes: newTotal,
          results: updatedResults,
        }

        setLive(optimisticLive)
        setShowR(true)

        // Move this poll to parent "already voted" list immediately with your result.
        onVoted(optimisticLive)

        // Background server sync for exact counts.
        void refresh()
      } else {
        toast.error(r.data?.resMsg ?? "Failed to vote")
      }
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const days    = daysLeft(live.endDate)
  const maxV    = live.results.length>0 ? Math.max(...live.results.map(r=>r.voteCount)) : 0
  const winner  = live.results.find(r=>r.voteCount===maxV&&maxV>0)

  return (
    <div className="bg-white dark:bg-[#0d0f18] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]
        bg-gradient-to-br from-violet-50/50 to-white dark:from-violet-900/15 dark:to-[#0d0f18]">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0 border",
            showR?"bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20":
                  "bg-violet-100 dark:bg-violet-500/15 border-violet-200 dark:border-violet-500/25")}>
            {showR
              ?<BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400"/>
              :<Vote      className="h-5 w-5 text-violet-600 dark:text-violet-400"/>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] sm:text-[15px] font-bold text-gray-900 dark:text-white leading-snug">{live.title}</p>
            {live.descriptions&&<p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{live.descriptions}</p>}
          </div>
        </div>
        {/* Meta chips */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full
            bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400
            border border-violet-200 dark:border-violet-500/25">
            <Users className="h-3 w-3"/>{live.targetRole||"All"}
          </span>
          <span className="flex items-center gap-1 text-[10.5px] text-gray-400 dark:text-gray-500">
            <CalendarClock className="h-3 w-3"/>Ends {fmt(live.endDate)}
          </span>
          {days!==null&&(
            <span className={cn("text-[10.5px] font-bold px-2 py-0.5 rounded-full border",
              days===0?"bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20":
              days<=3 ?"bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20":
                       "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20")}>
              {days===0?"Last day!":days===1?"1 day left":`${days} days left`}
            </span>
          )}
          <span className="ml-auto text-[10.5px] font-semibold text-gray-400 dark:text-gray-500">
            {live.totalVotes} vote{live.totalVotes!==1?"s":""}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 sm:px-5 py-4 space-y-3">
        {showR ? (
          /* â”€â”€ Result view â”€â”€ */
          <>
            {/* Success banner â€” only shown right after voting, not on already-voted polls */}
            {live.hasVoted && live.votedOptionId != null && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl
                bg-emerald-50 dark:bg-emerald-500/[0.08] border border-emerald-200 dark:border-emerald-500/20
                animate-[fadeInUp_0.3s_ease_both]">
                <PartyPopper className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0"/>
                <p className="text-[12.5px] font-bold text-emerald-700 dark:text-emerald-400">
                  Vote recorded! Here are the live results.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-500 shrink-0"/>
              <p className="text-[12.5px] font-bold text-gray-700 dark:text-gray-300">Live Results</p>
            </div>

            <div className="space-y-2">
              {live.results.map((r,i)=>(
                <ResultBar key={r.optionId} opt={r} total={live.totalVotes}
                  myVote={live.votedOptionId ?? sel ?? undefined}
                  isWinner={r.optionId===winner?.optionId} ci={i} show={anim}/>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-50 dark:border-white/[0.04]">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                <Vote className="h-3.5 w-3.5"/>{live.totalVotes} total vote{live.totalVotes!==1?"s":""}
              </span>
              {winner&&winner.voteCount>0&&(
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <Trophy className="h-3.5 w-3.5"/>Leading: {winner.optionText}
                </span>
              )}
            </div>
          </>
        ) : (
          /* â”€â”€ Vote view â”€â”€ */
          <>
            <p className="text-[11.5px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-violet-500"/>Choose your answer:
            </p>
            <div className="space-y-2">
              {live.results.map((opt,i)=>(
                <VoteBtn key={opt.optionId} opt={opt} ci={i}
                  selected={sel===opt.optionId}
                  onSelect={()=>setSel(opt.optionId)}/>
              ))}
            </div>
            <Button onClick={submit} disabled={!sel||busy}
              className={cn(
                "w-full h-11 text-[13px] font-bold rounded-xl gap-2 mt-1",
                "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500",
                "text-white shadow-[0_4px_14px_rgba(139,92,246,0.4)]",
                "disabled:opacity-40 disabled:shadow-none transition-all"
              )}>
              {busy
                ?<><Loader2 className="h-4 w-4 animate-spin"/>Submittingâ€¦</>
                :<><Vote className="h-4 w-4"/>Submit Vote</>}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type Tab = "pending"|"voted"
const PER = 4

export default function VoterPollPage() {
  const [polls,   setPolls]   = useState<PollWithResultVM[]>([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<Tab>("pending")
  const [page,    setPage]    = useState(1)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get<Res<PollWithResultVM[]>>("/TblPollVote/GetAllForVoter")
      setPolls(r.data?.result ?? [])
    } catch(e) { toast.error(getApiMessage(e)) }
    finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const onVoted = (updated: PollWithResultVM) => {
    setPolls(ps => ps.map(p => p.pollId===updated.pollId ? updated : p))
    setTab("voted")
    setPage(1)
  }

  const pending  = polls.filter(p => !p.hasVoted)
  const voted    = polls.filter(p => p.hasVoted)
  const current  = tab==="pending" ? pending : voted
  const pages    = Math.max(1, Math.ceil(current.length/PER))
  const paged    = current.slice((page-1)*PER, page*PER)

  const TABS: {id:Tab;label:string;s:string;Icon:React.FC<{className?:string}>;count:number}[] = [
    {id:"pending",label:"Pending Votes",s:"Pending",Icon:Vote,   count:pending.length},
    {id:"voted",  label:"Already Voted",s:"Voted",  Icon:History,count:voted.length},
  ]

  return (
    <div className="flex flex-col h-full bg-[#f5f6fa] dark:bg-[#0a0c11]">

      {/* â•â•â• HEADER â•â•â• */}
      <div className="bg-white dark:bg-[#0d0f18] border-b border-gray-200 dark:border-white/[0.06] px-3 sm:px-5 pt-3 pb-0 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 shrink-0">
              <Vote className="h-4 w-4 text-violet-600 dark:text-violet-400"/>
            </div>
            <div className="min-w-0">
              <h1 className="text-[14px] sm:text-[16px] font-bold text-gray-900 dark:text-white leading-tight">Community Polls</h1>
              <p className="hidden sm:block text-[11px] text-gray-400 dark:text-gray-500">Vote on active polls and see live results instantly</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="h-7 px-2 text-[11px] gap-1 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 dark:text-gray-400 rounded-lg shrink-0">
            <RefreshCw className={cn("h-3 w-3",loading&&"animate-spin")}/><span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Summary strip */}
        {!loading&&polls.length>0&&(
          <div className="flex items-center gap-2 flex-wrap mb-2.5">
            <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full
              bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400
              border border-violet-200 dark:border-violet-500/20">
              <BarChart3 className="h-3 w-3"/>{polls.length} Active Poll{polls.length!==1?"s":""}
            </span>
            {pending.length>0?(
              <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full animate-pulse
                bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400
                border border-amber-200 dark:border-amber-500/20">
                <BellRing className="h-3 w-3"/>{pending.length} Awaiting Your Vote
              </span>
            ):(
              <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full
                bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400
                border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3"/>All Voted! ðŸŽ‰
              </span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-end gap-0 -mb-px">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>{setTab(t.id);setPage(1)}}
              className={cn("flex items-center gap-1.5 px-3 sm:px-5 py-2 border-b-2 text-[11.5px] sm:text-[12.5px] font-semibold whitespace-nowrap shrink-0 transition-all",
                tab===t.id?"border-violet-500 text-violet-600 dark:text-violet-400":"border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300")}>
              <t.Icon className="h-3.5 w-3.5 shrink-0"/>
              <span className="hidden sm:inline">{t.label}</span><span className="sm:hidden">{t.s}</span>
              <span className={cn("inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9.5px] font-black",
                tab===t.id?"bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300":"bg-gray-100 dark:bg-white/[0.06] text-gray-500")}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* â•â•â• CONTENT â•â•â• */}
      <div className="flex-1 overflow-auto">
        {loading?(
          <div className="p-3 sm:p-5 space-y-4 max-w-2xl mx-auto">
            {[1,2,3].map(i=>(
              <div key={i} className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0d0f18] overflow-hidden animate-pulse">
                <div className="h-24 bg-gray-50 dark:bg-white/[0.03]"/>
                <div className="p-4 space-y-2">
                  {[1,2,3].map(j=><div key={j} className="h-12 rounded-xl bg-gray-100 dark:bg-white/[0.05]"/>)}
                </div>
              </div>
            ))}
          </div>
        ):paged.length===0?(
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
            <div className={cn("h-16 w-16 rounded-2xl border-2 border-dashed flex items-center justify-center",
              tab==="pending"?"border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/5":
                              "border-gray-200 dark:border-white/[0.09]")}>
              {tab==="pending"
                ?<CheckCircle2 className="h-7 w-7 text-emerald-500"/>
                :<History      className="h-7 w-7 text-gray-300 dark:text-gray-600"/>}
            </div>
            <div>
              <p className="text-[14px] font-bold text-gray-600 dark:text-gray-300">
                {tab==="pending"?"All caught up! ðŸŽ‰":"No votes yet"}
              </p>
              <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-1">
                {tab==="pending"
                  ?"You've voted on all current polls. Check the Voted tab for your results."
                  :"Vote on a poll to see your voting history here."}
              </p>
            </div>
            {tab==="pending"&&voted.length>0&&(
              <Button size="sm" onClick={()=>setTab("voted")}
                className="h-8 px-4 text-[12.5px] gap-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg">
                <History className="h-3.5 w-3.5"/>View My Votes
              </Button>
            )}
          </div>
        ):(
          <div className="p-3 sm:p-5 space-y-4 max-w-2xl mx-auto">
            {/* Tab banner */}
            <div className="flex items-center gap-2">
              {tab==="pending"
                ?<><AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0"/>
                   <p className="text-[11.5px] font-bold text-amber-600 dark:text-amber-400">
                     {pending.length} poll{pending.length!==1?"s":""} waiting for your vote
                   </p></>
                :<><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0"/>
                   <p className="text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400">
                     You&apos;ve voted on {voted.length} poll{voted.length!==1?"s":""}
                   </p></>
              }
            </div>

            {paged.map((poll, idx)=>(
              <div key={poll.pollId}
                className="animate-[fadeInUp_0.35s_ease_both]"
                style={{animationDelay:`${idx*70}ms`}}>
                <PollCard poll={poll} onVoted={onVoted}/>
              </div>
            ))}

            {/* Pagination */}
            {pages>1&&(
              <div className="flex items-center justify-between gap-2 pb-4">
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Page <b className="text-gray-700 dark:text-gray-300">{page}</b> / <b className="text-gray-700 dark:text-gray-300">{pages}</b>
                </p>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                    className="h-7 w-7 p-0 rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 disabled:opacity-40">
                    <ChevronLeft className="h-3.5 w-3.5"/>
                  </Button>
                  {Array.from({length:pages},(_,i)=>i+1).map(p=>(
                    <button key={p} onClick={()=>setPage(p)}
                      className={cn("h-7 w-7 rounded-lg text-[11.5px] font-bold border transition-all",
                        page===p?"bg-violet-600 border-violet-600 text-white shadow-sm":
                        "bg-white dark:bg-transparent border-gray-200 dark:border-white/[0.08] text-gray-500 hover:border-violet-300 hover:text-violet-600")}>
                      {p}
                    </button>
                  ))}
                  <Button size="sm" variant="outline" onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages}
                    className="h-7 w-7 p-0 rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 disabled:opacity-40">
                    <ChevronRight className="h-3.5 w-3.5"/>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
