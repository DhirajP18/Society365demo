"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  AlertTriangle, Calendar, CheckCircle2, Image as ReceiptImageIcon, IndianRupee, Pencil, Plus, PlusCircle,
  Receipt, RefreshCw, Search, Send, Settings, Trash2, X, Eye, Download,
} from "lucide-react"
import { resolveReceiptUrl } from "@/lib/appconfig"

interface Setting { id:number; penaltyPerDay:number; dueDayOfMonth:number }
interface Expense  { id:number; periodId:number; description:string; amount:number; receiptUrl?:string }
interface Period {
  id:number; title:string; periodMonth:number; periodYear:number
  fixedAmount:number; dueDate:string; workDescription:string
  isPublished:boolean; isActive:boolean
  totalUsers:number; paidCount:number; pendingCount:number; totalCollected:number
  expenses:Expense[]
}
type Res<T=unknown> = {isSuccess?:boolean;resMsg?:string;result?:T}

const MONTHS = ["","January","February","March","April","May","June","July","August","September","October","November","December"]
const CY = new Date().getFullYear()
const YEARS = [CY-1,CY,CY+1]

/** Tiny popover with Show & Download actions for a receipt */
function ReceiptActions({ url }: { url: string }) {
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
        className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
      >
        <ReceiptImageIcon className="h-3 w-3" />
        Receipt
      </button>

      {open && (
        <div className="absolute z-50 left-0 top-full mt-1.5 min-w-[130px] rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-[#1a1d27] shadow-xl overflow-hidden">
          {/* Show / Preview */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[12px] text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
          >
            <Eye className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            {isPdf ? "Open PDF" : "Show Image"}
          </a>

          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors border-t border-gray-100 dark:border-white/[0.06] disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            {downloading ? "Downloading..." : "Download"}
          </button>
        </div>
      )}
    </div>
  )
}
function FL({id,label,type="text",value,onChange,as,min,max,step}:{id?:string;label:string;type?:string;value:string|number;onChange:(v:string)=>void;as?:"textarea";min?:string;max?:string;step?:string}) {
  const [f,setF]=useState(false)
  const active=f||String(value).length>0
  const base=cn(
    "w-full rounded-xl border text-[13px] text-gray-900 dark:text-gray-100 outline-none transition-all bg-white dark:bg-[#1a1d27]",
    f?"border-teal-400 shadow-[0_0_0_3px_rgba(20,184,166,0.1)]":"border-gray-200 dark:border-white/[0.09] hover:border-gray-300"
  )
  return (
    <div className="relative">
      {as==="textarea"
        ? <textarea id={id} rows={3} value={value as string} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} className={cn(base,"px-3 pt-5 pb-2 resize-none")}/>
        : <input id={id} type={type} value={value as string} min={min} max={max} step={step} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} className={cn(base,"h-11 px-3 pt-4 pb-1")}/>
      }
      <label className={cn("pointer-events-none absolute left-3 font-medium transition-all duration-150 select-none",active?"top-[5px] text-[10px] text-teal-600 dark:text-teal-400 tracking-wide":as==="textarea"?"top-3.5 text-[12.5px] text-gray-400":"top-1/2 -translate-y-1/2 text-[12.5px] text-gray-400")}>{label}</label>
    </div>
  )
}

export default function AdminMaintenanceSettingPage() {
  const [setting,setS]=useState<Setting>({id:0,penaltyPerDay:20,dueDayOfMonth:10})
  const [periods,setP]=useState<Period[]>([])
  const [loading,setL]=useState(true)
  const [savingS,setSS]=useState(false)
  const [showForm,setSF]=useState(false)
  const [pf,setPF]=useState({id:0,title:"",periodMonth:new Date().getMonth()+1,periodYear:CY,fixedAmount:"",dueDate:"",workDescription:"",isActive:true})
  const [pSav,setPS]=useState(false)
  const [eForm,setEF]=useState<{[k:number]:{desc:string;amt:string;file:File|null}}>({})
  const [delPId,setDP]=useState<number|null>(null)
  const [delEId,setDE]=useState<number|null>(null)
  const [pub,setPub]=useState<number|null>(null)

  const [query, setQuery] = useState("")
  const [month, setMonth] = useState<string>("all")
  const [year, setYear] = useState<string>("all")
  const [status, setStatus] = useState<"all"|"published"|"draft">("all")

  const load=async()=>{
    setL(true)
    try{
      const[sR,pR]=await Promise.all([api.get<Res<Setting>>("/MaintenanceSetting/Get"),api.get<Res<Period[]>>("/MaintenancePeriod/GetAll")])
      if(sR.data?.result)setS(sR.data.result)
      setP(pR.data?.result??[])
    }catch(e){toast.error(getApiMessage(e))}
    finally{setL(false)}
  }
  useEffect(()=>{load()},[])

  const saveSetting=async()=>{
    setSS(true)
    try{
      const r=await api.post<Res>("/MaintenanceSetting/Save",setting)
      if(r.data?.isSuccess)toast.success("Settings saved")
      else toast.error(r.data?.resMsg??"Failed")
    }catch(e){toast.error(getApiMessage(e))}
    finally{setSS(false)}
  }

  const resetPF=()=>setPF({id:0,title:"",periodMonth:new Date().getMonth()+1,periodYear:CY,fixedAmount:"",dueDate:"",workDescription:"",isActive:true})
  const savePeriod=async()=>{
    if(!pf.fixedAmount||!pf.dueDate)return toast.error("Fixed amount and due date required")
    setPS(true)
    try{
      const payload={...pf,fixedAmount:parseFloat(pf.fixedAmount),title:pf.title||`${MONTHS[pf.periodMonth]} ${pf.periodYear}`}
      const r=pf.id>0?await api.put<Res>("/MaintenancePeriod/Update",payload):await api.post<Res>("/MaintenancePeriod/Insert",payload)
      if(r.data?.isSuccess){toast.success(pf.id>0?"Period updated":"Period created");setSF(false);resetPF();load()}
      else toast.error(r.data?.resMsg??"Failed")
    }catch(e){toast.error(getApiMessage(e))}
    finally{setPS(false)}
  }

  const deletePeriod=async()=>{
    if(!delPId)return
    try{await api.delete(`/MaintenancePeriod/Delete/${delPId}`);toast.success("Deleted");load()}
    catch(e){toast.error(getApiMessage(e))}
    finally{setDP(null)}
  }
  const publishPeriod=async(id:number)=>{
    setPub(id)
    try{
      const r=await api.post<Res>(`/MaintenancePeriod/Publish/${id}`,{})
      if(r.data?.isSuccess){toast.success("Published. Dues generated.");load()}
      else toast.error(r.data?.resMsg??"Failed")
    }catch(e){toast.error(getApiMessage(e))}
    finally{setPub(null)}
  }

  const gef=(pid:number)=>eForm[pid]??{desc:"",amt:"",file:null}
  const sef=(pid:number,patch:Partial<{desc:string;amt:string;file:File|null}>)=>setEF(f=>({...f,[pid]:{...gef(pid),...patch}}))

  const getInsertedPeriodId = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v
    if (!v || typeof v !== "object") return null
    const rec = v as Record<string, unknown>
    const raw = rec.id ?? rec.periodId
    return typeof raw === "number" && Number.isFinite(raw) ? raw : null
  }

  const createExpenseWithReceipt = async (periodId: number, ef: {desc:string;amt:string;file:File|null}) => {
    const amount = parseFloat(ef.amt)
    const fd = new FormData()
    fd.append("PeriodId", String(periodId))
    fd.append("Description", ef.desc.trim())
    fd.append("Amount", String(amount))
    if (ef.file) fd.append("Receipt", ef.file)

    const r = await api.post<Res>("/MaintenanceExpense/Create", fd)
    if (r.data?.isSuccess === false) throw new Error(r.data?.resMsg ?? "Expense insert failed")
  }

  const addExpense=async(pid:number,separate=false)=>{
    const ef=gef(pid)
    if(!ef.desc.trim()||!ef.amt)return toast.error("Description and amount required")
    const amount = parseFloat(ef.amt)
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid expense amount")
    try{
      if (separate) {
        const base = periods.find(p => p.id === pid)
        if (!base) return toast.error("Base period not found")

        const title = `${MONTHS[base.periodMonth]} ${base.periodYear} - Extra Expense`
        const pRes = await api.post<Res>("/MaintenancePeriod/Insert",{
          id:0,title,periodMonth:base.periodMonth,periodYear:base.periodYear,fixedAmount:0,
          dueDate:base.dueDate?.split("T")[0] ?? "",
          workDescription:`Additional expense bill for ${base.title}`,isActive:true,
        })
        if (!pRes.data?.isSuccess) return toast.error(pRes.data?.resMsg ?? "Could not create separate expense bill")

        let newPeriodId = getInsertedPeriodId(pRes.data?.result)
        if (!newPeriodId) {
          const all = await api.get<Res<Period[]>>("/MaintenancePeriod/GetAll")
          const list = all.data?.result ?? []
          const fallback = [...list]
            .filter(p => p.periodMonth===base.periodMonth && p.periodYear===base.periodYear && p.fixedAmount===0 && p.title===title)
            .sort((a,b)=>b.id-a.id)[0]
          newPeriodId = fallback?.id ?? null
        }
        if (!newPeriodId) return toast.error("Expense bill created, but could not locate it")

        await createExpenseWithReceipt(newPeriodId, ef)

        const pubRes = await api.post<Res>(`/MaintenancePeriod/Publish/${newPeriodId}`,{})
        if (!pubRes.data?.isSuccess) return toast.error(pubRes.data?.resMsg ?? "Publish failed")
        toast.success("Separate expense bill created and published")
      } else {
        await createExpenseWithReceipt(pid, ef)
        toast.success("Expense added")
      }
      setEF(f=>({...f,[pid]:{desc:"",amt:"",file:null}}))
      load()
    }catch(e){toast.error(getApiMessage(e))}
  }
  const deleteExpense=async()=>{
    if(!delEId)return
    try{await api.delete(`/MaintenanceExpense/Delete/${delEId}`);toast.success("Removed");load()}
    catch(e){toast.error(getApiMessage(e))}
    finally{setDE(null)}
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return periods
      .filter(p => month === "all" || String(p.periodMonth) === month)
      .filter(p => year === "all" || String(p.periodYear) === year)
      .filter(p => status === "all" ? true : status === "published" ? p.isPublished : !p.isPublished)
      .filter(p => q.length === 0 || `${p.title} ${p.workDescription ?? ""}`.toLowerCase().includes(q))
      .sort((a,b) => b.periodYear - a.periodYear || b.periodMonth - a.periodMonth || b.id - a.id)
  }, [month, periods, query, status, year])

  const card="bg-white dark:bg-[#0f1117] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm"

  return (
    <div className="flex flex-col h-full bg-[#f0f4f8] dark:bg-[#070b10] overflow-auto">
      <div className="bg-white dark:bg-[#0d1017] border-b border-gray-200 dark:border-white/[0.06] px-4 sm:px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20">
              <Settings className="h-4 w-4 text-teal-600 dark:text-teal-400"/>
            </div>
            <div>
              <h1 className="text-[15px] sm:text-[17px] font-bold text-gray-900 dark:text-white">Maintenance Management</h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block">List view + accordion for large monthly records</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="h-8 px-3 text-[11.5px] gap-1.5 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 rounded-xl">
            <RefreshCw className={cn("h-3.5 w-3.5",loading&&"animate-spin")}/>Refresh
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto w-full">
        <div className={cn(card,"overflow-hidden")}>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/[0.05] bg-gradient-to-r from-teal-50 to-transparent dark:from-teal-900/10 dark:to-transparent">
            <IndianRupee className="h-4 w-4 text-teal-600 dark:text-teal-400"/>
            <p className="text-[13.5px] font-bold text-gray-900 dark:text-white">Global Settings</p>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Penalty Per Day (₹)</p>
              <FL label="e.g. 20" type="number" min="0" step="1" value={setting.penaltyPerDay} onChange={v=>setS(s=>({...s,penaltyPerDay:+v}))}/>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Due Day of Month</p>
              <FL label="e.g. 10" type="number" min="1" max="28" step="1" value={setting.dueDayOfMonth} onChange={v=>setS(s=>({...s,dueDayOfMonth:+v}))}/>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button onClick={saveSetting} disabled={savingS}
                className="h-9 px-6 text-[12.5px] font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white gap-1.5 disabled:opacity-50">
                {savingS?<><RefreshCw className="h-3.5 w-3.5 animate-spin"/>Saving...</>:<><CheckCircle2 className="h-3.5 w-3.5"/>Save Settings</>}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold text-gray-700 dark:text-gray-300">Monthly Periods</p>
          <Button size="sm" onClick={()=>{resetPF();setSF(!showForm)}}
            className="h-8 px-3.5 text-[12px] font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white gap-1.5">
            {showForm?<><X className="h-3.5 w-3.5"/>Cancel</>:<><Plus className="h-3.5 w-3.5"/>New Period</>}
          </Button>
        </div>

        {showForm&&(
          <div className={cn(card,"overflow-hidden")}>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.05] bg-gradient-to-r from-teal-50 to-transparent dark:from-teal-900/10">
              <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400"/>
              <p className="text-[13px] font-bold text-gray-900 dark:text-white">{pf.id>0?"Edit Period":"Create New Period"}</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Month</p>
                  <select value={pf.periodMonth} onChange={e=>setPF(f=>({...f,periodMonth:+e.target.value}))}
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1d27] text-[12.5px] text-gray-800 dark:text-white outline-none">
                    {MONTHS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Year</p>
                  <select value={pf.periodYear} onChange={e=>setPF(f=>({...f,periodYear:+e.target.value}))}
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1d27] text-[12.5px] text-gray-800 dark:text-white outline-none">
                    {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Fixed Amount (₹)</p>
                  <FL label="e.g. 2500" type="number" min="0" value={pf.fixedAmount} onChange={v=>setPF(f=>({...f,fixedAmount:v}))}/>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Due Date</p>
                  <FL label="" type="date" value={pf.dueDate} onChange={v=>setPF(f=>({...f,dueDate:v}))}/>
                </div>
              </div>
              <FL label="Custom Title (optional)" value={pf.title} onChange={v=>setPF(f=>({...f,title:v}))}/>
              <FL label="Work Description / Notes for this month" value={pf.workDescription} as="textarea" onChange={v=>setPF(f=>({...f,workDescription:v}))}/>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.01]">
              <Button variant="outline" onClick={()=>{setSF(false);resetPF()}} className="h-9 px-4 text-[12.5px] rounded-xl">Cancel</Button>
              <Button onClick={savePeriod} disabled={pSav} className="h-9 px-6 text-[12.5px] font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white gap-1.5 disabled:opacity-50">
                {pSav?<><RefreshCw className="h-3.5 w-3.5 animate-spin"/>Saving...</>:<><CheckCircle2 className="h-3.5 w-3.5"/>{pf.id>0?"Save Changes":"Create Period"}</>}
              </Button>
            </div>
          </div>
        )}

        <div className={cn(card,"p-3 sm:p-4")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <div className="lg:col-span-2 relative">
              <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2"/>
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search period or note..."
                className="h-9 w-full pl-8 pr-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121622] text-[12px] text-gray-700 dark:text-gray-200 outline-none"/>
            </div>
            <select value={month} onChange={e=>setMonth(e.target.value)} className="h-9 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121622] text-[12px] px-2 text-gray-700 dark:text-gray-200">
              <option value="all">All Months</option>
              {Array.from({length:12}).map((_,i)=><option key={i+1} value={String(i+1)}>{new Date(2025,i,1).toLocaleString("en-US",{month:"short"})}</option>)}
            </select>
            <select value={year} onChange={e=>setYear(e.target.value)} className="h-9 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121622] text-[12px] px-2 text-gray-700 dark:text-gray-200">
              <option value="all">All Years</option>
              {[...new Set(periods.map(p=>p.periodYear))].sort((a,b)=>b-a).map(y=><option key={y} value={String(y)}>{y}</option>)}
            </select>
            <select value={status} onChange={e=>setStatus(e.target.value as "all"|"published"|"draft")} className="h-9 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121622] text-[12px] px-2 text-gray-700 dark:text-gray-200">
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {loading?(
          <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 rounded-xl bg-white dark:bg-[#0f1117] border border-gray-100 dark:border-white/[0.05] animate-pulse"/>)}</div>
        ):filtered.length===0?(
          <div className="text-center py-16">
            <Calendar className="h-7 w-7 mx-auto text-gray-300 dark:text-gray-600"/>
            <p className="mt-2 text-[13px] font-semibold text-gray-500">No periods found</p>
          </div>
        ):(
          <Accordion type="multiple">
            {filtered.map(p=>{
              const ef=gef(p.id)
              const extraTotal=p.expenses.reduce((a,e)=>a+e.amount,0)
              return (
                <AccordionItem key={p.id} value={String(p.id)} className="border border-gray-200 dark:border-white/[0.08] rounded-xl bg-white dark:bg-[#0f1117] mb-3 px-3 sm:px-4 last:mb-0">
                  <AccordionTrigger className="py-3 sm:py-4 hover:no-underline">
                    <div className="w-full text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[13px] sm:text-[14px] font-bold text-gray-900 dark:text-white">{p.title}</p>
                            <span className={cn("text-[9px] px-2 py-0.5 rounded-full border",p.isPublished?"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30":"bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30")}>
                              {p.isPublished?"Published":"Draft"}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                            <span>Fixed: ₹{p.fixedAmount.toLocaleString()}</span>
                            <span>Extra: ₹{extraTotal.toLocaleString()}</span>
                            <span>Due: {new Date(p.dueDate).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {p.isPublished ? `${p.paidCount}/${p.totalUsers} paid` : "Not published"}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1 pb-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {!p.isPublished&&(
                        <Button size="sm" onClick={()=>publishPeriod(p.id)} disabled={pub===p.id}
                          className="h-8 px-3 text-[11px] font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white gap-1">
                          {pub===p.id?<RefreshCw className="h-3.5 w-3.5 animate-spin"/>:<Send className="h-3.5 w-3.5"/>}Publish
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-8 px-3 text-[11px] rounded-lg gap-1" onClick={()=>{setPF({...p,fixedAmount:String(p.fixedAmount),dueDate:p.dueDate?.split("T")[0]??""});setSF(true)}}>
                        <Pencil className="h-3.5 w-3.5"/>Edit
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-3 text-[11px] rounded-lg gap-1 text-rose-600 border-rose-200 dark:border-rose-500/30" onClick={()=>setDP(p.id)}>
                        <Trash2 className="h-3.5 w-3.5"/>Delete
                      </Button>
                    </div>

                    {p.isPublished&&(
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          {label:"Total Users",value:p.totalUsers,c:"text-gray-700 dark:text-gray-200"},
                          {label:"Paid",value:p.paidCount,c:"text-emerald-700 dark:text-emerald-400"},
                          {label:"Pending",value:p.pendingCount,c:"text-amber-700 dark:text-amber-400"},
                          {label:"Collected",value:`₹${p.totalCollected.toLocaleString()}`,c:"text-teal-700 dark:text-teal-400"},
                        ].map(s=>(
                          <div key={s.label} className="rounded-lg border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03] px-3 py-2">
                            <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{s.label}</p>
                            <p className={cn("text-[13px] font-black mt-0.5",s.c)}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Extra Expenses</p>
                      {p.expenses.length===0?(
                        <p className="text-[12px] text-gray-400 dark:text-gray-500">No extra expenses.</p>
                      ):(
                        p.expenses.map(e=>{
                          const rUrl = resolveReceiptUrl(e.receiptUrl)
                          // Debug: open browser console to see what the API returns
                          if (e.receiptUrl) console.debug("[Receipt URL raw]", e.receiptUrl, "→ resolved:", rUrl)
                          return (
                            <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#111522] px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Receipt className="h-3.5 w-3.5 text-teal-500 shrink-0"/>
                                <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200 truncate">{e.description}</span>
                                {/* ── Receipt Show/Download popover ── */}
                                {rUrl && <ReceiptActions url={rUrl} />}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-black text-gray-800 dark:text-white">₹{e.amount.toLocaleString()}</span>
                                <button onClick={()=>setDE(e.id)} className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-rose-600"><Trash2 className="h-3 w-3"/></button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    <div className="flex gap-2 pt-1 flex-wrap">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-[260px]">
                        <input value={ef.desc} onChange={e=>sef(p.id,{desc:e.target.value})} placeholder="Expense description"
                          className="h-9 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[12px] text-gray-700 dark:text-gray-200 outline-none focus:border-teal-400"/>
                        <input value={ef.amt} onChange={e=>sef(p.id,{amt:e.target.value})} type="number" min="0" placeholder="Amount ₹"
                          className="h-9 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[12px] text-gray-700 dark:text-gray-200 outline-none focus:border-teal-400"/>
                        <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e=>sef(p.id,{file:e.target.files?.[0]??null})}
                          className="h-9 px-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[11.5px] text-gray-700 dark:text-gray-200 outline-none file:mr-2 file:rounded-md file:border-0 file:bg-teal-50 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-teal-700 dark:file:bg-teal-500/10 dark:file:text-teal-300"/>
                      </div>
                      <p className="w-full text-[10.5px] text-gray-400 dark:text-gray-500">
                        Upload receipt: JPG, JPEG, PNG, PDF (recommended max 5 MB).
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={()=>addExpense(p.id,p.isPublished)} disabled={!ef.desc.trim()||!ef.amt}
                          className="h-9 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[12px] font-bold gap-1 disabled:opacity-40">
                          <PlusCircle className="h-3.5 w-3.5"/>{p.isPublished?"Add Separate":"Add"}
                        </Button>
                        {p.isPublished&&(
                          <Button size="sm" variant="outline" onClick={()=>addExpense(p.id,false)} disabled={!ef.desc.trim()||!ef.amt}
                            className="h-9 px-3 rounded-lg text-[12px] font-bold gap-1 border-gray-200 dark:border-white/[0.08]">
                            <Plus className="h-3.5 w-3.5"/>Add Combined
                          </Button>
                        )}
                      </div>
                    </div>
                    {p.isPublished&&(
                      <p className="text-[10.5px] text-gray-400 dark:text-gray-500">Use <span className="font-semibold">Add Separate</span> for separate same-month expense billing.</p>
                    )}
                    {p.workDescription&&(
                      <div className="rounded-lg border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#111522] px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Work Done</p>
                        <p className="text-[12px] text-gray-600 dark:text-gray-300">{p.workDescription}</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
      </div>

      <AlertDialog open={delPId!==null} onOpenChange={()=>setDP(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-4 sm:mx-auto bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08] p-0 gap-0 overflow-hidden">
          <AlertDialogHeader className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20"><AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400"/></div>
              <div>
                <AlertDialogTitle className="text-[14px] font-bold text-gray-900 dark:text-white">Delete Period?</AlertDialogTitle>
                <AlertDialogDescription className="text-[11.5px] text-gray-500 mt-0">This will remove the period and all its data.</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 py-4 gap-2 flex-row">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deletePeriod} className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={delEId!==null} onOpenChange={()=>setDE(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-4 sm:mx-auto bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[14px] font-bold">Remove Expense?</AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] text-gray-500">This expense will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-row">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteExpense} className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
