"use client"

import { useEffect, useMemo, useState } from "react"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Building2, ChevronLeft, ChevronRight, List, Loader2,
  Pencil, Plus, RefreshCw, Trash2, X,
} from "lucide-react"
import { toast } from "sonner"
import { getApiMessage } from "@/lib/getApiMessage"
import { cn } from "@/lib/utils"

type Floor = {
  id: number
  floorName: string
  totalFlats: number
  totalParkingSlot: number
  isParkingFloor: boolean
}

type SortConfig = { key: keyof Floor; direction: "asc" | "desc" } | null

export default function FloorMasterPage() {
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isListView, setIsListView] = useState(true)

  const [floorId, setFloorId] = useState<number | null>(null)
  const [floorName, setFloorName] = useState("")
  const [totalFlats, setTotalFlats] = useState("")
  const [totalParkingSlot, setTotalParkingSlot] = useState("")
  const [isParkingFloor, setIsParkingFloor] = useState(false)

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<SortConfig>(null)

  const loadFloors = async () => {
    setLoading(true)
    try {
      const res = await api.get("Floor/GetAll")
      const data: Floor[] = res.data?.result ?? []
      data.sort((a, b) => a.id - b.id)
      setFloors(data)
      setCurrentPage(1)
    } catch {
      toast.error("Failed to load floors")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadFloors() }, [])

  const handleSort = (key: keyof Floor) => {
    setSortConfig(cur => {
      if (cur?.key === key) return cur.direction === "asc" ? { key, direction: "desc" } : null
      return { key, direction: "asc" }
    })
    setCurrentPage(1)
  }

  const sortIcon = (key: keyof Floor) => {
    if (sortConfig?.key !== key) return <span className="text-gray-300 dark:text-gray-600 ml-1">↕</span>
    return <span className="text-teal-600 dark:text-teal-400 ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
  }

  const filtered = useMemo(() => {
    let data = [...floors]
    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter((x) =>
        [x.floorName, String(x.totalFlats), String(x.totalParkingSlot), x.isParkingFloor ? "yes" : "no"]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    }

    if (sortConfig) {
      data.sort((a, b) => {
        const av = a[sortConfig.key]
        const bv = b[sortConfig.key]
        if (typeof av === "string" && typeof bv === "string")
          return sortConfig.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
        if (typeof av === "number" && typeof bv === "number")
          return sortConfig.direction === "asc" ? av - bv : bv - av
        if (typeof av === "boolean" && typeof bv === "boolean") {
          const an = av ? 1 : 0
          const bn = bv ? 1 : 0
          return sortConfig.direction === "asc" ? an - bn : bn - an
        }
        return 0
      })
    }
    return data
  }, [floors, search, sortConfig])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  )
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, filtered.length)

  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [currentPage, totalPages])
  useEffect(() => { setCurrentPage(1) }, [search, pageSize])

  const resetForm = () => {
    setFloorId(null)
    setFloorName("")
    setTotalFlats("")
    setTotalParkingSlot("")
    setIsParkingFloor(false)
    setIsListView(true)
  }

  const editFloor = (floor: Floor) => {
    setFloorId(floor.id)
    setFloorName(floor.floorName)
    setTotalFlats(String(floor.totalFlats))
    setTotalParkingSlot(String(floor.totalParkingSlot))
    setIsParkingFloor(floor.isParkingFloor)
    setIsListView(false)
  }

  const saveFloor = async () => {
    if (!floorName.trim()) return toast.error("Floor Name is required")

    setSaving(true)
    try {
      const payload = {
        floorName: floorName.trim(),
        totalFlats: Number(totalFlats || 0),
        totalParkingSlot: Number(totalParkingSlot || 0),
        isParkingFloor,
      }

      const res = floorId === null
        ? await api.post("Floor/Insert", payload)
        : await api.put("Floor/Update", { id: floorId, ...payload })

      if (res.data?.isSuccess) {
        toast.success(res.data.resMsg ?? "Saved")
        resetForm()
        loadFloors()
      } else toast.error(res.data?.resMsg ?? "Operation failed")
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      const res = await api.delete(`Floor/Delete/${deleteId}`)
      if (res.data?.isSuccess) {
        toast.success(res.data.resMsg ?? "Deleted")
        loadFloors()
      } else toast.error(res.data?.resMsg ?? "Delete failed")
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#f3f6fa] dark:bg-[#070b10]">
      <div className="bg-white dark:bg-[#0d1017] border-b border-gray-200 dark:border-white/[0.06] px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl border border-teal-200 dark:border-teal-500/25 bg-teal-100 dark:bg-teal-500/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-[15px] sm:text-[17px] font-bold text-gray-900 dark:text-white">Floor Master</h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block">Manage floors, flats, and parking with full theme support</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadFloors}
              className="h-8 px-3 text-[11.5px] gap-1.5 border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-300 bg-white dark:bg-transparent rounded-xl"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => { setFloorId(null); setFloorName(""); setTotalFlats(""); setTotalParkingSlot(""); setIsParkingFloor(false); setIsListView(false) }}
              className="h-8 px-3 text-[11.5px] gap-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Floor
            </Button>
          </div>
        </div>

        <div className="flex items-end gap-0 mt-3 -mb-px overflow-x-auto">
          {[
            { label: "List View", icon: List, value: true },
            { label: floorId ? "Edit Floor" : "Add Floor", icon: floorId ? Pencil : Plus, value: false },
          ].map((tab) => {
            const Icon = tab.icon
            const active = isListView === tab.value
            return (
              <button
                key={String(tab.value)}
                onClick={() => {
                  if (tab.value) resetForm()
                  else { setFloorId(null); setFloorName(""); setTotalFlats(""); setTotalParkingSlot(""); setIsParkingFloor(false); setIsListView(false) }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 border-b-2 text-[12px] font-semibold transition-all whitespace-nowrap",
                  active
                    ? "border-teal-500 text-teal-600 dark:text-teal-400"
                    : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 sm:p-6">
        <div className="h-full rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f1118] shadow-sm overflow-hidden">
          {isListView ? (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/80 dark:bg-white/[0.02] px-4 py-3">
                <span className="text-[12px] text-gray-500 dark:text-gray-400">Show</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-16 rounded-lg border-gray-200 dark:border-white/[0.08] text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)} className="text-[12px]">{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[12px] text-gray-500 dark:text-gray-400">entries</span>
                <span className="text-[12px] text-gray-400 dark:text-gray-500">
                  Showing <b className="text-gray-700 dark:text-gray-200">{from}</b>-<b className="text-gray-700 dark:text-gray-200">{to}</b> of <b className="text-gray-700 dark:text-gray-200">{filtered.length}</b>
                </span>
                <Input
                  placeholder="Search floor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ml-auto h-8 w-full sm:w-56 rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121722] text-[12px]"
                />
              </div>

              <div className="overflow-auto h-[calc(100%-108px)]">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04]">
                      <th onClick={() => handleSort("id")} className="w-16 cursor-pointer whitespace-nowrap px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">ID {sortIcon("id")}</th>
                      <th onClick={() => handleSort("floorName")} className="cursor-pointer whitespace-nowrap px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Floor Name {sortIcon("floorName")}</th>
                      <th onClick={() => handleSort("totalFlats")} className="cursor-pointer whitespace-nowrap px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total Flats {sortIcon("totalFlats")}</th>
                      <th onClick={() => handleSort("totalParkingSlot")} className="cursor-pointer whitespace-nowrap px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Parking Slots {sortIcon("totalParkingSlot")}</th>
                      <th onClick={() => handleSort("isParkingFloor")} className="cursor-pointer whitespace-nowrap px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Parking Floor {sortIcon("isParkingFloor")}</th>
                      <th className="w-24 whitespace-nowrap px-4 py-3 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-white/[0.04]">
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-3 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-white/[0.06]" /></td>
                        ))}
                      </tr>
                    ))}

                    {!loading && paged.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-gray-400 dark:text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <Building2 className="h-7 w-7 opacity-30" />
                            <p className="text-[13px] font-medium">No floors found</p>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!loading && paged.map((floor, idx) => (
                      <tr key={floor.id} className="border-b border-gray-100 dark:border-white/[0.04] hover:bg-teal-50/40 dark:hover:bg-teal-500/5 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11.5px] text-gray-400 dark:text-gray-500">#{floor.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-7 w-7 rounded-md text-[9px] font-bold flex items-center justify-center",
                              ["bg-teal-100 text-teal-700","bg-cyan-100 text-cyan-700","bg-indigo-100 text-indigo-700","bg-amber-100 text-amber-700","bg-rose-100 text-rose-700","bg-emerald-100 text-emerald-700"][idx % 6],
                            )}>
                              {floor.floorName.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">{floor.floorName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{floor.totalFlats}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{floor.totalParkingSlot}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10.5px] font-semibold border",
                            floor.isParkingFloor
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
                              : "bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/[0.05] dark:text-gray-400 dark:border-white/[0.08]",
                          )}>
                            {floor.isParkingFloor ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => editFloor(floor)} className="h-7 w-7 rounded-lg p-0 border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setDeleteId(floor.id)} className="h-7 w-7 rounded-lg p-0 border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!loading && (
                <div className="h-12 flex items-center justify-between px-4 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/80 dark:bg-white/[0.02]">
                  <span className="text-[11.5px] text-gray-500 dark:text-gray-400">
                    Page <b className="text-gray-700 dark:text-gray-200">{currentPage}</b> of <b className="text-gray-700 dark:text-gray-200">{totalPages}</b>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="h-7 w-7 rounded-lg p-0 border-gray-200 dark:border-white/[0.08]">
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "h-7 w-7 rounded-lg p-0 text-[11px]",
                          page === currentPage
                            ? "bg-teal-600 hover:bg-teal-500 text-white"
                            : "bg-white dark:bg-transparent border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-gray-300",
                        )}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="h-7 w-7 rounded-lg p-0 border-gray-200 dark:border-white/[0.08]">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full overflow-auto p-6 flex items-start justify-center">
              <div className="w-full max-w-md">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-teal-100 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/25 flex items-center justify-center">
                      {floorId ? <Pencil className="h-4 w-4 text-teal-600 dark:text-teal-400" /> : <Plus className="h-4 w-4 text-teal-600 dark:text-teal-400" />}
                    </div>
                    <div>
                      <h2 className="text-[14px] font-bold text-gray-900 dark:text-white">{floorId ? "Edit Floor" : "Add New Floor"}</h2>
                      <p className="text-[11.5px] text-gray-400 dark:text-gray-500">{floorId ? "Update floor details" : "Create a new floor"}</p>
                    </div>
                  </div>
                  <button onClick={resetForm} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/70 dark:bg-white/[0.02] p-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="floor-name" className="text-[12.5px] font-semibold text-gray-700 dark:text-gray-200">
                      Floor Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="floor-name"
                      value={floorName}
                      onChange={(e) => setFloorName(e.target.value)}
                      placeholder="e.g. Ground Floor, First Floor"
                      className="h-9 rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121722] text-[13px] focus-visible:border-teal-400 focus-visible:ring-teal-500/30"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="total-flats" className="text-[12.5px] font-semibold text-gray-700 dark:text-gray-200">Total Flats</Label>
                      <Input
                        id="total-flats"
                        type="number"
                        min={0}
                        value={totalFlats}
                        onChange={(e) => setTotalFlats(e.target.value)}
                        placeholder="0"
                        className="h-9 rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121722] text-[13px] focus-visible:border-teal-400 focus-visible:ring-teal-500/30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="parking-slots" className="text-[12.5px] font-semibold text-gray-700 dark:text-gray-200">Parking Slots</Label>
                      <Input
                        id="parking-slots"
                        type="number"
                        min={0}
                        value={totalParkingSlot}
                        onChange={(e) => setTotalParkingSlot(e.target.value)}
                        placeholder="0"
                        className="h-9 rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121722] text-[13px] focus-visible:border-teal-400 focus-visible:ring-teal-500/30"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121722] px-3 py-2.5 cursor-pointer">
                    <Checkbox checked={isParkingFloor} onCheckedChange={(checked) => setIsParkingFloor(checked === true)} />
                    <span className="text-[12.5px] text-gray-700 dark:text-gray-200">Is this a parking floor?</span>
                  </label>

                  <div className="h-px bg-gray-200 dark:bg-white/[0.08]" />

                  <div className="flex gap-2.5">
                    <Button onClick={saveFloor} disabled={saving} className="h-9 flex-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-[13px] font-semibold text-white">
                      {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      {floorId ? "Update Floor" : "Create Floor"}
                    </Button>
                    <Button variant="outline" onClick={resetForm} disabled={saving} className="h-9 flex-1 rounded-lg border-gray-200 dark:border-white/[0.08] text-[13px]">
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-sm gap-0 overflow-hidden rounded-2xl p-0 bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08]">
          <AlertDialogHeader className="border-b border-gray-100 dark:border-white/[0.06] bg-rose-50 dark:bg-rose-500/10 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-[14px] font-bold text-gray-900 dark:text-white">Delete Floor?</AlertDialogTitle>
                <AlertDialogDescription className="mt-0 text-[11.5px] text-gray-500 dark:text-gray-400">This action cannot be undone.</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 px-5 py-4">
            <AlertDialogCancel className="h-9 flex-1 rounded-lg border-gray-200 dark:border-white/[0.08] text-[12.5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="h-9 flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-[12.5px] font-semibold text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
