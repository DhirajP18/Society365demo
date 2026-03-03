"use client"

import { useEffect, useRef, useState } from "react"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Users, UserCheck, UserX, RefreshCw, QrCode, LogOut,
  Clock, Phone, Briefcase, Home, CheckCircle2, X,
  Loader2, AlertTriangle, Search, CalendarDays,
  Timer, BarChart3, Trash2, Mail, MessageSquare,
  FileSpreadsheet, Printer, CalendarRange, ChevronDown,
} from "lucide-react"
import QRCode from "react-qr-code"

// ── Types ─────────────────────────────────────────────────────────────────────
interface VisitorEntry {
  id:              number
  visitorName:     string
  mobileNo:        string
  designation?:    string
  visitingUserId?: number
  visitingName:    string
  visitingFlat:    string
  inTime:          string
  outTime?:        string
  status:          "Active" | "Out"
  notifyEmail:     boolean
  notifySMS:       boolean
  tokenId?:        number
  tokenUsed:       boolean
}
interface VisitorToken { id: number; token: string; formUrl: string; expiresAt: string }
interface Stats { totalToday: number; activeNow: number; outToday: number; totalAllTime: number }
interface ApiRes<T = unknown> { isSuccess?: boolean; resMsg?: string; result?: T }

// ── Helpers ───────────────────────────────────────────────────────────────────
const toUTC   = (d: string) => new Date(d.endsWith("Z") ? d : d + "Z")
const fmtTime = (d: string) =>
  toUTC(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
const fmtDate = (d: string) =>
  toUTC(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
const fmtFull = (d: string) => `${fmtDate(d)}, ${fmtTime(d)}`
const todayISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
const elapsed  = (inTime: string) => {
  const mins = Math.floor((Date.now() - toUTC(inTime).getTime()) / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60); const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ══════════════════════════════════════════════════════════════════════════════
// QR MODAL
// ══════════════════════════════════════════════════════════════════════════════
function QRModal({ token, onClose, onSubmitted }: {
  token: VisitorToken; onClose: () => void; onSubmitted: () => void
}) {
  const [used, setUsed]           = useState(false)
  const [countdown, setCountdown] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const update = () => {
      const secs = Math.max(0, Math.floor((new Date(token.expiresAt).getTime() - Date.now()) / 1000))
      setCountdown(secs)
      if (secs === 0 && pollRef.current) clearInterval(pollRef.current)
    }
    update(); const t = setInterval(update, 1000); return () => clearInterval(t)
  }, [token.expiresAt])

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.get<ApiRes<VisitorEntry[]>>("/VisitorAdmin/GetAll?todayOnly=true")
        const match = (r.data?.result ?? []).find(e => e.tokenId === token.id && e.tokenUsed)
        if (match) {
          setUsed(true); clearInterval(pollRef.current!)
          setTimeout(() => { onSubmitted(); onClose() }, 2500)
        }
      } catch { /* silent */ }
    }, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [token.id])

  const mins = Math.floor(countdown / 60); const secs = countdown % 60
  const expired = countdown === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-[#141820] rounded-3xl border border-gray-200 dark:border-white/[0.09] shadow-2xl w-full max-w-sm overflow-hidden animate-[fadeInUp_0.25s_ease_both]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
              <QrCode className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-[14px] font-bold text-gray-900 dark:text-white">Visitor QR Code</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 flex flex-col items-center gap-5">
          {used ? (
            <div className="flex flex-col items-center gap-3 py-4 animate-[fadeInUp_0.3s_ease_both]">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10 border-2 border-emerald-400">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-[15px] font-bold text-emerald-700 dark:text-emerald-400">Form Submitted!</p>
              <p className="text-[12.5px] text-gray-400 text-center">Visitor entry recorded. Closing…</p>
            </div>
          ) : expired ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/10 border-2 border-rose-300">
                <AlertTriangle className="h-8 w-8 text-rose-500" />
              </div>
              <p className="text-[14px] font-bold text-rose-600 dark:text-rose-400">QR Code Expired</p>
              <p className="text-[12.5px] text-gray-400 text-center">Generate a new QR code for the visitor.</p>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-2xl bg-white border-2 border-gray-200 shadow-inner">
                <QRCode value={token.formUrl} size={200} />
              </div>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 text-center">
                Ask the visitor to scan this QR with their phone camera or Google Lens
              </p>
              <div className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border text-[12.5px] font-bold",
                countdown <= 120
                  ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400"
                  : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400")}>
                <Timer className="h-3.5 w-3.5" />
                Expires in {mins}:{String(secs).padStart(2, "0")}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Waiting for visitor to fill the form…
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCORDION VISITOR ROW
// Collapsed  → one line: status dot | Name | Purpose | Visiting User | Out btn
// Expanded   → full detail grid
// ══════════════════════════════════════════════════════════════════════════════
function VisitorRow({ v, onOut, onDelete }: {
  v: VisitorEntry; onOut: () => void; onDelete: () => void
}) {
  const isActive = v.status === "Active"

  // Duration label
  const duration = (() => {
    if (v.outTime) {
      const m = Math.floor((toUTC(v.outTime).getTime() - toUTC(v.inTime).getTime()) / 60000)
      return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
    }
    return isActive ? elapsed(v.inTime) + " inside" : "—"
  })()

  return (
    <AccordionItem
      value={String(v.id)}
      className={cn(
        "mb-1.5 rounded-xl border overflow-hidden transition-shadow",
        isActive
          ? "border-emerald-200 dark:border-emerald-500/20 bg-white dark:bg-[#0d1117]"
          : "border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#0d1117] opacity-80"
      )}>

      {/* ── COLLAPSED ROW ─────────────────────────────────────────────── */}
      <AccordionTrigger
        className="px-4 py-0 hover:no-underline hover:bg-gray-50 dark:hover:bg-white/[0.02] group [&>svg]:hidden"
        asChild={false}>

        <div className="flex items-center w-full gap-3 py-3 min-w-0">

          {/* Status dot */}
          <span className={cn("h-2 w-2 rounded-full shrink-0 mt-0.5",
            isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400")} />

          {/* Name — always visible */}
          <p className="text-[13px] font-bold text-gray-900 dark:text-white shrink-0 w-28 truncate">
            {v.visitorName}
          </p>

          {/* Purpose — hidden on very small screens */}
          <p className="hidden xs:block text-[12px] text-gray-400 dark:text-gray-500 flex-1 truncate min-w-0">
            {v.designation || <span className="italic">No purpose</span>}
          </p>

          {/* Visiting user */}
          <div className="hidden sm:flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 dark:text-blue-400 w-36 shrink-0 truncate">
            <Home className="h-3 w-3 shrink-0 text-blue-400" />
            <span className="truncate">{v.visitingName}{v.visitingFlat ? ` (${v.visitingFlat})` : ""}</span>
          </div>

          {/* In time */}
          <span className="hidden lg:flex items-center gap-1 text-[11px] text-gray-400 shrink-0">
            <Clock className="h-3 w-3" />{fmtTime(v.inTime)}
          </span>

          {/* Status pill */}
          <span className={cn(
            "hidden md:inline-flex shrink-0 items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border",
            isActive
              ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              : "bg-gray-100 dark:bg-white/[0.06] border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400"
          )}>
            {isActive
              ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</>
              : <><span className="h-1.5 w-1.5 rounded-full bg-gray-400" />Out</>}
          </span>

          {/* Out button + chevron — stop propagation so click doesn't toggle accordion */}
          <div className="flex items-center gap-2 ml-auto shrink-0"
            onClick={e => e.stopPropagation()}>
            {isActive && (
              <Button size="sm" onClick={onOut}
                className="h-7 px-2.5 text-[11.5px] font-bold rounded-lg gap-1 bg-rose-600 hover:bg-rose-500 text-white shadow-sm">
                <LogOut className="h-3 w-3" />Out
              </Button>
            )}
            {/* Manual chevron since we hid the default one */}
            <ChevronDown
              className="h-4 w-4 text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180"
              onClick={() => {}} // trigger handled by AccordionTrigger itself
            />
          </div>
        </div>
      </AccordionTrigger>

      {/* ── EXPANDED DETAILS ──────────────────────────────────────────── */}
      <AccordionContent className="px-4 pb-4">
        <div className="pt-3 border-t border-gray-100 dark:border-white/[0.06] space-y-3">

          {/* Detail cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { icon: <Phone     className="h-3.5 w-3.5" />, label: "Mobile",      value: v.mobileNo },
              { icon: <Briefcase className="h-3.5 w-3.5" />, label: "Designation", value: v.designation || "—" },
              { icon: <Home      className="h-3.5 w-3.5" />, label: "Visiting",    value: `${v.visitingName}${v.visitingFlat ? ` (${v.visitingFlat})` : ""}` },
              { icon: <Clock     className="h-3.5 w-3.5" />, label: "In Time",     value: fmtFull(v.inTime) },
              { icon: <LogOut    className="h-3.5 w-3.5" />, label: "Out Time",    value: v.outTime ? fmtFull(v.outTime) : "Not exited yet" },
              { icon: <Timer     className="h-3.5 w-3.5" />, label: "Duration",    value: duration },
            ].map(row => (
              <div key={row.label} className="px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                  {row.icon}{row.label}
                </div>
                <p className="text-[12.5px] font-semibold text-gray-800 dark:text-white truncate">{row.value}</p>
              </div>
            ))}
          </div>

          {/* Footer row: notifications + delete */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-gray-400 font-medium">Notified via:</span>
              {v.notifyEmail && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md
                  bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400
                  border border-blue-100 dark:border-blue-500/20">
                  <Mail className="h-3 w-3" />Email
                </span>
              )}
              {v.notifySMS && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md
                  bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400
                  border border-violet-100 dark:border-violet-500/20">
                  <MessageSquare className="h-3 w-3" />SMS
                </span>
              )}
              {!v.notifyEmail && !v.notifySMS && (
                <span className="text-[11px] text-gray-400">None</span>
              )}
            </div>
            <button onClick={onDelete}
              className="flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-400
                hover:text-rose-600 transition-colors px-2.5 py-1.5 rounded-lg
                hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent
                hover:border-rose-200 dark:hover:border-rose-500/20">
              <Trash2 className="h-3.5 w-3.5" />Delete Entry
            </button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function VisitorAdminPage() {
  const [visitors,   setVisitors]  = useState<VisitorEntry[]>([])
  const [stats,      setStats]     = useState<Stats | null>(null)
  const [loading,    setLoading]   = useState(true)
  const [generating, setGen]       = useState(false)
  const [activeQR,   setActiveQR]  = useState<VisitorToken | null>(null)
  const [delId,      setDelId]     = useState<number | null>(null)
  const [outId,      setOutId]     = useState<number | null>(null)
  const [search,     setSearch]    = useState("")
  const [exporting,  setExporting] = useState<"pdf" | "excel" | null>(null)

  // Date filters — default = today
  const [fromDate, setFromDate] = useState(todayISO())
  const [toDate,   setToDate]   = useState(todayISO())

  const isToday = fromDate === todayISO() && toDate === todayISO()

  // ── Load all records — filter client-side by date ──────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const [vr, sr] = await Promise.all([
        api.get<ApiRes<VisitorEntry[]>>("/VisitorAdmin/GetAll?todayOnly=false"),
        api.get<ApiRes<Stats>>("/VisitorAdmin/GetStats"),
      ])
      setVisitors(vr.data?.result ?? [])
      if (sr.data?.result) setStats(sr.data.result)
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // ── Client-side filter by date range + search ──────────────────────────────
  const filtered = visitors.filter(v => {
    const dateStr = toUTC(v.inTime).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
    if (fromDate && dateStr < fromDate) return false
    if (toDate   && dateStr > toDate)   return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        v.visitorName.toLowerCase().includes(q) ||
        v.mobileNo.includes(q) ||
        v.visitingName.toLowerCase().includes(q) ||
        v.visitingFlat.toLowerCase().includes(q) ||
        (v.designation ?? "").toLowerCase().includes(q)
      )
    }
    return true
  })

  const active = filtered.filter(v => v.status === "Active")
  const out    = filtered.filter(v => v.status === "Out")

  // ── Generate QR ────────────────────────────────────────────────────────────
  const generateQR = async () => {
    setGen(true)
    try {
      const r = await api.post<ApiRes<VisitorToken>>("/VisitorAdmin/GenerateToken", {})
      if (r.data?.isSuccess && r.data.result) setActiveQR(r.data.result)
      else toast.error(r.data?.resMsg ?? "Failed to generate QR")
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setGen(false) }
  }

  // ── Mark out ───────────────────────────────────────────────────────────────
  const markOut = async () => {
    if (!outId) return
    try {
      const r = await api.post<ApiRes>(`/VisitorAdmin/MarkOut/${outId}`, {})
      if (r.data?.isSuccess) {
        toast.success("Visitor marked as Out")
        setOutId(null)
        setVisitors(prev => prev.map(v =>
          v.id === outId ? { ...v, status: "Out" as const, outTime: new Date().toISOString() } : v
        ))
        if (stats) setStats(s => s ? { ...s, activeNow: s.activeNow - 1, outToday: s.outToday + 1 } : s)
      } else toast.error(r.data?.resMsg ?? "Failed")
    } catch (e) { toast.error(getApiMessage(e)) }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteEntry = async () => {
    if (!delId) return
    try {
      await api.delete(`/VisitorAdmin/Delete/${delId}`)
      toast.success("Deleted"); setDelId(null)
      setVisitors(prev => prev.filter(v => v.id !== delId))
    } catch (e) { toast.error(getApiMessage(e)) }
  }

  // ── Export Excel ───────────────────────────────────────────────────────────
  const exportExcel = async () => {
    if (!filtered.length) return
    setExporting("excel")
    try {
      const XLSX = await import("xlsx")
      const rows = filtered.map((v, i) => ({
        "#":              i + 1,
        "Visitor Name":   v.visitorName,
        "Mobile":         v.mobileNo,
        "Designation":    v.designation ?? "",
        "Visiting":       `${v.visitingName}${v.visitingFlat ? ` (${v.visitingFlat})` : ""}`,
        "In Time":        fmtFull(v.inTime),
        "Out Time":       v.outTime ? fmtFull(v.outTime) : "",
        "Status":         v.status,
        "Email Notified": v.notifyEmail ? "Yes" : "No",
        "SMS Notified":   v.notifySMS   ? "Yes" : "No",
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws["!cols"] = [5, 22, 16, 22, 28, 24, 24, 10, 15, 13].map(w => ({ wch: w }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Visitor Report")
      const label = fromDate === toDate ? fromDate : `${fromDate}_to_${toDate}`
      XLSX.writeFile(wb, `Visitor_Report_${label}.xlsx`)
      toast.success("Excel exported successfully!")
    } catch {
      toast.error("Excel export failed. Make sure 'xlsx' package is installed.")
    } finally { setExporting(null) }
  }

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    if (!filtered.length) return
    setExporting("pdf")
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ])
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

      // ── Header bar
      doc.setFillColor(29, 78, 216)
      doc.rect(0, 0, 297, 20, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Visitor Report — Society Management System", 14, 13)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      const rangeLabel = fromDate === toDate ? `Date: ${fromDate}` : `Period: ${fromDate}  →  ${toDate}`
      doc.text(rangeLabel, 283, 13, { align: "right" })

      // ── Sub-header summary
      doc.setTextColor(50, 50, 50)
      doc.setFontSize(8.5)
      doc.text(
        `Total Records: ${filtered.length}   |   Active: ${active.length}   |   Exited: ${out.length}   |   Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
        14, 27
      )

      // ── Table
      autoTable(doc, {
        startY: 31,
        head: [["#", "Visitor Name", "Mobile", "Designation", "Visiting (Flat)", "In Time", "Out Time", "Status"]],
        body: filtered.map((v, i) => [
          i + 1,
          v.visitorName,
          v.mobileNo,
          v.designation ?? "—",
          `${v.visitingName}${v.visitingFlat ? ` (${v.visitingFlat})` : ""}`,
          fmtFull(v.inTime),
          v.outTime ? fmtFull(v.outTime) : "—",
          v.status,
        ]),
        headStyles: {
          fillColor: [29, 78, 216],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 8.5,
          cellPadding: 3,
        },
        bodyStyles: { fontSize: 8, cellPadding: 2.5 },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        columnStyles: {
          0: { cellWidth: 8,  halign: "center" },
          1: { cellWidth: 38 },
          2: { cellWidth: 26 },
          3: { cellWidth: 36 },
          4: { cellWidth: 40 },
          5: { cellWidth: 36 },
          6: { cellWidth: 36 },
          7: { cellWidth: 20, halign: "center" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 7) {
            data.cell.styles.fontStyle = "bold"
            data.cell.styles.textColor = data.cell.text[0] === "Active"
              ? [22, 163, 74]
              : [107, 114, 128]
          }
        },
        margin: { left: 14, right: 14 },
        tableLineColor: [220, 226, 240],
        tableLineWidth: 0.1,
      })

      // ── Page numbers
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7.5)
        doc.setTextColor(160)
        doc.text(`Page ${i} of ${pageCount}`, 148.5, 207, { align: "center" })
        doc.text("Society Management System — Visitor Report", 14, 207)
      }

      const fileLabel = fromDate === toDate ? fromDate : `${fromDate}_to_${toDate}`
      doc.save(`Visitor_Report_${fileLabel}.pdf`)
      toast.success("PDF exported successfully!")
    } catch (e) {
      console.error(e)
      toast.error("PDF export failed. Make sure 'jspdf' and 'jspdf-autotable' are installed.")
    } finally { setExporting(null) }
  }

  const resetToToday = () => { setFromDate(todayISO()); setToDate(todayISO()) }

  // ── Section label component ────────────────────────────────────────────────
  const SectionLabel = ({ dot, label, count }: { dot: string; label: string; count: number }) => (
    <div className="flex items-center gap-2 mb-2">
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {label} ({count})
      </p>
    </div>
  )

  // ── Column header row ──────────────────────────────────────────────────────
  const ColHeaders = () => (
    <div className="hidden sm:grid px-4 pb-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-white/[0.05] mb-1"
      style={{ gridTemplateColumns: "20px 120px 1fr 160px 100px 90px 120px" }}>
      <span />
      <span>Visitor</span>
      <span>Purpose</span>
      <span className="hidden sm:block">Visiting</span>
      <span className="hidden lg:block">In Time</span>
      <span className="hidden md:block">Status</span>
      <span className="text-right">Action</span>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-[#f0f4ff] dark:bg-[#07080f] overflow-auto">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-[#0a0c14] border-b border-gray-200 dark:border-white/[0.06] px-4 sm:px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-[17px] font-bold text-gray-900 dark:text-white">Visitor Management</h1>
              <p className="text-[11px] text-gray-400">Generate QR · track arrivals · manage exits</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}
              className="h-8 px-3 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 rounded-xl">
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
            <Button size="sm" onClick={generateQR} disabled={generating}
              className="h-9 px-4 text-[12.5px] font-bold rounded-xl gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-md">
              {generating
                ? <><Loader2 className="h-4 w-4 animate-spin" />Generating…</>
                : <><QrCode className="h-4 w-4" />New Visitor QR</>}
            </Button>
          </div>
        </div>

        {/* Stats chips */}
        {stats && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {[
              { label: "Today",      value: stats.totalToday,   cls: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400",             icon: <CalendarDays className="h-3.5 w-3.5" /> },
              { label: "Inside Now", value: stats.activeNow,    cls: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400", icon: <UserCheck    className="h-3.5 w-3.5" /> },
              { label: "Exited",     value: stats.outToday,     cls: "bg-gray-100 dark:bg-white/[0.06] border-gray-200 dark:border-white/[0.07] text-gray-600 dark:text-gray-400",             icon: <UserX        className="h-3.5 w-3.5" /> },
              { label: "All Time",   value: stats.totalAllTime, cls: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-400",    icon: <BarChart3    className="h-3.5 w-3.5" /> },
            ].map(s => (
              <div key={s.label} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-bold", s.cls)}>
                {s.icon}{s.value} {s.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ BODY ════════════════════════════════════════════════════════════ */}
      <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-4">

        {/* ── Filter / Search / Export panel ── */}
        <div className="bg-white dark:bg-[#0d1117] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm px-4 py-3.5 space-y-3">

          {/* Row 1 — Date range */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <CalendarRange className="h-4 w-4 text-blue-500" />
              <span className="text-[12px] font-bold text-gray-600 dark:text-gray-300">Date Range</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400 font-medium w-6">From</span>
                <input type="date" value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-gray-200 dark:border-white/[0.09]
                    bg-gray-50 dark:bg-white/[0.04] text-[12px] text-gray-800 dark:text-gray-200
                    outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 cursor-pointer" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400 font-medium w-3">To</span>
                <input type="date" value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-gray-200 dark:border-white/[0.09]
                    bg-gray-50 dark:bg-white/[0.04] text-[12px] text-gray-800 dark:text-gray-200
                    outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 cursor-pointer" />
              </div>
            </div>

            {isToday ? (
              <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full
                bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400
                border border-blue-200 dark:border-blue-500/20">
                Today
              </span>
            ) : (
              <button onClick={resetToToday}
                className="shrink-0 text-[11.5px] font-semibold text-blue-500 hover:text-blue-600
                  px-2.5 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all border border-transparent hover:border-blue-200 dark:hover:border-blue-500/20">
                Reset to Today
              </button>
            )}
          </div>

          {/* Row 2 — Search + record count + export buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[180px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, mobile, resident, purpose…"
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-gray-200 dark:border-white/[0.09]
                  bg-gray-50 dark:bg-white/[0.03] text-[12.5px] text-gray-800 dark:text-white
                  outline-none focus:border-blue-400 placeholder:text-gray-400" />
            </div>

            {/* Record count badge */}
            {!loading && (
              <span className="text-[12px] text-gray-400 shrink-0 hidden sm:block">
                <span className="font-bold text-gray-700 dark:text-gray-200">{filtered.length}</span> records
              </span>
            )}

            {/* Divider */}
            <div className="h-7 w-px bg-gray-200 dark:bg-white/[0.08] hidden sm:block" />

            {/* Export buttons */}
            <button
              onClick={exportExcel}
              disabled={filtered.length === 0 || exporting !== null}
              className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-xl border text-[12px] font-bold transition-all shrink-0",
                "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
                "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}>
              {exporting === "excel"
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileSpreadsheet className="h-3.5 w-3.5" />}
              Excel
            </button>

            <button
              onClick={exportPDF}
              disabled={filtered.length === 0 || exporting !== null}
              className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-xl border text-[12px] font-bold transition-all shrink-0",
                "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20",
                "text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}>
              {exporting === "pdf"
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Printer className="h-3.5 w-3.5" />}
              PDF
            </button>
          </div>
        </div>

        {/* ── List ── */}
        {loading ? (
          <div className="space-y-1.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 rounded-xl bg-white dark:bg-[#0d1117] border border-gray-100 dark:border-white/[0.05] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center
            bg-white dark:bg-[#0d1117] rounded-2xl border border-gray-200 dark:border-white/[0.07]">
            <Users className="h-12 w-12 text-gray-200 dark:text-gray-700" />
            <p className="text-[14px] font-bold text-gray-400">No visitors found</p>
            <p className="text-[12.5px] text-gray-400">
              {isToday
                ? "No visitors today. Click \"New Visitor QR\" to check one in."
                : "No records for the selected date range. Try adjusting the dates."}
            </p>
            {!isToday && (
              <button onClick={resetToToday}
                className="mt-1 text-[12px] font-semibold text-blue-500 hover:underline">
                Back to today
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">

            {/* Active section */}
            {active.length > 0 && (
              <div className="bg-white dark:bg-[#0d1117] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm overflow-hidden">
                <div className="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-white/[0.06]">
                  <SectionLabel
                    dot="bg-emerald-500 animate-pulse"
                    label="Inside Now"
                    count={active.length}
                  />
                  <ColHeaders />
                </div>
                <div className="p-3">
                  <Accordion type="multiple" className="space-y-0">
                    {active.map(v => (
                      <VisitorRow
                        key={v.id} v={v}
                        onOut={() => setOutId(v.id)}
                        onDelete={() => setDelId(v.id)}
                      />
                    ))}
                  </Accordion>
                </div>
              </div>
            )}

            {/* Exited section */}
            {out.length > 0 && (
              <div className="bg-white dark:bg-[#0d1117] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm overflow-hidden">
                <div className="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-white/[0.06]">
                  <SectionLabel dot="bg-gray-400" label="Exited" count={out.length} />
                  <ColHeaders />
                </div>
                <div className="p-3">
                  <Accordion type="multiple" className="space-y-0">
                    {out.map(v => (
                      <VisitorRow
                        key={v.id} v={v}
                        onOut={() => setOutId(v.id)}
                        onDelete={() => setDelId(v.id)}
                      />
                    ))}
                  </Accordion>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {activeQR && (
        <QRModal token={activeQR} onClose={() => setActiveQR(null)} onSubmitted={load} />
      )}

      {/* Out confirm */}
      <AlertDialog open={outId !== null} onOpenChange={() => setOutId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-4 bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                <LogOut className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <AlertDialogTitle className="text-[14px] font-bold">Mark as Out?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-[12px] text-gray-500">
              This will record the exit time and change the visitor&apos;s status to Out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-row mt-2">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={markOut}
              className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white">
              Mark Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={delId !== null} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-4 bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <AlertDialogTitle className="text-[14px] font-bold">Delete Entry?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-[12px] text-gray-500">
              This visitor entry will be permanently removed from records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-row mt-2">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteEntry}
              className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  )
}
