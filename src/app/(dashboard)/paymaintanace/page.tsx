"use client"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  RefreshCw, IndianRupee, Calendar, AlertTriangle, CheckCircle2,
  Clock, ChevronDown, ChevronUp, Receipt, Shield, Zap,
  Download, Image as ImageIcon, Loader2, CreditCard, Info,
} from "lucide-react"

type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } }

type RazorpayResponse = {
  razorpay_payment_id: string
  razorpay_order_id?: string
}

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

declare global {
  interface Window { Razorpay: RazorpayConstructor }
}

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
  if (!d) return "—"
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})
}
const fmtTime = (d?:string|null) => {
  if (!d) return "—"
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})
}

// ── Receipt PDF Generator ─────────────────────────────────────────────────────
function generateUserReceipt(p: DuePeriod) {
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()

  // Header
  doc.setFillColor(13,148,136)
  doc.rect(0,0,pageW,38,"F")
  doc.setTextColor(255,255,255)
  doc.setFontSize(20); doc.setFont("helvetica","bold")
  doc.text("SOCIETY 365",pageW/2,16,{align:"center"})
  doc.setFontSize(10); doc.setFont("helvetica","normal")
  doc.text("MAINTENANCE PAYMENT RECEIPT",pageW/2,24,{align:"center"})
  doc.setFontSize(8)
  doc.text(`Receipt No: ${p.receiptNumber ?? "—"}   |   Payment ID: ${p.razorpayPayId ?? "—"}`,pageW/2,32,{align:"center"})

  // Info table
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

  // Amount breakdown
  doc.setFontSize(10); doc.setFont("helvetica","bold")
  const y1 = ((doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? 60) + 10
  doc.text("Amount Breakdown",14,y1)
  const rows:string[][] = [
    ["Fixed Monthly Maintenance",`₹${p.fixedAmount.toLocaleString()}`],
  ]
  if (p.extraAmount > 0)        rows.push(["Extra Charges",`₹${p.extraAmount.toLocaleString()}`])
  if (p.penaltyAmount > 0)      rows.push([`Late Penalty (${p.penaltyDays} days × ₹${p.penaltyPerDay}/day)`,`₹${p.penaltyAmount.toLocaleString()}`])
  rows.push(["TOTAL PAID",`₹${p.totalPayable.toLocaleString()}`])

  autoTable(doc,{
    startY:y1+5, theme:"striped", headStyles:{fillColor:[13,148,136]},
    head:[["Description","Amount"]],
    body:rows,
    columnStyles:{1:{halign:"right"}},
    didParseCell:(d)=>{ if(d.row.index===rows.length-1&&d.section==="body"){d.cell.styles.fontStyle="bold";d.cell.styles.fillColor=[220,252,231]} },
  })

  // Expenses
  if (p.expenses.length > 0) {
    const y2 = ((doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y1 + 20) + 10
    doc.setFontSize(10); doc.setFont("helvetica","bold")
    doc.text("Extra Expense Details",14,y2)
    autoTable(doc,{
      startY:y2+5, theme:"grid", headStyles:{fillColor:[99,102,241]},
      head:[["Description","Amount"]],
      body:p.expenses.map(e=>[e.description,`₹${e.amount.toLocaleString()}`]),
      columnStyles:{1:{halign:"right"}},
    })
  }

  // Footer
  const finalY = ((doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? 120) + 15
  doc.setFontSize(8); doc.setTextColor(120,120,120)
  doc.text("This is a computer-generated receipt. No signature required.",pageW/2,finalY,{align:"center"})
  doc.text("Society 365 — Maintenance Management System",pageW/2,finalY+6,{align:"center"})

  doc.save(`Receipt_${p.title.replace(/\s/g,"_")}.pdf`)
}

// ── Period Card ───────────────────────────────────────────────────────────────
function PeriodCard({ period, onPaid }: { period:DuePeriod; onPaid:(pid:number)=>void }) {
  const [expanded, setExpanded] = useState(false)
  const [paying,   setPaying]   = useState(false)
  const [live,     setLive]     = useState(period)
  const isPaid = live.paymentStatus === "Paid"
  const isLate = live.penaltyDays > 0 && !isPaid

  const refreshPeriod = async () => {
    try {
      const r = await api.get<Res<DuePeriod[]>>("/MaintenancePayment/GetMyDues")
      const updated = (r.data?.result??[]).find(d=>d.periodId===period.periodId)
      if (updated) setLive(updated)
    } catch { /* silent */ }
  }

  const pay = async () => {
    if (isPaid) return
    setPaying(true)
    try {
      // Create Razorpay order (use live.totalPayable)
      new window.Razorpay({
        key: "rzp_test_RtMLEoBroA8R8P",
        amount: Math.round(live.totalPayable * 100),
        currency: "INR",
        name: "Society 365",
        description: `Maintenance — ${live.title}`,
        theme: { color: "#0d9488" },
        handler: async (res: RazorpayResponse) => {
          try {
            const r = await api.post<Res>("/MaintenancePayment/ConfirmPayment", {
              periodId: live.periodId,
              razorpayPayId:   res.razorpay_payment_id,
              razorpayOrderId: res.razorpay_order_id ?? "",
            })
            if (r.data?.isSuccess) {
              toast.success("Payment confirmed!")
              await refreshPeriod()
              onPaid(live.periodId)
            } else {
              toast.error(r.data?.resMsg ?? "Confirmation failed")
            }
          } catch(e) { toast.error(getApiMessage(e)) }
        },
        modal: { ondismiss: () => setPaying(false) },
      }).open()
    } catch(e) { toast.error(getApiMessage(e)); setPaying(false) }
  }

  return (
    <div className={cn(
      "bg-white dark:bg-[#0d1017] rounded-2xl border shadow-sm overflow-hidden transition-all",
      isPaid  ? "border-emerald-200 dark:border-emerald-500/20"
      : isLate? "border-rose-300 dark:border-rose-500/30"
              : "border-gray-200 dark:border-white/[0.07]"
    )}>
      {/* Status bar */}
      <div className={cn("h-1.5",
        isPaid?"bg-gradient-to-r from-emerald-400 to-emerald-500":
        isLate?"bg-gradient-to-r from-rose-400 to-orange-400":
               "bg-gradient-to-r from-teal-400 to-cyan-400"
      )}/>

      {/* Header */}
      <div className={cn("px-4 sm:px-5 py-4",
        isPaid  ? "bg-gradient-to-r from-emerald-50/60 to-transparent dark:from-emerald-900/10 dark:to-transparent"
        : isLate? "bg-gradient-to-r from-rose-50/60 to-transparent dark:from-rose-900/10 dark:to-transparent"
                : "bg-gradient-to-r from-teal-50/40 to-transparent dark:from-teal-900/10 dark:to-transparent"
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl border shrink-0 text-[11px] font-black",
              isPaid?"bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400":
              isLate?"bg-rose-100 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400":
                     "bg-teal-100 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/25 text-teal-700 dark:text-teal-400")}>
              {isPaid?<CheckCircle2 className="h-5 w-5"/>:isLate?<AlertTriangle className="h-5 w-5"/>:<IndianRupee className="h-5 w-5"/>}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[14px] sm:text-[15px] font-bold text-gray-900 dark:text-white">{live.title}</p>
                <span className={cn("text-[9.5px] font-black px-2 py-0.5 rounded-full border",
                  isPaid?"bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20":
                  isLate?"bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20":
                         "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20")}>
                  {isPaid?"PAID":isLate?"OVERDUE":"PENDING"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3"/>
                  {isPaid?`Paid on ${fmt(live.paymentDate)}`:`Due: ${fmt(live.dueDate)}`}
                </span>
                {isLate&&!isPaid&&(
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                    <Clock className="h-3 w-3"/>{live.penaltyDays} day{live.penaltyDays!==1?"s":""} late
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[18px] sm:text-[20px] font-black text-gray-900 dark:text-white">₹{live.totalPayable.toLocaleString()}</p>
            {!isPaid&&isLate&&<p className="text-[10.5px] text-rose-600 dark:text-rose-400 font-bold">incl. ₹{live.penaltyAmount.toLocaleString()} penalty</p>}
            {isPaid&&<p className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-bold">{live.receiptNumber}</p>}
          </div>
        </div>

        {/* Penalty info bar */}
        {isLate&&!isPaid&&(
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/[0.08] border border-rose-200 dark:border-rose-500/20">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0"/>
            <p className="text-[11.5px] font-semibold text-rose-700 dark:text-rose-400">
              ₹{live.penaltyPerDay}/day × {live.penaltyDays} days = <b>₹{live.penaltyAmount.toLocaleString()} penalty</b>. Pay now to stop accumulating!
            </p>
          </div>
        )}

        {/* Amount breakdown chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300">
            <IndianRupee className="h-3 w-3"/>Fixed: ₹{live.fixedAmount.toLocaleString()}
          </span>
          {live.extraAmount > 0&&(
            <span className="flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400">
              Extra: ₹{live.extraAmount.toLocaleString()}
            </span>
          )}
          {live.penaltyAmount > 0&&!isPaid&&(
            <span className="flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400">
              Penalty: ₹{live.penaltyAmount.toLocaleString()}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4">
          {isPaid?(
            <Button onClick={()=>generateUserReceipt(live)}
              className="flex-1 sm:flex-none h-10 px-5 text-[13px] font-bold rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]">
              <Download className="h-4 w-4"/>Download Receipt
            </Button>
          ):(
            <Button onClick={pay} disabled={paying}
              className={cn("flex-1 sm:flex-none h-10 px-6 text-[13px] font-bold rounded-xl gap-2 text-white shadow-lg disabled:opacity-50",
                isLate?"bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 shadow-[0_4px_14px_rgba(239,68,68,0.35)]":
                       "bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 shadow-[0_4px_14px_rgba(13,148,136,0.35)]")}>
              {paying?<><Loader2 className="h-4 w-4 animate-spin"/>Processing…</>:<><CreditCard className="h-4 w-4"/>Pay ₹{live.totalPayable.toLocaleString()}</>}
            </Button>
          )}
          <button onClick={()=>setExpanded(!expanded)}
            className="h-10 w-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-teal-600 hover:border-teal-300 transition-all">
            {expanded?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}
          </button>
        </div>
      </div>

      {/* Expandable details */}
      {expanded&&(
        <div className="border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02] px-4 sm:px-5 py-4 space-y-3 animate-[fadeInUp_0.2s_ease_both]">
          {live.workDescription&&(
            <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#0d1017] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-teal-600 dark:text-teal-400 mb-1.5 flex items-center gap-1.5">
                <Info className="h-3 w-3"/>Work Done This Month
              </p>
              <p className="text-[12.5px] text-gray-600 dark:text-gray-300 leading-relaxed">{live.workDescription}</p>
            </div>
          )}

          {live.expenses.length > 0&&(
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
                <Receipt className="h-3 w-3"/>Extra Expenses
              </p>
              {live.expenses.map(e=>(
                <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#0d1017] px-3 py-2.5">
                  <span className="text-[12.5px] font-medium text-gray-700 dark:text-gray-300">{e.description}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {e.receiptUrl&&(
                      <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline">
                        <ImageIcon className="h-3 w-3"/>Receipt
                      </a>
                    )}
                    <span className="text-[13px] font-black text-gray-800 dark:text-white">₹{e.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isPaid&&live.razorpayPayId&&(
            <div className="rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/[0.06] px-4 py-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Shield className="h-3 w-3"/>Payment Proof
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                <div><span className="text-gray-400">Receipt No:</span><span className="ml-2 font-bold text-gray-700 dark:text-gray-200">{live.receiptNumber}</span></div>
                <div><span className="text-gray-400">Payment ID:</span><span className="ml-2 font-bold text-gray-700 dark:text-gray-200 break-all">{live.razorpayPayId}</span></div>
                <div><span className="text-gray-400">Paid On:</span><span className="ml-2 font-bold text-gray-700 dark:text-gray-200">{fmtTime(live.paymentDate)}</span></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UserPayMaintenancePage() {
  const [dues,    setDues]    = useState<DuePeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<"pending"|"paid">("pending")

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get<Res<DuePeriod[]>>("/MaintenancePayment/GetMyDues")
      setDues(r.data?.result ?? [])
    } catch(e) { toast.error(getApiMessage(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    // Load Razorpay
    if (!document.querySelector('script[src*="razorpay"]')) {
      const s = document.createElement("script")
      s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.async = true
      document.body.appendChild(s)
    }
    load()
  }, [])

  const onPaid = (pid: number) =>
    setDues(ds => ds.map(d => d.periodId===pid ? {...d, paymentStatus:"Paid"} : d))

  const pending  = dues.filter(d => d.paymentStatus !== "Paid")
  const paid     = dues.filter(d => d.paymentStatus === "Paid")
  const current  = tab === "pending" ? pending : paid
  const totalDue = pending.reduce((a,d)=>a+d.totalPayable,0)

  return (
    <div className="flex flex-col h-full bg-[#f0f4f8] dark:bg-[#070b10]">

      {/* Header */}
      <div className="bg-white dark:bg-[#0d1017] border-b border-gray-200 dark:border-white/[0.06] px-4 sm:px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 shrink-0">
              <IndianRupee className="h-4 w-4 text-teal-600 dark:text-teal-400"/>
            </div>
            <div>
              <h1 className="text-[15px] sm:text-[17px] font-bold text-gray-900 dark:text-white">Pay Maintenance</h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block">View dues, pay securely via Razorpay, download receipts</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="h-8 px-3 text-[11.5px] gap-1.5 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 rounded-xl">
            <RefreshCw className={cn("h-3.5 w-3.5",loading&&"animate-spin")}/>Refresh
          </Button>
        </div>

        {/* Due summary banner */}
        {!loading&&totalDue > 0&&(
          <div className="mt-3 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 shrink-0"/>
              <span className="text-[12.5px] font-semibold">{pending.length} pending payment{pending.length!==1?"s":""}</span>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold opacity-80">Total Due</p>
              <p className="text-[18px] font-black">₹{totalDue.toLocaleString()}</p>
            </div>
          </div>
        )}
        {!loading&&totalDue===0&&dues.length>0&&(
          <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0"/>
            <p className="text-[12.5px] font-bold text-emerald-700 dark:text-emerald-400">All payments up to date! 🎉</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-end gap-0 -mb-px mt-3">
          {([["pending","Pending",pending.length],["paid","Paid",paid.length]] as const).map(([id,label,count])=>(
            <button key={id} onClick={()=>setTab(id)}
              className={cn("flex items-center gap-1.5 px-4 sm:px-5 py-2 border-b-2 text-[12px] sm:text-[12.5px] font-semibold whitespace-nowrap transition-all",
                tab===id?"border-teal-500 text-teal-600 dark:text-teal-400":"border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600")}>
              {label}
              <span className={cn("inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9.5px] font-black",
                tab===id?"bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300":"bg-gray-100 dark:bg-white/[0.06] text-gray-500")}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading?(
          <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto">
            {[1,2,3].map(i=>(
              <div key={i} className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0d1017] overflow-hidden animate-pulse">
                <div className="h-1.5 bg-teal-200"/>
                <div className="p-5 space-y-3">
                  <div className="flex justify-between"><div className="h-5 w-36 bg-gray-100 dark:bg-white/[0.05] rounded-lg"/><div className="h-6 w-20 bg-gray-100 dark:bg-white/[0.05] rounded-lg"/></div>
                  <div className="h-4 w-48 bg-gray-100 dark:bg-white/[0.04] rounded"/>
                  <div className="h-10 w-36 bg-gray-100 dark:bg-white/[0.04] rounded-xl"/>
                </div>
              </div>
            ))}
          </div>
        ):current.length===0?(
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
            <div className={cn("h-16 w-16 rounded-2xl border-2 border-dashed flex items-center justify-center",
              tab==="pending"?"border-teal-200 dark:border-teal-500/20":"border-gray-200 dark:border-white/[0.09]")}>
              {tab==="pending"?<CheckCircle2 className="h-7 w-7 text-emerald-500"/>:<Receipt className="h-7 w-7 text-gray-300 dark:text-gray-600"/>}
            </div>
            <div>
              <p className="text-[14px] font-bold text-gray-600 dark:text-gray-300">
                {tab==="pending"?"No pending dues 🎉":"No payment history yet"}
              </p>
              <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-1">
                {tab==="pending"?"You're all caught up!":"Pay a maintenance due to see your history."}
              </p>
            </div>
          </div>
        ):(
          <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto">
            {current.map((d,i)=>(
              <div key={d.periodId} className="animate-[fadeInUp_0.35s_ease_both]" style={{animationDelay:`${i*60}ms`}}>
                <PeriodCard period={d} onPaid={onPaid}/>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
