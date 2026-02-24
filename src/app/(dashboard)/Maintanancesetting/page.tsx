"use client"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Settings,Plus,Pencil,Trash2,RefreshCw,CheckCircle2,X,IndianRupee,Calendar,AlertTriangle,ChevronDown,ChevronUp,Send,Receipt,PlusCircle,Image } from "lucide-react"

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

function FL({id,label,type="text",value,onChange,as,min,max,step}:{id?:string;label:string;type?:string;value:string|number;onChange:(v:string)=>void;as?:"textarea";min?:string;max?:string;step?:string}) {
  const [f,setF]=useState(false); const active=f||String(value).length>0
  const base=cn("w-full rounded-xl border text-[13px] text-gray-900 dark:text-gray-100 outline-none transition-all bg-white dark:bg-[#1a1d27]",f?"border-teal-400 shadow-[0_0_0_3px_rgba(20,184,166,0.1)]":"border-gray-200 dark:border-white/[0.09] hover:border-gray-300")
  return (
    <div className="relative">
      {as==="textarea"?<textarea id={id} rows={3} value={value as string} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} className={cn(base,"px-3 pt-5 pb-2 resize-none")}/>
      :<input id={id} type={type} value={value as string} min={min} max={max} step={step} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} className={cn(base,"h-11 px-3 pt-4 pb-1")}/>}
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
  const [eForm,setEF]=useState<{[k:number]:{desc:string;amt:string;url:string}}>({})
  const [expanded,setExp]=useState<Set<number>>(new Set())
  const [delPId,setDP]=useState<number|null>(null)
  const [delEId,setDE]=useState<number|null>(null)
  const [pub,setPub]=useState<number|null>(null)
  const [editExpId,setEditExpId]=useState<number|null>(null)

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
    try{const r=await api.post<Res>("/MaintenanceSetting/Save",setting);if(r.data?.isSuccess)toast.success("Settings saved!");else toast.error(r.data?.resMsg??"Failed")}
    catch(e){toast.error(getApiMessage(e))}finally{setSS(false)}
  }

  const resetPF=()=>setPF({id:0,title:"",periodMonth:new Date().getMonth()+1,periodYear:CY,fixedAmount:"",dueDate:"",workDescription:"",isActive:true})
  const savePeriod=async()=>{
    if(!pf.fixedAmount||!pf.dueDate)return toast.error("Fixed amount and due date required")
    setPS(true)
    try{
      const payload={...pf,fixedAmount:parseFloat(pf.fixedAmount),title:pf.title||`${MONTHS[pf.periodMonth]} ${pf.periodYear}`}
      const r=pf.id>0?await api.put<Res>("/MaintenancePeriod/Update",payload):await api.post<Res>("/MaintenancePeriod/Insert",payload)
      if(r.data?.isSuccess){toast.success(pf.id>0?"Period updated!":"Period created!");setSF(false);resetPF();load()}
      else toast.error(r.data?.resMsg??"Failed")
    }catch(e){toast.error(getApiMessage(e))}finally{setPS(false)}
  }

  const deletePeriod=async()=>{if(!delPId)return;try{await api.delete(`/MaintenancePeriod/Delete/${delPId}`);toast.success("Deleted");load()}catch(e){toast.error(getApiMessage(e))}finally{setDP(null)}}
  const publishPeriod=async(id:number)=>{
    setPub(id)
    try{const r=await api.post<Res>(`/MaintenancePeriod/Publish/${id}`,{});if(r.data?.isSuccess){toast.success("Published! Dues generated.");load()}else toast.error(r.data?.resMsg??"Failed")}
    catch(e){toast.error(getApiMessage(e))}finally{setPub(null)}
  }
  const gef=(pid:number)=>eForm[pid]??{desc:"",amt:"",url:""}
  const sef=(pid:number,patch:Partial<{desc:string;amt:string;url:string}>)=>setEF(f=>({...f,[pid]:{...gef(pid),...patch}}))
  const addExpense=async(pid:number)=>{
    const ef=gef(pid);if(!ef.desc.trim()||!ef.amt)return toast.error("Description and amount required")
    try{const r=await api.post<Res>("/MaintenanceExpense/Insert",{id:0,periodId:pid,description:ef.desc,amount:parseFloat(ef.amt),receiptUrl:ef.url||null});if(r.data?.isSuccess){toast.success("Expense added!");setEF(f=>({...f,[pid]:{desc:"",amt:"",url:""}}));load()}else toast.error(r.data?.resMsg??"Failed")}
    catch(e){toast.error(getApiMessage(e))}
  }
  const deleteExpense=async()=>{if(!delEId)return;try{await api.delete(`/MaintenanceExpense/Delete/${delEId}`);toast.success("Removed");load()}catch(e){toast.error(getApiMessage(e))}finally{setDE(null)}}
  const toggle=(id:number)=>setExp(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n})

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
              <p className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block">Set global rules · create monthly periods · attach expenses</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}
            className="h-8 px-3 text-[11.5px] gap-1.5 border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-500 rounded-xl">
            <RefreshCw className={cn("h-3.5 w-3.5",loading&&"animate-spin")}/>Refresh
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto w-full">

        {/* ── GLOBAL SETTINGS ── */}
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
              <FL label="e.g. 10 (due on 10th)" type="number" min="1" max="28" step="1" value={setting.dueDayOfMonth} onChange={v=>setS(s=>({...s,dueDayOfMonth:+v}))}/>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button onClick={saveSetting} disabled={savingS}
                className="h-9 px-6 text-[12.5px] font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white gap-1.5 shadow-[0_2px_8px_rgba(13,148,136,0.3)] disabled:opacity-50">
                {savingS?<><RefreshCw className="h-3.5 w-3.5 animate-spin"/>Saving…</>:<><CheckCircle2 className="h-3.5 w-3.5"/>Save Settings</>}
              </Button>
            </div>
          </div>
        </div>

        {/* ── NEW PERIOD BUTTON ── */}
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold text-gray-700 dark:text-gray-300">Monthly Periods</p>
          <Button size="sm" onClick={()=>{resetPF();setSF(!showForm)}}
            className="h-8 px-3.5 text-[12px] font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white gap-1.5 shadow-[0_2px_8px_rgba(13,148,136,0.3)]">
            {showForm?<><X className="h-3.5 w-3.5"/>Cancel</>:<><Plus className="h-3.5 w-3.5"/>New Period</>}
          </Button>
        </div>

        {/* ── PERIOD FORM ── */}
        {showForm&&(
          <div className={cn(card,"overflow-hidden animate-[fadeInUp_0.3s_ease_both]")}>
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
              <Button variant="outline" onClick={()=>{setSF(false);resetPF()}}
                className="h-9 px-4 text-[12.5px] rounded-xl border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-600 dark:text-gray-300">Cancel</Button>
              <Button onClick={savePeriod} disabled={pSav}
                className="h-9 px-6 text-[12.5px] font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white gap-1.5 disabled:opacity-50">
                {pSav?<><RefreshCw className="h-3.5 w-3.5 animate-spin"/>Saving…</>:<><CheckCircle2 className="h-3.5 w-3.5"/>{pf.id>0?"Save Changes":"Create Period"}</>}
              </Button>
            </div>
          </div>
        )}

        {/* ── PERIOD CARDS ── */}
        {loading?(
          <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-32 rounded-2xl bg-white dark:bg-[#0f1117] border border-gray-100 dark:border-white/[0.05] animate-pulse"/>)}</div>
        ):periods.length===0?(
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-14 w-14 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/[0.09] flex items-center justify-center">
              <Calendar className="h-6 w-6 text-gray-300 dark:text-gray-600"/>
            </div>
            <p className="text-[13px] font-semibold text-gray-400">No periods yet. Create your first monthly period.</p>
          </div>
        ):(
          <div className="space-y-4">
            {periods.map((p,idx)=>{
              const isExp=expanded.has(p.id)
              const ef=gef(p.id)
              const extraTotal=p.expenses.reduce((a,e)=>a+e.amount,0)
              return (
                <div key={p.id} className={cn(card,"overflow-hidden animate-[fadeInUp_0.3s_ease_both]")} style={{animationDelay:`${idx*50}ms`}}>
                  {/* Period header */}
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border shrink-0 text-[11px] font-black",
                          p.isPublished?"bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400":
                                        "bg-amber-100 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400")}>
                          {MONTHS[p.periodMonth]?.slice(0,3)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[14px] font-bold text-gray-900 dark:text-white">{p.title}</p>
                            <span className={cn("text-[9.5px] font-black px-2 py-0.5 rounded-full border",
                              p.isPublished?"bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20":
                                            "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20")}>
                              {p.isPublished?"Published":"Draft"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                            <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3"/>Fixed: ₹{p.fixedAmount.toLocaleString()}</span>
                            <span>+Extra: ₹{extraTotal.toLocaleString()}</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/>Due: {new Date(p.dueDate).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!p.isPublished&&(
                          <Button size="sm" onClick={()=>publishPeriod(p.id)} disabled={pub===p.id}
                            className="h-7 px-2.5 text-[11px] font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white gap-1">
                            {pub===p.id?<RefreshCw className="h-3 w-3 animate-spin"/>:<Send className="h-3 w-3"/>}
                            <span className="hidden sm:inline">Publish</span>
                          </Button>
                        )}
                        <button onClick={()=>{setPF({...p,fixedAmount:String(p.fixedAmount),dueDate:p.dueDate?.split("T")[0]??""});setSF(true)}}
                          className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-teal-600 hover:border-teal-300">
                          <Pencil className="h-3 w-3"/>
                        </button>
                        <button onClick={()=>setDP(p.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-rose-600 hover:border-rose-300">
                          <Trash2 className="h-3 w-3"/>
                        </button>
                        <button onClick={()=>toggle(p.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400">
                          {isExp?<ChevronUp className="h-3.5 w-3.5"/>:<ChevronDown className="h-3.5 w-3.5"/>}
                        </button>
                      </div>
                    </div>

                    {/* Stats row */}
                    {p.isPublished&&(
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                        {[
                          {label:"Total Users",value:p.totalUsers,c:"text-gray-700 dark:text-gray-200"},
                          {label:"Paid",value:p.paidCount,c:"text-emerald-700 dark:text-emerald-400"},
                          {label:"Pending",value:p.pendingCount,c:"text-amber-700 dark:text-amber-400"},
                          {label:"Collected",value:`₹${p.totalCollected.toLocaleString()}`,c:"text-teal-700 dark:text-teal-400"},
                        ].map(s=>(
                          <div key={s.label} className="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03] px-3 py-2">
                            <p className="text-[9.5px] font-bold uppercase tracking-wide text-gray-400">{s.label}</p>
                            <p className={cn("text-[14px] font-black mt-0.5",s.c)}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expandable expense section */}
                  {isExp&&(
                    <div className="border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02] px-5 py-4 space-y-3 animate-[fadeInUp_0.2s_ease_both]">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Extra Expenses & Receipts</p>
                      {p.expenses.length===0?(
                        <p className="text-[12px] text-gray-400 dark:text-gray-500 text-center py-2">No extra expenses — fixed amount only.</p>
                      ):(
                        <div className="space-y-2">
                          {p.expenses.map(e=>(
                            <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#0f1117] px-3 py-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <Receipt className="h-3.5 w-3.5 text-teal-500 shrink-0"/>
                                <span className="text-[12.5px] font-semibold text-gray-700 dark:text-gray-200 truncate">{e.description}</span>
                                {e.receiptUrl&&<a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline shrink-0"><Image className="h-3 w-3"/>Receipt</a>}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[13px] font-black text-gray-800 dark:text-white">₹{e.amount.toLocaleString()}</span>
                                <button onClick={()=>setDE(e.id)} className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-rose-600"><Trash2 className="h-3 w-3"/></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Add expense */}
                      <div className="flex gap-2 pt-1">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input value={ef.desc} onChange={e=>sef(p.id,{desc:e.target.value})} placeholder="Expense description"
                            className="h-9 px-3 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[12px] text-gray-700 dark:text-gray-200 outline-none focus:border-teal-400 placeholder:text-gray-400 col-span-1 sm:col-span-1"/>
                          <input value={ef.amt} onChange={e=>sef(p.id,{amt:e.target.value})} type="number" min="0" placeholder="Amount ₹"
                            className="h-9 px-3 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[12px] text-gray-700 dark:text-gray-200 outline-none focus:border-teal-400 placeholder:text-gray-400"/>
                          <input value={ef.url} onChange={e=>sef(p.id,{url:e.target.value})} placeholder="Receipt URL (optional)"
                            className="h-9 px-3 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1d27] text-[12px] text-gray-700 dark:text-gray-200 outline-none focus:border-teal-400 placeholder:text-gray-400"/>
                        </div>
                        <Button size="sm" onClick={()=>addExpense(p.id)} disabled={!ef.desc.trim()||!ef.amt}
                          className="h-9 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[12px] font-bold gap-1 disabled:opacity-40 shrink-0">
                          <PlusCircle className="h-3.5 w-3.5"/><span className="hidden sm:inline">Add</span>
                        </Button>
                      </div>
                      {p.workDescription&&(
                        <div className="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#0f1117] px-3 py-2.5 mt-1">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Work Done This Month</p>
                          <p className="text-[12.5px] text-gray-600 dark:text-gray-300">{p.workDescription}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AlertDialog open={delPId!==null} onOpenChange={()=>setDP(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-4 sm:mx-auto bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08] p-0 gap-0 overflow-hidden">
          <AlertDialogHeader className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/20 dark:to-[#141820]">
            <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20"><AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400"/></div><div><AlertDialogTitle className="text-[14px] font-bold text-gray-900 dark:text-white">Delete Period?</AlertDialogTitle><AlertDialogDescription className="text-[11.5px] text-gray-500 mt-0">This will remove the period and all its data.</AlertDialogDescription></div></div>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 py-4 gap-2 flex-row">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-xl border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-gray-600 dark:text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deletePeriod} className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={delEId!==null} onOpenChange={()=>setDE(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-4 sm:mx-auto bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08]">
          <AlertDialogHeader><AlertDialogTitle className="text-[14px] font-bold">Remove Expense?</AlertDialogTitle><AlertDialogDescription className="text-[12px] text-gray-500">This expense will be removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-row">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteExpense} className="flex-1 h-9 text-[12.5px] font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
