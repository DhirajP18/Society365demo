"use client"

import { useEffect, useMemo, useState } from "react"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Bell, RefreshCw, Plus, Pencil, Trash2, Search,
  Calendar, ChevronLeft, ChevronRight, Clock,
  AlertTriangle, FileText, Users, X, CheckCircle2,
  History, CalendarClock, BellRing, Eye,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TblNoticeVM {
  id:           number
  title:        string
  descriptions: string
  noticefor:    string
  startDate:    string
  endDate:      string
  isActive:     boolean
  isExprire?:   boolean
}

type ApiResponse<T = unknown> = {
  statusCode?: number; isSuccess?: boolean; resMsg?: string; result?: T
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY: TblNoticeVM = {
  id: 0, title: "", descriptions: "", noticefor: "All",
  startDate: "", endDate: "", isActive: true, isExprire: false,
}

function fmtDate(d?: string | null) {
  if (!d) return "—"
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function toInputDate(d?: string | null) {
  if (!d) return ""
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ""
  return dt.toISOString().split("T")[0]
}

function getStatus(notice: TblNoticeVM): "active" | "upcoming" | "expired" {
  const now  = new Date(); now.setHours(0,0,0,0)
  const start = notice.startDate ? new Date(notice.startDate) : null
  const end   = notice.endDate   ? new Date(notice.endDate)   : null
  if (start) start.setHours(0,0,0,0)
  if (end)   end.setHours(23,59,59,999)
  if (!notice.isActive || (end && end < now)) return "expired"
  if (start && start > now)                   return "upcoming"
  return "active"
}

const TARGET_OPTIONS = ["All", "Residents", "Staff", "Committee", "Security"]
const ITEMS_PER_PAGE = 8

// ─── Floating label input ─────────────────────────────────────────────────────

function FInput({
  id, label, type = "text", value, onChange, disabled = false, as
}: {
  id?: string; label: string; type?: string; value: string
  onChange: (v: string) => void; disabled?: boolean; as?: "textarea"
}) {
  const [focused, setFocused] = useState(false)
  const active = focused || (value?.length ?? 0) > 0

  const base = cn(
    "w-full rounded-xl border bg-white dark:bg-gray-900/60 text-[13px] text-gray-900 dark:text-gray-100",
    "outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed",
    "placeholder:text-transparent",
    focused
      ? "border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
      : "border-gray-200 dark:border-gray-700/70 hover:border-gray-300 dark:hover:border-gray-600"
  )

  return (
    <div className="relative">
      {as === "textarea" ? (
        <textarea
          id={id} value={value} disabled={disabled} rows={3}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className={cn(base, "px-3 pt-5 pb-2 resize-none")}
        />
      ) : (
        <input
          id={id} type={type} value={value} disabled={disabled}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className={cn(base, "h-11 px-3 pt-4 pb-1")}
        />
      )}
      <label htmlFor={id} className={cn(
        "pointer-events-none absolute left-3 font-medium transition-all duration-150 select-none",
        active
          ? "top-[5px] text-[10px] text-indigo-500 dark:text-indigo-400 tracking-wide"
          : as === "textarea"
            ? "top-3.5 text-[12.5px] text-gray-400 dark:text-gray-500"
            : "top-1/2 -translate-y-1/2 text-[12.5px] text-gray-400 dark:text-gray-500"
      )}>
        {label}
      </label>
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "active" | "upcoming" | "expired" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border",
      status === "active"   && "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
      status === "upcoming" && "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
      status === "expired"  && "bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/[0.08]"
    )}>
      {status === "active"   && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
      {status === "upcoming" && <CalendarClock className="h-3 w-3" />}
      {status === "expired"  && <History className="h-3 w-3" />}
      {status === "active" ? "Active" : status === "upcoming" ? "Upcoming" : "Expired"}
    </span>
  )
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabId = "all" | "active" | "upcoming" | "history" | "form"

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NoticePage() {
  const [notices,    setNotices]    = useState<TblNoticeVM[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [tab,        setTab]        = useState<TabId>("all")
  const [form,       setForm]       = useState<TblNoticeVM>(EMPTY)
  const [isEdit,     setIsEdit]     = useState(false)
  const [deleteId,   setDeleteId]   = useState<number | null>(null)
  const [search,     setSearch]     = useState("")
  const [page,       setPage]       = useState(1)
  const [viewNotice, setViewNotice] = useState<TblNoticeVM | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadNotices = async () => {
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<TblNoticeVM[]>>("/Notice/GetAll")
      setNotices(res.data?.result ?? [])
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadNotices() }, [])

  // ── Filtered data ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...notices]
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(n =>
      `${n.title} ${n.descriptions} ${n.noticefor}`.toLowerCase().includes(q)
    )
    if (tab === "active")   list = list.filter(n => getStatus(n) === "active")
    if (tab === "upcoming") list = list.filter(n => getStatus(n) === "upcoming")
    if (tab === "history")  list = list.filter(n => getStatus(n) === "expired")
    return list
  }, [notices, search, tab])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Count per tab
  const counts = useMemo(() => ({
    all:      notices.length,
    active:   notices.filter(n => getStatus(n) === "active").length,
    upcoming: notices.filter(n => getStatus(n) === "upcoming").length,
    history:  notices.filter(n => getStatus(n) === "expired").length,
  }), [notices])

  // ── Form actions ──────────────────────────────────────────────────────────

  const openAdd = () => {
    setForm(EMPTY); setIsEdit(false); setTab("form")
  }

  const openEdit = (n: TblNoticeVM) => {
    setForm({
      ...n,
      startDate: toInputDate(n.startDate),
      endDate:   toInputDate(n.endDate),
    })
    setIsEdit(true); setTab("form")
  }

  const cancelForm = () => {
    setForm(EMPTY); setIsEdit(false); setTab("all")
  }

  const handleSave = async () => {
    if (!form.title.trim())         return toast.error("Title is required")
    if (!form.startDate)            return toast.error("Start date is required")
    if (!form.endDate)              return toast.error("End date is required")
    if (form.endDate < form.startDate) return toast.error("End date must be after start date")

    setSaving(true)
    try {
      if (isEdit) {
        const res = await api.put<ApiResponse>("/Notice/Update", form)
        if (res.data?.isSuccess) {
          toast.success("Notice updated successfully")
          cancelForm(); await loadNotices()
        } else toast.error(res.data?.resMsg ?? "Update failed")
      } else {
        const res = await api.post<ApiResponse>("/Notice/Insert", form)
        if (res.data?.isSuccess) {
          toast.success("Notice created successfully")
          cancelForm(); await loadNotices()
        } else toast.error(res.data?.resMsg ?? "Insert failed")
      }
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      const res = await api.delete<ApiResponse>(`/Notice/Delete/${deleteId}`)
      if (res.data?.isSuccess) {
        toast.success("Notice deleted"); await loadNotices()
      } else toast.error(res.data?.resMsg ?? "Delete failed")
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setDeleteId(null) }
  }

  // ── Tab list ──────────────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; short: string; icon: React.FC<{className?: string}>; count?: number }[] = [
    { id: "all",      label: "All Notices",    short: "All",      icon: Bell,        count: counts.all      },
    { id: "active",   label: "Active",         short: "Active",   icon: BellRing,    count: counts.active   },
    { id: "upcoming", label: "Upcoming",       short: "Soon",     icon: CalendarClock,count: counts.upcoming},
    { id: "history",  label: "History",        short: "History",  icon: History,     count: counts.history  },
    { id: "form",     label: isEdit ? "Edit Notice" : "New Notice", short: isEdit ? "Edit" : "Add", icon: isEdit ? Pencil : Plus },
  ]

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#f5f6fa] dark:bg-[#0a0c11]">

      {/* ═══ TOOLBAR ═══ */}
      <div className="bg-white dark:bg-[#0f1117] border-b border-gray-200 dark:border-white/[0.06] px-3 sm:px-5 pt-3 pb-0 shrink-0">

        {/* Top row */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 shrink-0">
              <Bell className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[14px] sm:text-[16px] font-bold text-gray-900 dark:text-white leading-tight">
                Notice Board
              </h1>
              <p className="hidden sm:block text-[11px] text-gray-400 dark:text-gray-500">
                Manage and publish notices for residents &amp; staff
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={loadNotices} disabled={loading}
              className="h-7 px-2 text-[11px] gap-1 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 dark:text-gray-400">
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={openAdd}
              className="h-7 px-2.5 sm:px-3 text-[11.5px] gap-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg shadow-[0_2px_6px_rgba(139,92,246,0.3)]">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden xs:inline sm:inline">Add Notice</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-end gap-0 overflow-x-auto scrollbar-none -mb-px">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setPage(1) }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 sm:px-4 py-2 border-b-2 text-[11.5px] sm:text-[12.5px] font-semibold whitespace-nowrap shrink-0 transition-all",
                tab === t.id
                  ? "border-violet-500 text-violet-600 dark:text-violet-400"
                  : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              )}>
              <t.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.short}</span>
              {t.count !== undefined && (
                <span className={cn(
                  "inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9.5px] font-black",
                  tab === t.id
                    ? "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300"
                    : "bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400"
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* ── FORM TAB ── */}
        {tab === "form" && (
          <div className="flex-1 overflow-auto p-3 sm:p-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-gray-200 dark:border-white/[0.07] shadow-sm overflow-hidden">

                {/* Form header */}
                <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]
                  bg-gradient-to-r from-violet-50 to-white dark:from-violet-950/20 dark:to-[#0f1117]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/25 shrink-0">
                    {isEdit ? <Pencil className="h-4 w-4 text-violet-600 dark:text-violet-400" /> : <Plus className="h-4 w-4 text-violet-600 dark:text-violet-400" />}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-gray-900 dark:text-white">
                      {isEdit ? "Edit Notice" : "Create New Notice"}
                    </p>
                    <p className="text-[11.5px] text-gray-400 dark:text-gray-500">
                      {isEdit ? "Update notice details below" : "Fill in the notice details and publish"}
                    </p>
                  </div>
                </div>

                {/* Form fields */}
                <div className="p-4 sm:p-5 space-y-4">

                  {/* Title */}
                  <FInput id="title" label="Notice Title *" value={form.title}
                    onChange={v => setForm(f => ({ ...f, title: v }))} />

                  {/* Description */}
                  <FInput id="desc" label="Description" as="textarea" value={form.descriptions}
                    onChange={v => setForm(f => ({ ...f, descriptions: v }))} />

                  {/* Notice For + Active row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Notice For */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Notice For</label>
                      <div className="flex flex-wrap gap-2">
                        {TARGET_OPTIONS.map(opt => (
                          <button key={opt} type="button"
                            onClick={() => setForm(f => ({ ...f, noticefor: opt }))}
                            className={cn(
                              "flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] font-semibold transition-all",
                              form.noticefor === opt
                                ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                                : "bg-gray-50 dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:border-violet-300 dark:hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-400"
                            )}>
                            <Users className="h-3 w-3 shrink-0" />
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Is Active toggle */}
                    <div className="flex items-end pb-1">
                      <div className="flex items-center justify-between w-full rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center",
                            form.isActive ? "bg-emerald-100 dark:bg-emerald-500/15" : "bg-gray-100 dark:bg-white/[0.05]")}>
                            {form.isActive
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              : <X className="h-3.5 w-3.5 text-gray-400" />
                            }
                          </div>
                          <span className="text-[12.5px] font-semibold text-gray-700 dark:text-gray-300">
                            {form.isActive ? "Active Notice" : "Inactive Notice"}
                          </span>
                        </div>
                        <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                      </div>
                    </div>
                  </div>

                  {/* Date row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FInput id="start" label="Start Date *" type="date" value={form.startDate}
                      onChange={v => setForm(f => ({ ...f, startDate: v }))} />
                    <FInput id="end" label="End Date *" type="date" value={form.endDate}
                      onChange={v => setForm(f => ({ ...f, endDate: v }))} />
                  </div>

                  {/* Date preview */}
                  {form.startDate && form.endDate && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/[0.07] border border-violet-100 dark:border-violet-500/20">
                      <Calendar className="h-4 w-4 text-violet-500 shrink-0" />
                      <span className="text-[12px] font-semibold text-violet-700 dark:text-violet-300">
                        {fmtDate(form.startDate)} → {fmtDate(form.endDate)}
                      </span>
                      {form.endDate < form.startDate && (
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold ml-auto">⚠ End before start</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Form footer */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 px-4 sm:px-5 py-4 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.01]">
                  <Button variant="outline" onClick={cancelForm}
                    className="h-9 px-4 text-[12.5px] rounded-xl border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}
                    className="h-9 px-5 text-[12.5px] font-bold rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-[0_2px_8px_rgba(139,92,246,0.3)] disabled:opacity-50 gap-2">
                    {saving
                      ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Saving…</>
                      : <>{isEdit ? <><Pencil className="h-3.5 w-3.5" />Update Notice</> : <><Plus className="h-3.5 w-3.5" />Publish Notice</>}</>
                    }
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── LIST TABS ── */}
        {tab !== "form" && (
          <>
            {/* Controls row */}
            <div className="bg-white dark:bg-[#0f1117] border-b border-gray-100 dark:border-white/[0.05] px-3 sm:px-5 py-2 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{paged.length}</span> of{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{filtered.length}</span> notices
                </p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <input
                    placeholder="Search notices…"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                    className="h-8 pl-8 pr-8 w-44 sm:w-56 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] text-[12px] text-gray-700 dark:text-gray-200 outline-none focus:border-violet-300 dark:focus:border-violet-500/50 focus:bg-white dark:focus:bg-white/[0.07] placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Notice list */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="p-3 sm:p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-xl bg-white dark:bg-[#0f1117] border border-gray-100 dark:border-white/[0.05] animate-pulse" />
                  ))}
                </div>
              ) : paged.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
                  <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/[0.09] flex items-center justify-center">
                    <Bell className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-gray-500 dark:text-gray-400">
                      {search ? `No notices match "${search}"` : "No notices yet"}
                    </p>
                    <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-1">
                      {!search && tab === "all" && 'Click "Add Notice" to publish your first notice'}
                    </p>
                  </div>
                  {!search && tab === "all" && (
                    <Button size="sm" onClick={openAdd}
                      className="h-8 px-4 text-[12.5px] gap-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg">
                      <Plus className="h-3.5 w-3.5" />Add Notice
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* ── Mobile cards ── */}
                  <div className="sm:hidden divide-y divide-gray-100 dark:divide-white/[0.04]">
                    {paged.map((n, idx) => {
                      const status = getStatus(n)
                      return (
                        <div key={n.id}
                          className="flex items-start gap-3 px-3 py-3 bg-white dark:bg-[#0f1117] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors animate-[fadeIn_0.25s_ease_both]"
                          style={{ animationDelay: `${idx * 30}ms` }}>
                          {/* Icon */}
                          <div className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-xl shrink-0",
                            status === "active"   && "bg-emerald-50 dark:bg-emerald-500/10",
                            status === "upcoming" && "bg-blue-50 dark:bg-blue-500/10",
                            status === "expired"  && "bg-gray-100 dark:bg-white/[0.05]",
                          )}>
                            <Bell className={cn("h-4 w-4",
                              status === "active"   && "text-emerald-600 dark:text-emerald-400",
                              status === "upcoming" && "text-blue-600 dark:text-blue-400",
                              status === "expired"  && "text-gray-400 dark:text-gray-500",
                            )} />
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[13px] font-semibold text-gray-800 dark:text-white leading-tight truncate">
                                {n.title}
                              </p>
                              <StatusBadge status={status} />
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">{n.descriptions}</p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className="flex items-center gap-1 text-[10.5px] text-gray-400 dark:text-gray-500">
                                <Users className="h-3 w-3" />{n.noticefor}
                              </span>
                              <span className="flex items-center gap-1 text-[10.5px] text-gray-400 dark:text-gray-500">
                                <Calendar className="h-3 w-3" />{fmtDate(n.startDate)} – {fmtDate(n.endDate)}
                              </span>
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex flex-col gap-1 shrink-0">
                            <button onClick={() => setViewNotice(n)}
                              className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-violet-600 hover:border-violet-300 transition-all">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => openEdit(n)}
                              className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-all">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => setDeleteId(n.id)}
                              className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-rose-600 hover:border-rose-300 transition-all">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* ── Desktop table ── */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full border-collapse text-[12.5px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/[0.06]">
                          {["#","Title","For","Start Date","End Date","Status","Active","Actions"].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paged.map((n, idx) => {
                          const status = getStatus(n)
                          return (
                            <tr key={n.id}
                              className="border-b border-gray-50 dark:border-white/[0.03] hover:bg-violet-50/20 dark:hover:bg-white/[0.02] transition-colors animate-[fadeIn_0.25s_ease_both] bg-white dark:bg-[#0f1117]"
                              style={{ animationDelay: `${idx * 30}ms` }}>
                              <td className="px-4 py-3 text-[11px] text-gray-400 dark:text-gray-600">
                                {(page - 1) * ITEMS_PER_PAGE + idx + 1}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5 max-w-[260px]">
                                  <div className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                                    status === "active"   && "bg-emerald-50 dark:bg-emerald-500/10",
                                    status === "upcoming" && "bg-blue-50 dark:bg-blue-500/10",
                                    status === "expired"  && "bg-gray-100 dark:bg-white/[0.05]",
                                  )}>
                                    <Bell className={cn("h-3.5 w-3.5",
                                      status === "active"   && "text-emerald-600 dark:text-emerald-400",
                                      status === "upcoming" && "text-blue-600 dark:text-blue-400",
                                      status === "expired"  && "text-gray-400 dark:text-gray-500",
                                    )} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-800 dark:text-white truncate">{n.title}</p>
                                    {n.descriptions && (
                                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{n.descriptions}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="flex items-center gap-1 text-[11.5px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 w-fit">
                                  <Users className="h-3 w-3" />{n.noticefor}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 text-[12px]">
                                  <Calendar className="h-3 w-3 text-gray-400" />{fmtDate(n.startDate)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 text-[12px]">
                                  <Clock className="h-3 w-3 text-gray-400" />{fmtDate(n.endDate)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={status} />
                              </td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  "text-[11px] font-bold px-2 py-0.5 rounded-full border",
                                  n.isActive
                                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                                    : "bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/[0.08]"
                                )}>
                                  {n.isActive ? "Yes" : "No"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="outline" onClick={() => setViewNotice(n)}
                                    className="h-6 w-6 p-0 rounded border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-violet-600 hover:border-violet-300 bg-transparent">
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => openEdit(n)}
                                    className="h-6 w-6 p-0 rounded border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-indigo-600 hover:border-indigo-300 bg-transparent">
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setDeleteId(n.id)}
                                    className="h-6 w-6 p-0 rounded border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-rose-600 hover:border-rose-300 bg-transparent">
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
                </>
              )}
            </div>

            {/* Pagination */}
            {filtered.length > ITEMS_PER_PAGE && (
              <div className="bg-white dark:bg-[#0f1117] border-t border-gray-100 dark:border-white/[0.05] px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 shrink-0">
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Page <span className="font-semibold text-gray-700 dark:text-gray-300">{page}</span> of{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{totalPages}</span>
                </p>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="h-7 w-7 p-0 rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 dark:text-gray-400 disabled:opacity-40">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | "…")[]>((acc, p, i, arr) => {
                      if (i > 0 && (p as number) - (arr[i-1] as number) > 1) acc.push("…")
                      acc.push(p); return acc
                    }, [])
                    .map((p, i) => p === "…"
                      ? <span key={`e${i}`} className="text-gray-400 dark:text-gray-600 px-1 text-[12px]">…</span>
                      : (
                        <button key={p} onClick={() => setPage(p as number)}
                          className={cn(
                            "h-7 w-7 rounded-lg text-[11.5px] font-bold border transition-all",
                            page === p
                              ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                              : "bg-white dark:bg-transparent border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:border-violet-300 hover:text-violet-600"
                          )}>
                          {p}
                        </button>
                      )
                    )
                  }
                  <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="h-7 w-7 p-0 rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 dark:text-gray-400 disabled:opacity-40">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── View Dialog ── */}
      {viewNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewNotice(null)}>
          <div className="bg-white dark:bg-[#141720] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={cn(
              "px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.06]",
              getStatus(viewNotice) === "active"   && "bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-[#141720]",
              getStatus(viewNotice) === "upcoming" && "bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-[#141720]",
              getStatus(viewNotice) === "expired"  && "bg-gradient-to-br from-gray-50 to-white dark:from-gray-950/20 dark:to-[#141720]",
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/25 shrink-0">
                    <BellRing className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">{viewNotice.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <StatusBadge status={getStatus(viewNotice)} />
                      <span className="flex items-center gap-1 text-[10.5px] font-semibold text-violet-600 dark:text-violet-400">
                        <Users className="h-3 w-3" />{viewNotice.noticefor}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setViewNotice(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              {viewNotice.descriptions && (
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">Description</p>
                  <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {viewNotice.descriptions}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Start Date</p>
                  <p className="text-[13px] font-semibold text-gray-800 dark:text-white mt-0.5 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />{fmtDate(viewNotice.startDate)}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">End Date</p>
                  <p className="text-[13px] font-semibold text-gray-800 dark:text-white mt-0.5 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />{fmtDate(viewNotice.endDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-5 pb-5">
              <Button variant="outline" onClick={() => setViewNotice(null)}
                className="flex-1 h-9 text-[12.5px] rounded-xl border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-600 dark:text-gray-300">
                Close
              </Button>
              <Button onClick={() => { openEdit(viewNotice); setViewNotice(null) }}
                className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-violet-600 hover:bg-violet-500 text-white gap-1.5">
                <Pencil className="h-3.5 w-3.5" />Edit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Dialog ── */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl max-w-sm p-0 overflow-hidden gap-0 mx-4 sm:mx-auto
          bg-white dark:bg-[#141720] border border-gray-200 dark:border-white/[0.08]">
          <AlertDialogHeader className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]
            bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/20 dark:to-[#141720]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400" style={{ height: 18, width: 18 }} />
              </div>
              <div>
                <AlertDialogTitle className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">
                  Delete Notice?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-0">
                  This notice will be permanently removed.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 py-4 gap-2 flex-row">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-xl border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-600 dark:text-gray-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}
              className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
        @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
        @keyframes fadeInUp  { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  )
}
