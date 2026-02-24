"use client"
import { useEffect, useRef, useState } from "react"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import {
  RefreshCw, Search, Download, Printer, FileSpreadsheet,
  IndianRupee, Calendar, Users, CheckCircle2, Clock,
  ChevronLeft, ChevronRight, X, FileText, Filter,
  TrendingUp, AlertTriangle, Eye,
} from "lucide-react"

type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } }

interface Payment {
  id:number; periodId:number; periodTitle:string
  userId:number; userName:string; flatNo:string
  fixedAmount:number; extraAmount:number
  penaltyDays:number; penaltyAmount:number; totalAmount:number
  paymentStatus:string; paymentDate?:string; razorpayPayId?:string; receiptNumber?:string
  dueDate:string; penaltyPerDay:number
}
type Res<T=unknown>={isSuccess?:boolean;resMsg?:string;result?:T}

const MONTHS=["","January","February","March","April","May","June","July","August","September","October","November","December"]
const CY=new Date().getFullYear()
const YEARS=[CY-2,CY-1,CY,CY+1]
const PAGE_SIZE=15

const fmt=(d?:string|null)=>{
  if(!d)return"—"
  const dt=new Date(d)
  return isNaN(dt.getTime())?"—":dt.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})
}
const fmtT=(d?:string|null)=>{
  if(!d)return"—"
  const dt=new Date(d)
  return isNaN(dt.getTime())?"—":dt.toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})
}

// ── Admin Receipt PDF ─────────────────────────────────────────────────────────
function generateAdminReceipt(p: Payment) {
  const doc=new jsPDF()
  const W=doc.internal.pageSize.getWidth()
  doc.setFillColor(15,23,42)
  doc.rect(0,0,W,40,"F")
  doc.setFillColor(13,148,136)
  doc.rect(0,38,W,3,"F")
  doc.setTextColor(255,255,255)
  doc.setFontSize(18);doc.setFont("helvetica","bold")
  doc.text("SOCIETY 365 — ADMIN RECEIPT",W/2,18,{align:"center"})
  doc.setFontSize(9);doc.setFont("helvetica","normal")
  doc.text(`Receipt: ${p.receiptNumber??"—"}   |   Razorpay: ${p.razorpayPayId??"—"}`,W/2,30,{align:"center"})

  doc.setTextColor(30,30,30)
  autoTable(doc,{
    startY:50,theme:"grid",headStyles:{fillColor:[15,23,42]},
    head:[["Field","Value"]],
    body:[
      ["Resident",p.userName],["Flat No",p.flatNo],["Period",p.periodTitle],
      ["Due Date",fmt(p.dueDate)],["Payment Date",fmtT(p.paymentDate)],["Status",p.paymentStatus],
    ],
    columnStyles:{0:{fontStyle:"bold",cellWidth:55}},
  })
  const y1=((doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? 60)+10
  doc.setFontSize(10);doc.setFont("helvetica","bold");doc.text("Amount Breakdown",14,y1)
  const rows=[["Fixed Amount",`₹${p.fixedAmount.toLocaleString()}`]]
  if(p.extraAmount>0)rows.push(["Extra Charges",`₹${p.extraAmount.toLocaleString()}`])
  if(p.penaltyAmount>0)rows.push([`Penalty (${p.penaltyDays}d × ₹${p.penaltyPerDay})`,`₹${p.penaltyAmount.toLocaleString()}`])
  rows.push(["TOTAL",`₹${p.totalAmount.toLocaleString()}`])
  autoTable(doc,{
    startY:y1+4,theme:"striped",headStyles:{fillColor:[15,23,42]},
    head:[["Description","Amount"]],body:rows,
    columnStyles:{1:{halign:"right"}},
    didParseCell:(d)=>{if(d.row.index===rows.length-1&&d.section==="body"){d.cell.styles.fontStyle="bold";d.cell.styles.fillColor=[220,252,231]}},
  })
  const fy=((doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? 120)+15
  doc.setFontSize(7);doc.setTextColor(150,150,150)
  doc.text("Society 365 — Admin Generated Receipt — Computer Generated, No Signature Required",W/2,fy,{align:"center"})
  doc.save(`AdminReceipt_${p.receiptNumber??p.id}.pdf`)
}

// ── Excel Export ──────────────────────────────────────────────────────────────
function exportToExcel(payments: Payment[], label: string) {
  const rows=payments.map(p=>({
    "Receipt No":p.receiptNumber??"",
    "Resident":p.userName,
    "Flat No":p.flatNo,
    "Period":p.periodTitle,
    "Fixed Amount":p.fixedAmount,
    "Extra Amount":p.extraAmount,
    "Penalty Days":p.penaltyDays,
    "Penalty Amount":p.penaltyAmount,
    "Total Amount":p.totalAmount,
    "Status":p.paymentStatus,
    "Due Date":fmt(p.dueDate),
    "Payment Date":fmtT(p.paymentDate),
    "Razorpay ID":p.razorpayPayId??"",
  }))
  const ws=XLSX.utils.json_to_sheet(rows)
  const wb=XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb,ws,"Payments")
  XLSX.writeFile(wb,`Maintenance_Report_${label.replace(/\s/g,"_")}.xlsx`)
}

// ── Print handler ─────────────────────────────────────────────────────────────
function printTable(payments: Payment[], label: string) {
  const rows=payments.map(p=>`
    <tr>
      <td>${p.userName}</td><td>${p.flatNo}</td><td>${p.periodTitle}</td>
      <td>₹${p.fixedAmount.toLocaleString()}</td><td>₹${p.extraAmount.toLocaleString()}</td>
      <td>₹${p.penaltyAmount.toLocaleString()}</td><td><b>₹${p.totalAmount.toLocaleString()}</b></td>
      <td><span style="color:${p.paymentStatus==="Paid"?"green":"orange"};font-weight:bold">${p.paymentStatus}</span></td>
      <td>${fmt(p.paymentDate)}</td><td style="font-size:9px">${p.receiptNumber??""}</td>
    </tr>`).join("")
  const win=window.open("","_blank","width=1100,height=700")!
  win.document.write(`
    <html><head><title>Maintenance Report — ${label}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;padding:20px}
      h2{color:#0f172a;margin-bottom:4px}p{color:#64748b;font-size:10px;margin-bottom:12px}
      table{width:100%;border-collapse:collapse}
      th{background:#0f172a;color:#fff;padding:7px 6px;text-align:left;font-size:10px}
      td{padding:6px;border-bottom:1px solid #e2e8f0;font-size:10px}
      tr:nth-child(even){background:#f8fafc}
      .summary{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:12px;display:flex;gap:20px}
      .summary span{font-size:10px;color:#64748b}.summary b{font-size:13px;color:#0f172a}
    </style></head><body>
    <h2>Society 365 — Maintenance Payment Report</h2>
    <p>Generated: ${new Date().toLocaleString("en-IN")} | Filter: ${label}</p>
    <div class="summary">
      <div><span>Total Records</span><br/><b>${payments.length}</b></div>
      <div><span>Paid</span><br/><b style="color:green">${payments.filter(p=>p.paymentStatus==="Paid").length}</b></div>
      <div><span>Pending</span><br/><b style="color:orange">${payments.filter(p=>p.paymentStatus==="Pending").length}</b></div>
      <div><span>Total Collected</span><br/><b>₹${payments.filter(p=>p.paymentStatus==="Paid").reduce((a,p)=>a+p.totalAmount,0).toLocaleString()}</b></div>
    </div>
    <table><thead><tr>
      <th>Resident</th><th>Flat</th><th>Period</th><th>Fixed</th><th>Extra</th>
      <th>Penalty</th><th>Total</th><th>Status</th><th>Paid On</th><th>Receipt No</th>
    </tr></thead><tbody>${rows}</tbody></table>
    </body></html>`)
  win.document.close(); win.print()
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminReportPage() {
  const [payments,  setPayments]  = useState<Payment[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState("")
  const [page,      setPage]      = useState(1)
  const [fMonth,    setFMonth]    = useState("")
  const [fYear,     setFYear]     = useState(String(CY))
  const [fStatus,   setFStatus]   = useState("")
  const [fFrom,     setFFrom]     = useState("")
  const [fTo,       setFTo]       = useState("")
  const [viewPay,   setViewPay]   = useState<Payment|null>(null)
  const printLabel  = [fMonth?MONTHS[+fMonth]:"",fYear,fStatus].filter(Boolean).join(" · ") || "All Records"

  const load = async () => {
    setLoading(true)
    try {
      const params=new URLSearchParams()
      if(fMonth)  params.set("Month",fMonth)
      if(fYear)   params.set("Year",fYear)
      if(fStatus) params.set("Status",fStatus)
      if(fFrom)   params.set("FromDate",fFrom)
      if(fTo)     params.set("ToDate",fTo)
      const r=await api.get<Res<Payment[]>>(`/MaintenancePayment/GetAllPayments?${params}`)
      setPayments(r.data?.result??[])
      setPage(1)
    } catch(e){toast.error(getApiMessage(e))}
    finally{setLoading(false)}
  }

  useEffect(()=>{load()},[])

  const filtered=payments.filter(p=>{
    const q=search.trim().toLowerCase()
    return !q||`${p.userName} ${p.flatNo} ${p.periodTitle} ${p.receiptNumber}`.toLowerCase().includes(q)
  })
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE))
  const paged=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)

  // Summary stats
  const paidList    = payments.filter(p=>p.paymentStatus==="Paid")
  const pendingList = payments.filter(p=>p.paymentStatus!=="Paid")
  const totalCollected = paidList.reduce((a,p)=>a+p.totalAmount,0)
  const totalPending   = pendingList.reduce((a,p)=>a+p.totalAmount,0)

  const statBox=(label:string,value:string,sub:string,color:string)=>(
    <div className={cn("rounded-2xl border p-4",color)}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-[22px] font-black text-gray-900 dark:text-white mt-0.5">{value}</p>
      <p className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-[#f0f4f8] dark:bg-[#070b10]">

      {/* Header */}
      <div className="bg-white dark:bg-[#0d1017] border-b border-gray-200 dark:border-white/[0.06] px-4 sm:px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 dark:bg-white/10 border border-slate-200 dark:border-white/[0.1]">
              <FileSpreadsheet className="h-4 w-4 text-white dark:text-white"/>
            </div>
            <div>
              <h1 className="text-[15px] sm:text-[17px] font-bold text-gray-900 dark:text-white">Maintenance Report</h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block">All payment records · filter · print · export to Excel</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={()=>printTable(filtered,printLabel)}
              className="h-8 px-3 text-[11.5px] gap-1.5 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 rounded-xl hidden sm:flex">
              <Printer className="h-3.5 w-3.5"/>Print
            </Button>
            <Button size="sm" onClick={()=>exportToExcel(filtered,printLabel)}
              className="h-8 px-3 text-[11.5px] gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
              <Download className="h-3.5 w-3.5"/><span className="hidden sm:inline">Export Excel</span>
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}
              className="h-8 px-2 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 rounded-xl">
              <RefreshCw className={cn("h-3.5 w-3.5",loading&&"animate-spin")}/>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {statBox("Total Records",String(payments.length),`${paidList.length} paid · ${pendingList.length} pending`,"bg-white dark:bg-[#0d1017] border-gray-200 dark:border-white/[0.07]")}
          {statBox("Total Collected",`₹${totalCollected.toLocaleString()}`,`${paidList.length} payments`,"bg-emerald-50 dark:bg-emerald-500/[0.07] border-emerald-200 dark:border-emerald-500/20")}
          {statBox("Pending Amount",`₹${totalPending.toLocaleString()}`,`${pendingList.length} outstanding`,"bg-amber-50 dark:bg-amber-500/[0.07] border-amber-200 dark:border-amber-500/20")}
          {statBox("Penalty Collected",`₹${paidList.reduce((a,p)=>a+p.penaltyAmount,0).toLocaleString()}`,`from late payments`,"bg-rose-50 dark:bg-rose-500/[0.07] border-rose-200 dark:border-rose-500/20")}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-gray-400 shrink-0"/>
            <span className="text-[11px] font-semibold text-gray-400">Filters:</span>
          </div>
          <select value={fMonth} onChange={e=>{setFMonth(e.target.value);setPage(1)}}
            className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[11.5px] text-gray-700 dark:text-gray-200 outline-none min-w-[110px]">
            <option value="">All Months</option>
            {MONTHS.slice(1).map((m,i)=><option key={i+1} value={String(i+1)}>{m}</option>)}
          </select>
          <select value={fYear} onChange={e=>{setFYear(e.target.value);setPage(1)}}
            className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[11.5px] text-gray-700 dark:text-gray-200 outline-none">
            {YEARS.map(y=><option key={y} value={String(y)}>{y}</option>)}
          </select>
          <select value={fStatus} onChange={e=>{setFStatus(e.target.value);setPage(1)}}
            className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[11.5px] text-gray-700 dark:text-gray-200 outline-none">
            <option value="">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </select>
          <input type="date" value={fFrom} onChange={e=>{setFFrom(e.target.value);setPage(1)}} placeholder="From Date"
            className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[11.5px] text-gray-700 dark:text-gray-200 outline-none"/>
          <input type="date" value={fTo} onChange={e=>{setFTo(e.target.value);setPage(1)}} placeholder="To Date"
            className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[11.5px] text-gray-700 dark:text-gray-200 outline-none"/>
          <Button size="sm" onClick={load} disabled={loading}
            className="h-8 px-4 text-[11.5px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-white gap-1.5 dark:bg-white/10 dark:hover:bg-white/[0.15]">
            <TrendingUp className="h-3 w-3"/>Generate
          </Button>
          {(fMonth||fStatus||fFrom||fTo)&&(
            <button onClick={()=>{setFMonth("");setFStatus("");setFFrom("");setFTo("");setPage(1)}}
              className="h-8 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] text-[11.5px] text-gray-400 hover:text-rose-600 hover:border-rose-300 flex items-center gap-1 transition-all">
              <X className="h-3 w-3"/>Clear
            </button>
          )}
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none"/>
            <input placeholder="Search resident / flat / receipt…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
              className="h-8 pl-8 pr-7 w-48 sm:w-60 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[11.5px] text-gray-700 dark:text-gray-200 outline-none focus:border-teal-400 placeholder:text-gray-400"/>
            {search&&<button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X className="h-3 w-3"/></button>}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading?(
          <div className="p-4 space-y-2">
            {[...Array(8)].map((_,i)=><div key={i} className="h-12 rounded-xl bg-white dark:bg-[#0d1017] border border-gray-100 dark:border-white/[0.05] animate-pulse"/>)}
          </div>
        ):paged.length===0?(
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
            <div className="h-14 w-14 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/[0.09] flex items-center justify-center">
              <FileText className="h-6 w-6 text-gray-300 dark:text-gray-600"/>
            </div>
            <p className="text-[13px] font-semibold text-gray-400">{search?`No records match "${search}"`:"No records found for selected filters"}</p>
          </div>
        ):(
          <div className="p-4 space-y-2">
            {/* Mobile result count */}
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Showing <b className="text-gray-700 dark:text-gray-300">{paged.length}</b> of <b className="text-gray-700 dark:text-gray-300">{filtered.length}</b> records
            </p>

            {/* Desktop table */}
            <div className="hidden lg:block bg-white dark:bg-[#0d1017] rounded-2xl border border-gray-200 dark:border-white/[0.07] overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/80 dark:bg-white/[0.02]">
                    {["Resident / Flat","Period","Fixed","Extra","Penalty","Total","Status","Paid On","Receipt","Actions"].map(h=>(
                      <th key={h} className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-wide text-gray-400 dark:text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((p,i)=>(
                    <tr key={p.id} className={cn("border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors animate-[fadeInUp_0.25s_ease_both]",
                      i%2===0?"":"bg-gray-50/30 dark:bg-white/[0.01]")} style={{animationDelay:`${i*20}ms`}}>
                      <td className="px-3 py-3">
                        <p className="text-[12.5px] font-bold text-gray-900 dark:text-white">{p.userName}</p>
                        <p className="text-[10.5px] text-gray-400">Flat {p.flatNo}</p>
                      </td>
                      <td className="px-3 py-3 text-[12px] font-semibold text-gray-700 dark:text-gray-200">{p.periodTitle}</td>
                      <td className="px-3 py-3 text-[12px] text-gray-600 dark:text-gray-300">₹{p.fixedAmount.toLocaleString()}</td>
                      <td className="px-3 py-3 text-[12px] text-gray-600 dark:text-gray-300">{p.extraAmount>0?`₹${p.extraAmount.toLocaleString()}`:"—"}</td>
                      <td className="px-3 py-3">
                        {p.penaltyAmount>0
                          ?<span className="flex flex-col"><span className="text-[12px] font-bold text-rose-600 dark:text-rose-400">₹{p.penaltyAmount.toLocaleString()}</span><span className="text-[10px] text-gray-400">{p.penaltyDays}d late</span></span>
                          :<span className="text-[12px] text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-3 text-[13px] font-black text-gray-900 dark:text-white">₹{p.totalAmount.toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full border",
                          p.paymentStatus==="Paid"?"bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20":
                                                   "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20")}>
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-gray-400">{fmt(p.paymentDate)}</td>
                      <td className="px-3 py-3 text-[10.5px] font-mono text-gray-500 dark:text-gray-400">{p.receiptNumber??"—"}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={()=>setViewPay(p)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-teal-600 hover:border-teal-300 transition-all">
                            <Eye className="h-3 w-3"/>
                          </button>
                          {p.paymentStatus==="Paid"&&(
                            <button onClick={()=>generateAdminReceipt(p)}
                              className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition-all">
                              <FileText className="h-3 w-3"/>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-2">
              {paged.map((p,i)=>(
                <div key={p.id} className={cn("bg-white dark:bg-[#0d1017] rounded-xl border shadow-sm p-4 animate-[fadeInUp_0.25s_ease_both]",
                  p.paymentStatus==="Paid"?"border-emerald-100 dark:border-emerald-500/15":"border-gray-200 dark:border-white/[0.07]")}
                  style={{animationDelay:`${i*30}ms`}}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[13px] font-bold text-gray-900 dark:text-white">{p.userName}</p>
                      <p className="text-[11px] text-gray-400">Flat {p.flatNo} · {p.periodTitle}</p>
                    </div>
                    <span className={cn("text-[9.5px] font-black px-2 py-0.5 rounded-full border",
                      p.paymentStatus==="Paid"?"bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20":
                                               "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20")}>
                      {p.paymentStatus}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] mb-3">
                    <div><span className="text-gray-400">Fixed</span><p className="font-bold text-gray-700 dark:text-gray-200">₹{p.fixedAmount.toLocaleString()}</p></div>
                    {p.extraAmount>0&&<div><span className="text-gray-400">Extra</span><p className="font-bold text-teal-600 dark:text-teal-400">₹{p.extraAmount.toLocaleString()}</p></div>}
                    {p.penaltyAmount>0&&<div><span className="text-gray-400">Penalty</span><p className="font-bold text-rose-600 dark:text-rose-400">₹{p.penaltyAmount.toLocaleString()}</p></div>}
                    <div><span className="text-gray-400">Total</span><p className="text-[14px] font-black text-gray-900 dark:text-white">₹{p.totalAmount.toLocaleString()}</p></div>
                    {p.paymentDate&&<div><span className="text-gray-400">Paid On</span><p className="font-semibold text-gray-600 dark:text-gray-300">{fmt(p.paymentDate)}</p></div>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>setViewPay(p)}
                      className="flex-1 h-8 rounded-lg border border-gray-200 dark:border-white/[0.08] text-[11.5px] font-semibold text-gray-600 dark:text-gray-300 flex items-center justify-center gap-1.5">
                      <Eye className="h-3.5 w-3.5"/>View
                    </button>
                    {p.paymentStatus==="Paid"&&(
                      <button onClick={()=>generateAdminReceipt(p)}
                        className="flex-1 h-8 rounded-lg border border-emerald-200 dark:border-emerald-500/20 text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center gap-1.5">
                        <FileText className="h-3.5 w-3.5"/>Receipt PDF
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE&&(
        <div className="bg-white dark:bg-[#0d1017] border-t border-gray-100 dark:border-white/[0.05] px-4 sm:px-6 py-3 flex items-center justify-between gap-2 shrink-0">
          <p className="text-[11px] text-gray-400">
            Page <b className="text-gray-700 dark:text-gray-300">{page}</b> / <b className="text-gray-700 dark:text-gray-300">{pages}</b>
            <span className="ml-2 text-gray-300 dark:text-gray-600">({filtered.length} records)</span>
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
                    page===p?"bg-slate-800 border-slate-800 text-white dark:bg-white/10 dark:border-white/10":"bg-white dark:bg-transparent border-gray-200 dark:border-white/[0.08] text-gray-500 hover:border-teal-400")}>{p}
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

      {/* View detail modal */}
      {viewPay&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={()=>setViewPay(null)}>
          <div className="bg-white dark:bg-[#141820] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-2xl w-full max-w-md overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className={cn("h-1.5",viewPay.paymentStatus==="Paid"?"bg-emerald-500":"bg-amber-400")}/>
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
              <div>
                <p className="text-[15px] font-bold text-gray-900 dark:text-white">{viewPay.userName}</p>
                <p className="text-[12px] text-gray-400 mt-0.5">Flat {viewPay.flatNo} · {viewPay.periodTitle}</p>
              </div>
              <button onClick={()=>setViewPay(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"><X className="h-5 w-5"/></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Fixed Amount",`₹${viewPay.fixedAmount.toLocaleString()}`],
                  ["Extra Amount",viewPay.extraAmount>0?`₹${viewPay.extraAmount.toLocaleString()}`:"—"],
                  ["Penalty",viewPay.penaltyAmount>0?`₹${viewPay.penaltyAmount.toLocaleString()} (${viewPay.penaltyDays}d)`:"—"],
                  ["Total Paid",`₹${viewPay.totalAmount.toLocaleString()}`],
                  ["Due Date",fmt(viewPay.dueDate)],
                  ["Payment Date",fmt(viewPay.paymentDate)],
                ].map(([k,v])=>(
                  <div key={k} className="rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] px-3 py-2.5">
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-gray-400">{k}</p>
                    <p className="text-[12.5px] font-bold text-gray-800 dark:text-white mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              {viewPay.receiptNumber&&(
                <div className="rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/[0.06] px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Receipt Info</p>
                  <p className="text-[12.5px] font-bold text-gray-800 dark:text-white mt-1">{viewPay.receiptNumber}</p>
                  {viewPay.razorpayPayId&&<p className="text-[10.5px] font-mono text-gray-400 mt-0.5">{viewPay.razorpayPayId}</p>}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <Button variant="outline" onClick={()=>setViewPay(null)}
                className="flex-1 h-9 text-[12.5px] rounded-xl border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-600 dark:text-gray-300">Close</Button>
              {viewPay.paymentStatus==="Paid"&&(
                <Button onClick={()=>generateAdminReceipt(viewPay)}
                  className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white gap-1.5 dark:bg-white/10 dark:hover:bg-white/[0.15]">
                  <FileText className="h-3.5 w-3.5"/>Download PDF
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
