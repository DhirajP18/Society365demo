"use client"

import { useEffect, useMemo, useState } from "react"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  List,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
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
  const [pageSize, setPageSize] = useState(5)
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

  useEffect(() => {
    loadFloors()
  }, [])

  const handleSort = (key: keyof Floor) => {
    setSortConfig((cur) => {
      if (cur?.key === key) {
        return cur.direction === "asc" ? { key, direction: "desc" } : null
      }
      return { key, direction: "asc" }
    })
    setCurrentPage(1)
  }

  const sortIcon = (key: keyof Floor) => {
    if (sortConfig?.key !== key) return <span className="ml-1 text-gray-300">(unsorted)</span>
    return <span className="ml-1 text-indigo-500">{sortConfig.direction === "asc" ? "(asc)" : "(desc)"}</span>
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

        if (typeof av === "string" && typeof bv === "string") {
          return sortConfig.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
        }

        if (typeof av === "number" && typeof bv === "number") {
          return sortConfig.direction === "asc" ? av - bv : bv - av
        }

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

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, pageSize])

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
    if (!floorName.trim()) {
      toast.error("Floor Name is required")
      return
    }

    setSaving(true)
    try {
      const payload = {
        floorName: floorName.trim(),
        totalFlats: Number(totalFlats || 0),
        totalParkingSlot: Number(totalParkingSlot || 0),
        isParkingFloor,
      }

      const res =
        floorId === null
          ? await api.post("Floor/Insert", payload)
          : await api.put("Floor/Update", { id: floorId, ...payload })

      if (res.data?.isSuccess) {
        toast.success(res.data.resMsg)
        resetForm()
        loadFloors()
      } else {
        toast.error(res.data?.resMsg ?? "Operation failed")
      }
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
        toast.success(res.data.resMsg)
        loadFloors()
      } else {
        toast.error(res.data?.resMsg ?? "Delete failed")
      }
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#f5f6fa]">
      <div className="border-b border-gray-200 bg-white px-4 pb-0 pt-3 sm:px-5">
        <div className="mb-2.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-[16px] font-bold leading-tight text-gray-900">
              <Building2 className="h-4 w-4 text-indigo-500" />
              Floor Master
            </h1>
            <p className="text-[11.5px] text-gray-400">Manage floors, flat counts, and parking slots</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadFloors}
              className="h-8 gap-1.5 border-gray-200 px-2.5 text-[11.5px] text-gray-500"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setFloorId(null)
                setFloorName("")
                setTotalFlats("")
                setTotalParkingSlot("")
                setIsParkingFloor(false)
                setIsListView(false)
              }}
              className="h-8 gap-1.5 bg-indigo-600 px-3 text-[11.5px] text-white hover:bg-indigo-700"
            >
              <Plus className="h-3 w-3" />
              Add Floor
            </Button>
          </div>
        </div>

        <div className="flex items-end gap-0 overflow-x-auto">
          {[
            { label: "List View", icon: List, value: true },
            { label: floorId ? "Edit Floor" : "Add Floor", icon: floorId ? Pencil : Plus, value: false },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = isListView === tab.value

            return (
              <button
                key={String(tab.value)}
                onClick={() => {
                  if (tab.value) {
                    resetForm()
                  } else {
                    setFloorId(null)
                    setFloorName("")
                    setTotalFlats("")
                    setTotalParkingSlot("")
                    setIsParkingFloor(false)
                    setIsListView(false)
                  }
                }}
                className={cn(
                  "rounded-t-lg border-l border-r border-t px-4 py-2 text-[12.5px] font-medium transition-all",
                  isActive
                    ? "relative z-10 -mb-px border-b-white border-gray-200 bg-white font-semibold text-gray-900"
                    : "border-transparent bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700",
                )}
              >
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <Icon className={cn("h-3.5 w-3.5", isActive ? "text-indigo-500" : "text-gray-400")} />
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mx-3 my-3 flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:mx-4">
        {isListView && (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-3 py-2">
              <span className="shrink-0 text-[12px] text-gray-500">Show</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-7 w-16 rounded border-gray-200 px-2 text-[11.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-[12px]">
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="shrink-0 text-[12px] text-gray-500">entries</span>

              <span className="shrink-0 text-[12px] text-gray-400">
                Showing <b className="text-gray-600">{from}</b>-<b className="text-gray-600">{to}</b> of <b className="text-gray-600">{filtered.length}</b>
              </span>

              <div className="relative ml-auto w-full sm:w-auto">
                <Input
                  placeholder="Search floor..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-8 w-full rounded border-gray-200 bg-gray-50 pl-3 text-[12px] sm:w-52"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="md:hidden">
                {loading && (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="rounded-lg border border-gray-100 p-3">
                        <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                        <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                      </div>
                    ))}
                  </div>
                )}

                {!loading && paged.length === 0 && (
                  <div className="flex min-h-[280px] items-center justify-center px-4 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="h-7 w-7 opacity-20" />
                      <p className="text-[13px] font-medium text-gray-500">No floors found</p>
                    </div>
                  </div>
                )}

                {!loading && paged.length > 0 && (
                  <div className="space-y-2 p-3">
                    {paged.map((floor) => (
                      <div key={floor.id} className="rounded-lg border border-gray-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11.5px] text-gray-400">#{floor.id}</p>
                            <p className="text-[13px] font-semibold text-gray-800">{floor.floorName}</p>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                              floor.isParkingFloor ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
                            )}
                          >
                            {floor.isParkingFloor ? "Parking" : "Regular"}
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11.5px] text-gray-500">
                          <div className="rounded-md bg-gray-50 px-2 py-1.5">Flats: {floor.totalFlats}</div>
                          <div className="rounded-md bg-gray-50 px-2 py-1.5">Slots: {floor.totalParkingSlot}</div>
                        </div>

                        <div className="mt-3 flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => editFloor(floor)}
                            className="h-7 flex-1 rounded border-gray-200 text-[12px] text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteId(floor.id)}
                            className="h-7 flex-1 rounded border-gray-200 text-[12px] text-gray-500 hover:border-rose-300 hover:text-rose-600"
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <table className="hidden w-full border-collapse text-[12.5px] md:table">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th
                      onClick={() => handleSort("id")}
                      className="w-16 cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400"
                    >
                      ID {sortIcon("id")}
                    </th>
                    <th
                      onClick={() => handleSort("floorName")}
                      className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400"
                    >
                      Floor Name {sortIcon("floorName")}
                    </th>
                    <th
                      onClick={() => handleSort("totalFlats")}
                      className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400"
                    >
                      Total Flats {sortIcon("totalFlats")}
                    </th>
                    <th
                      onClick={() => handleSort("totalParkingSlot")}
                      className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400"
                    >
                      Total Parking Slots {sortIcon("totalParkingSlot")}
                    </th>
                    <th
                      onClick={() => handleSort("isParkingFloor")}
                      className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400"
                    >
                      Parking Floor {sortIcon("isParkingFloor")}
                    </th>
                    <th className="w-24 whitespace-nowrap px-3 py-2 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j} className="px-3 py-2.5">
                            <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                          </td>
                        ))}
                      </tr>
                    ))}

                  {!loading && paged.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <Building2 className="h-7 w-7 opacity-20" />
                          <p className="text-[13px] font-medium text-gray-500">No floors found</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    paged.map((floor, idx) => (
                      <tr key={floor.id} className="border-b border-gray-50 transition-colors hover:bg-indigo-50/20">
                        <td className="px-3 py-2 font-mono text-[11.5px] text-gray-400">#{floor.id}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[9px] font-bold",
                                [
                                  "bg-indigo-100 text-indigo-700",
                                  "bg-violet-100 text-violet-700",
                                  "bg-emerald-100 text-emerald-700",
                                  "bg-amber-100 text-amber-700",
                                  "bg-rose-100 text-rose-700",
                                  "bg-sky-100 text-sky-700",
                                ][idx % 6],
                              )}
                            >
                              {floor.floorName.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-800">{floor.floorName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{floor.totalFlats}</td>
                        <td className="px-3 py-2 text-gray-600">{floor.totalParkingSlot}</td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                              floor.isParkingFloor ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
                            )}
                          >
                            {floor.isParkingFloor ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editFloor(floor)}
                              className="h-6 w-6 rounded border-gray-200 p-0 text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteId(floor.id)}
                              className="h-6 w-6 rounded border-gray-200 p-0 text-gray-500 hover:border-rose-300 hover:text-rose-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {!loading && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/50 px-3 py-2">
                <span className="text-[11.5px] text-gray-400">
                  Page <b className="text-gray-600">{currentPage}</b> of <b className="text-gray-600">{totalPages}</b>
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="h-6 w-6 rounded border-gray-200 p-0"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>

                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "h-6 w-6 rounded p-0 text-[11px]",
                        page === currentPage
                          ? "border-0 bg-indigo-600 text-white hover:bg-indigo-700"
                          : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                      )}
                    >
                      {page}
                    </Button>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="h-6 w-6 rounded border-gray-200 p-0"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {!isListView && (
          <div className="flex flex-1 items-start justify-center overflow-y-auto p-4 sm:p-6">
            <div className="w-full max-w-md">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                    {floorId ? <Pencil className="h-4 w-4 text-indigo-600" /> : <Plus className="h-4 w-4 text-indigo-600" />}
                  </div>
                  <div>
                    <h2 className="text-[14px] font-bold leading-tight text-gray-900">{floorId ? "Edit Floor" : "Add New Floor"}</h2>
                    <p className="text-[11.5px] text-gray-400">
                      {floorId ? "Update floor information below" : "Fill in the details to create a new floor"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetForm}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/60 p-5">
                <div className="space-y-1.5">
                  <Label htmlFor="floor-name" className="text-[12.5px] font-semibold text-gray-700">
                    Floor Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="floor-name"
                    value={floorName}
                    onChange={(e) => setFloorName(e.target.value)}
                    placeholder="e.g. Ground Floor, First Floor"
                    className="h-9 rounded-lg border-gray-200 bg-white text-[13px] focus-visible:border-indigo-400 focus-visible:ring-indigo-500/30"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="total-flats" className="text-[12.5px] font-semibold text-gray-700">
                      Total Flats
                    </Label>
                    <Input
                      id="total-flats"
                      type="number"
                      min={0}
                      value={totalFlats}
                      onChange={(e) => setTotalFlats(e.target.value)}
                      placeholder="0"
                      className="h-9 rounded-lg border-gray-200 bg-white text-[13px] focus-visible:border-indigo-400 focus-visible:ring-indigo-500/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="parking-slots" className="text-[12.5px] font-semibold text-gray-700">
                      Parking Slots
                    </Label>
                    <Input
                      id="parking-slots"
                      type="number"
                      min={0}
                      value={totalParkingSlot}
                      onChange={(e) => setTotalParkingSlot(e.target.value)}
                      placeholder="0"
                      className="h-9 rounded-lg border-gray-200 bg-white text-[13px] focus-visible:border-indigo-400 focus-visible:ring-indigo-500/30"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                  <Checkbox
                    checked={isParkingFloor}
                    onCheckedChange={(checked) => setIsParkingFloor(checked === true)}
                  />
                  <span className="text-[12.5px] text-gray-700">Is this a parking floor?</span>
                </label>

                <div className="h-px bg-gray-200" />

                <div className="flex gap-2.5">
                  <Button
                    onClick={saveFloor}
                    disabled={saving}
                    className="h-9 flex-1 rounded-lg bg-indigo-600 text-[13px] font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700"
                  >
                    {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    {floorId ? "Update Floor" : "Create Floor"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    disabled={saving}
                    className="h-9 flex-1 rounded-lg border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-sm gap-0 overflow-hidden rounded-xl p-0">
          <AlertDialogHeader className="border-b border-rose-100 bg-rose-50 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
                <Trash2 className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-[14px] font-bold leading-tight text-gray-900">Delete Floor?</AlertDialogTitle>
                <AlertDialogDescription className="mt-0 text-[11.5px] text-gray-500">
                  This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 px-5 py-4">
            <AlertDialogCancel className="h-8 flex-1 rounded-lg border-gray-200 text-[12.5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="h-8 flex-1 rounded-lg bg-rose-600 text-[12.5px] font-semibold text-white hover:bg-rose-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


