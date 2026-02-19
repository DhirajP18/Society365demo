"use client"

import { useEffect, useMemo, useState } from "react"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

import {
  Plus,
  List,
  Loader2,
  Car,
  RefreshCw,
  Trash2,
} from "lucide-react"

import { toast } from "sonner"
import { cn } from "@/lib/utils"

//////////////////////////////////////////////////////
// TYPES
//////////////////////////////////////////////////////

type Floor = {
  floorId: number
  floorName: string
}

type ParkingSlot = {
  slotId?: number
  slotName: string
  floorId: number
}

//////////////////////////////////////////////////////
// PAGE
//////////////////////////////////////////////////////

export default function ParkingSlotMasterPage() {

  //////////////////////////////////////////////////
  // STATE
  //////////////////////////////////////////////////

  const [isListView, setIsListView] = useState(true)

  const [floors, setFloors] = useState<Floor[]>([])
  const [selectedFloorId, setSelectedFloorId] = useState("")

  const [totalSlots, setTotalSlots] = useState(0)

  const [slots, setSlots] = useState<ParkingSlot[]>([])

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState(false)

  //////////////////////////////////////////////////
  // LOAD FLOORS
  //////////////////////////////////////////////////

  const loadFloors = async () => {
    try {
      const res = await api.get("Floor/GetParkingFloors")

      setFloors(res.data.result ?? [])
    }
    catch {
      toast.error("Failed to load floors")
    }
  }

  //////////////////////////////////////////////////
  // LOAD SLOTS LIST
  //////////////////////////////////////////////////

  const loadSlots = async () => {

    setLoading(true)

    try {

      const res = await api.get("ParkingSlot/GetAll")

      setSlots(res.data.result ?? [])

    }
    catch {
      toast.error("Failed to load slots")
    }
    finally {
      setLoading(false)
    }
  }

  //////////////////////////////////////////////////
  // INIT
  //////////////////////////////////////////////////

  useEffect(() => {

    loadFloors()
    loadSlots()

  }, [])

  //////////////////////////////////////////////////
  // GENERATE BULK SLOTS
  //////////////////////////////////////////////////

  const generateSlots = () => {

    if (!selectedFloorId) {
      toast.error("Select floor first")
      return
    }

    if (totalSlots <= 0) {
      toast.error("Enter valid total slots")
      return
    }

    const newSlots: ParkingSlot[] = []

    for (let i = 1; i <= totalSlots; i++) {

      newSlots.push({
        slotName: `Slot ${i}`,
        floorId: Number(selectedFloorId),
      })

    }

    setSlots(newSlots)

  }

  //////////////////////////////////////////////////
  // CHANGE SLOT NAME
  //////////////////////////////////////////////////

  const updateSlotName = (index: number, value: string) => {

    const copy = [...slots]

    copy[index].slotName = value

    setSlots(copy)

  }

  //////////////////////////////////////////////////
  // BULK SAVE
  //////////////////////////////////////////////////

  const bulkSave = async () => {

    if (slots.length === 0) {

      toast.error("No slots to save")

      return
    }

    setSaving(true)

    try {

      const res = await api.post("ParkingSlot/BulkInsert", {

        slots

      })

      if (res.data.isSuccess) {

        toast.success(res.data.resMsg)

        setSlots([])

        setTotalSlots(0)

        setSelectedFloorId("")

        setIsListView(true)

        loadSlots()

      }
      else {

        toast.error(res.data.resMsg)

      }

    }
    catch {

      toast.error("Bulk save failed")

    }
    finally {

      setSaving(false)

    }

  }

  //////////////////////////////////////////////////
  // DELETE ALL TEMP
  //////////////////////////////////////////////////

  const clearSlots = () => {

    setSlots([])

    setDeleteConfirm(false)

  }

  //////////////////////////////////////////////////
  // UI
  //////////////////////////////////////////////////

  return (

    <div className="flex flex-col h-full bg-gray-50">

    

      <div className="bg-white border-b px-5 py-3">

        <div className="flex justify-between">

          <div className="flex gap-2 items-center">

            <Car className="h-5 w-5 text-indigo-600"/>

            <h1 className="font-bold text-sm">

              Parking Slot Master

            </h1>

          </div>

          <div className="flex gap-2">

            <Button
              variant="outline"
              size="sm"
              onClick={loadSlots}
            >

              <RefreshCw className="h-4 w-4"/>

            </Button>

            <Button
              size="sm"
              onClick={() => setIsListView(false)}
            >

              <Plus className="h-4 w-4 mr-1"/>

              Add Slots

            </Button>

          </div>

        </div>

      </div>

    

      <div className="flex-1 p-4">

       
        {isListView && (

          <div className="bg-white border rounded-lg p-4">

            {loading && (

              <Loader2 className="animate-spin"/>

            )}

            {!loading && (

              <table className="w-full text-sm">

                <thead>

                  <tr className="border-b">

                    <th className="text-left p-2">Slot</th>

                    <th className="text-left p-2">Floor</th>

                  </tr>

                </thead>

                <tbody>

                  {slots.map((s, i) => (

                    <tr key={i} className="border-b">

                      <td className="p-2">

                        {s.slotName}

                      </td>

                      <td className="p-2">

                        {floors.find(x => x.floorId === s.floorId)?.floorName}

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            )}

          </div>

        )}


        {!isListView && (

          <div className="bg-white border rounded-lg p-4 max-w-xl">


            <Label>Select Floor</Label>

            <Select
              value={selectedFloorId}
              onValueChange={setSelectedFloorId}
            >

              <SelectTrigger>

                <SelectValue placeholder="Select floor"/>

              </SelectTrigger>

              <SelectContent>

                {floors.map(f => (

                  <SelectItem
                    key={f.floorId}
                    value={String(f.floorId)}
                  >

                    {f.floorName}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

           
            <Label className="mt-3 block">

              Total Slots

            </Label>

            <Input
              type="number"
              value={totalSlots}
              onChange={e => setTotalSlots(Number(e.target.value))}
            />

           

            <Button
              onClick={generateSlots}
              className="mt-3"
            >

              Generate Slots

            </Button>

           

            {slots.length > 0 && (

              <div className="mt-4 space-y-2 max-h-64 overflow-auto">

                {slots.map((s, i) => (

                  <Input
                    key={i}
                    value={s.slotName}
                    onChange={e => updateSlotName(i, e.target.value)}
                  />

                ))}

              </div>

            )}

          

            {slots.length > 0 && (

              <div className="flex gap-2 mt-4">

                <Button
                  onClick={bulkSave}
                  disabled={saving}
                >

                  {saving && (
                    <Loader2 className="animate-spin mr-2 h-4 w-4"/>
                  )}

                  Bulk Save

                </Button>

                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirm(true)}
                >

                  Clear

                </Button>

              </div>

            )}

          </div>

        )}

      </div>

    

      <AlertDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
      >

        <AlertDialogContent>

          <AlertDialogHeader>

            <AlertDialogTitle>

              Clear all slots?

            </AlertDialogTitle>

          </AlertDialogHeader>

          <AlertDialogFooter>

            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={clearSlots}
            >
              Clear
            </AlertDialogAction>

          </AlertDialogFooter>

        </AlertDialogContent>

      </AlertDialog>

    </div>

  )

}
