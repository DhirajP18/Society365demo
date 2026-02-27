"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Calendar, Clock, CreditCard, Download, Eye, Image as ImageIcon,
  IndianRupee, Loader2, Receipt, RefreshCw, Search,
} from "lucide-react"
import { APP_NAME, resolveReceiptUrl } from "@/lib/appconfig"

type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } }
type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id?: string }
type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  theme?: { color?: string }
  handler: (response: RazorpayResponse) => void | Promise<void>
  modal?: { ondismiss?: () => void }
}
type RazorpayInstance = { open: () => void }
type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance

declare global { interface Window { Razorpay: RazorpayConstructor } }

interface Expense { id:number; periodId:number; description:string; amount:number; receiptUrl?:string }
interface DuePeriod {
  periodId:number; title:string; periodMonth:number; periodYear:number
  fixedAmount:number; extraAmount:number; dueDate:string; workDescription:string
  paymentStatus:string; paymentDate?:string; receiptNumber?:string; razorpayPayId?:string
  penaltyDays:number; penaltyPerDay:number; penaltyAmount:number; totalPayable:number
  expenses:Expense[]
}
type Res<T=unknown> = {isSuccess?:boolean;resMsg?:string;result?:T}

const fmt = (d?:string|null) => {
  if (!d) return "-"
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? "-" : dt.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})
}
const fmtTime = (d?:string|null) => {
  if (!d) return "-"
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? "-" : dt.toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})
}
const isExpenseOnly = (d: DuePeriod) => d.fixedAmount <= 0 && d.extraAmount > 0

/** Popover with Show & Download actions for a receipt */
function ReceiptActions({ url, label = "Receipt" }: { url: string; label?: string }) {
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const isPdf = /\.pdf(\?|$)/i.test(url)

  const fileNameFromUrl = () => {
    try {
      const u = new URL(url)
      const name = u.pathname.split("/").pop() || "receipt"
      return decodeURIComponent(name)
    } catch {
      return isPdf ? "receipt.pdf" : "receipt"
    }
  }

  const handleDownload = async () => {
    setOpen(false)
    setDownloading(true)
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch receipt")
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = fileNameFromUrl()
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch {
      const a = document.createElement("a")
      a.href = url
      a.setAttribute("download", fileNameFromUrl())
      a.rel = "noopener noreferrer"
      document.body.appendChild(a)
      a.click()
      a.remove()
      toast.error("Could not force download from browser. Check server download headers.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
      >
        <ImageIcon className="h-3 w-3" />
        {label}
      </button>

      {open && (
        <div className="absolute z-50 left-0 top-full mt-1.5 min-w-[140px] rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-[#1a1d27] shadow-xl overflow-hidden">
          {/* Show / Preview */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
          >
            <Eye className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            {isPdf ? "Open PDF" : "Show Image"}
          </a>

          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-left text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors border-t border-gray-100 dark:border-white/[0.06] disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            {downloading ? "Downloading..." : "Download"}
          </button>
        </div>
      )}
    </div>
  )
}
function generateUserReceipt(p: DuePeriod) {
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFillColor(13,148,136)
  doc.rect(0,0,pageW,38,"F")
  doc.setTextColor(255,255,255)
  doc.setFontSize(20); doc.setFont("helvetica","bold")
  doc.text(APP_NAME.toUpperCase(),pageW/2,16,{align:"center"})
  doc.setFontSize(10); doc.setFont("helvetica","normal")
  doc.text("PAYMENT RECEIPT",pageW/2,24,{align:"center"})
  doc.setFontSize(8)
  doc.text(`Receipt: ${p.receiptNumber ?? "-"} | Payment ID: ${p.razorpayPayId ?? "-"}`,pageW/2,32,{align:"center"})

  doc.setTextColor(30,30,30)
  doc.setFontSize(10); doc.setFont("helvetica","bold")
  doc.text("Payment Details",14,50)
  autoTable(doc,{
    startY:55, theme:"grid", headStyles:{fillColor:[13,148,136]},
    head:[["Field","Value"]],
    body:[
      ["Period",p.title],
      ["Due Date",fmt(p.dueDate)],
      ["Payment Date",fmtTime(p.paymentDate)],
      ["Status","PAID"],
    ],
    columnStyles:{0:{fontStyle:"bold",cellWidth:60}},
  })

  const y1 = ((doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? 60) + 10
  doc.text("Amount Breakdown",14,y1)
  const rows:string[][] = []
  if (p.fixedAmount > 0) rows.push(["Fixed Maintenance",`Rs ${p.fixedAmount.toLocaleString()}`])
  if (p.extraAmount > 0) rows.push(["Extra Charges",`Rs ${p.extraAmount.toLocaleString()}`])
  if (p.penaltyAmount > 0) rows.push([`Late Penalty (${p.penaltyDays} days x Rs ${p.penaltyPerDay}/day)`,`Rs ${p.penaltyAmount.toLocaleString()}`])
  rows.push(["TOTAL PAID",`Rs ${p.totalPayable.toLocaleString()}`])

  autoTable(doc,{
    startY:y1+5, theme:"striped", headStyles:{fillColor:[13,148,136]},
    head:[["Description","Amount"]],
    body:rows,
    columnStyles:{1:{halign:"right"}},
  })

  if (p.expenses.length > 0) {
    const y2 = ((doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y1 + 20) + 10
    doc.setFontSize(10); doc.setFont("helvetica","bold")
    doc.text("Expense Details",14,y2)
    autoTable(doc,{
      startY:y2+5, theme:"grid", headStyles:{fillColor:[99,102,241]},
      head:[["Description","Amount"]],
      body:p.expenses.map(e=>[e.description,`Rs ${e.amount.toLocaleString()}`]),
      columnStyles:{1:{halign:"right"}},
    })
  }

  const finalY = ((doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? 120) + 15
  doc.setFontSize(8); doc.setTextColor(120,120,120)
  doc.text("Computer-generated receipt.",pageW/2,finalY,{align:"center"})
  doc.save(`Receipt_${p.title.replace(/\s/g,"_")}.pdf`)
}

function DueListItem({
  due, onPaid, selectable, selected, onToggleSelect,
}: {
  due: DuePeriod
  onPaid: (pid:number)=>void
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (checked: boolean) => void
}) {
  const [live, setLive] = useState(due)
  const [paying, setPaying] = useState(false)

  const paid = live.paymentStatus === "Paid"
  const late = live.penaltyDays > 0 && !paid
  const expenseBill = isExpenseOnly(live)

  useEffect(() => { setLive(due) }, [due])

  const refreshSelf = async () => {
    try {
      const r = await api.get<Res<DuePeriod[]>>("/MaintenancePayment/GetMyDues")
      const u = (r.data?.result ?? []).find(x => x.periodId === live.periodId)
      if (u) setLive(u)
    } catch {}
  }

  const payNow = async () => {
    if (paid) return
    setPaying(true)
    try {
      new window.Razorpay({
        key: "rzp_test_RtMLEoBroA8R8P",
        amount: Math.round(live.totalPayable * 100),
        currency: "INR",
        name: APP_NAME,
        description: `${expenseBill ? "Extra Expense" : "Maintenance"} - ${live.title}`,
        theme: { color: "#0d9488" },
        handler: async (res: RazorpayResponse) => {
          try {
            const r = await api.post<Res>("/MaintenancePayment/ConfirmPayment", {
              periodId: live.periodId,
              razorpayPayId: res.razorpay_payment_id,
              razorpayOrderId: res.razorpay_order_id ?? "",
            })
            if (r.data?.isSuccess) {
              toast.success("Payment confirmed")
              await refreshSelf()
              onPaid(live.periodId)
            } else toast.error(r.data?.resMsg ?? "Confirmation failed")
          } catch(e) { toast.error(getApiMessage(e)) }
          finally { setPaying(false) }
        },
        modal: { ondismiss: () => setPaying(false) },
      }).open()
    } catch(e) {
      toast.error(getApiMessage(e))
      setPaying(false)
    }
  }

  return (
    <AccordionItem value={String(live.periodId)} className="border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 sm:px-4 bg-white dark:bg-[#0d1017] mb-3 last:mb-0">
      <AccordionTrigger className="py-3 sm:py-4 hover:no-underline">
        <div className="w-full text-left">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {selectable&&(
                  <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={(e)=>onToggleSelect?.(e.target.checked)}
                    onClick={(e)=>e.stopPropagation()}
                    className="h-3.5 w-3.5 accent-teal-600"
                    aria-label={`Select ${live.title}`}
                  />
                )}
                <p className="text-[13px] sm:text-[14px] font-bold text-gray-900 dark:text-white truncate">{live.title}</p>
                {expenseBill&&<span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30">Expense</span>}
                <span className={cn("text-[9px] px-2 py-0.5 rounded-full border",
                  paid?"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30":
                  late?"bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30":
                  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30")}>
                  {paid ? "Paid" : late ? "Overdue" : "Pending"}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3"/>{paid ? `Paid: ${fmt(live.paymentDate)}` : `Due: ${fmt(live.dueDate)}`}</span>
                {late&&<span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400"><Clock className="h-3 w-3"/>{live.penaltyDays} late</span>}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[16px] sm:text-[18px] font-black text-gray-900 dark:text-white">Rs {live.totalPayable.toLocaleString()}</p>
              {live.penaltyAmount > 0 && !paid && <p className="text-[10px] text-rose-600 dark:text-rose-400">Penalty Rs {live.penaltyAmount.toLocaleString()}</p>}
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-1 pb-4 space-y-3">
        <div className="flex flex-wrap gap-2 text-[11px]">
          {live.fixedAmount > 0&&<span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300">Fixed: Rs {live.fixedAmount.toLocaleString()}</span>}
          {live.extraAmount > 0&&<span className="px-2 py-1 rounded-md bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30">Extra: Rs {live.extraAmount.toLocaleString()}</span>}
        </div>

        {live.workDescription&&(
          <div className="rounded-lg border border-gray-200 dark:border-white/[0.08] px-3 py-2 text-[12px] text-gray-600 dark:text-gray-300">
            {live.workDescription}
          </div>
        )}

        {live.expenses.length > 0&&(
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Expense Items</p>
            {live.expenses.map(e=>{
              const rUrl = resolveReceiptUrl(e.receiptUrl)
              return (
                <div key={e.id} className="flex items-center justify-between gap-2 border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-[12px]">
                  <span className="text-gray-700 dark:text-gray-300">{e.description}</span>
                  <div className="flex items-center gap-3">
                    {/* ── Receipt Show/Download popover ── */}
                    {rUrl && <ReceiptActions url={rUrl} />}
                    <span className="font-bold text-gray-900 dark:text-white">Rs {e.amount.toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {paid && live.razorpayPayId&&(
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-700 dark:text-emerald-300">
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              <span>Receipt: {live.receiptNumber}</span>
              <span>Payment ID: {live.razorpayPayId}</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {paid ? (
            <Button className="h-9 rounded-lg text-[12px] gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white" onClick={()=>generateUserReceipt(live)}>
              <Download className="h-3.5 w-3.5"/>Download Receipt
            </Button>
          ) : (
            <Button className="h-9 rounded-lg text-[12px] gap-1.5 bg-teal-600 hover:bg-teal-500 text-white" disabled={paying} onClick={payNow}>
              {paying ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/>Processing...</> : <><CreditCard className="h-3.5 w-3.5"/>Pay Rs {live.totalPayable.toLocaleString()}</>}
            </Button>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export default function UserPayMaintenancePage() {
  const [dues, setDues] = useState<DuePeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"pending"|"paid">("pending")
  const [query, setQuery] = useState("")
  const [month, setMonth] = useState<string>("all")
  const [year, setYear] = useState<string>("all")
  const [kind, setKind] = useState<"all"|"maintenance"|"expense">("all")
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkPaying, setBulkPaying] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get<Res<DuePeriod[]>>("/MaintenancePayment/GetMyDues")
      setDues(r.data?.result ?? [])
    } catch(e) { toast.error(getApiMessage(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!document.querySelector('script[src*="razorpay"]')) {
      const s = document.createElement("script")
      s.src = "https://checkout.razorpay.com/v1/checkout.js"
      s.async = true
      document.body.appendChild(s)
    }
    load()
  }, [])

  const onPaid = (pid:number) => setDues(ds => ds.map(d => d.periodId===pid ? { ...d, paymentStatus: "Paid" } : d))

  const pending = dues.filter(d => d.paymentStatus !== "Paid")
  const paid = dues.filter(d => d.paymentStatus === "Paid")
  const baseList = tab === "pending" ? pending : paid

  const yearOptions = useMemo(
    () => [...new Set(dues.map(d => d.periodYear))].sort((a,b)=>b-a),
    [dues]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return baseList
      .filter(d => month === "all" || String(d.periodMonth) === month)
      .filter(d => year === "all" || String(d.periodYear) === year)
      .filter(d => kind === "all" ? true : kind === "expense" ? isExpenseOnly(d) : !isExpenseOnly(d))
      .filter(d => q.length === 0 || `${d.title} ${d.workDescription ?? ""}`.toLowerCase().includes(q))
      .sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
  }, [baseList, kind, month, query, year])

  const totalDue = pending.reduce((a,d)=>a+d.totalPayable,0)
  const selectableFiltered = useMemo(() => filtered.filter(d => d.paymentStatus !== "Paid"), [filtered])
  const selectedFiltered = useMemo(
    () => selectableFiltered.filter(d => selectedIds.has(d.periodId)),
    [selectableFiltered, selectedIds]
  )
  const selectedTotal = useMemo(
    () => selectedFiltered.reduce((a,d)=>a+d.totalPayable,0),
    [selectedFiltered]
  )

  useEffect(() => {
    if (tab !== "pending") setSelectedIds(new Set())
  }, [tab])

  const toggleSelect = (pid:number, checked:boolean) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (checked) n.add(pid)
      else n.delete(pid)
      return n
    })
  }
  const selectAllFiltered = () => setSelectedIds(new Set(selectableFiltered.map(d => d.periodId)))
  const clearSelection = () => setSelectedIds(new Set())

  const paySelected = async (payAllFiltered = false) => {
    const target = payAllFiltered ? selectableFiltered : selectedFiltered
    if (target.length === 0) return toast.error("Select at least one pending entry")

    const amount = target.reduce((a,d)=>a+d.totalPayable,0)
    setBulkPaying(true)
    try {
      new window.Razorpay({
        key: "rzp_test_RtMLEoBroA8R8P",
        amount: Math.round(amount * 100),
        currency: "INR",
        name: APP_NAME,
        description: `Combined maintenance payment (${target.length} entries)`,
        theme: { color: "#0d9488" },
        handler: async (res: RazorpayResponse) => {
          let ok = 0
          let fail = 0
          for (const d of target) {
            try {
              const r = await api.post<Res>("/MaintenancePayment/ConfirmPayment", {
                periodId: d.periodId,
                razorpayPayId: res.razorpay_payment_id,
                razorpayOrderId: res.razorpay_order_id ?? "",
              })
              if (r.data?.isSuccess) ok++
              else fail++
            } catch { fail++ }
          }
          await load()
          clearSelection()
          if (ok > 0 && fail === 0) toast.success(`Payment confirmed for ${ok} entries`)
          else if (ok > 0) toast.warning(`Partial success: ${ok} success, ${fail} failed`)
          else toast.error("Payment confirmation failed")
          setBulkPaying(false)
        },
        modal: { ondismiss: () => setBulkPaying(false) },
      }).open()
    } catch(e) {
      toast.error(getApiMessage(e))
      setBulkPaying(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f3f6fa] dark:bg-[#070b10]">
      <div className="bg-white dark:bg-[#0d1017] border-b border-gray-200 dark:border-white/[0.06] px-4 sm:px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-teal-100 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20">
              <IndianRupee className="h-4 w-4 text-teal-600 dark:text-teal-400"/>
            </div>
            <div>
              <h1 className="text-[15px] sm:text-[17px] font-bold text-gray-900 dark:text-white">Pay Maintenance</h1>
              <p className="hidden sm:block text-[11px] text-gray-400 dark:text-gray-500">List view for large data with quick filters</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="h-8 px-3 text-[11.5px] gap-1.5 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 rounded-xl">
            <RefreshCw className={cn("h-3.5 w-3.5",loading&&"animate-spin")}/>Refresh
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <div className="lg:col-span-2 relative">
            <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2"/>
            <input
              value={query}
              onChange={e=>setQuery(e.target.value)}
              placeholder="Search period or note..."
              className="h-9 w-full pl-8 pr-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121622] text-[12px] text-gray-700 dark:text-gray-200 outline-none"
            />
          </div>
          <select value={month} onChange={e=>setMonth(e.target.value)} className="h-9 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121622] text-[12px] px-2 text-gray-700 dark:text-gray-200">
            <option value="all">All Months</option>
            {Array.from({length:12}).map((_,i)=><option key={i+1} value={String(i+1)}>{new Date(2025,i,1).toLocaleString("en-US",{month:"short"})}</option>)}
          </select>
          <select value={year} onChange={e=>setYear(e.target.value)} className="h-9 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121622] text-[12px] px-2 text-gray-700 dark:text-gray-200">
            <option value="all">All Years</option>
            {yearOptions.map(y=><option key={y} value={String(y)}>{y}</option>)}
          </select>
          <select value={kind} onChange={e=>setKind(e.target.value as "all"|"maintenance"|"expense")} className="h-9 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121622] text-[12px] px-2 text-gray-700 dark:text-gray-200">
            <option value="all">All Types</option>
            <option value="maintenance">Maintenance</option>
            <option value="expense">Expense Bills</option>
          </select>
          <Button variant="outline" className="h-9 rounded-lg text-[12px]" onClick={()=>{setQuery("");setMonth("all");setYear("all");setKind("all")}}>Clear</Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={()=>setTab("pending")} className={cn("px-3 py-1.5 rounded-lg text-[12px] font-semibold border",tab==="pending"?"bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30":"bg-white dark:bg-transparent text-gray-500 border-gray-200 dark:border-white/[0.08]")}>Pending ({pending.length})</button>
          <button onClick={()=>setTab("paid")} className={cn("px-3 py-1.5 rounded-lg text-[12px] font-semibold border",tab==="paid"?"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30":"bg-white dark:bg-transparent text-gray-500 border-gray-200 dark:border-white/[0.08]")}>Paid ({paid.length})</button>
          <span className="ml-auto text-[12px] text-gray-500 dark:text-gray-400">Total Pending: <b className="text-gray-800 dark:text-gray-200">Rs {totalDue.toLocaleString()}</b></span>
        </div>

        {tab==="pending"&&selectableFiltered.length>=2&&(
          <div className="mt-3 rounded-lg border border-teal-200 dark:border-teal-500/30 bg-teal-50/70 dark:bg-teal-500/10 p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={selectAllFiltered} disabled={bulkPaying}>Select All Filtered</Button>
              <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={clearSelection} disabled={bulkPaying}>Clear</Button>
              <Button size="sm" className="h-8 text-[11px] bg-teal-600 hover:bg-teal-500 text-white" onClick={()=>paySelected(false)} disabled={bulkPaying||selectedFiltered.length===0}>
                {bulkPaying?<><Loader2 className="h-3.5 w-3.5 animate-spin"/>Processing...</>:<><CreditCard className="h-3.5 w-3.5"/>Pay Selected ({selectedFiltered.length})</>}
              </Button>
              <Button size="sm" className="h-8 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white" onClick={()=>paySelected(true)} disabled={bulkPaying||selectableFiltered.length===0}>
                Pay All Pending ({selectableFiltered.length})
              </Button>
              <span className="ml-auto text-[11px] text-gray-600 dark:text-gray-300">Selected Total: <b>Rs {selectedTotal.toLocaleString()}</b></span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {loading ? (
          <div className="max-w-4xl mx-auto space-y-3">
            {[1,2,3,4].map(i=><div key={i} className="h-20 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0d1017] animate-pulse"/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <Receipt className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600"/>
              <p className="mt-2 text-[14px] font-semibold text-gray-600 dark:text-gray-300">No records found</p>
              <p className="text-[12px] text-gray-400 dark:text-gray-500">Try changing filters.</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <Accordion type="multiple">
              {filtered.map(d => (
                <DueListItem
                  key={d.periodId}
                  due={d}
                  onPaid={onPaid}
                  selectable={tab==="pending" && d.paymentStatus !== "Paid"}
                  selected={selectedIds.has(d.periodId)}
                  onToggleSelect={(checked)=>toggleSelect(d.periodId, checked)}
                />
              ))}
            </Accordion>
          </div>
        )}
      </div>
    </div>
  )
}
