"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Star, Plus, List, RefreshCw, Phone, Mail, MapPin,
  Wrench, X, MessageSquare, ChevronRight, User, Search
} from "lucide-react"
import { getApiMessage } from "@/lib/getApiMessage"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceProvider = {
  id: number
  name: string
  serviceType: string
  mobile: string
  emailId: string
  adress: string
  avgRating: number
  totalReviews: number
}

type Review = {
  rating: number
  descriptions: string
  userName?: string
  reviewDate?: string
}

// ─── Star Rating Display ──────────────────────────────────────────────────────

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(x => (
        <Star key={x} size={size}
          className={x <= Math.round(rating)
            ? "fill-amber-400 text-amber-400"
            : "fill-gray-100 text-gray-200"} />
      ))}
    </div>
  )
}

// ─── Interactive Star Picker ──────────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(x => (
        <Star key={x} size={26}
          onMouseEnter={() => setHovered(x)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(x)}
          className={cn(
            "cursor-pointer transition-all duration-100",
            x <= (hovered || value)
              ? "fill-amber-400 text-amber-400 scale-110"
              : "fill-gray-100 text-gray-200 hover:scale-105"
          )} />
      ))}
      {value > 0 && (
        <span className="ml-2 text-[12px] font-semibold text-amber-600">
          {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][value]}
        </span>
      )}
    </div>
  )
}

// ─── Avatar color ─────────────────────────────────────────────────────────────

const AV = [
  "bg-indigo-100 text-indigo-700", "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700",
  "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
]

const SERVICE_COLORS: Record<string, string> = {
  plumbing:   "bg-blue-50 text-blue-700 border-blue-200",
  electrical: "bg-amber-50 text-amber-700 border-amber-200",
  cleaning:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  carpentry:  "bg-orange-50 text-orange-700 border-orange-200",
  painting:   "bg-purple-50 text-purple-700 border-purple-200",
  security:   "bg-slate-50 text-slate-700 border-slate-200",
}

function serviceColor(type: string) {
  const key = type.toLowerCase()
  for (const k of Object.keys(SERVICE_COLORS)) if (key.includes(k)) return SERVICE_COLORS[k]
  return "bg-gray-50 text-gray-600 border-gray-200"
}

// ─── Provider Card ────────────────────────────────────────────────────────────

function ProviderCard({
  provider, idx, onReview
}: { provider: ServiceProvider; idx: number; onReview: (p: ServiceProvider) => void }) {
  const initials = provider.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()

  return (
    <div className="group bg-white rounded-xl border border-gray-200 hover:border-indigo-200 hover:shadow-md shadow-sm transition-all duration-200 overflow-hidden">
      {/* Card top accent */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-400 to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className={cn("text-[11px] font-bold", AV[idx % AV.length])}>
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-bold text-gray-900 leading-tight truncate">
              {provider.name}
            </p>
            <Badge variant="outline" className={cn("mt-1 text-[10.5px] px-1.5 py-0 h-4 rounded-full border font-medium", serviceColor(provider.serviceType))}>
              <Wrench className="h-2.5 w-2.5 mr-1" />
              {provider.serviceType}
            </Badge>
          </div>

          {/* Rating pill */}
          <div className="flex flex-col items-end shrink-0">
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-[12px] font-bold text-amber-700">
                {provider.avgRating > 0 ? provider.avgRating.toFixed(1) : "—"}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 mt-0.5">
              {provider.totalReviews} review{provider.totalReviews !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-[12px] text-gray-500">
            <Phone className="h-3 w-3 text-gray-300 shrink-0" />
            <span>{provider.mobile}</span>
          </div>
          {provider.emailId && (
            <div className="flex items-center gap-2 text-[12px] text-gray-500">
              <Mail className="h-3 w-3 text-gray-300 shrink-0" />
              <span className="truncate">{provider.emailId}</span>
            </div>
          )}
          {provider.adress && (
            <div className="flex items-center gap-2 text-[12px] text-gray-500">
              <MapPin className="h-3 w-3 text-gray-300 shrink-0" />
              <span className="truncate">{provider.adress}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <StarRow rating={provider.avgRating} size={12} />
          <Button size="sm" variant="outline" onClick={() => onReview(provider)}
            className="h-7 px-2.5 text-[11.5px] gap-1.5 border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg">
            <MessageSquare className="h-3 w-3" />
            Reviews
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Floating Label Input ─────────────────────────────────────────────────────

function FInput({ id, label, value, onChange, type = "text", required = false }:
  { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0
  return (
    <div className="relative">
      <input id={id} type={type} value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "peer w-full h-11 rounded-lg border bg-white px-3 pt-4 pb-1.5 text-[13.5px] text-gray-900 outline-none transition-all",
          active ? "border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" : "border-gray-200 hover:border-gray-300"
        )}
      />
      <label htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-3 font-medium transition-all duration-150 select-none",
          active ? "top-[7px] text-[10px] text-indigo-500 tracking-wide"
                 : "top-[50%] -translate-y-1/2 text-[13.5px] text-gray-400"
        )}>
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
    </div>
  )
}

function FTextarea({ id, label, value, onChange }:
  { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0
  return (
    <div className="relative">
      <textarea id={id} rows={3} value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "peer w-full rounded-lg border bg-white px-3 pt-5 pb-2 text-[13.5px] text-gray-900 outline-none transition-all resize-none",
          active ? "border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" : "border-gray-200 hover:border-gray-300"
        )}
      />
      <label htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-3 font-medium transition-all duration-150 select-none",
          active ? "top-[7px] text-[10px] text-indigo-500 tracking-wide"
                 : "top-[14px] text-[13.5px] text-gray-400"
        )}>
        {label}
      </label>
    </div>
  )
}

// ─── Review Dialog ────────────────────────────────────────────────────────────

function ReviewDialog({
  open, onClose, provider, reviews, onSubmit
}: {
  open: boolean
  onClose: () => void
  provider: ServiceProvider | null
  reviews: Review[]
  onSubmit: (rating: number, text: string) => Promise<void>
}) {
  const [showForm, setShowForm] = useState(false)
  const [rating,   setRating]   = useState(0)
  const [text,     setText]     = useState("")
  const [saving,   setSaving]   = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    await onSubmit(rating, text)
    setRating(0); setText(""); setShowForm(false)
    setSaving(false)
  }

  const handleClose = () => { setShowForm(false); setRating(0); setText(""); onClose() }

  if (!provider) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden gap-0">

        {/* Dialog Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <DialogTitle className="text-[14.5px] font-bold text-gray-900 leading-tight">
                {provider.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRow rating={provider.avgRating} size={11} />
                <span className="text-[11px] text-gray-400">{provider.totalReviews} reviews</span>
              </div>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowForm(s => !s)}
            className={cn("h-7 px-3 text-[11.5px] gap-1.5 rounded-lg",
              showForm ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-indigo-600 hover:bg-indigo-700 text-white")}>
            {showForm ? <><X className="h-3 w-3" />Cancel</> : <><Plus className="h-3 w-3" />Write Review</>}
          </Button>
        </div>

        {/* Add Review Form */}
        {showForm && (
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
            <p className="text-[12.5px] font-semibold text-gray-700 mb-3">Your Review</p>
            <StarPicker value={rating} onChange={setRating} />
            <div className="mt-3">
              <Textarea placeholder="Share your experience (min. 5 characters)..."
                value={text} onChange={e => setText(e.target.value)} rows={2}
                className="text-[13px] resize-none rounded-lg border-gray-200 bg-white focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400" />
            </div>
            <Button onClick={handleSubmit} disabled={saving || rating === 0 || text.trim().length < 5}
              className="mt-3 h-8 px-4 text-[12.5px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
              {saving ? "Submitting…" : "Submit Review"}
            </Button>
          </div>
        )}

        {/* Reviews List */}
        <div className="px-5 py-3 max-h-72 overflow-y-auto space-y-3">
          {reviews.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
              <MessageSquare className="h-8 w-8 opacity-20" />
              <p className="text-[13px] font-medium text-gray-500">No reviews yet</p>
              <p className="text-[12px]">Be the first to review this provider</p>
            </div>
          ) : reviews.map((r, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold", AV[i % AV.length])}>
                    <User className="h-3 w-3" />
                  </div>
                  <span className="text-[12.5px] font-semibold text-gray-800">{r.userName ?? "Anonymous"}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <StarRow rating={r.rating} size={11} />
                  {r.reviewDate && (
                    <span className="text-[10.5px] text-gray-400">
                      {new Date(r.reviewDate).toLocaleDateString("en-GB")}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[12.5px] text-gray-600 leading-relaxed">{r.descriptions}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminServiceProviderPage() {
  const [view,              setView]              = useState<"list" | "add">("list")
  const [providers,         setProviders]         = useState<ServiceProvider[]>([])
  const [loading,           setLoading]           = useState(true)
  const [saving,            setSaving]            = useState(false)
  const [search,            setSearch]            = useState("")

  // Review dialog
  const [reviewOpen,        setReviewOpen]        = useState(false)
  const [selectedProvider,  setSelectedProvider]  = useState<ServiceProvider | null>(null)
  const [reviews,           setReviews]           = useState<Review[]>([])

  // Form fields
  const [providerCode, setProviderCode] = useState("")
  const [name,         setName]         = useState("")
  const [serviceType,  setServiceType]  = useState("")
  const [mobile,       setMobile]       = useState("")
  const [emailId,      setEmailId]      = useState("")
  const [adress,       setAdress]       = useState("")

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => { if (view === "list") loadProviders() }, [view])

  const loadProviders = async () => {
    setLoading(true)
    try {
      const res = await api.get<{ result: ServiceProvider[] }>("/ServiceProvider/GetAll")
      setProviders((res.data.result ?? []).map(x => ({
        ...x, avgRating: x.avgRating ?? 0, totalReviews: x.totalReviews ?? 0
      })))
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setLoading(false) }
  }

  // ── Submit Provider ───────────────────────────────────────────────────────

  const submitProvider = async () => {
    if (!providerCode || !name || !serviceType || !mobile)
      return toast.warning("Please fill all required fields")
    setSaving(true)
    try {
      const res = await api.post("/ServiceProvider/Insert",
        { providerCode, name, serviceType, mobile, emailId, adress, isActive: true })
      if (res.data?.isSuccess) {
        toast.success(res.data.resMsg)
        setProviderCode(""); setName(""); setServiceType("")
        setMobile(""); setEmailId(""); setAdress("")
        setView("list")
      } else toast.error(res.data?.resMsg ?? "Operation failed")
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setSaving(false) }
  }

  // ── Reviews ───────────────────────────────────────────────────────────────

  const openReviews = async (p: ServiceProvider) => {
    setSelectedProvider(p)
    setReviews([])
    setReviewOpen(true)
    try {
      const res = await api.get<{ result: Review[] }>(`/ServiceProviderReview/GetByProvider/${p.id}`)
      setReviews(res.data?.result ?? [])
    } catch { setReviews([]) }
  }

  const submitReview = async (rating: number, text: string) => {
    if (!selectedProvider) return
    const res = await api.post("/ServiceProviderReview/Insert", {
      serviceProviderId: selectedProvider.id,
      rating, descriptions: text,
      reviewDate: new Date().toISOString(), isActive: true
    })
    if (res.data?.isSuccess) {
      toast.success(res.data.resMsg)
      const fresh = await api.get<{ result: Review[] }>(`/ServiceProviderReview/GetByProvider/${selectedProvider.id}`)
      setReviews(fresh.data?.result ?? [])
      loadProviders()
    } else toast.error(res.data?.resMsg ?? "Failed")
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = providers.filter(p =>
    `${p.name} ${p.serviceType} ${p.mobile}`.toLowerCase().includes(search.toLowerCase())
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#f5f6fa]">

      {/* ── Toolbar ── */}
      <div className="bg-white border-b border-gray-200 px-5 pt-3 pb-0">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h1 className="text-[16px] font-bold text-gray-900 leading-tight flex items-center gap-2">
              <Wrench className="h-4 w-4 text-indigo-500" />
              Service Providers
            </h1>
            <p className="text-[11.5px] text-gray-400">Manage service providers and customer reviews</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadProviders}
              className="h-7 px-2.5 text-[11.5px] gap-1.5 border-gray-200 text-gray-500">
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setView("add")}
              className="h-7 px-3 text-[11.5px] gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-3 w-3" />
              Add Provider
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-end gap-0">
          {[
            { label: "All Providers", icon: List,  value: "list" as const },
            { label: "Add Provider",  icon: Plus,  value: "add"  as const },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = view === tab.value
            return (
              <button key={tab.value} onClick={() => setView(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-medium border-t border-l border-r transition-all rounded-t-lg",
                  isActive
                    ? "bg-white border-gray-200 text-gray-900 font-semibold border-b-white -mb-px z-10 relative"
                    : "bg-transparent border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}>
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-indigo-500" : "text-gray-400")} />
                {tab.label}
                {tab.value === "list" && isActive && (
                  <span className="ml-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0">
                    {filtered.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden flex flex-col mx-4 my-3">

        {/* ════ LIST VIEW ════ */}
        {view === "list" && (
          <div className="flex flex-col h-full">
            {/* Search bar */}
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <Input placeholder="Search providers..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-[12.5px] border-gray-200 bg-white rounded-lg" />
              </div>
              <span className="text-[12px] text-gray-400">
                <b className="text-gray-600">{filtered.length}</b> provider{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-44 rounded-xl bg-white border border-gray-200 animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 py-20">
                  <Wrench className="h-10 w-10 opacity-20" />
                  <p className="text-[14px] font-medium text-gray-500">No providers found</p>
                  <p className="text-[12.5px]">Add your first service provider</p>
                  <Button size="sm" onClick={() => setView("add")}
                    className="mt-2 h-8 px-4 text-[12.5px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />Add Provider
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-3">
                  {filtered.map((p, i) => (
                    <ProviderCard key={p.id} provider={p} idx={i} onReview={openReviews} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ ADD FORM VIEW ════ */}
        {view === "add" && (
          <div className="flex items-start justify-center pt-2 overflow-y-auto flex-1">
            <div className="w-full max-w-lg">

              {/* Form header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                    <Plus className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-[14px] font-bold text-gray-900 leading-tight">Add Service Provider</h2>
                    <p className="text-[11.5px] text-gray-400">Fill in provider details below</p>
                  </div>
                </div>
                <button onClick={() => setView("list")}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FInput id="code"    label="Provider Code" required value={providerCode} onChange={setProviderCode} />
                  <FInput id="name"    label="Full Name"     required value={name}         onChange={setName} />
                  <FInput id="type"    label="Service Type"  required value={serviceType}  onChange={setServiceType} />
                  <FInput id="mobile"  label="Mobile"        required value={mobile}        onChange={setMobile} type="tel" />
                  <FInput id="email"   label="Email Address"           value={emailId}      onChange={setEmailId} type="email" />
                  <div className="sm:col-span-2">
                    <FTextarea id="address" label="Address" value={adress} onChange={setAdress} />
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="flex gap-2.5">
                  <Button onClick={submitProvider} disabled={saving}
                    className="flex-1 h-9 text-[13px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm">
                    {saving ? "Saving…" : "Save Provider"}
                  </Button>
                  <Button variant="outline" onClick={() => setView("list")} disabled={saving}
                    className="flex-1 h-9 text-[13px] font-medium border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Review Dialog ── */}
      <ReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        provider={selectedProvider}
        reviews={reviews}
        onSubmit={submitReview}
      />
    </div>
  )
}
