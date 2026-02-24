"use client"

import { useEffect, useMemo, useState } from "react"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  RefreshCw, Car, Building2, Search, CheckCircle2,
  CircleOff, AlertTriangle, Layers, X, ChevronRight,
  ParkingCircle,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type FloorVM       = { id: number; floorName: string; isParkingFloor: boolean; totalParkingSlot?: number }
type ParkingSlotVM = { id: number; slotNumber: string; floorId: number; isAssigned?: boolean }
type UserVM        = { id: number; name: string; floor?: string; flatName?: string; mobile?: string }
type AssignmentVM  = { id: number; slotId: number; userId: number; slotNumber?: string; userName?: string; floorId?: number; floorName?: string; flatName?: string }
type ApiResponse<T = unknown> = { statusCode?: number; isSuccess?: boolean; resMsg?: string; result?: T }

// ─── Normalisers ──────────────────────────────────────────────────────────────

const readN = (o: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === "number") return v
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v)
  }
  return 0
}
const readS = (o: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) { const v = o[k]; if (typeof v === "string" && v.trim()) return v }
  return ""
}
function normalizeAssignment(raw: unknown): AssignmentVM | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const slotId = readN(r, ["slotId","parkingSlotId","slotMasterId"])
  const userId  = readN(r, ["userId","memberId","residentId","ownerId"])
  if (!slotId || !userId) return null
  return {
    id: readN(r, ["id","assignmentId","parkingAssignmentId"]), slotId, userId,
    slotNumber: readS(r, ["slotNumber","parkingSlot","slotName"]),
    userName:   readS(r, ["userName","name","memberName","ownerName","residentName"]),
    floorId:    readN(r, ["floorId"]),
    floorName:  readS(r, ["floorName"]),
    flatName:   readS(r, ["flatName","flat"]),
  }
}
function normalizeUser(raw: unknown): UserVM | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const id = readN(r, ["id","userId","memberId","ownerId","residentId"])
  const name = readS(r, ["name","fullName","userName","ownerName","residentName","memberName"])
  if (!id || !name) return null
  return { id, name, floor: readS(r, ["floor","floorName"]), flatName: readS(r, ["flatName","flat"]), mobile: readS(r, ["mobile","mobileNo","phone"]) }
}

// ─── Avatar Initials ──────────────────────────────────────────────────────────

function Initials({ name }: { name: string }) {
  const ini = name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full font-bold text-[11px] shrink-0 select-none bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
      {ini}
    </div>
  )
}

// ─── Slot Card ────────────────────────────────────────────────────────────────

function SlotCard({ slot, assignment, onClick, flash }: {
  slot: ParkingSlotVM; assignment?: AssignmentVM; onClick: () => void; flash: boolean
}) {
  const assigned = !!assignment
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border-2 transition-all duration-200 select-none",
        "h-[86px] sm:h-[100px] w-full text-left hover:-translate-y-[1px] active:scale-[0.97]",
        !assigned && [
          "bg-emerald-50 dark:bg-emerald-950/30",
          "border-emerald-200 dark:border-emerald-800/60",
          "hover:border-emerald-400 dark:hover:border-emerald-600",
          "hover:shadow-md hover:shadow-emerald-100 dark:hover:shadow-emerald-950/40",
        ],
        assigned && [
          "bg-rose-50 dark:bg-rose-950/30",
          "border-rose-200 dark:border-rose-800/60",
          "hover:border-rose-400 dark:hover:border-rose-600",
          "hover:shadow-md hover:shadow-rose-100 dark:hover:shadow-rose-950/40",
        ],
        flash && "animate-[slotPop_0.5s_ease]",
      )}
    >
      {/* Status dot + slot label */}
      <div className="flex items-center justify-between px-2.5 pt-2">
        <span className={cn(
          "text-[10px] sm:text-[11px] font-black tracking-wider truncate leading-tight",
          assigned ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
        )}>
          {slot.slotNumber}
        </span>
        <span className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0",
          assigned ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
        )} />
      </div>

      {/* Center icon */}
      <div className="flex flex-1 items-center justify-center">
        {assigned ? (
          <div className={cn(
            "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
            "bg-rose-100 dark:bg-rose-900/50"
          )}>
            <Car className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-rose-500 dark:text-rose-400" />
          </div>
        ) : (
          <div className={cn(
            "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200",
            "border-emerald-300 dark:border-emerald-700",
            "group-hover:border-emerald-500 dark:group-hover:border-emerald-500",
            "group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40",
          )}>
            <ParkingCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 dark:text-emerald-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
          </div>
        )}
      </div>

      {/* Bottom label */}
      <div className={cn(
        "pb-2 px-2.5 text-[9.5px] sm:text-[10.5px] font-semibold truncate text-center leading-tight",
        assigned ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
      )}>
        {assigned ? (assignment?.userName?.split(" ")[0] ?? "Assigned") : "Available"}
      </div>
    </button>
  )
}

// ─── User row ─────────────────────────────────────────────────────────────────

function UserRow({ user, selected, onClick }: { user: UserVM; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150",
        selected
          ? "bg-indigo-600 dark:bg-indigo-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900/40"
          : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
      )}>
      <Initials name={user.name} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-[12.5px] font-semibold truncate", selected ? "text-white" : "text-gray-800 dark:text-gray-100")}>
          {user.name}
        </p>
        <p className={cn("text-[10.5px] truncate", selected ? "text-indigo-200" : "text-gray-400 dark:text-gray-500")}>
          {[user.floor, user.flatName].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>
      {selected && <CheckCircle2 className="h-4 w-4 text-white shrink-0" />}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssignParkingPage() {
  const [floors,       setFloors]       = useState<FloorVM[]>([])
  const [slots,        setSlots]        = useState<ParkingSlotVM[]>([])
  const [assignments,  setAssignments]  = useState<AssignmentVM[]>([])
  const [users,        setUsers]        = useState<UserVM[]>([])
  const [selFloorId,   setSelFloorId]   = useState<number>(0)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [freeOpen,     setFreeOpen]     = useState(false)
  const [assignedOpen, setAssignedOpen] = useState(false)
  const [activeSlot,   setActiveSlot]   = useState<ParkingSlotVM | null>(null)
  const [activeAssign, setActiveAssign] = useState<AssignmentVM | null>(null)
  const [selUserId,    setSelUserId]    = useState<number>(0)
  const [search,       setSearch]       = useState("")
  const [flashSlots,   setFlashSlots]   = useState<Set<number>>(new Set())

  const parkingFloors = useMemo(() => floors.filter(f => f.isParkingFloor), [floors])
  const bySlot = useMemo(() => { const m = new Map<number, AssignmentVM>(); assignments.forEach(a => m.set(a.slotId, a)); return m }, [assignments])
  const selFloor   = useMemo(() => parkingFloors.find(f => f.id === selFloorId) ?? null, [parkingFloors, selFloorId])
  const floorSlots = useMemo(() => slots.filter(s => s.floorId === selFloorId), [slots, selFloorId])
  const selUser    = useMemo(() => users.find(u => u.id === selUserId) ?? null, [users, selUserId])
  const freeCount  = floorSlots.filter(s => !bySlot.get(s.id)).length
  const usedCount  = floorSlots.filter(s =>  bySlot.get(s.id)).length

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(u => `${u.name} ${u.floor ?? ""} ${u.flatName ?? ""} ${u.mobile ?? ""}`.toLowerCase().includes(q))
  }, [users, search])

  // ── Loaders ──────────────────────────────────────────────────────────────────
  const loadFloors = async () => {
    const res = await api.get<ApiResponse<FloorVM[]>>("/Floor/GetAll")
    const list = res.data?.result ?? []
    setFloors(list)
    if (!selFloorId) { const f = list.find(f => f.isParkingFloor); if (f) setSelFloorId(f.id) }
  }
  const loadSlots = async () => {
    const res = await api.get<ApiResponse<ParkingSlotVM[]>>("/ParkingSlot/GetAll")
    setSlots(res.data?.result ?? [])
  }
  const loadAssignments = async () => {
    try {
      const res = await api.get<ApiResponse<unknown[]>>("/ParkingAssignment/GetAll")
      const rows = Array.isArray(res.data?.result) ? res.data.result : Array.isArray(res.data) ? (res.data as unknown[]) : []
      setAssignments(rows.map(normalizeAssignment).filter((x): x is AssignmentVM => x !== null))
    } catch { setAssignments([]) }
  }
  const loadUsers = async () => {
    try {
      const res = await api.get<ApiResponse<unknown[]>>("/AdminUserApprove/GetUsersByStatus", { params: { status: "APPROVED" } })
      const rows = Array.isArray(res.data?.result) ? res.data.result : []
      const parsed = rows.map(normalizeUser).filter((x): x is UserVM => x !== null)
      if (parsed.length > 0) { setUsers(parsed); return }
    } catch { /* fallback */ }
    try {
      const res = await api.get<ApiResponse<unknown[]>>("/UserMaster/GetAll")
      const rows = Array.isArray(res.data?.result) ? res.data.result : []
      setUsers(rows.map(normalizeUser).filter((x): x is UserVM => x !== null))
    } catch { setUsers([]) }
  }
  const loadAll = async () => {
    setLoading(true)
    try { await Promise.all([loadFloors(), loadSlots(), loadAssignments(), loadUsers()]) }
    catch (e) { toast.error(getApiMessage(e)) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadAll() }, [])

  const flash = (id: number) => {
    setFlashSlots(s => new Set(s).add(id))
    setTimeout(() => setFlashSlots(s => { const n = new Set(s); n.delete(id); return n }), 600)
  }

  const openFree = (slot: ParkingSlotVM) => { setActiveSlot(slot); setSelUserId(0); setSearch(""); setFreeOpen(true) }
  const openAssigned = (slot: ParkingSlotVM) => {
    const a = bySlot.get(slot.id) ?? null
    setActiveSlot(slot); setActiveAssign(a); setSelUserId(a?.userId ?? 0); setSearch(""); setAssignedOpen(true)
  }

  const assignSlot = async () => {
    if (!activeSlot || !selUserId) return toast.error("Please select a user")
    setSaving(true)
    try {
      const res = await api.post<ApiResponse>("/ParkingAssignment/Assign", {
        id: 0,
        ownerId:       selUserId,
        userId:        selUserId,
        memberId:      selUserId,
        parkingSlotId: activeSlot.id,
        slotId:        activeSlot.id,
      })
      if (res.data?.isSuccess === false) { toast.error(res.data.resMsg ?? "Assignment failed"); return }
      toast.success(res.data?.resMsg ?? "Parking assigned!")
      flash(activeSlot.id)
      setFreeOpen(false); setAssignedOpen(false)
      await Promise.all([loadAssignments(), loadSlots()])
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setSaving(false) }
  }

  const freeSlot = async () => {
    if (!activeAssign?.id) return toast.error("Assignment not found")
    setSaving(true)
    try {
      const res = await api.delete<ApiResponse>(`/ParkingAssignment/Remove/${activeAssign.id}`)
      if (res.data?.isSuccess === false) { toast.error(res.data.resMsg ?? "Failed to free slot"); return }
      toast.success(res.data?.resMsg ?? "Slot freed!")
      flash(activeSlot?.id ?? 0)
      setAssignedOpen(false)
      await Promise.all([loadAssignments(), loadSlots()])
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setSaving(false) }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#f5f6fa] dark:bg-[#0a0c11]">

      {/* ═══ HEADER ═══ */}
      <div className="bg-white dark:bg-[#0f1117] border-b border-gray-200 dark:border-white/[0.06] px-3 sm:px-5 py-3 shrink-0">
        <div className="flex items-center justify-between gap-2">

          {/* Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/20 shrink-0">
              <Car className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[14px] sm:text-[16px] font-bold text-gray-900 dark:text-white leading-tight">
                Parking Assignment
              </h1>
              <p className="text-[10.5px] text-gray-400 dark:text-gray-500 hidden sm:block">
                Click any slot to assign or free a parking space
              </p>
            </div>
          </div>

          {/* Right side — counts + refresh */}
          <div className="flex items-center gap-2 shrink-0">
            {selFloor && (
              <>
                <span className="flex items-center gap-1 text-[10.5px] sm:text-[11px] font-bold px-2 py-1 rounded-full
                  bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400
                  border border-emerald-200 dark:border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {freeCount} <span className="hidden sm:inline">Free</span>
                </span>
                <span className="flex items-center gap-1 text-[10.5px] sm:text-[11px] font-bold px-2 py-1 rounded-full
                  bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400
                  border border-rose-200 dark:border-rose-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                  {usedCount} <span className="hidden sm:inline">Assigned</span>
                </span>
              </>
            )}
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading || saving}
              className="h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] sm:text-[11.5px] gap-1.5
                border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent
                text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.05]">
              <RefreshCw className={cn("h-3 w-3", (loading || saving) && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div className="flex-1 overflow-hidden flex flex-col gap-3 p-3 sm:p-4">

        {/* ── Floor Selector ── */}
        <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-gray-200 dark:border-white/[0.06] shadow-sm px-3 sm:px-4 py-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <p className="text-[11.5px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
              Select Parking Floor
            </p>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Free
              </span>
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Assigned
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex gap-2 flex-wrap">
              {[1,2,3].map(i => <div key={i} className="h-8 w-24 rounded-lg bg-gray-100 dark:bg-white/[0.05] animate-pulse" />)}
            </div>
          ) : parkingFloors.length === 0 ? (
            <div className="flex items-center gap-2 py-2 text-[12px] text-gray-400 dark:text-gray-500">
              <Building2 className="h-4 w-4 opacity-40" />No parking floors configured
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {parkingFloors.map(floor => {
                const active      = selFloorId === floor.id
                const fSlots      = slots.filter(s => s.floorId === floor.id)
                const fFree       = fSlots.filter(s => !bySlot.get(s.id)).length
                return (
                  <button key={floor.id} onClick={() => setSelFloorId(floor.id)}
                    className={cn(
                      "flex items-center gap-1.5 h-8 sm:h-9 px-3 rounded-lg border text-[11.5px] sm:text-[12px] font-semibold transition-all duration-150",
                      active
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)]"
                        : "bg-gray-50 dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:text-indigo-600 dark:hover:text-indigo-400"
                    )}>
                    <ParkingCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate max-w-[90px] sm:max-w-[140px]">{floor.floorName}</span>
                    {fSlots.length > 0 && (
                      <span className={cn(
                        "h-4 px-1.5 rounded-full text-[9px] font-black flex items-center shrink-0",
                        active
                          ? "bg-white/25 text-white"
                          : fFree > 0
                            ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400"
                      )}>
                        {fFree > 0 ? `${fFree} free` : "Full"}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Slot Grid Panel ── */}
        <div className="flex-1 overflow-hidden bg-white dark:bg-[#0f1117] rounded-xl border border-gray-200 dark:border-white/[0.06] shadow-sm flex flex-col">

          {/* Panel header */}
          {selFloor && (
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-gray-100 dark:border-white/[0.05] shrink-0">
              <div className="flex items-center gap-2">
                <ParkingCircle className="h-4 w-4 text-indigo-500 shrink-0" />
                <span className="text-[13px] font-semibold text-gray-800 dark:text-white">{selFloor.floorName}</span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">· {floorSlots.length} slots</span>
              </div>
              {/* Occupancy bar */}
              {floorSlots.length > 0 && (
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <div className="w-20 sm:w-28 h-1.5 bg-gray-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-700"
                      style={{ width: `${(usedCount / floorSlots.length) * 100}%` }} />
                  </div>
                  <span className="text-[10.5px] text-gray-400 dark:text-gray-500">
                    {usedCount}/{floorSlots.length}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Slots scroll area */}
          <div className="flex-1 overflow-auto p-3 sm:p-4">
            {!selFloor ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="h-14 w-14 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/[0.1] flex items-center justify-center">
                  <Layers className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-[13px] font-medium text-gray-400 dark:text-gray-500">Select a parking floor above</p>
              </div>

            ) : loading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-[86px] sm:h-[100px] rounded-xl bg-gray-100 dark:bg-white/[0.05] animate-pulse"
                    style={{ animationDelay: `${i * 40}ms` }} />
                ))}
              </div>

            ) : floorSlots.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="h-14 w-14 rounded-2xl border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/5 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-600 dark:text-gray-300">
                    No slots for {selFloor.floorName}
                  </p>
                  <p className="text-[11.5px] text-gray-400 dark:text-gray-500 mt-0.5">
                    Create slots from Parking Slot Setup first.
                  </p>
                </div>
              </div>

            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
                {floorSlots.map((slot, idx) => (
                  <div key={slot.id}
                    className="animate-[fadeInUp_0.3s_ease_both]"
                    style={{ animationDelay: `${Math.min(idx * 25, 300)}ms` }}>
                    <SlotCard
                      slot={slot}
                      assignment={bySlot.get(slot.id)}
                      flash={flashSlots.has(slot.id)}
                      onClick={() => bySlot.get(slot.id) ? openAssigned(slot) : openFree(slot)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile occupancy bar */}
          {selFloor && floorSlots.length > 0 && (
            <div className="sm:hidden flex items-center gap-2 px-3 py-2 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02] shrink-0">
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-white/[0.07] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-700"
                  style={{ width: `${(usedCount / floorSlots.length) * 100}%` }} />
              </div>
              <span className="text-[10.5px] text-gray-400 dark:text-gray-500 shrink-0">
                {usedCount}/{floorSlots.length} used
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ════════ ASSIGN DIALOG ════════ */}
      <Dialog open={freeOpen} onOpenChange={v => { setFreeOpen(v); if (!v) setSearch("") }}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden gap-0 mx-4 sm:mx-auto
          bg-white dark:bg-[#141720] border border-gray-200 dark:border-white/[0.07]">

          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.06]
            bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/20 dark:to-[#141720]">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0
                  bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <DialogTitle className="text-[14.5px] font-bold text-gray-900 dark:text-white">
                    Assign Slot — {activeSlot?.slotNumber}
                  </DialogTitle>
                  <DialogDescription className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-0">
                    Choose a resident to assign this free parking space
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, flat, mobile…"
                className="pl-9 h-9 text-[12.5px] rounded-xl
                  bg-gray-50 dark:bg-white/[0.05]
                  border-gray-200 dark:border-white/[0.08]
                  text-gray-800 dark:text-gray-100
                  placeholder:text-gray-400 dark:placeholder:text-gray-600
                  focus:border-indigo-400 dark:focus:border-indigo-500/60
                  focus:ring-0" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto space-y-0.5 -mx-1 px-1">
              {filteredUsers.length === 0
                ? <p className="py-8 text-center text-[12px] text-gray-400 dark:text-gray-500">No users found</p>
                : filteredUsers.map(u => (
                  <UserRow key={u.id} user={u} selected={selUserId === u.id} onClick={() => setSelUserId(u.id)} />
                ))
              }
            </div>

            {selUser && (
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5
                bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/25">
                <Initials name={selUser.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-indigo-700 dark:text-indigo-300 truncate">{selUser.name}</p>
                  <p className="text-[10.5px] text-indigo-500 dark:text-indigo-400 truncate">
                    {[selUser.floor, selUser.flatName].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              </div>
            )}
          </div>

          <DialogFooter className="px-5 pb-5 gap-2 flex-row">
            <Button variant="outline" onClick={() => setFreeOpen(false)}
              className="flex-1 h-9 text-[12.5px] rounded-xl
                border-gray-200 dark:border-white/[0.08]
                bg-white dark:bg-transparent
                text-gray-600 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-white/[0.05]">
              Cancel
            </Button>
            <Button onClick={assignSlot} disabled={saving || !selUserId}
              className="flex-1 h-9 text-[12.5px] font-bold rounded-xl
                bg-emerald-600 hover:bg-emerald-500 text-white
                shadow-[0_2px_8px_rgba(34,197,94,0.25)] disabled:opacity-40">
              {saving ? "Assigning…" : "Assign Slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════ ASSIGNED DIALOG ════════ */}
      <Dialog open={assignedOpen} onOpenChange={v => { setAssignedOpen(v); if (!v) setSearch("") }}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden gap-0 mx-4 sm:mx-auto
          bg-white dark:bg-[#141720] border border-gray-200 dark:border-white/[0.07]">

          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.06]
            bg-gradient-to-br from-rose-50/80 to-white dark:from-rose-950/20 dark:to-[#141720]">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0
                  bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                  <CircleOff className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <DialogTitle className="text-[14.5px] font-bold text-gray-900 dark:text-white">
                    Slot {activeSlot?.slotNumber} — Occupied
                  </DialogTitle>
                  <DialogDescription className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-0">
                    Free this slot or reassign to another resident
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-3">
            {/* Current occupant */}
            <div className="flex items-center gap-3 rounded-xl px-3 py-3
              bg-rose-50 dark:bg-rose-500/[0.07] border border-rose-200 dark:border-rose-500/20">
              <Initials name={activeAssign?.userName || "??"} />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-rose-700 dark:text-rose-300 truncate">
                  {activeAssign?.userName || "Currently assigned"}
                </p>
                <p className="text-[10.5px] text-rose-500 dark:text-rose-400">
                  {[activeAssign?.floorName, activeAssign?.flatName].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>

            <p className="text-[11.5px] font-semibold text-gray-500 dark:text-gray-400">Reassign to another resident:</p>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resident…"
                className="pl-9 h-9 text-[12.5px] rounded-xl
                  bg-gray-50 dark:bg-white/[0.05]
                  border-gray-200 dark:border-white/[0.08]
                  text-gray-800 dark:text-gray-100
                  placeholder:text-gray-400 dark:placeholder:text-gray-600
                  focus:border-indigo-400 dark:focus:border-indigo-500/60 focus:ring-0" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="max-h-44 overflow-y-auto space-y-0.5 -mx-1 px-1">
              {filteredUsers.length === 0
                ? <p className="py-6 text-center text-[12px] text-gray-400 dark:text-gray-500">No users found</p>
                : filteredUsers.map(u => (
                  <UserRow key={u.id} user={u} selected={selUserId === u.id} onClick={() => setSelUserId(u.id)} />
                ))
              }
            </div>
          </div>

          <DialogFooter className="px-5 pb-5 flex-row flex-wrap gap-2">
            <Button variant="outline" onClick={() => setAssignedOpen(false)}
              className="h-9 px-3 text-[12px] rounded-xl
                border-gray-200 dark:border-white/[0.08]
                bg-white dark:bg-transparent
                text-gray-600 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-white/[0.05]">
              Cancel
            </Button>
            <Button variant="outline" onClick={freeSlot} disabled={saving || !activeAssign?.id}
              className="flex-1 h-9 text-[12px] font-semibold rounded-xl
                border-amber-300 dark:border-amber-500/30
                bg-amber-50 dark:bg-amber-500/10
                text-amber-700 dark:text-amber-400
                hover:bg-amber-100 dark:hover:bg-amber-500/20 disabled:opacity-40">
              {saving ? "Processing…" : "Free Slot"}
            </Button>
            <Button onClick={assignSlot} disabled={saving || !selUserId}
              className="flex-1 h-9 text-[12px] font-bold rounded-xl
                bg-indigo-600 hover:bg-indigo-500 text-white
                shadow-[0_2px_8px_rgba(99,102,241,0.25)] disabled:opacity-40">
              {saving ? "Saving…" : "Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slotPop  { 0%,100% { transform:scale(1) } 50% { transform:scale(1.07) } }
      `}</style>
    </div>
  )
}
