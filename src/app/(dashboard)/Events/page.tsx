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
  ExternalLink, History
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
//  Matches TblEventVM in the C# backend (camelCase JSON serialization)

interface EventVM {
  id: number          // long in C# → number in TS; 0 means new record
  title: string
  descriptions: string
  startDate: string   // ISO date string from backend, "yyyy-MM-dd" for inputs
  eventDate: string
  endDate: string
  location: string
  locationUrl: string // optional Google Maps / any map link (column: LocationURL)
  eventType: string
  isActive: boolean
}

// Backend API response envelope
interface ApiResponse<T = unknown> {
  statusCode: number
  isSuccess: boolean
  resMsg?: string
  result?: T
}

type ViewType = "list" | "form" | "upcoming" | "history"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise ISO datetime → "yyyy-MM-dd" for <input type="date"> */
function toDateInput(val: string | null | undefined): string {
  if (!val) return ""
  return val.split("T")[0]
}

/** Extract time part "HH:MM" from ISO datetime string */
function toTimeInput(val: string | null | undefined): string {
  if (!val || !val.includes("T")) return ""
  return val.split("T")[1]?.slice(0, 5) ?? ""
}

/** Combine date "yyyy-MM-dd" + time "HH:MM" → ISO datetime string */
function combineDateTime(date: string, time: string): string {
  if (!date) return ""
  if (!time) return `${date}T00:00:00`
  return `${date}T${time}:00`
}

/** Format ISO datetime → "15 Jan 2025, 02:30 PM" */
function fmtDateTime(val: string | null | undefined): string {
  if (!val) return "—"
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return val
    const datePart = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    const timePart = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
    // Only show time if it's not midnight (i.e. time was actually set)
    const hasTime = val.includes("T") && !val.endsWith("T00:00:00") && !val.endsWith("T00:00")
    return hasTime ? `${datePart}, ${timePart}` : datePart
  } catch {
    return val
  }
}

/** Format ISO datetime → date only "15 Jan 2025" */
function fmtDate(val: string | null | undefined): string {
  if (!val) return "—"
  try {
    return new Date(val).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  } catch { return val }
}

// ─── Event-type badge colour ──────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  meeting:     "bg-blue-50   text-blue-700   border-blue-200",
  celebration: "bg-pink-50   text-pink-700   border-pink-200",
  maintenance: "bg-orange-50 text-orange-700 border-orange-200",
  sports:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  cultural:    "bg-violet-50 text-violet-700  border-violet-200",
  general:     "bg-gray-50   text-gray-600   border-gray-200",
}

function typeBadgeClass(type: string): string {
  const key = type.toLowerCase()
  const match = Object.keys(TYPE_COLORS).find(k => key.includes(k))
  return match ? TYPE_COLORS[match] : "bg-indigo-50 text-indigo-700 border-indigo-200"
}

// ─── Floating-label Input ─────────────────────────────────────────────────────

interface FInputProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  disabled?: boolean
}

function FInput({ id, label, value, onChange, type = "text", required = false, disabled = false }: FInputProps) {
  const [focused, setFocused] = useState(false)
  // Date/time inputs always show browser-native placeholder (dd-mm-yyyy etc)
  // so the label must ALWAYS stay in the small/top position to avoid overlap
  const isDateType = type === "date" || type === "time" || type === "datetime-local"
  const active = isDateType || focused || value.length > 0

  return (
    <div className="relative">
      <input
        id={id} type={type} value={value} disabled={disabled}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "w-full h-11 rounded-lg border bg-white px-3 text-[13.5px] text-gray-900 outline-none transition-all",
          isDateType ? "pt-4 pb-1" : "pt-4 pb-1.5",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          focused
            ? "border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            : "border-gray-200 hover:border-gray-300",
        )}
      />
      <label htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-3 font-medium transition-all duration-150 select-none",
          active
            ? "top-[7px] text-[10px] text-indigo-500 tracking-wide"
            : "top-[50%] -translate-y-1/2 text-[13.5px] text-gray-400",
        )}>
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
    </div>
  )
}

// ─── Floating-label Textarea ──────────────────────────────────────────────────

function FTextarea({ id, label, value, onChange, disabled = false }:
  { id: string; label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0

  return (
    <div className="relative">
      <textarea
        id={id} rows={3} value={value} disabled={disabled}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "w-full rounded-lg border bg-white px-3 pt-5 pb-2 text-[13.5px] text-gray-900 outline-none resize-none transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          active
            ? "border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            : "border-gray-200 hover:border-gray-300",
        )}
      />
      <label htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-3 font-medium transition-all duration-150 select-none",
          active
            ? "top-[7px] text-[10px] text-indigo-500 tracking-wide"
            : "top-[14px] text-[13.5px] text-gray-400",
        )}>
        {label}
      </label>
    </div>
  )
}

/** Convert "HH:MM" 24hr → "02:30 PM" 12hr AM/PM display */
function formatTimeTo12hr(time: string): string {
  if (!time) return ""
  const [hStr, mStr] = time.split(":")
  const h = parseInt(hStr, 10)
  const m = mStr ?? "00"
  const meridiem = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${String(h12).padStart(2, "0")}:${m} ${meridiem}`
}

// ─── Form state (extends EventVM with local time fields split from datetime) ──

interface FormState extends EventVM {
  startTime: string   // "HH:MM" - combined with startDate on submit
  eventTime: string   // "HH:MM" - combined with eventDate on submit
  endTime:   string   // "HH:MM" - combined with endDate on submit
}

// ─── Empty form ───────────────────────────────────────────────────────────────

const EMPTY: FormState = {
  id: 0, title: "", descriptions: "",
  startDate: "", eventDate: "", endDate: "",
  location: "", locationUrl: "", eventType: "", isActive: true,
  startTime: "", eventTime: "", endTime: "",
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

  // ── Load ── (handles 204 No Content that backend returns for empty list)
  const loadEvents = async () => {
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<EventVM[]>>("/Event/GetAll")
      // Backend returns 204 (no body) when list is empty → res.data is null/""
      setEvents(res.data?.result ?? [])
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadEvents() }, [])

  // ── Filter + paginate ─────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return events
    const q = search.toLowerCase()
    return events.filter(e =>
      `${e.title} ${e.eventType} ${e.location}`.toLowerCase().includes(q)
    )
  }, [events, search])

  const today = new Date(); today.setHours(0, 0, 0, 0)

  // Past events: endDate is set and is before today
  const pastEvents = useMemo(() =>
    events.filter(e => {
      if (!e.endDate) return false
      return new Date(e.endDate) < today
    }),
    [events]
  )

  // Upcoming events: startDate is set and is >= today
  const upcomingEvents = useMemo(() =>
    events.filter(e => {
      if (!e.startDate) return false
      return new Date(e.startDate) >= today
    }),
    [events]
  )

  // Helper: is an event expired (endDate < today)
  const isExpired = (e: EventVM) => !!e.endDate && new Date(e.endDate) < today

  // Helper: is an event upcoming (startDate >= today)
  const isUpcoming = (e: EventVM) => !!e.startDate && new Date(e.startDate) >= today

  // For All Events tab: sort upcoming first, then the rest, expired last
  const filteredSorted = useMemo(() => {
    const up   = filtered.filter(e => isUpcoming(e))
    const mid  = filtered.filter(e => !isUpcoming(e) && !isExpired(e))
    const exp  = filtered.filter(e => isExpired(e))
    return [...up, ...mid, ...exp]
  }, [filtered, events])

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize))
  const paged = useMemo(
    () => filteredSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredSorted, currentPage, pageSize]
  )
  const from = filteredSorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to   = Math.min(currentPage * pageSize, filteredSorted.length)

  useEffect(() => { setCurrentPage(1) }, [search, pageSize])
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [totalPages, currentPage])

  // ── Typed field setter (avoids any) ──────────────────────────────────────

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.title.trim())     return toast.error("Title is required")
    if (!form.eventType.trim()) return toast.error("Event Type is required")
    if (!form.eventDate)        return toast.error("Event Date is required")

    setSaving(true)
    try {
      // Combine date + time fields into full ISO datetime strings for the API
      const payload: EventVM = {
        ...form,
        startDate: combineDateTime(form.startDate, form.startTime),
        eventDate: combineDateTime(form.eventDate, form.eventTime),
        endDate:   combineDateTime(form.endDate,   form.endTime),
      }
      const res = isEdit
        ? await api.put<ApiResponse>("/Event/Update", payload)
        : await api.post<ApiResponse>("/Event/Insert", payload)

      if (res.data?.isSuccess) {
        toast.success(res.data.resMsg ?? (isEdit ? "Event updated" : "Event created"))
        resetForm()
        loadEvents()
      } else {
        toast.error(res.data?.resMsg ?? "Operation failed")
      }
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setSaving(false)
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  const handleEdit = (evt: EventVM) => {
    setForm({
      ...evt,
      startDate:   toDateInput(evt.startDate),
      eventDate:   toDateInput(evt.eventDate),
      endDate:     toDateInput(evt.endDate),
      locationUrl: evt.locationUrl ?? "",
      // Split time parts for the time inputs
      startTime:   toTimeInput(evt.startDate),
      eventTime:   toTimeInput(evt.eventDate),
      endTime:     toTimeInput(evt.endDate),
    })
    setIsEdit(true)
    setView("form")
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      // Backend: DELETE /Event/Delete/{id}
      const res = await api.delete<ApiResponse>(`/Event/Delete/${deleteId}`)
      if (res.data?.isSuccess) {
        toast.success(res.data.resMsg ?? "Event deleted")
        loadEvents()
      } else {
        toast.error(res.data?.resMsg ?? "Delete failed")
      }
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setDeleteId(null)
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setForm(EMPTY)
    setIsEdit(false)
    setView("list")
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#f5f6fa]">

      {/* ── Toolbar ── */}
      <div className="bg-white border-b border-gray-200 px-5 pt-3 pb-0">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h1 className="text-[16px] font-bold text-gray-900 leading-tight flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-indigo-500" />
              Event Management
            </h1>
            <p className="text-[11.5px] text-gray-400">Schedule and manage society events</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadEvents}
              className="h-7 px-2.5 text-[11.5px] gap-1.5 border-gray-200 text-gray-500">
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm"
              onClick={() => { setForm(EMPTY); setIsEdit(false); setView("form") }}
              className="h-7 px-3 text-[11.5px] gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-3 w-3" />Add Event
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-end gap-0">
          {([
            { label: "All Events",                         icon: List,           value: "list"     },
            { label: isEdit ? "Edit Event" : "Add Event",  icon: isEdit ? Pencil : Plus, value: "form" },
            { label: "Upcoming Events",                    icon: CalendarRange,  value: "upcoming" },
            { label: "Past Events",                        icon: History,        value: "history"  },
          ] as { label: string; icon: React.FC<{ className?: string }>; value: ViewType }[]).map(tab => {
            const Icon = tab.icon
            const isActive = view === tab.value
            return (
              <button key={tab.value}
                onClick={() => {
                  if (tab.value === "list")     resetForm()
                  else if (tab.value === "history")  { setIsEdit(false); setView("history")  }
                  else if (tab.value === "upcoming") { setIsEdit(false); setView("upcoming") }
                  else { setForm(EMPTY); setIsEdit(false); setView("form") }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-medium border-t border-l border-r transition-all rounded-t-lg",
                  isActive
                    ? "bg-white border-gray-200 text-gray-900 font-semibold border-b-white -mb-px z-10 relative"
                    : "bg-transparent border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}>
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-indigo-500" : "text-gray-400")} />
                {tab.label}
                {tab.value === "list" && isActive && (
                  <span className="ml-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0">
                    {filteredSorted.length}
                  </span>
                )}
                {tab.value === "upcoming" && isActive && (
                  <span className="ml-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0">
                    {upcomingEvents.length}
                  </span>
                )}
                {tab.value === "history" && isActive && (
                  <span className="ml-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0">
                    {pastEvents.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content Card ── */}
      <div className="flex-1 overflow-hidden flex flex-col mx-4 my-3 bg-white rounded-xl border border-gray-200 shadow-sm">

        {/* ══════════ LIST ══════════ */}
        {view === "list" && (
          <>
            {/* Controls row */}
            <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 shrink-0">
              <span className="text-[12px] text-gray-500 shrink-0">Show</span>
              <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                <SelectTrigger className="h-6 w-14 text-[11.5px] rounded border-gray-200 px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map(n => (
                    <SelectItem key={n} value={String(n)} className="text-[12px]">{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[12px] text-gray-500 shrink-0">entries</span>

              <span className="text-[12px] text-gray-400 shrink-0">
                Showing <b className="text-gray-600">{from}</b>–<b className="text-gray-600">{to}</b> of{" "}
                <b className="text-gray-600">{filtered.length}</b>
              </span>

              <div className="relative ml-auto">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                <Input placeholder="Search title, type, location…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-7 h-6 w-56 text-[12px] rounded border-gray-200 bg-gray-50" />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1">
              <table className="w-full text-[12.5px] border-collapse table-fixed">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[13%]" />
                  <col className="w-[13%]" />
                  <col className="w-[14%]" />
                  <col className="w-[20%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Title</th>
                    <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Type</th>
                    <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                    <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Event Date</th>
                    <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Location</th>
                    <th className="text-right px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {/* Loading skeletons */}
                  {loading && Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-3 py-2.5">
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Empty */}
                  {!loading && paged.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <CalendarDays className="h-8 w-8 opacity-20" />
                          <p className="text-[13px] font-medium text-gray-500">No events found</p>
                          <p className="text-[12px]">
                            {search ? "Try a different search term" : "Create your first event"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Data rows */}
                  {!loading && paged.map(evt => {
                    const expired  = isExpired(evt)
                    const upcoming = isUpcoming(evt)
                    return (
                    <tr key={evt.id}
                      className={cn(
                        "border-b border-gray-50 transition-colors",
                        expired   ? "bg-rose-50/20 hover:bg-rose-50/40"
                        : upcoming ? "bg-emerald-50/20 hover:bg-emerald-50/40"
                        : "hover:bg-indigo-50/20"
                      )}>

                      {/* Title + description + date range as subtitle */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-lg shrink-0",
                            expired ? "bg-rose-50" : upcoming ? "bg-emerald-50" : "bg-indigo-50"
                          )}>
                            <CalendarCheck className={cn(
                              "h-3.5 w-3.5",
                              expired ? "text-rose-400" : upcoming ? "text-emerald-500" : "text-indigo-500"
                            )} />
                          </div>
                          <div className="min-w-0">
                            <p className={cn(
                              "font-semibold leading-tight truncate",
                              expired ? "text-gray-500" : "text-gray-800"
                            )}>
                              {evt.title}
                            </p>
                            {(evt.startDate || evt.endDate) && (
                              <p className="text-[10.5px] text-gray-400 truncate">
                                {evt.startDate ? fmtDateTime(evt.startDate) : "—"}
                                {evt.endDate ? ` → ${fmtDateTime(evt.endDate)}` : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type — clean badge only */}
                      <td className="px-3 py-2.5">
                        <Badge variant="outline"
                          className={cn(
                            "text-[10.5px] px-2 py-0 h-5 rounded-full border font-semibold",
                            expired ? "opacity-60" : "",
                            typeBadgeClass(evt.eventType)
                          )}>
                          {evt.eventType}
                        </Badge>
                      </td>

                      {/* Status — new dedicated column */}
                      <td className="px-3 py-2.5">
                        {expired ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-500 border border-rose-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 inline-block" />
                            Expired
                          </span>
                        ) : upcoming ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                            Upcoming
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Event date */}
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 text-[12px] text-gray-700">
                            <CalendarDays className="h-3 w-3 text-gray-300 shrink-0" />
                            {fmtDate(evt.eventDate)}
                          </div>
                          {evt.eventDate?.includes("T") && !evt.eventDate.endsWith("T00:00:00") && (
                            <span className="text-[10.5px] text-indigo-500 font-medium pl-4">
                              {new Date(evt.eventDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Location + Map link */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                          <MapPin className="h-3 w-3 text-gray-300 shrink-0" />
                          <span className="truncate">{evt.location || "—"}</span>
                          {evt.locationUrl && (
                            <a href={evt.locationUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-0.5 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors shrink-0"
                              onClick={e => e.stopPropagation()}>
                              <ExternalLink className="h-2.5 w-2.5" />Map
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(evt)}
                            className="h-6 w-6 p-0 rounded border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDeleteId(evt.id)}
                            className="h-6 w-6 p-0 rounded border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-300">
                            <Trash2 className="h-3 w-3" />
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
              <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/50 shrink-0">
                <span className="text-[11.5px] text-gray-400">
                  Page <b className="text-gray-600">{currentPage}</b> of{" "}
                  <b className="text-gray-600">{totalPages}</b>
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="h-6 w-6 p-0 rounded border-gray-200">
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
                    <Button key={page} size="sm" onClick={() => setCurrentPage(page)}
                      className={cn("h-6 w-6 p-0 text-[11px] rounded",
                        page === currentPage
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                          : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}>
                      {page}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="h-6 w-6 p-0 rounded border-gray-200">
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════ UPCOMING EVENTS ══════════ */}
        {view === "upcoming" && (
          <>
            <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-1.5">
                <CalendarRange className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[12px] text-gray-500">
                  Events where <b className="text-gray-700">Start Date</b> is today or in future
                </span>
              </div>
              <span className="text-[12px] text-gray-400 ml-auto">
                <b className="text-gray-600">{upcomingEvents.length}</b> upcoming event{upcomingEvents.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-[12.5px] border-collapse table-fixed">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[15%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[19%]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Title</th>
                    <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Type</th>
                    <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Start Date</th>
                    <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Event Date</th>
                    <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-3 py-2.5">
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))}

                  {!loading && upcomingEvents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <CalendarRange className="h-8 w-8 opacity-20" />
                          <p className="text-[13px] font-medium text-gray-500">No upcoming events</p>
                          <p className="text-[12px]">Events with a start date from today onwards will appear here</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loading && upcomingEvents.map(evt => (
                    <tr key={evt.id}
                      className="border-b border-gray-50 bg-emerald-50/10 hover:bg-emerald-50/30 transition-colors">

                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 shrink-0">
                            <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 leading-tight truncate">{evt.title}</p>
                            {evt.descriptions && (
                              <p className="text-[11px] text-gray-400 truncate">{evt.descriptions}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2.5">
                        <Badge variant="outline"
                          className={cn("text-[10.5px] px-2 py-0 h-5 rounded-full border font-semibold", typeBadgeClass(evt.eventType))}>
                          {evt.eventType}
                        </Badge>
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium">
                            <CalendarDays className="h-3 w-3 text-emerald-400 shrink-0" />
                            {fmtDate(evt.startDate)}
                          </div>
                          {evt.startDate?.includes("T") && !evt.startDate.endsWith("T00:00:00") && (
                            <span className="text-[10.5px] text-emerald-500 font-medium pl-4">
                              {new Date(evt.startDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 text-[12px] text-gray-600">
                            <CalendarDays className="h-3 w-3 text-gray-300 shrink-0" />
                            {fmtDate(evt.eventDate)}
                          </div>
                          {evt.eventDate?.includes("T") && !evt.eventDate.endsWith("T00:00:00") && (
                            <span className="text-[10.5px] text-indigo-500 font-medium pl-4">
                              {new Date(evt.eventDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                          <MapPin className="h-3 w-3 text-gray-300 shrink-0" />
                          <span className="truncate">{evt.location || "—"}</span>
                          {evt.locationUrl && (
                            <a href={evt.locationUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-0.5 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors shrink-0"
                              onClick={e => e.stopPropagation()}>
                              <ExternalLink className="h-2.5 w-2.5" />Map
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50 shrink-0">
              <p className="text-[11.5px] text-gray-400">
                Showing all <b className="text-gray-600">{upcomingEvents.length}</b> upcoming events
              </p>
            </div>
          </>
        )}

        {/* ══════════ PAST EVENTS / HISTORY ══════════ */}
        {view === "history" && (
          <>
            {/* Controls row */}
            <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[12px] text-gray-500">
                  Events where <b className="text-gray-700">End Date</b> is before today
                </span>
              </div>
              <span className="text-[12px] text-gray-400 ml-auto">
                <b className="text-gray-600">{pastEvents.length}</b> past event{pastEvents.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-[12.5px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Title</th>
                    <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">Type</th>
                    <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">Event Date</th>
                    <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">End Date</th>
                    <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-3 py-2.5">
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))}

                  {!loading && pastEvents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <History className="h-8 w-8 opacity-20" />
                          <p className="text-[13px] font-medium text-gray-500">No past events</p>
                          <p className="text-[12px]">Events with an end date before today will appear here</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loading && pastEvents.map(evt => (
                    <tr key={evt.id}
                      className="border-b border-gray-50 hover:bg-slate-50/40 transition-colors opacity-80">

                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 shrink-0">
                            <CalendarCheck className="h-3.5 w-3.5 text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-600 leading-tight truncate max-w-[200px]">{evt.title}</p>
                            {evt.descriptions && (
                              <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{evt.descriptions}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <Badge variant="outline"
                          className={cn("text-[10.5px] px-2 py-0 h-5 rounded-full border font-semibold opacity-70", typeBadgeClass(evt.eventType))}>
                          {evt.eventType}
                        </Badge>
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <CalendarDays className="h-3 w-3 text-gray-300 shrink-0" />
                          {fmtDate(evt.eventDate)}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-[12px]">
                            <Clock className="h-3 w-3 text-gray-300 shrink-0" />
                            <span className="text-rose-500 font-medium">{fmtDate(evt.endDate)}</span>
                            <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">Done</span>
                          </div>
                          {evt.endDate?.includes("T") && !evt.endDate.endsWith("T00:00:00") && (
                            <span className="text-[10.5px] text-rose-400 font-medium pl-4">
                              {new Date(evt.endDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                          <MapPin className="h-3 w-3 text-gray-300 shrink-0" />
                          <span className="truncate max-w-[120px]">{evt.location || "—"}</span>
                          {evt.locationUrl && (
                            <a href={evt.locationUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-0.5 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors shrink-0">
                              <ExternalLink className="h-2.5 w-2.5" />Map
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50 shrink-0">
              <p className="text-[11.5px] text-gray-400">
                Showing all <b className="text-gray-600">{pastEvents.length}</b> completed events
              </p>
            </div>
          </>
        )}

        {/* ══════════ FORM ══════════ */}
        {view === "form" && (
          <div className="flex-1 flex items-start justify-center p-5 overflow-y-auto">
            <div className="w-full max-w-2xl">

              {/* Form header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                    {isEdit
                      ? <Pencil className="h-4 w-4 text-indigo-600" />
                      : <CalendarRange className="h-4 w-4 text-indigo-600" />}
                  </div>
                  <div>
                    <h2 className="text-[14px] font-bold text-gray-900 leading-tight">
                      {isEdit ? "Edit Event" : "Create New Event"}
                    </h2>
                    <p className="text-[11.5px] text-gray-400">
                      {isEdit ? "Update event details below" : "Fill in the event information"}
                    </p>
                  </div>
                </div>
                <button onClick={resetForm}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form body */}
              <div className="bg-gray-50/60 rounded-xl border border-gray-200 p-5 space-y-4">

                {/* Row 1: Title + Event Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FInput id="title" label="Event Title" required
                    value={form.title} onChange={v => setField("title", v)} disabled={saving} />
                  <FInput id="eventType" label="Event Type" required
                    value={form.eventType} onChange={v => setField("eventType", v)} disabled={saving} />
                </div>

                {/* Row 2: Dates + Times — each date has a companion time picker */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Start Date + Time */}
                  <div className="space-y-2">
                    <FInput id="startDate" label="Start Date" type="date"
                      value={form.startDate} onChange={v => setField("startDate", v)} disabled={saving} />
                    <FInput id="startTime" label="Start Time (AM/PM)" type="time"
                      value={form.startTime} onChange={v => setField("startTime", v)} disabled={saving} />
                    {form.startTime && (
                      <p className="text-[11px] text-indigo-500 font-medium pl-1">
                        🕐 {formatTimeTo12hr(form.startTime)}
                      </p>
                    )}
                  </div>

                  {/* Event Date + Time */}
                  <div className="space-y-2">
                    <FInput id="eventDate" label="Event Date" type="date" required
                      value={form.eventDate} onChange={v => setField("eventDate", v)} disabled={saving} />
                    <FInput id="eventTime" label="Event Time (AM/PM)" type="time"
                      value={form.eventTime} onChange={v => setField("eventTime", v)} disabled={saving} />
                    {form.eventTime && (
                      <p className="text-[11px] text-indigo-500 font-medium pl-1">
                        🕐 {formatTimeTo12hr(form.eventTime)}
                      </p>
                    )}
                  </div>

                  {/* End Date + Time */}
                  <div className="space-y-2">
                    <FInput id="endDate" label="End Date" type="date"
                      value={form.endDate} onChange={v => setField("endDate", v)} disabled={saving} />
                    <FInput id="endTime" label="End Time (AM/PM)" type="time"
                      value={form.endTime} onChange={v => setField("endTime", v)} disabled={saving} />
                    {form.endTime && (
                      <p className="text-[11px] text-indigo-500 font-medium pl-1">
                        🕐 {formatTimeTo12hr(form.endTime)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 3: Location + Location URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FInput id="location" label="Location / Venue"
                    value={form.location} onChange={v => setField("location", v)} disabled={saving} />
                  <FInput id="locationUrl" label="Map URL (optional)"
                    value={form.locationUrl} onChange={v => setField("locationUrl", v)} disabled={saving} />
                </div>
                {form.locationUrl && (
                  <div className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2">
                    <ExternalLink className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <span className="text-[12px] text-gray-500 truncate flex-1">{form.locationUrl}</span>
                    <a href={form.locationUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[11.5px] font-semibold text-indigo-600 hover:underline shrink-0">
                      Preview →
                    </a>
                  </div>
                )}

                {/* Row 4: Description */}
                <FTextarea id="descriptions" label="Description"
                  value={form.descriptions} onChange={v => setField("descriptions", v)} disabled={saving} />

                <div className="h-px bg-gray-200" />

                {/* Buttons */}
                <div className="flex gap-2.5">
                  <Button onClick={handleSubmit} disabled={saving}
                    className="flex-1 h-9 text-[13px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm">
                    {saving
                      ? (isEdit ? "Updating…" : "Creating…")
                      : (isEdit ? "Update Event" : "Create Event")}
                  </Button>
                  <Button variant="outline" onClick={resetForm} disabled={saving}
                    className="flex-1 h-9 text-[13px] font-medium border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg">
                    Cancel
                  </Button>
                </div>
              </div>

              {!isEdit && (
                <p className="text-center text-[11.5px] text-gray-400 mt-3">
                  Event will be active by default after creation.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirm Dialog ── */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl max-w-sm p-0 overflow-hidden gap-0">
          <AlertDialogHeader className="px-5 py-4 border-b bg-rose-50 border-rose-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
                <Trash2 className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-[14px] font-bold text-gray-900 leading-tight">
                  Delete Event?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[11.5px] text-gray-500 mt-0">
                  This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 py-4 gap-2 flex-row">
            <AlertDialogCancel className="flex-1 h-8 text-[12.5px] rounded-lg border-gray-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}
              className="flex-1 h-8 text-[12.5px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
