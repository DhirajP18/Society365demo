"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Car, RefreshCw, MapPin, Layers, Home,
  CheckCircle2, AlertCircle, Copy, Check,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
interface MyParkingVM {
  slotNumber: string
  floorName:  string
  flatName:   string
}

// ── Copy-to-clipboard hook ────────────────────────────────────────────────────
function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy")
    }
  }
  return { copied, copy }
}

// ── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({
  icon, label, value, accent, copyable,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: string
  copyable?: boolean
}) {
  const { copied, copy } = useCopy(value)

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 sm:py-3 border-b border-gray-100 dark:border-white/[0.06] last:border-none">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border shrink-0",
          accent ?? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400"
        )}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</p>
          <p className="text-[13.5px] sm:text-[14px] font-black text-gray-900 dark:text-white truncate">{value}</p>
        </div>
      </div>

      {copyable && (
        <button
          onClick={copy}
          title="Copy to clipboard"
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md border text-gray-400 transition-all shrink-0",
            copied
              ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-600"
              : "border-gray-200 dark:border-white/[0.08] hover:border-blue-300 hover:text-blue-600"
          )}>
          {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function MyParkingPage() {
  const [data,    setData]    = useState<MyParkingVM | null>(null)
  const [loading, setLoading] = useState(true)
  const [empty,   setEmpty]   = useState(false)

  const load = async () => {
    setLoading(true)
    setEmpty(false)
    try {
      const r = await api.get<MyParkingVM>("/MyParking/GetMyParking")

      // 204 No Content → r.data is null/undefined
      if (!r.data || !r.data.slotNumber) {
        setData(null)
        setEmpty(true)
      } else {
        setData(r.data)
      }
    } catch (e) {
      // 204 can come as an axios error depending on interceptor setup
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 204) {
        setData(null)
        setEmpty(true)
      } else {
        toast.error(getApiMessage(e))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 via-blue-50 to-indigo-50 dark:bg-[#07080f] overflow-hidden">

      {/* ── Hero header ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 dark:from-blue-900 dark:via-blue-950 dark:to-indigo-950 px-4 sm:px-6 pt-4 sm:pt-5 pb-6 sm:pb-7 shrink-0 relative overflow-hidden">

        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute top-4 right-16 h-20 w-20 rounded-full bg-white/15 pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-cyan-300/30 pointer-events-none" />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-white/20 border border-white/30 shadow-lg">
              <Car className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h1 className="text-[17px] sm:text-[19px] font-black text-white tracking-tight">My Parking</h1>
              <p className="text-[11px] text-blue-50/95 mt-0.5">Your assigned parking slot details</p>
            </div>
          </div>
          <Button
            variant="outline" size="sm" onClick={load} disabled={loading}
            className="h-7 sm:h-8 px-2.5 sm:px-3 border-white/40 bg-white/15 hover:bg-white/25 text-white rounded-lg sm:rounded-xl">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ── Main content card — overlaps hero ────────────────────────────── */}
      <div className="flex-1 px-4 sm:px-6 -mt-3 sm:-mt-4 pb-3 sm:pb-4 max-w-md mx-auto w-full">

        {/* Loading skeleton */}
        {loading && (
          <div className="bg-white/95 dark:bg-[#0f1117] rounded-2xl sm:rounded-3xl border border-sky-100 dark:border-white/[0.07] shadow-xl overflow-hidden animate-pulse">
            <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 space-y-3.5 sm:space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-white/[0.06] shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 w-14 rounded bg-sky-100 dark:bg-white/[0.06]" />
                    <div className="h-3.5 w-24 rounded bg-blue-100 dark:bg-white/[0.06]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No parking assigned */}
        {!loading && empty && (
          <div className="bg-white/95 dark:bg-[#0f1117] h-full rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.07] shadow-xl overflow-hidden animate-[fadeInUp_0.3s_ease_both]">
            <div className="h-1 bg-gradient-to-r from-sky-200 to-indigo-200 dark:from-gray-700 dark:to-gray-600" />
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-7 sm:py-8 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 dark:bg-white/[0.06] border border-sky-200 dark:border-white/[0.09]">
                <AlertCircle className="h-6 w-6 text-sky-500" />
              </div>
              <div>
                <p className="text-[15px] sm:text-[16px] font-black text-slate-800 dark:text-white">No Parking Assigned</p>
                <p className="text-[12px] text-slate-500 dark:text-gray-500 mt-1.5 leading-relaxed">
                  You don&apos;t have a parking slot assigned yet. Please contact society management for assistance.
                </p>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg sm:rounded-xl bg-sky-50 dark:bg-amber-500/[0.08] border border-sky-200 dark:border-amber-500/20 mt-1">
                <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-[11px] sm:text-[12px] text-amber-700 dark:text-amber-400 font-medium">
                  Contact admin to get a slot assigned
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Parking details card */}
        {!loading && data && (
          <div className="bg-white/95 dark:bg-[#0f1117] rounded-2xl sm:rounded-3xl border border-sky-200 dark:border-blue-500/20 shadow-xl overflow-hidden animate-[fadeInUp_0.3s_ease_both]">

            {/* Accent bar */}
            <div className="h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-400" />

            {/* Slot number hero */}
            <div className="flex flex-col items-center pt-4 sm:pt-5 pb-4 sm:pb-5 px-4 sm:px-5 bg-gradient-to-b from-sky-50 dark:from-blue-500/[0.06] to-transparent border-b border-sky-100 dark:border-blue-500/10">
              <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-[0_8px_24px_rgba(14,165,233,0.35)] mb-2.5 sm:mb-3">
                <Car className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600 dark:text-blue-400 mb-1">
                Your Slot
              </p>
              <p className="text-[28px] sm:text-[32px] font-black text-slate-900 dark:text-white tracking-tight leading-none">
                {data.slotNumber}
              </p>
              <div className="flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400">Assigned to you</span>
              </div>
            </div>

            {/* Detail rows */}
            <div className="px-4 sm:px-5 divide-y divide-sky-100 dark:divide-white/[0.05]">
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                label="Slot Number"
                value={data.slotNumber}
                accent="bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400"
                copyable
              />
              <InfoRow
                icon={<Layers className="h-4 w-4" />}
                  label="Floor"
                value={data.floorName}
                accent="bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
              />
              {data.flatName && data.flatName.trim() !== "" && (
                <InfoRow
                  icon={<Home className="h-4 w-4" />}
                  label="Flat"
                  value={data.flatName}
                  accent="bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20 text-teal-600 dark:text-teal-400"
                />
              )}
            </div>

            {/* Footer note */}
            <div className="mx-4 sm:mx-5 mb-4 sm:mb-5 mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl sm:rounded-2xl bg-sky-50 dark:bg-blue-500/[0.07] border border-sky-100 dark:border-blue-500/15">
              <AlertCircle className="h-4 w-4 text-sky-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-[12px] text-sky-800 dark:text-blue-300/80 leading-relaxed">
                This slot is reserved exclusively for your use. Please ensure only your vehicle uses this space.
                Contact management if there are any issues.
              </p>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </div>
  )
}
