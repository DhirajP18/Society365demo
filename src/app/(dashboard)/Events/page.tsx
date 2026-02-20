"use client"

import { useEffect, useMemo, useState } from "react"
import api from "@/lib/api"
import { toast } from "sonner"
import { getApiMessage } from "@/lib/getApiMessage"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  CalendarDays, Plus, List, RefreshCw, MapPin,
  Pencil, Trash2, X, Clock, Search,
  ChevronLeft, ChevronRight, CalendarCheck, CalendarRange,
  ExternalLink, History,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventVM {
  id: number
  title: string
  descriptions: string
  startDate: string
  eventDate: string
  endDate: string
  location: string
  locationUrl: string
  eventType: string
  isActive: boolean
}

interface ApiResponse<T = unknown> {
  statusCode: number
  isSuccess: boolean
  resMsg?: string
  result?: T
}

type ViewType = "list" | "form" | "upcoming" | "history"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInput(val?: string | null) { return val ? val.split("T")[0] : "" }
function toTimeInput(val?: string | null) {
  if (!val || !val.includes("T")) return ""
  return val.split("T")[1]?.slice(0, 5) ?? ""
}
function combineDateTime(date: string, time: string) {
  if (!date) return ""
  return time ? `${date}T${time}:00` : `${date}T00:00:00`
}
function fmtDate(val?: string | null) {
  if (!val) return "—"
  try { return new Date(val).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) } catch { return val }
}
function fmtDateTime(val?: string | null) {
  if (!val) return "—"
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return val
    const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    const hasTime = val.includes("T") && !val.endsWith("T00:00:00") && !val.endsWith("T00:00")
    if (!hasTime) return date
    return `${date}, ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`
  } catch { return val }
}
function formatTimeTo12hr(time: string) {
  if (!time) return ""
  const [h, m] = time.split(":").map(Number)
  const mer = h >= 12 ? "PM" : "AM"
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${mer}`
}
function fmtTime(val?: string | null) {
  if (!val || !val.includes("T") || val.endsWith("T00:00:00")) return ""
  try { return new Date(val).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) } catch { return "" }
}

// ─── Event type badge ─────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  meeting:     "bg-blue-50   text-blue-700   border-blue-200",
  celebration: "bg-pink-50   text-pink-700   border-pink-200",
  maintenance: "bg-orange-50 text-orange-700 border-orange-200",
  sports:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  cultural:    "bg-violet-50 text-violet-700  border-violet-200",
  general:     "bg-gray-50   text-gray-600   border-gray-200",
}
function typeBadgeClass(type: string) {
  const k = type.toLowerCase()
  const m = Object.keys(TYPE_COLORS).find(k2 => k.includes(k2))
  return m ? TYPE_COLORS[m] : "bg-indigo-50 text-indigo-700 border-indigo-200"
}

// ─── Floating-label Input ─────────────────────────────────────────────────────

function FInput({ id, label, value, onChange, type = "text", required = false, disabled = false }:
  { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; disabled?: boolean }) {
  const [focused, setFocused] = useState(false)
  const isDate = type === "date" || type === "time" || type === "datetime-local"
  const active = isDate || focused || value.length > 0
  return (
    <div className="relative">
      <input id={id} type={type} value={value} disabled={disabled}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        className={cn(
          "w-full h-11 rounded-lg border bg-white dark:bg-gray-900 px-3 text-[13.5px] text-gray-900 dark:text-gray-100 outline-none transition-all",
          isDate ? "pt-4 pb-1" : "pt-4 pb-1.5",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          focused ? "border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
        )}
      />
      <label htmlFor={id} className={cn(
        "pointer-events-none absolute left-3 font-medium transition-all duration-150 select-none",
        active ? "top-[7px] text-[10px] text-indigo-500 tracking-wide"
               : "top-[50%] -translate-y-1/2 text-[13.5px] text-gray-400"
      )}>
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
    </div>
  )
}

function FTextarea({ id, label, value, onChange, disabled = false }:
  { id: string; label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0
  return (
    <div className="relative">
      <textarea id={id} rows={3} value={value} disabled={disabled}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        className={cn(
          "w-full rounded-lg border bg-white dark:bg-gray-900 px-3 pt-5 pb-2 text-[13.5px] text-gray-900 dark:text-gray-100 outline-none resize-none transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          focused ? "border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
        )}
      />
      <label htmlFor={id} className={cn(
        "pointer-events-none absolute left-3 font-medium transition-all duration-150 select-none",
        active ? "top-[7px] text-[10px] text-indigo-500 tracking-wide"
               : "top-[14px] text-[13.5px] text-gray-400"
      )}>{label}</label>
    </div>
  )
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState extends EventVM { startTime: string; eventTime: string; endTime: string }

const EMPTY: FormState = {
  id: 0, title: "", descriptions: "", startDate: "", eventDate: "", endDate: "",
  location: "", locationUrl: "", eventType: "", isActive: true,
  startTime: "", eventTime: "", endTime: "",
}

// ─── Status badge helper ──────────────────────────────────────────────────────

function StatusBadge({ expired, upcoming }: { expired: boolean; upcoming: boolean }) {
  if (expired)  return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-500 border border-rose-200 whitespace-nowrap"><span className="h-1.5 w-1.5 rounded-full bg-rose-400 inline-block"/>Expired</span>
  if (upcoming) return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 whitespace-nowrap"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"/>Upcoming</span>
  return              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 whitespace-nowrap"><span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block"/>Active</span>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const [view,        setView]        = useState<ViewType>("list")
  const [events,      setEvents]      = useState<EventVM[]>([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [form,        setForm]        = useState<FormState>(EMPTY)
  const [isEdit,      setIsEdit]      = useState(false)
  const [deleteId,    setDeleteId]    = useState<number | null>(null)
  const [search,      setSearch]      = useState("")
  const [pageSize,    setPageSize]    = useState(5)
  const [currentPage, setCurrentPage] = useState(1)

  const loadEvents = async () => {
    setLoading(true)
    try { setEvents((await api.get<ApiResponse<EventVM[]>>("/Event/GetAll")).data?.result ?? []) }
    catch (e) { toast.error(getApiMessage(e)) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadEvents() }, [])

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return events
    const q = search.toLowerCase()
    return events.filter(e => `${e.title} ${e.eventType} ${e.location}`.toLowerCase().includes(q))
  }, [events, search])

  const isExpired  = (e: EventVM) => !!e.endDate  && new Date(e.endDate)  < today
  const isUpcoming = (e: EventVM) => !!e.startDate && new Date(e.startDate) >= today

  const pastEvents     = useMemo(() => events.filter(e => !!e.endDate  && new Date(e.endDate)  < today),  [events, today])
  const upcomingEvents = useMemo(() => events.filter(e => !!e.startDate && new Date(e.startDate) >= today), [events, today])

  const filteredSorted = useMemo(() => {
    const up  = filtered.filter(e => isUpcoming(e))
    const mid = filtered.filter(e => !isUpcoming(e) && !isExpired(e))
    const exp = filtered.filter(e => isExpired(e))
    return [...up, ...mid, ...exp]
  }, [filtered, events])

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize))
  const paged      = useMemo(() => filteredSorted.slice((currentPage-1)*pageSize, currentPage*pageSize), [filteredSorted, currentPage, pageSize])
  const from = filteredSorted.length === 0 ? 0 : (currentPage-1)*pageSize+1
  const to   = Math.min(currentPage*pageSize, filteredSorted.length)

  useEffect(() => { setCurrentPage(1) }, [search, pageSize])
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [totalPages])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) { setForm(p => ({...p,[key]:value})) }

  const handleSubmit = async () => {
    if (!form.title.trim())     return toast.error("Title is required")
    if (!form.eventType.trim()) return toast.error("Event Type is required")
    if (!form.eventDate)        return toast.error("Event Date is required")
    setSaving(true)
    try {
      const payload: EventVM = { ...form,
        startDate: combineDateTime(form.startDate, form.startTime),
        eventDate: combineDateTime(form.eventDate, form.eventTime),
        endDate:   combineDateTime(form.endDate,   form.endTime),
      }
      const res = isEdit
        ? await api.put<ApiResponse>("/Event/Update", payload)
        : await api.post<ApiResponse>("/Event/Insert", payload)
      if (res.data?.isSuccess) { toast.success(res.data.resMsg ?? (isEdit ? "Updated" : "Created")); resetForm(); loadEvents() }
      else toast.error(res.data?.resMsg ?? "Operation failed")
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setSaving(false) }
  }

  const handleEdit = (evt: EventVM) => {
    setForm({ ...evt,
      startDate: toDateInput(evt.startDate), eventDate: toDateInput(evt.eventDate), endDate: toDateInput(evt.endDate),
      locationUrl: evt.locationUrl ?? "",
      startTime: toTimeInput(evt.startDate), eventTime: toTimeInput(evt.eventDate), endTime: toTimeInput(evt.endDate),
    })
    setIsEdit(true); setView("form")
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      const res = await api.delete<ApiResponse>(`/Event/Delete/${deleteId}`)
      if (res.data?.isSuccess) { toast.success(res.data.resMsg ?? "Deleted"); loadEvents() }
      else toast.error(res.data?.resMsg ?? "Delete failed")
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setDeleteId(null) }
  }

  const resetForm = () => { setForm(EMPTY); setIsEdit(false); setView("list") }

  // ── TAB definitions ──────────────────────────────────────────────────────────

  const tabs = [
    { label: "All",      labelFull: "All Events",                         icon: List,         value: "list"     as ViewType, count: filteredSorted.length, countColor: "bg-indigo-100 text-indigo-700" },
    { label: isEdit ? "Edit" : "Add", labelFull: isEdit ? "Edit Event" : "Add Event", icon: isEdit ? Pencil : Plus, value: "form" as ViewType, count: null, countColor: "" },
    { label: "Upcoming", labelFull: "Upcoming",                           icon: CalendarRange, value: "upcoming" as ViewType, count: upcomingEvents.length, countColor: "bg-emerald-100 text-emerald-700" },
    { label: "History",  labelFull: "Past Events",                        icon: History,       value: "history"  as ViewType, count: pastEvents.length,    countColor: "bg-slate-100 text-slate-600"   },
  ]

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#f5f6fa] dark:bg-[#0a0c11]">

      {/* ══════════════════════════════════════════════
          TOOLBAR
      ══════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-[#0f1117] border-b border-gray-200 dark:border-white/[0.06] px-3 sm:px-5 pt-3 pb-0">

        {/* Title row */}
        <div className="flex items-center justify-between mb-2.5 gap-2">
          <div className="min-w-0">
            <h1 className="text-[14px] sm:text-[16px] font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-1.5 sm:gap-2">
              <CalendarDays className="h-4 w-4 text-indigo-500 shrink-0" />
              <span className="truncate">Event Management</span>
            </h1>
            <p className="text-[11px] sm:text-[11.5px] text-gray-400 dark:text-gray-500 hidden sm:block">
              Schedule and manage society events
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="outline" size="sm" onClick={loadEvents}
              className="h-7 px-2 sm:px-2.5 text-[11px] sm:text-[11.5px] gap-1 sm:gap-1.5 border-gray-200 text-gray-500">
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm"
              onClick={() => { setForm(EMPTY); setIsEdit(false); setView("form") }}
              className="h-7 px-2.5 sm:px-3 text-[11px] sm:text-[11.5px] gap-1 sm:gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-3 w-3" />
              <span className="hidden xs:inline sm:inline">Add Event</span>
              <span className="xs:hidden sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Tabs — horizontally scrollable on mobile */}
        <div className="flex items-end gap-0 overflow-x-auto scrollbar-none -mb-px pb-0">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = view === tab.value
            return (
              <button key={tab.value}
                onClick={() => {
                  if      (tab.value === "list")     resetForm()
                  else if (tab.value === "history")  { setIsEdit(false); setView("history") }
                  else if (tab.value === "upcoming") { setIsEdit(false); setView("upcoming") }
                  else { setForm(EMPTY); setIsEdit(false); setView("form") }
                }}
                className={cn(
                  "flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 text-[11px] sm:text-[12.5px] font-medium whitespace-nowrap",
                  "border-t border-l border-r rounded-t-lg transition-all shrink-0",
                  isActive
                    ? "bg-white dark:bg-[#0f1117] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white font-semibold border-b-white dark:border-b-[#0f1117] -mb-px relative z-10"
                    : "bg-transparent border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                )}>
                <Icon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0", isActive ? "text-indigo-500" : "text-gray-400 dark:text-gray-600")} />
                {/* Show full label on sm+, short label on mobile */}
                <span className="hidden sm:inline">{tab.labelFull}</span>
                <span className="sm:hidden">{tab.label}</span>
                {tab.count !== null && isActive && (
                  <span className={cn("ml-0.5 rounded-full text-[9px] sm:text-[10px] font-bold px-1.5 py-0", tab.countColor)}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          CONTENT CARD
      ══════════════════════════════════════════════ */}
      <div className="flex-1 overflow-hidden flex flex-col mx-2 sm:mx-4 my-2 sm:my-3
        bg-white dark:bg-[#0f1117] rounded-xl border border-gray-200 dark:border-white/[0.06] shadow-sm">

        {/* ════════ ALL EVENTS LIST ════════ */}
        {view === "list" && (
          <>
            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-white/[0.06] shrink-0">
              {/* Show N entries — hidden on mobile */}
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-[12px] text-gray-500">Show</span>
                <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                  <SelectTrigger className="h-6 w-14 text-[11.5px] rounded border-gray-200 px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5,10,20,50].map(n => <SelectItem key={n} value={String(n)} className="text-[12px]">{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-[12px] text-gray-500">entries</span>
              </div>

              <span className="text-[11px] sm:text-[12px] text-gray-400">
                <b className="text-gray-600 dark:text-gray-300">{from}</b>–<b className="text-gray-600 dark:text-gray-300">{to}</b> of{" "}
                <b className="text-gray-600 dark:text-gray-300">{filtered.length}</b>
              </span>

              {/* Search — full width on mobile */}
              <div className="relative ml-auto w-full sm:w-auto">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                <Input placeholder="Search…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-7 h-7 w-full sm:w-48 text-[11.5px] rounded border-gray-200 bg-gray-50 dark:bg-white/[0.04]" />
              </div>
            </div>

            {/* ── MOBILE: Card list ── */}
            <div className="sm:hidden flex-1 overflow-y-auto">
              {loading && Array.from({length:4}).map((_,i) => (
                <div key={i} className="p-3 border-b border-gray-50 dark:border-white/[0.04] animate-pulse">
                  <div className="h-4 bg-gray-100 dark:bg-white/[0.06] rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-100 dark:bg-white/[0.04] rounded w-1/2" />
                </div>
              ))}

              {!loading && paged.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
                  <CalendarDays className="h-10 w-10 opacity-20" />
                  <p className="text-[13px] font-medium text-gray-500">{search ? "No results" : "No events yet"}</p>
                </div>
              )}

              {!loading && paged.map(evt => {
                const expired  = isExpired(evt)
                const upcoming = isUpcoming(evt)
                return (
                  <div key={evt.id} className={cn(
                    "px-3 py-3 border-b border-gray-50 dark:border-white/[0.04]",
                    expired ? "bg-rose-50/30" : upcoming ? "bg-emerald-50/20" : ""
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      {/* Left */}
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5",
                          expired ? "bg-rose-50" : upcoming ? "bg-emerald-50" : "bg-indigo-50")}>
                          <CalendarCheck className={cn("h-4 w-4",
                            expired ? "text-rose-400" : upcoming ? "text-emerald-500" : "text-indigo-500")} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                            <p className={cn("text-[13px] font-semibold leading-tight",
                              expired ? "text-gray-500" : "text-gray-800 dark:text-white")}>
                              {evt.title}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <Badge variant="outline"
                              className={cn("text-[10px] px-1.5 py-0 h-[18px] rounded-full border font-semibold", typeBadgeClass(evt.eventType))}>
                              {evt.eventType}
                            </Badge>
                            <StatusBadge expired={expired} upcoming={upcoming} />
                          </div>
                          {/* Date info */}
                          <div className="mt-1.5 space-y-0.5">
                            {evt.eventDate && (
                              <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                                <CalendarDays className="h-3 w-3 text-gray-300 shrink-0" />
                                <span>Event: {fmtDate(evt.eventDate)}{fmtTime(evt.eventDate) ? `, ${fmtTime(evt.eventDate)}` : ""}</span>
                              </div>
                            )}
                            {evt.location && (
                              <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                                <MapPin className="h-3 w-3 text-gray-300 shrink-0" />
                                <span className="truncate">{evt.location}</span>
                                {evt.locationUrl && (
                                  <a href={evt.locationUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-0.5 rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0 text-[10px] font-semibold text-indigo-600 shrink-0"
                                    onClick={e => e.stopPropagation()}>
                                    <ExternalLink className="h-2.5 w-2.5" />Map
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleEdit(evt)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(evt.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-500 hover:text-rose-600 hover:border-rose-300 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── DESKTOP: Table ── */}
            <div className="hidden sm:block overflow-auto flex-1">
              <table className="w-full text-[12.5px] border-collapse table-fixed">
                <colgroup>
                  <col className="w-[30%]" /><col className="w-[13%]" /><col className="w-[13%]" />
                  <col className="w-[14%]" /><col className="w-[20%]" /><col className="w-[10%]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/[0.06]">
                    {["Title","Type","Status","Event Date","Location","Actions"].map((h, i) => (
                      <th key={h} className={cn("py-2 px-3 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-600",
                        i === 5 ? "text-right" : "text-left")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && Array.from({length:5}).map((_,i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-white/[0.03]">
                      {Array.from({length:6}).map((_,j) => (
                        <td key={j} className="px-3 py-2.5"><div className="h-3 bg-gray-100 dark:bg-white/[0.05] rounded animate-pulse w-3/4"/></td>
                      ))}
                    </tr>
                  ))}
                  {!loading && paged.length === 0 && (
                    <tr><td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <CalendarDays className="h-8 w-8 opacity-20" />
                        <p className="text-[13px] font-medium text-gray-500">{search ? "No results found" : "No events yet"}</p>
                      </div>
                    </td></tr>
                  )}
                  {!loading && paged.map(evt => {
                    const expired = isExpired(evt); const upcoming = isUpcoming(evt)
                    return (
                      <tr key={evt.id} className={cn("border-b border-gray-50 dark:border-white/[0.03] transition-colors",
                        expired ? "bg-rose-50/20 hover:bg-rose-50/40" : upcoming ? "bg-emerald-50/20 hover:bg-emerald-50/40" : "hover:bg-indigo-50/20")}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg shrink-0",
                              expired ? "bg-rose-50" : upcoming ? "bg-emerald-50" : "bg-indigo-50")}>
                              <CalendarCheck className={cn("h-3.5 w-3.5", expired ? "text-rose-400" : upcoming ? "text-emerald-500" : "text-indigo-500")} />
                            </div>
                            <div className="min-w-0">
                              <p className={cn("font-semibold leading-tight truncate", expired ? "text-gray-500" : "text-gray-800 dark:text-white")}>{evt.title}</p>
                              {(evt.startDate || evt.endDate) && (
                                <p className="text-[10.5px] text-gray-400 truncate">
                                  {evt.startDate ? fmtDateTime(evt.startDate) : "—"}{evt.endDate ? ` → ${fmtDateTime(evt.endDate)}` : ""}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className={cn("text-[10.5px] px-2 py-0 h-5 rounded-full border font-semibold", expired && "opacity-60", typeBadgeClass(evt.eventType))}>{evt.eventType}</Badge>
                        </td>
                        <td className="px-3 py-2.5"><StatusBadge expired={expired} upcoming={upcoming} /></td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5 text-[12px] text-gray-700 dark:text-gray-300">
                            <CalendarDays className="h-3 w-3 text-gray-300 shrink-0" />{fmtDate(evt.eventDate)}
                          </div>
                          {fmtTime(evt.eventDate) && <span className="text-[10.5px] text-indigo-500 font-medium pl-4">{fmtTime(evt.eventDate)}</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                            <MapPin className="h-3 w-3 text-gray-300 shrink-0"/><span className="truncate">{evt.location||"—"}</span>
                            {evt.locationUrl && (
                              <a href={evt.locationUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
                                className="flex items-center gap-0.5 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-indigo-600 hover:bg-indigo-100 shrink-0">
                                <ExternalLink className="h-2.5 w-2.5"/>Map
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(evt)}
                              className="h-6 w-6 p-0 rounded border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300">
                              <Pencil className="h-3 w-3"/>
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setDeleteId(evt.id)}
                              className="h-6 w-6 p-0 rounded border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-300">
                              <Trash2 className="h-3 w-3"/>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.01] shrink-0">
                <span className="text-[11px] sm:text-[11.5px] text-gray-400">
                  Page <b className="text-gray-600 dark:text-gray-300">{currentPage}</b> / <b className="text-gray-600 dark:text-gray-300">{totalPages}</b>
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={currentPage===1} onClick={() => setCurrentPage(p=>p-1)} className="h-6 w-6 p-0 rounded border-gray-200">
                    <ChevronLeft className="h-3 w-3"/>
                  </Button>
                  {Array.from({length: Math.min(totalPages,5)},(_,i)=>i+1).map(page => (
                    <Button key={page} size="sm" onClick={() => setCurrentPage(page)}
                      className={cn("h-6 w-6 p-0 text-[11px] rounded",
                        page===currentPage ? "bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                                           : "bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-gray-300 hover:bg-gray-50")}>
                      {page}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" disabled={currentPage===totalPages} onClick={() => setCurrentPage(p=>p+1)} className="h-6 w-6 p-0 rounded border-gray-200">
                    <ChevronRight className="h-3 w-3"/>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════ UPCOMING ════════ */}
        {view === "upcoming" && (
          <>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-white/[0.05] shrink-0">
              <CalendarRange className="h-3.5 w-3.5 text-emerald-500 shrink-0"/>
              <span className="text-[11.5px] text-gray-500 dark:text-gray-400">
                <span className="hidden sm:inline">Events where <b className="text-gray-700 dark:text-gray-200">Start Date</b> is today or in future · </span>
                <b className="text-gray-700 dark:text-gray-200">{upcomingEvents.length}</b> upcoming
              </span>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden flex-1 overflow-y-auto">
              {!loading && upcomingEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14 gap-2 text-gray-400">
                  <CalendarRange className="h-9 w-9 opacity-20"/>
                  <p className="text-[13px] font-medium text-gray-500">No upcoming events</p>
                </div>
              )}
              {!loading && upcomingEvents.map(evt => (
                <div key={evt.id} className="px-3 py-3 border-b border-gray-50 dark:border-white/[0.04] bg-emerald-50/20">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 shrink-0">
                      <CalendarCheck className="h-4 w-4 text-emerald-500"/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-800 dark:text-white truncate">{evt.title}</p>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-[18px] rounded-full border font-semibold mt-1", typeBadgeClass(evt.eventType))}>{evt.eventType}</Badge>
                      <div className="mt-1.5 space-y-0.5">
                        <div className="flex items-center gap-1 text-[11px] text-emerald-600">
                          <CalendarDays className="h-3 w-3 shrink-0"/>
                          Start: {fmtDate(evt.startDate)}{fmtTime(evt.startDate) ? `, ${fmtTime(evt.startDate)}` : ""}
                        </div>
                        {evt.location && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-500">
                            <MapPin className="h-3 w-3 text-gray-300 shrink-0"/>{evt.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-auto flex-1">
              <table className="w-full text-[12.5px] border-collapse table-fixed">
                <colgroup><col className="w-[30%]"/><col className="w-[15%]"/><col className="w-[18%]"/><col className="w-[18%]"/><col className="w-[19%]"/></colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/[0.06]">
                    {["Title","Type","Start Date","Event Date","Location"].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!loading && upcomingEvents.length === 0 && (
                    <tr><td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <CalendarRange className="h-8 w-8 opacity-20"/>
                        <p className="text-[13px] font-medium text-gray-500">No upcoming events</p>
                      </div>
                    </td></tr>
                  )}
                  {!loading && upcomingEvents.map(evt => (
                    <tr key={evt.id} className="border-b border-gray-50 dark:border-white/[0.03] bg-emerald-50/10 hover:bg-emerald-50/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 shrink-0"><CalendarCheck className="h-3.5 w-3.5 text-emerald-500"/></div>
                          <p className="font-semibold text-gray-800 dark:text-white truncate">{evt.title}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><Badge variant="outline" className={cn("text-[10.5px] px-2 py-0 h-5 rounded-full border font-semibold", typeBadgeClass(evt.eventType))}>{evt.eventType}</Badge></td>
                      <td className="px-3 py-2.5">
                        <div className="text-[12px] text-emerald-600 font-medium">{fmtDate(evt.startDate)}</div>
                        {fmtTime(evt.startDate) && <div className="text-[10.5px] text-emerald-500">{fmtTime(evt.startDate)}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-[12px] text-gray-600 dark:text-gray-300">{fmtDate(evt.eventDate)}</div>
                        {fmtTime(evt.eventDate) && <div className="text-[10.5px] text-indigo-500">{fmtTime(evt.eventDate)}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                          <MapPin className="h-3 w-3 text-gray-300 shrink-0"/><span className="truncate">{evt.location||"—"}</span>
                          {evt.locationUrl && <a href={evt.locationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-indigo-600 hover:bg-indigo-100 shrink-0"><ExternalLink className="h-2.5 w-2.5"/>Map</a>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.01] shrink-0">
              <p className="text-[11.5px] text-gray-400">Showing all <b className="text-gray-600 dark:text-gray-300">{upcomingEvents.length}</b> upcoming events</p>
            </div>
          </>
        )}

        {/* ════════ HISTORY ════════ */}
        {view === "history" && (
          <>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-white/[0.05] shrink-0">
              <History className="h-3.5 w-3.5 text-slate-400 shrink-0"/>
              <span className="text-[11.5px] text-gray-500 dark:text-gray-400">
                <span className="hidden sm:inline">Events where <b className="text-gray-700 dark:text-gray-200">End Date</b> is before today · </span>
                <b className="text-gray-700 dark:text-gray-200">{pastEvents.length}</b> past
              </span>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden flex-1 overflow-y-auto">
              {!loading && pastEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14 gap-2 text-gray-400">
                  <History className="h-9 w-9 opacity-20"/>
                  <p className="text-[13px] font-medium text-gray-500">No past events</p>
                </div>
              )}
              {!loading && pastEvents.map(evt => (
                <div key={evt.id} className="px-3 py-3 border-b border-gray-50 dark:border-white/[0.04] opacity-80">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/[0.05] shrink-0">
                      <CalendarCheck className="h-4 w-4 text-slate-400"/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-600 dark:text-gray-300 truncate">{evt.title}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-[18px] rounded-full border font-semibold opacity-70", typeBadgeClass(evt.eventType))}>{evt.eventType}</Badge>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Done</span>
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        <div className="flex items-center gap-1 text-[11px] text-rose-500">
                          <Clock className="h-3 w-3 shrink-0"/>Ended: {fmtDate(evt.endDate)}{fmtTime(evt.endDate) ? `, ${fmtTime(evt.endDate)}` : ""}
                        </div>
                        {evt.location && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            <MapPin className="h-3 w-3 text-gray-300 shrink-0"/>{evt.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-auto flex-1">
              <table className="w-full text-[12.5px] border-collapse table-fixed">
                <colgroup><col className="w-[30%]"/><col className="w-[15%]"/><col className="w-[18%]"/><col className="w-[18%]"/><col className="w-[19%]"/></colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/[0.06]">
                    {["Title","Type","Event Date","End Date","Location"].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!loading && pastEvents.length === 0 && (
                    <tr><td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <History className="h-8 w-8 opacity-20"/>
                        <p className="text-[13px] font-medium text-gray-500">No past events yet</p>
                      </div>
                    </td></tr>
                  )}
                  {!loading && pastEvents.map(evt => (
                    <tr key={evt.id} className="border-b border-gray-50 dark:border-white/[0.03] hover:bg-slate-50/40 dark:hover:bg-white/[0.02] opacity-80 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/[0.05] shrink-0"><CalendarCheck className="h-3.5 w-3.5 text-slate-400"/></div>
                          <p className="font-semibold text-gray-600 dark:text-gray-300 truncate">{evt.title}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><Badge variant="outline" className={cn("text-[10.5px] px-2 py-0 h-5 rounded-full border font-semibold opacity-70", typeBadgeClass(evt.eventType))}>{evt.eventType}</Badge></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-gray-500"><CalendarDays className="h-3 w-3 text-gray-300"/>{fmtDate(evt.eventDate)}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-gray-300 shrink-0"/><span className="text-rose-500 font-medium">{fmtDate(evt.endDate)}</span><span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">Done</span></div>
                        {fmtTime(evt.endDate) && <div className="text-[10.5px] text-rose-400 pl-4">{fmtTime(evt.endDate)}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                          <MapPin className="h-3 w-3 text-gray-300 shrink-0"/><span className="truncate">{evt.location||"—"}</span>
                          {evt.locationUrl && <a href={evt.locationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-indigo-600 hover:bg-indigo-100 shrink-0"><ExternalLink className="h-2.5 w-2.5"/>Map</a>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.01] shrink-0">
              <p className="text-[11.5px] text-gray-400">Showing all <b className="text-gray-600 dark:text-gray-300">{pastEvents.length}</b> completed events</p>
            </div>
          </>
        )}

        {/* ════════ FORM ════════ */}
        {view === "form" && (
          <div className="flex-1 flex items-start justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="w-full max-w-2xl">
              {/* Form header */}
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 shrink-0">
                    {isEdit ? <Pencil className="h-4 w-4 text-indigo-600"/> : <CalendarRange className="h-4 w-4 text-indigo-600"/>}
                  </div>
                  <div>
                    <h2 className="text-[13.5px] sm:text-[14px] font-bold text-gray-900 dark:text-white leading-tight">
                      {isEdit ? "Edit Event" : "Create New Event"}
                    </h2>
                    <p className="text-[11px] sm:text-[11.5px] text-gray-400">{isEdit ? "Update event details" : "Fill in the event information"}</p>
                  </div>
                </div>
                <button onClick={resetForm} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-600 transition-colors">
                  <X className="h-4 w-4"/>
                </button>
              </div>

              {/* Form body */}
              <div className="bg-gray-50/60 dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.07] p-3 sm:p-5 space-y-3 sm:space-y-4">
                {/* Row 1: Title + Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FInput id="title" label="Event Title" required value={form.title} onChange={v=>setField("title",v)} disabled={saving}/>
                  <FInput id="eventType" label="Event Type" required value={form.eventType} onChange={v=>setField("eventType",v)} disabled={saving}/>
                </div>

                {/* Row 2: Dates — single column on mobile, 3 cols on sm */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {/* Start */}
                  <div className="space-y-2">
                    <FInput id="startDate" label="Start Date" type="date" value={form.startDate} onChange={v=>setField("startDate",v)} disabled={saving}/>
                    <FInput id="startTime" label="Start Time" type="time" value={form.startTime} onChange={v=>setField("startTime",v)} disabled={saving}/>
                    {form.startTime && <p className="text-[11px] text-indigo-500 font-medium pl-1">🕐 {formatTimeTo12hr(form.startTime)}</p>}
                  </div>
                  {/* Event */}
                  <div className="space-y-2">
                    <FInput id="eventDate" label="Event Date" type="date" required value={form.eventDate} onChange={v=>setField("eventDate",v)} disabled={saving}/>
                    <FInput id="eventTime" label="Event Time" type="time" value={form.eventTime} onChange={v=>setField("eventTime",v)} disabled={saving}/>
                    {form.eventTime && <p className="text-[11px] text-indigo-500 font-medium pl-1">🕐 {formatTimeTo12hr(form.eventTime)}</p>}
                  </div>
                  {/* End */}
                  <div className="space-y-2">
                    <FInput id="endDate" label="End Date" type="date" value={form.endDate} onChange={v=>setField("endDate",v)} disabled={saving}/>
                    <FInput id="endTime" label="End Time" type="time" value={form.endTime} onChange={v=>setField("endTime",v)} disabled={saving}/>
                    {form.endTime && <p className="text-[11px] text-indigo-500 font-medium pl-1">🕐 {formatTimeTo12hr(form.endTime)}</p>}
                  </div>
                </div>

                {/* Row 3: Location + URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FInput id="location" label="Location / Venue" value={form.location} onChange={v=>setField("location",v)} disabled={saving}/>
                  <FInput id="locationUrl" label="Map URL (optional)" value={form.locationUrl} onChange={v=>setField("locationUrl",v)} disabled={saving}/>
                </div>
                {form.locationUrl && (
                  <div className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2">
                    <ExternalLink className="h-3.5 w-3.5 text-indigo-400 shrink-0"/>
                    <span className="text-[12px] text-gray-500 truncate flex-1">{form.locationUrl}</span>
                    <a href={form.locationUrl} target="_blank" rel="noopener noreferrer" className="text-[11.5px] font-semibold text-indigo-600 hover:underline shrink-0">Preview →</a>
                  </div>
                )}

                {/* Description */}
                <FTextarea id="descriptions" label="Description" value={form.descriptions} onChange={v=>setField("descriptions",v)} disabled={saving}/>

                <div className="h-px bg-gray-200 dark:bg-white/[0.07]"/>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5">
                  <Button onClick={handleSubmit} disabled={saving}
                    className="flex-1 h-9 text-[13px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
                    {saving ? (isEdit ? "Updating…" : "Creating…") : (isEdit ? "Update Event" : "Create Event")}
                  </Button>
                  <Button variant="outline" onClick={resetForm} disabled={saving}
                    className="flex-1 h-9 text-[13px] font-medium border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg">
                    Cancel
                  </Button>
                </div>
              </div>

              {!isEdit && <p className="text-center text-[11.5px] text-gray-400 mt-3">Event will be active by default after creation.</p>}
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Dialog ── */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl max-w-sm p-0 overflow-hidden gap-0 mx-4 sm:mx-auto">
          <AlertDialogHeader className="px-5 py-4 border-b bg-rose-50 border-rose-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
                <Trash2 className="h-4 w-4 text-rose-600"/>
              </div>
              <div>
                <AlertDialogTitle className="text-[14px] font-bold text-gray-900 leading-tight">Delete Event?</AlertDialogTitle>
                <AlertDialogDescription className="text-[11.5px] text-gray-500 mt-0">This action cannot be undone.</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 py-4 gap-2 flex-row">
            <AlertDialogCancel className="flex-1 h-8 text-[12.5px] rounded-lg border-gray-200">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="flex-1 h-8 text-[12.5px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}