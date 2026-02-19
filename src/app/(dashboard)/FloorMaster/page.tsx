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
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft, ChevronRight, Loader2,
  Pencil, Trash2, Plus, List, Building2, RefreshCw, X
} from "lucide-react"

import { toast } from "sonner"
import { getApiMessage } from "@/lib/getApiMessage"
import { cn } from "@/lib/utils"


// ─── TYPES ─────────────────────────────────────────

type Floor = {
  id: number
  floorName: string
  totalFlats: number
  totalParkingSlot: number
  isParkingFloor: boolean
}

type SortConfig = {
  key: keyof Floor
  direction: "asc" | "desc"
} | null


// ─── COMPONENT ─────────────────────────────────────

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


  // ─── LOAD ─────────────────────────────────────

  const loadFloors = async () => {

    setLoading(true)

    try {

      const res = await api.get("Floor/GetAll")

      const data = res.data.result ?? []

      setFloors(data)

    }
    catch {
      toast.error("Failed to load floors")
    }
    finally {
      setLoading(false)
    }
  }


  useEffect(() => {

    loadFloors()

  }, [])


  // ─── SAVE ─────────────────────────────────────

  const saveFloor = async () => {

    if (!floorName.trim())
      return toast.error("Floor Name required")

    setSaving(true)

    try {

      const payload = {

        floorName,
        totalFlats: Number(totalFlats),
        totalParkingSlot: Number(totalParkingSlot),
        isParkingFloor

      }

      const res = floorId === null
        ? await api.post("Floor/Insert", payload)
        : await api.put("Floor/Update", { id: floorId, ...payload })


      if (res.data.isSuccess) {

        toast.success(res.data.resMsg)

        resetForm()

        loadFloors()

      }
      else {

        toast.error(res.data.resMsg)

      }

    }
    catch (e) {

      toast.error(getApiMessage(e))

    }
    finally {

      setSaving(false)

    }

  }


  // ─── DELETE ─────────────────────────────────────

  const confirmDelete = async () => {

    if (!deleteId) return

    try {

      const res = await api.delete(`Floor/Delete/${deleteId}`)

      if (res.data.isSuccess) {

        toast.success(res.data.resMsg)

        loadFloors()

      }

    }
    catch (e) {

      toast.error(getApiMessage(e))

    }
    finally {

      setDeleteId(null)

    }

  }


  // ─── EDIT ─────────────────────────────────────

  const editFloor = (f: Floor) => {

    setFloorId(f.id)
    setFloorName(f.floorName)
    setTotalFlats(String(f.totalFlats))
    setTotalParkingSlot(String(f.totalParkingSlot))
    setIsParkingFloor(f.isParkingFloor)

    setIsListView(false)

  }


  const resetForm = () => {

    setFloorId(null)
    setFloorName("")
    setTotalFlats("")
    setTotalParkingSlot("")
    setIsParkingFloor(false)
    setIsListView(true)

  }


  // ─── FILTER ─────────────────────────────────────

  const filtered = useMemo(() => {

    return floors.filter(x =>
      x.floorName.toLowerCase().includes(search.toLowerCase())
    )

  }, [floors, search])


  const totalPages = Math.ceil(filtered.length / pageSize)

  const paged = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )


  // ─── UI ─────────────────────────────────────

  return (

    <div className="flex flex-col h-full bg-[#f5f6fa]">


      {/* HEADER */}

      <div className="bg-white border-b px-5 py-3 flex justify-between">

        <div>

          <h1 className="font-bold flex gap-2 items-center">

            <Building2 className="h-4 w-4 text-indigo-600"/>

            Floor Master

          </h1>

        </div>


        <div className="flex gap-2">

          <Button
            size="sm"
            variant="outline"
            onClick={loadFloors}
          >

            <RefreshCw className="h-3 w-3 mr-1"/>

            Refresh

          </Button>


          <Button
            size="sm"
            onClick={() => setIsListView(false)}
          >

            <Plus className="h-3 w-3 mr-1"/>

            Add Floor

          </Button>

        </div>

      </div>


      {/* LIST */}

      {isListView && (

        <div className="p-4">

          <Input
            placeholder="Search floor"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
          />


          <table className="w-full mt-4">

            <thead>

              <tr>

                <th>ID</th>
                <th>Name</th>
                <th>Flats</th>
                <th>Slots</th>
                <th>Parking Floor</th>
                <th>Actions</th>

              </tr>

            </thead>


            <tbody>

              {paged.map(f => (

                <tr key={f.id}>

                  <td>{f.id}</td>

                  <td>{f.floorName}</td>

                  <td>{f.totalFlats}</td>

                  <td>{f.totalParkingSlot}</td>

                  <td>

                    {f.isParkingFloor
                      ? "Yes"
                      : "No"
                    }

                  </td>


                  <td>

                    <Button
                      size="sm"
                      onClick={()=>editFloor(f)}
                    >
                      Edit
                    </Button>


                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={()=>setDeleteId(f.id)}
                    >
                      Delete
                    </Button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}



      {/* FORM */}

      {!isListView && (

        <div className="p-6 max-w-md">

          <Label>Floor Name</Label>

          <Input
            value={floorName}
            onChange={(e)=>setFloorName(e.target.value)}
          />


          <Label>Total Flats</Label>

          <Input
            value={totalFlats}
            onChange={(e)=>setTotalFlats(e.target.value)}
          />


          <Label>Total Parking Slots</Label>

          <Input
            value={totalParkingSlot}
            onChange={(e)=>setTotalParkingSlot(e.target.value)}
          />


          <div className="flex gap-2 mt-2">

           <Checkbox
  checked={isParkingFloor}
  onCheckedChange={(checked: boolean | "indeterminate") =>
    setIsParkingFloor(checked === true)
  }
/>


            Parking Floor

          </div>


          <Button
            onClick={saveFloor}
            disabled={saving}
            className="mt-4"
          >

            {saving && <Loader2 className="animate-spin mr-2"/>}

            Save

          </Button>


        </div>

      )}


      {/* DELETE DIALOG */}

      <AlertDialog open={deleteId!==null}>

        <AlertDialogContent>

          <AlertDialogHeader>

            <AlertDialogTitle>

              Delete Floor?

            </AlertDialogTitle>

          </AlertDialogHeader>


          <AlertDialogFooter>

            <AlertDialogCancel>

              Cancel

            </AlertDialogCancel>


            <AlertDialogAction
              onClick={confirmDelete}
            >

              Delete

            </AlertDialogAction>

          </AlertDialogFooter>

        </AlertDialogContent>

      </AlertDialog>


    </div>

  )

}
