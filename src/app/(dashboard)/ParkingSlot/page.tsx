"use client"

import { useEffect, useMemo, useState } from "react"
import api from "@/lib/api"
import { toast } from "sonner"
import { getApiMessage } from "@/lib/getApiMessage"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Car, RefreshCw, Save, AlertTriangle, CheckCircle2,
  Layers, Hash, Pencil, Trash2, X, ChevronDown,
  ParkingCircle, Search, Plus
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface FloorVM {
  id: number
  floorName: string
  totalFlats: number
  totalParkingSlot: number
  isParkingFloor: boolean
}

interface ParkingSlotVM {
  id: number
  slotNumber: string
  floorId: number
  isAssigned: boolean
}

interface ApiResponse<T = unknown> {
  statusCode: number
  isSuccess: boolean
  resMsg?: string
  result?: T
}

// Each row in the bulk input grid
interface SlotRow {
  index: number       // 1-based display number
  slotNumber: string  // user input
  existingId: number  // 0 = new, >0 = already saved (will update)
  isAssigned: boolean
}

// ─── Floating-label Input ─────────────────────────────────────────────────────

function FInput({
  id, label, value, onChange, disabled = false, prefix
}: {
  id?: string; label: string; value: string; onChange: (v: string) => void
  disabled?: boolean; prefix?: string
}) {
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0

  return (
    <div className="relative">
      {prefix && (
        <span className={cn(
          "absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold select-none transition-all",
          active ? "text-indigo-400" : "text-gray-300"
        )}>
          {prefix}
        </span>
      )}
      <input
        id={id} value={value} disabled={disabled}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "w-full h-10 rounded-lg border bg-white dark:bg-gray-900 text-[13px] text-gray-900 dark:text-gray-100 outline-none transition-all",
          prefix ? "pl-7 pr-3 pt-3.5 pb-1" : "px-3 pt-3.5 pb-1",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          focused
            ? "border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
        )}
      />
      <label htmlFor={id} className={cn(
        "pointer-events-none absolute font-medium transition-all duration-150 select-none",
        prefix ? "left-7" : "left-3",
        active
          ? "top-[6px] text-[9.5px] text-indigo-500 tracking-wide"
          : "top-[50%] -translate-y-1/2 text-[12.5px] text-gray-400"
      )}>
        {label}
      </label>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ParkingSlotPage() {
  // ── State ────────────────────────────────────────────────────────────────────
  const [floors,         setFloors]         = useState<FloorVM[]>([])
  const [selectedFloor,  setSelectedFloor]  = useState<FloorVM | null>(null)
  const [slotRows,       setSlotRows]       = useState<SlotRow[]>([])
  const [existingSlots,  setExistingSlots]  = useState<ParkingSlotVM[]>([])
  const [allSlots,       setAllSlots]       = useState<ParkingSlotVM[]>([])

  const [loadingFloors,  setLoadingFloors]  = useState(true)
  const [loadingSlots,   setLoadingSlots]   = useState(false)
  const [saving,         setSaving]         = useState(false)

  const [search,         setSearch]         = useState("")
  const [deleteId,       setDeleteId]       = useState<number | null>(null)
  const [editRow,        setEditRow]        = useState<{ id: number; slotNumber: string } | null>(null)
  const [editVal,        setEditVal]        = useState("")

  // ── Load floors on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    loadFloors()
    loadAllSlots()
  }, [])

  const loadFloors = async () => {
    setLoadingFloors(true)
    try {
      const res = await api.get<ApiResponse<FloorVM[]>>("/Floor/GetAll")
      setFloors(res.data?.result ?? [])
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setLoadingFloors(false) }
  }

  const loadAllSlots = async () => {
    try {
      const res = await api.get<ApiResponse<ParkingSlotVM[]>>("/ParkingSlot/GetAll")
      setAllSlots(res.data?.result ?? [])
    } catch { /* silent */ }
  }

  // ── When a floor is selected ─────────────────────────────────────────────────
  const handleFloorSelect = async (floorId: string) => {
    const floor = floors.find(f => f.id === Number(floorId)) ?? null
    setSelectedFloor(floor)
    setSlotRows([])
    setExistingSlots([])

    if (!floor || !floor.isParkingFloor) return

    // Load already-saved slots for this floor
    setLoadingSlots(true)
    try {
      const res = await api.get<ApiResponse<ParkingSlotVM[]>>(`/ParkingSlot/GetByFloor/${floor.id}`)
      const saved = res.data?.result ?? []
      setExistingSlots(saved)

      // Build the slot rows — totalParkingSlot determines how many inputs to show
      const total = floor.totalParkingSlot ?? 0
      const rows: SlotRow[] = Array.from({ length: total }, (_, i) => {
        const existing = saved[i]   // match by position
        return {
          index:      i + 1,
          slotNumber: existing?.slotNumber ?? "",
          existingId: existing?.id ?? 0,
          isAssigned: existing?.isAssigned ?? false,
        }
      })
      setSlotRows(rows)
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setLoadingSlots(false) }
  }

  // ── Update a single row's slot name ─────────────────────────────────────────
  const updateRow = (index: number, value: string) => {
    setSlotRows(rows => rows.map(r => r.index === index ? { ...r, slotNumber: value } : r))
  }

  // ── Auto-fill: prefix + sequential numbers (e.g. "P-01", "P-02") ────────────
  const autoFill = (prefix: string) => {
    if (!prefix.trim()) { toast.error("Enter a prefix first"); return }
    setSlotRows(rows => rows.map(r => ({
      ...r,
      slotNumber: `${prefix.trim()}-${String(r.index).padStart(2, "0")}`
    })))
  }
  const [autoPrefix, setAutoPrefix] = useState("")

  // ── Save (bulk insert new + bulk update existing) ────────────────────────────
  const handleSave = async () => {
    if (!selectedFloor) return

    const empty = slotRows.filter(r => !r.slotNumber.trim())
    if (empty.length > 0) {
      toast.error(`Slot ${empty.map(r => r.index).join(", ")} ${empty.length === 1 ? "is" : "are"} empty`)
      return
    }

    setSaving(true)
    try {
      const toInsert = slotRows.filter(r => r.existingId === 0)
      const toUpdate = slotRows.filter(r => r.existingId > 0)

      let insertOk = true, updateOk = true

      if (toInsert.length > 0) {
        const payload = toInsert.map(r => ({ id: 0, slotNumber: r.slotNumber, floorId: selectedFloor.id, isAssigned: false }))
        const res = await api.post<ApiResponse>("/ParkingSlot/InsertBulk", payload)
        insertOk = res.data?.isSuccess ?? false
        if (!insertOk) toast.error(res.data?.resMsg ?? "Insert failed")
      }

      if (toUpdate.length > 0) {
        const payload = toUpdate.map(r => ({ id: r.existingId, slotNumber: r.slotNumber, floorId: selectedFloor.id, isAssigned: r.isAssigned }))
        const res = await api.put<ApiResponse>("/ParkingSlot/UpdateBulk", payload)
        updateOk = res.data?.isSuccess ?? false
        if (!updateOk) toast.error(res.data?.resMsg ?? "Update failed")
      }

      if (insertOk && updateOk) {
        toast.success(`${slotRows.length} slot(s) saved for ${selectedFloor.floorName}`)
        // Reload slots
        await handleFloorSelect(String(selectedFloor.id))
        await loadAllSlots()
      }
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setSaving(false) }
  }

  // ── Delete slot ───────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      const res = await api.delete<ApiResponse>(`/ParkingSlot/Delete/${deleteId}`)
      if (res.data?.isSuccess) {
        toast.success("Slot deleted")
        await loadAllSlots()
        if (selectedFloor) await handleFloorSelect(String(selectedFloor.id))
      } else {
        toast.error(res.data?.resMsg ?? "Delete failed")
      }
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setDeleteId(null) }
  }

  // ── Inline edit ───────────────────────────────────────────────────────────────
  const saveInlineEdit = async () => {
    if (!editRow || !editVal.trim()) return
    try {
      const slot = allSlots.find(s => s.id === editRow.id)
      if (!slot) return
      const res = await api.put<ApiResponse>("/ParkingSlot/Update", { ...slot, slotNumber: editVal.trim() })
      if (res.data?.isSuccess) {
        toast.success("Slot updated")
        await loadAllSlots()
        if (selectedFloor) await handleFloorSelect(String(selectedFloor.id))
      } else {
        toast.error(res.data?.resMsg ?? "Update failed")
      }
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setEditRow(null); setEditVal("") }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const filledCount  = slotRows.filter(r => r.slotNumber.trim()).length
  const savedCount   = slotRows.filter(r => r.existingId > 0).length
  const newCount     = slotRows.filter(r => r.existingId === 0 && r.slotNumber.trim()).length

  const filteredAllSlots = useMemo(() => {
    if (!search.trim()) return allSlots
    const q = search.toLowerCase()
    return allSlots.filter(s => {
      const floor = floors.find(f => f.id === s.floorId)
      return `${s.slotNumber} ${floor?.floorName ?? ""}`.toLowerCase().includes(q)
    })
  }, [allSlots, search, floors])

  const isParkingFloor   = selectedFloor?.isParkingFloor === true
  const isNotParking     = selectedFloor && !isParkingFloor
  const totalSlots       = selectedFloor?.totalParkingSlot ?? 0

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#f5f6fa] dark:bg-[#0a0c11]">

      {/* ── Toolbar ── */}
      <div className="bg-white dark:bg-[#0f1117] border-b border-gray-200 dark:border-white/[0.06] px-3 sm:px-5 pt-3 pb-0">
        <div className="flex items-center justify-between mb-2.5 gap-2">
          <div className="min-w-0">
            <h1 className="text-[15px] sm:text-[16px] font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-2">
              <ParkingCircle className="h-4 w-4 text-indigo-500 shrink-0" />
              Parking Slot Setup
            </h1>
            <p className="text-[11px] sm:text-[11.5px] text-gray-400 dark:text-gray-500">
              Select a parking floor to configure bulk slot names
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { loadFloors(); loadAllSlots() }}
            className="h-7 px-2.5 text-[11.5px] gap-1.5 border-gray-200 text-gray-500 shrink-0">
            <RefreshCw className="h-3 w-3" />Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-end gap-0 overflow-x-auto scrollbar-none">
          {[
            { label: "Configure Slots", icon: Layers },
            { label: "All Slots",       icon: Car    },
          ].map((tab, i) => {
            // Simple tab — using a local state would be cleaner but keeping it minimal
            return null
          })}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-hidden flex flex-col gap-4 p-3 sm:p-4">

        {/* ══════════ STEP 1 — Floor Selector ══════════ */}
        <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-gray-200 dark:border-white/[0.06] shadow-sm p-4 sm:p-5">

          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/10 shrink-0">
              <span className="text-[12px] font-black text-indigo-600 dark:text-indigo-400">1</span>
            </div>
            <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Select Floor</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Floor dropdown */}
            <div className="flex-1 max-w-sm">
              <Select onValueChange={handleFloorSelect} disabled={loadingFloors}>
                <SelectTrigger className="h-10 text-[13px] border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                  <SelectValue placeholder={loadingFloors ? "Loading floors…" : "Choose a floor"} />
                </SelectTrigger>
                <SelectContent>
                  {floors.length === 0 && (
                    <SelectItem value="__none__" disabled className="text-[12px] text-gray-400">No floors found</SelectItem>
                  )}
                  {floors.map(f => (
                    <SelectItem key={f.id} value={String(f.id)} className="text-[12.5px]">
                      <div className="flex items-center gap-2">
                        {f.isParkingFloor
                          ? <ParkingCircle className="h-3.5 w-3.5 text-indigo-500" />
                          : <Layers        className="h-3.5 w-3.5 text-gray-400"  />
                        }
                        <span>{f.floorName}</span>
                        {f.isParkingFloor && (
                          <span className="text-[10px] text-indigo-500 font-semibold">
                            · {f.totalParkingSlot} slots
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Floor info pills */}
            {selectedFloor && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className={cn(
                  "inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full border",
                  isParkingFloor
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                    : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                )}>
                  {isParkingFloor
                    ? <><CheckCircle2 className="h-3.5 w-3.5" />Parking Floor</>
                    : <><AlertTriangle className="h-3.5 w-3.5" />Not a Parking Floor</>
                  }
                </span>

                {isParkingFloor && (
                  <>
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                      <Hash className="h-3 w-3" />{totalSlots} Total Slots
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-full bg-slate-50 dark:bg-white/[0.04] text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-white/[0.07]">
                      {existingSlots.length} Already Configured
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Not a parking floor warning */}
          {isNotParking && (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-500/[0.08] border border-amber-200 dark:border-amber-500/20 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">
                  {selectedFloor!.floorName} is not configured as a parking floor.
                </p>
                <p className="text-[12px] text-amber-600 dark:text-amber-400 mt-0.5">
                  To enable parking slots for this floor, edit the floor and enable{" "}
                  <b>Is Parking Floor</b> and set the <b>Total Parking Slots</b> count.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ══════════ STEP 2 — Bulk Slot Name Input ══════════ */}
        {isParkingFloor && totalSlots > 0 && (
          <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-gray-200 dark:border-white/[0.06] shadow-sm overflow-hidden">

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-gray-100 dark:border-white/[0.05]">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/10 shrink-0">
                  <span className="text-[12px] font-black text-indigo-600 dark:text-indigo-400">2</span>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800 dark:text-white leading-tight">
                    Name Parking Slots
                    {loadingSlots && <span className="ml-2 text-[11px] text-gray-400 font-normal">Loading…</span>}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {filledCount}/{totalSlots} filled
                    {savedCount > 0 && ` · ${savedCount} already saved`}
                    {newCount   > 0 && ` · ${newCount} new`}
                  </p>
                </div>
              </div>

              {/* Auto-fill */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <input
                    value={autoPrefix}
                    onChange={e => setAutoPrefix(e.target.value)}
                    placeholder="Prefix e.g. P"
                    className="h-8 w-28 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-[12px] text-gray-700 dark:text-gray-200 outline-none focus:border-indigo-400 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.08)] placeholder:text-gray-300 dark:placeholder:text-gray-600"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={() => autoFill(autoPrefix)}
                  className="h-8 px-3 text-[12px] gap-1.5 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
                  <Plus className="h-3 w-3" />Auto-fill
                </Button>
                <Button size="sm" variant="outline"
                  onClick={() => setSlotRows(rows => rows.map(r => ({ ...r, slotNumber: "" })))}
                  className="h-8 px-3 text-[12px] gap-1.5 border-gray-200 text-gray-500 hover:bg-gray-50">
                  <X className="h-3 w-3" />Clear All
                </Button>
              </div>
            </div>

            {/* Slot grid */}
            {loadingSlots ? (
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {Array.from({ length: totalSlots }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {slotRows.map(row => (
                  <div key={row.index} className="group relative">
                    <FInput
                      label={`Slot ${row.index}`}
                      value={row.slotNumber}
                      onChange={v => updateRow(row.index, v)}
                      prefix={row.existingId > 0 ? undefined : undefined}
                      disabled={saving}
                    />
                    {/* Saved / assigned indicator */}
                    {row.existingId > 0 && (
                      <div className={cn(
                        "absolute -top-1.5 -right-1.5 h-4 px-1.5 rounded-full text-[8.5px] font-bold flex items-center border",
                        row.isAssigned
                          ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
                          : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                      )}>
                        {row.isAssigned ? "Used" : "Saved"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Save bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/60 dark:bg-white/[0.01]">
              <div className="text-[11.5px] text-gray-500 dark:text-gray-400 space-y-0.5">
                <p>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{filledCount}</span> of{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{totalSlots}</span> slots named
                </p>
                {newCount > 0 && (
                  <p className="text-indigo-500 dark:text-indigo-400 font-medium">
                    {newCount} new slot(s) will be created
                  </p>
                )}
                {savedCount > 0 && (
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {savedCount} existing slot(s) will be updated
                  </p>
                )}
              </div>

              <Button onClick={handleSave} disabled={saving || filledCount === 0 || loadingSlots}
                className="h-9 px-5 text-[13px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg gap-2 shrink-0">
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : `Save ${filledCount} Slot${filledCount !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        )}

        {/* ══════════ STEP 2 edge case — parking floor but 0 slots configured ══════════ */}
        {isParkingFloor && totalSlots === 0 && !loadingSlots && (
          <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-gray-200 dark:border-white/[0.06] shadow-sm p-8 flex flex-col items-center gap-3 text-center">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <p className="text-[14px] font-semibold text-gray-800 dark:text-white">
              Total Parking Slots not set for {selectedFloor?.floorName}
            </p>
            <p className="text-[12.5px] text-gray-500 dark:text-gray-400 max-w-xs">
              Go to Floor Management and set the <b>Total Parking Slot</b> count for this floor to generate input fields.
            </p>
          </div>
        )}

        {/* ══════════ ALL SLOTS LIST ══════════ */}
        <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-gray-200 dark:border-white/[0.06] shadow-sm overflow-hidden">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-indigo-500" />
              <p className="text-[13px] font-semibold text-gray-800 dark:text-white">
                All Parking Slots
              </p>
              <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
                {allSlots.length}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
              <input
                placeholder="Search slot or floor…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-7 pl-7 pr-3 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.04] text-[11.5px] text-gray-700 dark:text-gray-200 outline-none focus:border-indigo-300 focus:bg-white dark:focus:bg-white/[0.07] placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
            </div>
          </div>

          {/* Mobile cards + Desktop table */}
          {allSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2 text-gray-400">
              <ParkingCircle className="h-10 w-10 opacity-20" />
              <p className="text-[13px] font-medium text-gray-500">No parking slots configured yet</p>
              <p className="text-[12px] text-gray-400">Select a parking floor above to begin</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-50 dark:divide-white/[0.04]">
                {filteredAllSlots.map(slot => {
                  const floor = floors.find(f => f.id === slot.floorId)
                  return (
                    <div key={slot.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl shrink-0 font-bold text-[12px]",
                        slot.isAssigned
                          ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      )}>
                        <Car className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-800 dark:text-white truncate">
                          {editRow?.id === slot.id ? (
                            <input
                              autoFocus
                              value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") saveInlineEdit(); if (e.key === "Escape") { setEditRow(null); setEditVal("") } }}
                              className="w-full border-b-2 border-indigo-400 outline-none bg-transparent text-gray-800 dark:text-white"
                            />
                          ) : slot.slotNumber}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">{floor?.floorName ?? "—"}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border shrink-0",
                        slot.isAssigned
                          ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                          : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                      )}>
                        {slot.isAssigned ? "Assigned" : "Free"}
                      </Badge>
                      <div className="flex items-center gap-1 shrink-0">
                        {editRow?.id === slot.id ? (
                          <>
                            <button onClick={saveInlineEdit} className="h-6 w-6 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-50"><CheckCircle2 className="h-3.5 w-3.5" /></button>
                            <button onClick={() => { setEditRow(null); setEditVal("") }} className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100"><X className="h-3.5 w-3.5" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditRow({ id: slot.id, slotNumber: slot.slotNumber }); setEditVal(slot.slotNumber) }}
                              className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-indigo-600 hover:border-indigo-300">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => setDeleteId(slot.id)}
                              className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-400 hover:text-rose-600 hover:border-rose-300" disabled={slot.isAssigned}>
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-[12.5px] border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/[0.06]">
                      <th className="text-left px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">#</th>
                      <th className="text-left px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Slot Name</th>
                      <th className="text-left px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Floor</th>
                      <th className="text-left px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                      <th className="text-right px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllSlots.map((slot, idx) => {
                      const floor = floors.find(f => f.id === slot.floorId)
                      return (
                        <tr key={slot.id} className="border-b border-gray-50 dark:border-white/[0.03] hover:bg-indigo-50/20 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-2.5 text-gray-400 dark:text-gray-600 text-[11px]">{idx + 1}</td>
                          <td className="px-4 py-2.5">
                            {editRow?.id === slot.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") saveInlineEdit(); if (e.key === "Escape") { setEditRow(null); setEditVal("") } }}
                                  className="h-7 px-2 rounded border border-indigo-400 outline-none text-[12.5px] bg-white dark:bg-gray-900 text-gray-800 dark:text-white w-32 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                                />
                                <button onClick={saveInlineEdit} className="text-emerald-600 hover:text-emerald-700"><CheckCircle2 className="h-4 w-4" /></button>
                                <button onClick={() => { setEditRow(null); setEditVal("") }} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg shrink-0",
                                  slot.isAssigned ? "bg-amber-50 dark:bg-amber-500/10" : "bg-indigo-50 dark:bg-indigo-500/10")}>
                                  <Car className={cn("h-3.5 w-3.5", slot.isAssigned ? "text-amber-500" : "text-indigo-500")} />
                                </div>
                                <span className="font-semibold text-gray-800 dark:text-white">{slot.slotNumber}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-gray-500 dark:text-gray-400">{floor?.floorName ?? "—"}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className={cn("text-[10.5px] px-2 py-0 h-5 rounded-full border font-semibold",
                              slot.isAssigned
                                ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                                : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                            )}>
                              {slot.isAssigned ? "Assigned" : "Free"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {editRow?.id !== slot.id && (
                              <div className="inline-flex items-center gap-1 justify-end">
                                <Button size="sm" variant="outline"
                                  onClick={() => { setEditRow({ id: slot.id, slotNumber: slot.slotNumber }); setEditVal(slot.slotNumber) }}
                                  className="h-6 w-6 p-0 rounded border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-300">
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline"
                                  onClick={() => setDeleteId(slot.id)} disabled={slot.isAssigned}
                                  title={slot.isAssigned ? "Cannot delete an assigned slot" : "Delete"}
                                  className="h-6 w-6 p-0 rounded border-gray-200 text-gray-400 hover:text-rose-600 hover:border-rose-300 disabled:opacity-30">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filteredAllSlots.length === 0 && search && (
                <div className="py-10 text-center text-gray-400 text-[12.5px]">No slots match{search}</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Delete Dialog ── */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl max-w-sm p-0 overflow-hidden gap-0 mx-4 sm:mx-auto">
          <AlertDialogHeader className="px-5 py-4 border-b bg-rose-50 dark:bg-rose-500/[0.05] border-rose-100 dark:border-rose-500/20">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-500/10">
                <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">
                  Delete Slot?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[11.5px] text-gray-500 mt-0">
                  This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 py-4 gap-2 flex-row">
            <AlertDialogCancel className="flex-1 h-8 text-[12.5px] rounded-lg border-gray-200">Cancel</AlertDialogCancel>
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