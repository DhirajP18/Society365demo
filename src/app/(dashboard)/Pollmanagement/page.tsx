"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  BarChart3, RefreshCw, Plus, Pencil, Trash2, Search, Calendar,
  ChevronLeft, ChevronRight, X, CheckCircle2, Users, Clock,
  History, CalendarClock, Eye, ListChecks, PlusCircle,
  AlertTriangle, Trophy, BellRing, Layers,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────
interface TblPollVM {
  id: number; title: string; descriptions: string
  startDate: string; endDate: string; targetRole: string
  isMultipleAllowed: boolean; status: string; isActive: boolean
}
interface TblPollOptionVM { id: number; pollId: number; optionsText: string; isActive: boolean }
interface PollResultVM    { optionId: number; optionText: string; voteCount: number; percentage: number }
interface PollWithResultVM { pollId: number; totalVotes: number; results: PollResultVM[] }
type Res<T=unknown> = { isSuccess?: boolean; resMsg?: string; result?: T }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const EMPTY: TblPollVM = {
  id:0, title:"", descriptions:"", startDate:"", endDate:"",
  targetRole:"All", isMultipleAllowed:false, status:"Active", isActive:true,
}
const ROLES      = ["All","Residents","Staff","Committee","Security"]
const PAGE_SIZE  = 6
const COLORS     = ["bg-violet-500","bg-indigo-500","bg-sky-500","bg-emerald-500","bg-amber-500","bg-rose-500"]

const fmt = (d?: string|null) => {
  if (!d) return "—"
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})
}
const toInput = (d?: string|null) => {
  if (!d) return ""
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? "" : dt.toISOString().split("T")[0]
}
const getStatus = (p: TblPollVM): "active"|"upcoming"|"expired" => {
  const now = new Date(); now.setHours(0,0,0,0)
  const s = p.startDate ? new Date(p.startDate) : null
  const e = p.endDate   ? new Date(p.endDate)   : null
  if (e) e.setHours(23,59,59,999)
  if (!p.isActive || (e && e < now)) return "expired"
  if (s && s > now)                  return "upcoming"
  return "active"
}

// ─── Reusable: Floating label ─────────────────────────────────────────────────
function FL({ id, label, type="text", value, onChange, as, disabled=false }: {
  id?:string; label:string; type?:string; value:string; onChange:(v:string)=>void
  as?:"textarea"; disabled?:boolean
}) {
  const [f,setF] = useState(false)
  const active   = f || value.length > 0
  const base     = cn(
    "w-full rounded-xl border text-[13px] text-gray-900 dark:text-gray-100 outline-none transition-all disabled:opacity-40",
    "bg-white dark:bg-[#1a1d27]",
    f ? "border-violet-400 shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
      : "border-gray-200 dark:border-white/[0.09] hover:border-gray-300 dark:hover:border-white/[0.14]"
  )
  return (
    <div className="relative">
      {as==="textarea"
        ? <textarea id={id} rows={3} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}
            onFocus={()=>setF(true)} onBlur={()=>setF(false)}
            className={cn(base,"px-3 pt-5 pb-2 resize-none")}/>
        : <input id={id} type={type} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}
            onFocus={()=>setF(true)} onBlur={()=>setF(false)}
            className={cn(base,"h-11 px-3 pt-4 pb-1")}/>
      }
      <label htmlFor={id} className={cn(
        "pointer-events-none absolute left-3 font-medium transition-all duration-150 select-none",
        active ? "top-[5px] text-[10px] text-violet-500 dark:text-violet-400 tracking-wide"
               : as==="textarea" ? "top-[14px] text-[12.5px] text-gray-400 dark:text-gray-500"
                                 : "top-1/2 -translate-y-1/2 text-[12.5px] text-gray-400 dark:text-gray-500"
      )}>{label}</label>
    </div>
  )
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function SBadge({s}: {s:"active"|"upcoming"|"expired"}) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border",
      s==="active"  ?"bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20":
      s==="upcoming"?"bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20":
                     "bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/[0.08]")}>
      {s==="active"   && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"/>}
      {s==="upcoming" && <CalendarClock className="h-3 w-3"/>}
      {s==="expired"  && <History className="h-3 w-3"/>}
      {s==="active"?"Active":s==="upcoming"?"Upcoming":"Expired"}
    </span>
  )
}

// ─── Mini result bar ──────────────────────────────────────────────────────────
function MBar({opt,maxV,ci}:{opt:PollResultVM;maxV:number;ci:number}) {
  const pct = maxV > 0 ? (opt.voteCount/maxV)*100 : 0
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-semibold text-gray-600 dark:text-gray-300 truncate max-w-[65%]">{opt.optionText}</span>
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{opt.voteCount} · {opt.percentage}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", COLORS[ci%COLORS.length])}
          style={{width:`${pct}%`}}/>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Tab="all"|"active"|"upcoming"|"history"|"form"

export default function PollManagementPage() {
  const [polls,    setPolls]    = useState<TblPollVM[]>([])
  const [options,  setOptions]  = useState<TblPollOptionVM[]>([])
  const [rmap,     setRmap]     = useState<Map<number,PollWithResultVM>>(new Map())
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [tab,      setTab]      = useState<Tab>("all")
  const [form,     setForm]     = useState<TblPollVM>(EMPTY)
  const [isEdit,   setIsEdit]   = useState(false)
  const [epId,     setEpId]     = useState<number|null>(null)   // editing poll id (for options)
  const [delId,    setDelId]    = useState<number|null>(null)
  const [search,   setSearch]   = useState("")
  const [page,     setPage]     = useState(1)
  const [viewing,  setViewing]  = useState<TblPollVM|null>(null)
  const [newOpt,   setNewOpt]   = useState("")
  const [eOptId,   setEOptId]   = useState<number|null>(null)
  const [eOptTxt,  setEOptTxt]  = useState("")
  const [dOptId,   setDOptId]   = useState<number|null>(null)

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadPolls = useCallback(async () => {
    const r = await api.get<Res<TblPollVM[]>>("/TblPoll/GetAll")
    setPolls(r.data?.result ?? [])
  }, [])

  const loadOptions = useCallback(async () => {
    const r = await api.get<Res<TblPollOptionVM[]>>("/TblPollOptions/GetAll")
    setOptions(r.data?.result ?? [])
  }, [])

  const loadResult = useCallback(async (pollId: number) => {
    try {
      const r = await api.get<Res<PollWithResultVM>>(`/TblPollVote/GetPollResult/${pollId}`)
      if (r.data?.result) setRmap(m => new Map(m).set(pollId, r.data.result!))
    } catch { /* silent */ }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try { await Promise.all([loadPolls(), loadOptions()]) }
    catch(e) { toast.error(getApiMessage(e)) }
    finally  { setLoading(false) }
  }, [loadPolls, loadOptions])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => { polls.forEach(p => loadResult(p.id)) }, [polls, loadResult])

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...polls]
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(p => `${p.title} ${p.descriptions}`.toLowerCase().includes(q))
    if (tab==="active")   list = list.filter(p => getStatus(p)==="active")
    if (tab==="upcoming") list = list.filter(p => getStatus(p)==="upcoming")
    if (tab==="history")  list = list.filter(p => getStatus(p)==="expired")
    return list
  }, [polls, search, tab])

  const pages = Math.max(1, Math.ceil(filtered.length/PAGE_SIZE))
  const paged  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const counts = useMemo(() => ({
    all:      polls.length,
    active:   polls.filter(p=>getStatus(p)==="active").length,
    upcoming: polls.filter(p=>getStatus(p)==="upcoming").length,
    history:  polls.filter(p=>getStatus(p)==="expired").length,
  }), [polls])
  const curOpts = epId ? options.filter(o=>o.pollId===epId) : []

  // ── Poll CRUD ──────────────────────────────────────────────────────────────
  const openAdd  = () => { setForm(EMPTY); setIsEdit(false); setEpId(null); setNewOpt(""); setTab("form") }
  const openEdit = (p: TblPollVM) => {
    setForm({...p, startDate:toInput(p.startDate), endDate:toInput(p.endDate)})
    setIsEdit(true); setEpId(p.id); setNewOpt(""); setTab("form")
  }
  const cancelForm = () => { setForm(EMPTY); setIsEdit(false); setEpId(null); setTab("all") }

  const savePoll = async () => {
    if (!form.title.trim())              return toast.error("Title is required")
    if (!form.startDate||!form.endDate)  return toast.error("Start and end date required")
    if (form.endDate < form.startDate)   return toast.error("End date must be after start date")
    setSaving(true)
    try {
      if (isEdit) {
        const r = await api.put<Res>("/TblPoll/Update", form)
        if (r.data?.isSuccess) { toast.success("Poll updated!"); await loadPolls() }
        else toast.error(r.data?.resMsg ?? "Update failed")
      } else {
        const r = await api.post<Res<number>>("/TblPoll/Insert", form)
        if (r.data?.isSuccess) {
          toast.success("Poll created! Add options below.")
          setIsEdit(true); setEpId(r.data.result ?? null)
          setForm(f => ({...f, id: r.data.result ?? 0}))
          await loadPolls()
        } else toast.error(r.data?.resMsg ?? "Insert failed")
      }
    } catch(e) { toast.error(getApiMessage(e)) }
    finally { setSaving(false) }
  }

  const deletePoll = async () => {
    if (!delId) return
    try {
      const r = await api.delete<Res>(`/TblPoll/Delete/${delId}`)
      if (r.data?.isSuccess) { toast.success("Poll deleted"); await loadPolls() }
      else toast.error(r.data?.resMsg ?? "Failed")
    } catch(e) { toast.error(getApiMessage(e)) }
    finally { setDelId(null) }
  }

  // ── Option CRUD ────────────────────────────────────────────────────────────
  const addOpt = async () => {
    if (!newOpt.trim() || !epId) return
    const r = await api.post<Res>("/TblPollOptions/Insert",
      { id:0, pollId:epId, optionsText:newOpt.trim(), isActive:true })
    if (r.data?.isSuccess) { setNewOpt(""); await loadOptions() }
    else toast.error(r.data?.resMsg ?? "Option already exists")
  }

  const saveOpt = async (id: number) => {
    if (!eOptTxt.trim()) return
    const opt = options.find(o=>o.id===id)
    if (!opt) return
    const r = await api.put<Res>("/TblPollOptions/Update",
      {...opt, optionsText:eOptTxt.trim()})
    if (r.data?.isSuccess) { setEOptId(null); setEOptTxt(""); await loadOptions() }
    else toast.error(r.data?.resMsg ?? "Update failed")
  }

  const delOpt = async () => {
    if (!dOptId) return
    const r = await api.delete<Res>(`/TblPollOptions/Delete/${dOptId}`)
    if (r.data?.isSuccess) await loadOptions()
    else toast.error(r.data?.resMsg ?? "Failed")
    setDOptId(null)
  }

  // ── Tab config ─────────────────────────────────────────────────────────────
  const TABS: {id:Tab;label:string;s:string;Icon:React.FC<{className?:string}>;count?:number}[] = [
    {id:"all",      label:"All Polls",           s:"All",   Icon:BarChart3,    count:counts.all},
    {id:"active",   label:"Active",              s:"Active",Icon:BellRing,     count:counts.active},
    {id:"upcoming", label:"Upcoming",            s:"Soon",  Icon:CalendarClock,count:counts.upcoming},
    {id:"history",  label:"History",             s:"Past",  Icon:History,      count:counts.history},
    {id:"form",     label:isEdit?"Edit Poll":"New Poll",s:isEdit?"Edit":"Add",Icon:isEdit?Pencil:Plus},
  ]

  return (
    <div className="flex flex-col h-full bg-[#f5f6fa] dark:bg-[#0a0c11]">

      {/* ═══ HEADER ═══ */}
      <div className="bg-white dark:bg-[#0d0f18] border-b border-gray-200 dark:border-white/[0.06] px-3 sm:px-5 pt-3 pb-0 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 shrink-0">
              <BarChart3 className="h-4 w-4 text-violet-600 dark:text-violet-400"/>
            </div>
            <div className="min-w-0">
              <h1 className="text-[14px] sm:text-[16px] font-bold text-gray-900 dark:text-white leading-tight">Poll Management</h1>
              <p className="hidden sm:block text-[11px] text-gray-400 dark:text-gray-500">Create polls · manage options · track live results</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}
              className="h-7 px-2 text-[11px] gap-1 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 dark:text-gray-400 rounded-lg">
              <RefreshCw className={cn("h-3 w-3",loading&&"animate-spin")}/><span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={openAdd}
              className="h-7 px-2.5 sm:px-3.5 text-[11.5px] font-bold gap-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg shadow-[0_2px_8px_rgba(139,92,246,0.35)]">
              <Plus className="h-3.5 w-3.5"/><span className="hidden sm:inline">New Poll</span>
            </Button>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex items-end overflow-x-auto scrollbar-none -mb-px">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>{setTab(t.id);setPage(1)}}
              className={cn("flex items-center gap-1.5 px-2.5 sm:px-4 py-2 border-b-2 whitespace-nowrap shrink-0 transition-all text-[11.5px] sm:text-[12.5px] font-semibold",
                tab===t.id?"border-violet-500 text-violet-600 dark:text-violet-400":"border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>
              <t.Icon className="h-3.5 w-3.5 shrink-0"/>
              <span className="hidden sm:inline">{t.label}</span><span className="sm:hidden">{t.s}</span>
              {t.count!==undefined&&(
                <span className={cn("inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9.5px] font-black",
                  tab===t.id?"bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300":"bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-500")}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">

        {/* ═══ FORM ═══ */}
        {tab==="form"&&(
          <div className="flex-1 overflow-auto p-3 sm:p-5">
            <div className="max-w-2xl mx-auto space-y-4">

              {/* Step 1: poll details */}
              <div className="bg-white dark:bg-[#0d0f18] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-gray-100 dark:border-white/[0.05]
                  bg-gradient-to-r from-violet-50 to-transparent dark:from-violet-900/20 dark:to-transparent">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/20 border border-violet-200 dark:border-violet-500/25 shrink-0">
                    <span className="text-[13px] font-black text-violet-600 dark:text-violet-400">1</span>
                  </div>
                  <div>
                    <p className="text-[13.5px] font-bold text-gray-900 dark:text-white">
                      {isEdit?"Edit Poll Details":"Create New Poll"}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">Fill in the poll information</p>
                  </div>
                </div>
                <div className="p-4 sm:p-5 space-y-4">
                  <FL id="ptitle" label="Poll Question / Title *" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))}/>
                  <FL id="pdesc"  label="Description (optional)"  value={form.descriptions} as="textarea" onChange={v=>setForm(f=>({...f,descriptions:v}))}/>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Visible To */}
                    <div className="space-y-1.5">
                      <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Visible To</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ROLES.map(r=>(
                          <button key={r} type="button" onClick={()=>setForm(f=>({...f,targetRole:r}))}
                            className={cn("flex items-center gap-1 h-7 px-2.5 rounded-lg border text-[11.5px] font-semibold transition-all",
                              form.targetRole===r?"bg-violet-600 border-violet-600 text-white shadow-sm":
                              "bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:border-violet-300 hover:text-violet-600")}>
                            <Users className="h-3 w-3 shrink-0"/>{r}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Multiple choice toggle */}
                    <div className="flex items-end pb-1">
                      <div className="flex items-center justify-between w-full rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <ListChecks className="h-4 w-4 text-violet-500"/>
                          <div>
                            <p className="text-[12.5px] font-semibold text-gray-700 dark:text-gray-300">Multiple Choice</p>
                            <p className="text-[10.5px] text-gray-400 dark:text-gray-500">Allow selecting many options</p>
                          </div>
                        </div>
                        <Switch checked={form.isMultipleAllowed} onCheckedChange={v=>setForm(f=>({...f,isMultipleAllowed:v}))}/>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FL id="pstart" label="Start Date *" type="date" value={form.startDate} onChange={v=>setForm(f=>({...f,startDate:v}))}/>
                    <FL id="pend"   label="End Date *"   type="date" value={form.endDate}   onChange={v=>setForm(f=>({...f,endDate:v}))}/>
                  </div>
                  {form.startDate&&form.endDate&&(
                    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-semibold",
                      form.endDate<form.startDate
                        ?"bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400"
                        :"bg-violet-50 dark:bg-violet-500/[0.06] border-violet-100 dark:border-violet-500/20 text-violet-700 dark:text-violet-300")}>
                      <Calendar className="h-4 w-4 shrink-0"/>
                      {fmt(form.startDate)} → {fmt(form.endDate)}
                      {form.endDate<form.startDate&&<span className="ml-auto text-[11px]">⚠ End before start</span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 px-4 sm:px-5 py-4 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.01]">
                  <Button variant="outline" onClick={cancelForm}
                    className="h-9 px-4 text-[12.5px] rounded-xl border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-600 dark:text-gray-300">
                    Cancel
                  </Button>
                  <Button onClick={savePoll} disabled={saving}
                    className="h-9 px-5 text-[12.5px] font-bold rounded-xl bg-violet-600 hover:bg-violet-500 text-white gap-1.5 disabled:opacity-50">
                    {saving?<><RefreshCw className="h-3.5 w-3.5 animate-spin"/>Saving…</>
                           :isEdit?<><CheckCircle2 className="h-3.5 w-3.5"/>Save Changes</>
                                  :<><Plus className="h-3.5 w-3.5"/>Create Poll</>}
                  </Button>
                </div>
              </div>

              {/* Step 2: options (shown after poll created/editing) */}
              {epId&&(
                <div className="bg-white dark:bg-[#0d0f18] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm overflow-hidden animate-[fadeInUp_0.35s_ease_both]">
                  <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.05]
                    bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-900/20 dark:to-transparent">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/25 shrink-0">
                      <span className="text-[13px] font-black text-indigo-600 dark:text-indigo-400">2</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-900 dark:text-white">Poll Options</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">Minimum 2 options required for voting</p>
                    </div>
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 shrink-0">
                      {curOpts.length} option{curOpts.length!==1?"s":""}
                    </span>
                  </div>
                  <div className="p-4 sm:p-5 space-y-3">
                    {curOpts.length===0?(
                      <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                        <Layers className="h-8 w-8 text-gray-300 dark:text-gray-600"/>
                        <p className="text-[12.5px] text-gray-400 dark:text-gray-500">No options yet. Add at least 2 below.</p>
                      </div>
                    ):(
                      <div className="space-y-2">
                        {curOpts.map((opt,i)=>(
                          <div key={opt.id} className="flex items-center gap-2 rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] px-3 py-2.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full shrink-0 text-[10px] font-black
                              bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                              {i+1}
                            </span>
                            {eOptId===opt.id?(
                              <input autoFocus value={eOptTxt} onChange={e=>setEOptTxt(e.target.value)}
                                onKeyDown={e=>{if(e.key==="Enter")saveOpt(opt.id);if(e.key==="Escape"){setEOptId(null);setEOptTxt("")}}}
                                className="flex-1 h-7 px-2 rounded-lg border border-indigo-400 outline-none bg-white dark:bg-[#1a1d27] text-[12.5px] text-gray-800 dark:text-white shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"/>
                            ):(
                              <span className="flex-1 text-[12.5px] font-medium text-gray-800 dark:text-gray-200">{opt.optionsText}</span>
                            )}
                            <div className="flex items-center gap-1 shrink-0">
                              {eOptId===opt.id?(
                                <>
                                  <button onClick={()=>saveOpt(opt.id)} className="h-6 w-6 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"><CheckCircle2 className="h-3.5 w-3.5"/></button>
                                  <button onClick={()=>{setEOptId(null);setEOptTxt("")}} className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"><X className="h-3.5 w-3.5"/></button>
                                </>
                              ):(
                                <>
                                  <button onClick={()=>{setEOptId(opt.id);setEOptTxt(opt.optionsText)}}
                                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-all">
                                    <Pencil className="h-3 w-3"/>
                                  </button>
                                  <button onClick={()=>setDOptId(opt.id)}
                                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-rose-600 hover:border-rose-300 transition-all">
                                    <Trash2 className="h-3 w-3"/>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Add option input */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <PlusCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"/>
                        <input value={newOpt} onChange={e=>setNewOpt(e.target.value)}
                          onKeyDown={e=>{if(e.key==="Enter")addOpt()}}
                          placeholder="Type an option and press Enter…"
                          className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] text-[12.5px] text-gray-700 dark:text-gray-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 placeholder:text-gray-400 dark:placeholder:text-gray-600"/>
                      </div>
                      <Button onClick={addOpt} disabled={!newOpt.trim()}
                        className="h-10 px-3 sm:px-4 text-[12px] font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 disabled:opacity-40">
                        <Plus className="h-3.5 w-3.5"/><span className="hidden sm:inline">Add</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ LIST TABS ═══ */}
        {tab!=="form"&&(
          <>
            {/* Controls bar */}
            <div className="bg-white dark:bg-[#0d0f18] border-b border-gray-100 dark:border-white/[0.05] px-3 sm:px-5 py-2 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{paged.length}</span> of{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{filtered.length}</span> polls
                </p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none"/>
                  <input placeholder="Search polls…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
                    className="h-8 pl-8 pr-7 w-44 sm:w-52 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] text-[12px] text-gray-700 dark:text-gray-200 outline-none focus:border-violet-300 dark:focus:border-violet-500/40 placeholder:text-gray-400 dark:placeholder:text-gray-600"/>
                  {search&&<button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-3 w-3"/></button>}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {loading?(
                <div className="p-3 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[1,2,3,4,5,6].map(i=><div key={i} className="h-52 rounded-xl bg-white dark:bg-[#0d0f18] border border-gray-100 dark:border-white/[0.05] animate-pulse"/>)}
                </div>
              ):paged.length===0?(
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
                  <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/[0.09] flex items-center justify-center">
                    <BarChart3 className="h-7 w-7 text-gray-300 dark:text-gray-600"/>
                  </div>
                  <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">
                    {search?`No polls match "${search}"`:"No polls yet"}
                  </p>
                  {!search&&tab==="all"&&(
                    <Button size="sm" onClick={openAdd} className="h-8 px-4 text-[12.5px] gap-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg">
                      <Plus className="h-3.5 w-3.5"/>Create First Poll
                    </Button>
                  )}
                </div>
              ):(
                <div className="p-3 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {paged.map((p,idx)=>{
                    const st  = getStatus(p)
                    const res = rmap.get(p.id)
                    const opts = options.filter(o=>o.pollId===p.id)
                    const maxV = res?Math.max(...res.results.map(r=>r.voteCount),1):1
                    const top  = res?.results.reduce<PollResultVM|null>((a,b)=>(!a||b.voteCount>a.voteCount)?b:a,null)
                    return (
                      <div key={p.id}
                        className="flex flex-col bg-white dark:bg-[#0d0f18] rounded-xl border border-gray-200 dark:border-white/[0.07] shadow-sm hover:shadow-md hover:border-violet-200 dark:hover:border-violet-500/30 transition-all overflow-hidden animate-[fadeInUp_0.3s_ease_both]"
                        style={{animationDelay:`${idx*40}ms`}}>
                        {/* Header */}
                        <div className={cn("px-4 py-3 border-b border-gray-100 dark:border-white/[0.05]",
                          st==="active"  ?"bg-gradient-to-r from-emerald-50/70 to-white dark:from-emerald-900/10 dark:to-transparent":
                          st==="upcoming"?"bg-gradient-to-r from-sky-50/70 to-white dark:from-sky-900/10 dark:to-transparent":
                                         "bg-gradient-to-r from-gray-50/70 to-white dark:from-gray-900/20 dark:to-transparent")}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-bold text-gray-800 dark:text-white leading-snug line-clamp-2 flex-1">{p.title}</p>
                            <SBadge s={st}/>
                          </div>
                          {p.descriptions&&<p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{p.descriptions}</p>}
                        </div>
                        {/* Meta */}
                        <div className="px-4 py-2 flex items-center gap-3 flex-wrap border-b border-gray-50 dark:border-white/[0.03] text-[10.5px]">
                          <span className="flex items-center gap-1 font-semibold text-violet-600 dark:text-violet-400"><Users className="h-3 w-3"/>{p.targetRole}</span>
                          <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500"><Calendar className="h-3 w-3"/>{fmt(p.startDate)}</span>
                          <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500"><Clock className="h-3 w-3"/>{fmt(p.endDate)}</span>
                          <span className="ml-auto font-bold text-gray-500 dark:text-gray-400">{res?.totalVotes??0} votes · {opts.length} opts</span>
                        </div>
                        {/* Results mini */}
                        {res&&res.results.length>0&&(
                          <div className="px-4 py-3 space-y-2 flex-1">
                            {top&&top.voteCount>0&&(
                              <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-amber-600 dark:text-amber-400 mb-1.5">
                                <Trophy className="h-3 w-3 shrink-0"/>Leading: {top.optionText} ({top.percentage}%)
                              </div>
                            )}
                            {res.results.slice(0,3).map((r,i)=><MBar key={r.optionId} opt={r} maxV={maxV} ci={i}/>)}
                            {res.results.length>3&&<p className="text-[10px] text-gray-400 text-center">+{res.results.length-3} more options</p>}
                          </div>
                        )}
                        {/* Actions */}
                        <div className="mt-auto px-4 py-3 border-t border-gray-50 dark:border-white/[0.04] flex gap-2">
                          <Button size="sm" variant="outline" onClick={()=>openEdit(p)}
                            className="flex-1 h-7 text-[11.5px] rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-600 dark:text-gray-300 gap-1">
                            <Pencil className="h-3 w-3"/>Edit & Options
                          </Button>
                          <Button size="sm" variant="outline" onClick={()=>setViewing(p)}
                            className="h-7 w-7 p-0 rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-400 hover:text-violet-600 hover:border-violet-300">
                            <Eye className="h-3.5 w-3.5"/>
                          </Button>
                          <Button size="sm" variant="outline" onClick={()=>setDelId(p.id)}
                            className="h-7 w-7 p-0 rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-400 hover:text-rose-600 hover:border-rose-300">
                            <Trash2 className="h-3.5 w-3.5"/>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {filtered.length>PAGE_SIZE&&(
              <div className="bg-white dark:bg-[#0d0f18] border-t border-gray-100 dark:border-white/[0.05] px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 shrink-0">
                <p className="text-[11px] text-gray-400">
                  Page <b className="text-gray-700 dark:text-gray-300">{page}</b> / <b className="text-gray-700 dark:text-gray-300">{pages}</b>
                </p>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                    className="h-7 w-7 p-0 rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 disabled:opacity-40">
                    <ChevronLeft className="h-3.5 w-3.5"/>
                  </Button>
                  {Array.from({length:pages},(_,i)=>i+1)
                    .filter(p=>p===1||p===pages||Math.abs(p-page)<=1)
                    .reduce<(number|"…")[]>((a,p,i,arr)=>{if(i>0&&(p as number)-(arr[i-1] as number)>1)a.push("…");a.push(p);return a},[])
                    .map((p,i)=>p==="…"?<span key={`e${i}`} className="text-gray-400 px-1 text-[11px]">…</span>:
                      <button key={p} onClick={()=>setPage(p as number)}
                        className={cn("h-7 w-7 rounded-lg text-[11.5px] font-bold border transition-all",
                          page===p?"bg-violet-600 border-violet-600 text-white shadow-sm":
                          "bg-white dark:bg-transparent border-gray-200 dark:border-white/[0.08] text-gray-500 hover:border-violet-300 hover:text-violet-600")}>
                        {p}
                      </button>
                    )
                  }
                  <Button size="sm" variant="outline" onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages}
                    className="h-7 w-7 p-0 rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 disabled:opacity-40">
                    <ChevronRight className="h-3.5 w-3.5"/>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View dialog */}
      {viewing&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={()=>setViewing(null)}>
          <div className="bg-white dark:bg-[#141820] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.06]
              bg-gradient-to-br from-violet-50 to-white dark:from-violet-900/20 dark:to-[#141820]">
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">{viewing.title}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap"><SBadge s={getStatus(viewing)}/></div>
              </div>
              <button onClick={()=>setViewing(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"><X className="h-5 w-5"/></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {viewing.descriptions&&<p className="text-[12.5px] text-gray-600 dark:text-gray-300 leading-relaxed">{viewing.descriptions}</p>}
              <div className="grid grid-cols-2 gap-2">
                {[["Target",viewing.targetRole],["Status",viewing.status],["Start",fmt(viewing.startDate)],["End",fmt(viewing.endDate)]].map(([k,v])=>(
                  <div key={k} className="rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] px-3 py-2.5">
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-gray-400">{k}</p>
                    <p className="text-[12.5px] font-bold text-gray-800 dark:text-white mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              {rmap.get(viewing.id)&&(
                <div className="space-y-2 border-t border-gray-50 dark:border-white/[0.05] pt-3">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Live Results ({rmap.get(viewing.id)!.totalVotes} total votes)
                  </p>
                  {rmap.get(viewing.id)!.results.map((r,i)=>(
                    <MBar key={r.optionId} opt={r}
                      maxV={Math.max(...rmap.get(viewing.id)!.results.map(x=>x.voteCount),1)} ci={i}/>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <Button variant="outline" onClick={()=>setViewing(null)}
                className="flex-1 h-9 text-[12.5px] rounded-xl border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-600 dark:text-gray-300">
                Close
              </Button>
              <Button onClick={()=>{openEdit(viewing);setViewing(null)}}
                className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-violet-600 hover:bg-violet-500 text-white gap-1.5">
                <Pencil className="h-3.5 w-3.5"/>Edit Poll
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Poll dialog */}
      <AlertDialog open={delId!==null} onOpenChange={()=>setDelId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm p-0 overflow-hidden gap-0 mx-4 sm:mx-auto bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08]">
          <AlertDialogHeader className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/20 dark:to-[#141820]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                <AlertTriangle className="h-[18px] w-[18px] text-rose-600 dark:text-rose-400"/>
              </div>
              <div>
                <AlertDialogTitle className="text-[14px] font-bold text-gray-900 dark:text-white">Delete Poll?</AlertDialogTitle>
                <AlertDialogDescription className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-0">
                  This will permanently remove the poll and all its vote data.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 py-4 gap-2 flex-row">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-xl border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-600 dark:text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deletePoll} className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Option dialog */}
      <AlertDialog open={dOptId!==null} onOpenChange={()=>setDOptId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-4 sm:mx-auto bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[14px] font-bold text-gray-900 dark:text-white">Remove Option?</AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] text-gray-500 dark:text-gray-400">
              This option will be removed from the poll.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-row">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={delOpt} className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}