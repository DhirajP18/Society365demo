"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import {
  Search, UserCheck, UserX, Clock, UserMinus,
  ChevronLeft, ChevronRight, CheckCircle2,
  XCircle, ShieldOff, Users, RefreshCw,
  ShieldCheck, ChevronDown, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────
type StatusType = "PENDING" | "APPROVED" | "REJECTED" | "DEACTIVATED"
type ActionType = "REJECT" | "DEACTIVATE"

interface UserRow {
  id:            number
  name:          string
  emailId:       string
  mobile:        string
  floor:         string
  flatName:      string
  createdDate:   string
  rejectReason?: string
  roleId?:       number
  roleName?:     string
}

interface RoleOption {
  roleId:   number
  roleName: string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TABS = [
  { value: "PENDING"     as StatusType, label: "Pending",     icon: Clock     },
  { value: "APPROVED"    as StatusType, label: "Approved",    icon: UserCheck },
  { value: "REJECTED"    as StatusType, label: "Rejected",    icon: UserX     },
  { value: "DEACTIVATED" as StatusType, label: "Deactivated", icon: UserMinus },
]

const STATUS_BADGE: Record<StatusType, string> = {
  PENDING:     "bg-amber-50   text-amber-700   border border-amber-200",
  APPROVED:    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  REJECTED:    "bg-rose-50    text-rose-700    border border-rose-200",
  DEACTIVATED: "bg-slate-100  text-slate-500   border border-slate-200",
}

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
]

const getInitials = (name: string) =>
  name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()

// ── Change Role Modal ─────────────────────────────────────────────────────────
function ChangeRoleModal({
  open, onClose,
  user, roles,
  onChanged,
}: {
  open: boolean
  onClose: () => void
  user: UserRow | null
  roles: RoleOption[]
  onChanged: () => void
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("")
  const [saving, setSaving] = useState(false)

  // Pre-select current role when modal opens
  useEffect(() => {
    if (open && user?.roleId) setSelectedRoleId(String(user.roleId))
    else setSelectedRoleId("")
  }, [open, user])

  const currentRole = roles.find(r => r.roleId === user?.roleId)
  const newRole     = roles.find(r => r.roleId === Number(selectedRoleId))
  const unchanged   = Number(selectedRoleId) === user?.roleId

  const handleSave = async () => {
    if (!user || !selectedRoleId || unchanged) return
    setSaving(true)
    try {
      const r = await api.post<{ isSuccess?: boolean; resMsg?: string }>(
        "/AdminUserApprove/ChangeRole",
        { userId: user.id, roleId: Number(selectedRoleId) }
      )
      if (r.data?.isSuccess) {
        toast.success(r.data.resMsg ?? "Role updated!")
        onChanged()
        onClose()
      } else {
        toast.error(r.data?.resMsg ?? "Failed to update role")
      }
    } catch (err: unknown) {
      toast.error(getApiMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm rounded-2xl p-0 overflow-hidden gap-0
        border border-slate-200 dark:border-slate-700 shadow-xl">

        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-slate-100 dark:border-slate-800
          bg-violet-50 dark:bg-violet-500/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20
              flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <DialogTitle className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
                Change Role
              </DialogTitle>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                {user?.name}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">

          {/* Current role chip */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl
            bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-[11.5px] text-slate-400 font-medium">Current Role</span>
            <span className="text-[12.5px] font-bold text-slate-700 dark:text-slate-300">
              {currentRole?.roleName ?? "—"}
            </span>
          </div>

          {/* Role selector */}
          <div className="space-y-1.5">
            <label className="text-[11.5px] font-bold uppercase tracking-widest text-slate-400">
              Assign New Role
            </label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-800 text-[13px] text-slate-800 dark:text-slate-200
                focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400">
                <SelectValue placeholder="Select a role…" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700">
                {roles.map(r => (
                  <SelectItem key={r.roleId} value={String(r.roleId)}
                    className="text-[13px] rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-md bg-violet-100 dark:bg-violet-500/20
                        flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                      </div>
                      {r.roleName}
                      {r.roleId === user?.roleId && (
                        <span className="ml-1 text-[10px] font-bold text-violet-500">(current)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Change preview */}
          {selectedRoleId && !unchanged && newRole && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl
              bg-violet-50 dark:bg-violet-500/10
              border border-violet-200 dark:border-violet-500/20">
              <ShieldCheck className="h-4 w-4 text-violet-500 shrink-0" />
              <p className="text-[12px] text-violet-700 dark:text-violet-400">
                Role will change from{" "}
                <span className="font-bold">{currentRole?.roleName ?? "—"}</span>
                {" "}to{" "}
                <span className="font-bold">{newRole.roleName}</span>
              </p>
            </div>
          )}

          {unchanged && selectedRoleId && (
            <p className="text-[12px] text-slate-400 text-center">
              This is already the current role.
            </p>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 pb-5 gap-2 flex-row">
          <Button variant="outline" onClick={onClose}
            className="flex-1 h-10 rounded-xl text-[12.5px] border-slate-200 dark:border-slate-700">
            Cancel
          </Button>
          <Button onClick={handleSave}
            disabled={saving || !selectedRoleId || unchanged}
            className="flex-1 h-10 rounded-xl text-[12.5px] font-bold
              bg-violet-600 hover:bg-violet-500 text-white
              shadow-[0_4px_14px_rgba(124,58,237,0.25)]
              disabled:opacity-50 disabled:cursor-not-allowed">
            {saving
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving…</>
              : "Save Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminUserApprovalPage() {
  const [users,        setUsers]        = useState<UserRow[]>([])
  const [roles,        setRoles]        = useState<RoleOption[]>([])
  const [status,       setStatus]       = useState<StatusType>("PENDING")
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState("")
  const [pageSize,     setPageSize]     = useState(5)
  const [currentPage,  setCurrentPage]  = useState(1)

  // Reason dialog (reject / deactivate)
  const [openDialog,      setOpenDialog]      = useState(false)
  const [actionType,      setActionType]      = useState<ActionType>("REJECT")
  const [selectedUserId,  setSelectedUserId]  = useState<number | null>(null)
  const [reason,          setReason]          = useState("")
  const [actionLoading,   setActionLoading]   = useState(false)

  // Change role modal
  const [roleModalUser, setRoleModalUser] = useState<UserRow | null>(null)

  // ── Load roles once ──────────────────────────────────────────────────────
  useEffect(() => {
    api.get<{ result: RoleOption[] }>("/AdminUserApprove/GetRoles")
      .then(r => setRoles(r.data?.result ?? []))
      .catch(() => { /* roles optional, no toast */ })
  }, [])

  // ── Load users ────────────────────────────────────────────────────────────
  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get<{ result: UserRow[] }>(
        "/AdminUserApprove/GetUsersByStatus", { params: { status } }
      )
      setUsers(res.data.result ?? [])
    } catch (err: unknown) { toast.error(getApiMessage(err)) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadUsers() }, [status])

  // ── Filter + paginate ─────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.emailId.toLowerCase().includes(q) ||
      u.mobile.includes(q)
    )
  }, [users, search])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const pagedUsers = useMemo(() => {
    const s = (currentPage - 1) * pageSize
    return filteredUsers.slice(s, s + pageSize)
  }, [filteredUsers, currentPage, pageSize])

  useEffect(() => { setCurrentPage(1) }, [search, status, pageSize])

  // ── Approve ───────────────────────────────────────────────────────────────
  const handleApprove = async (userId: number) => {
    try {
      await api.post("/AdminUserApprove/ApproveUser", { userId })
      toast.success("User approved successfully")
      loadUsers()
    } catch (err: unknown) { toast.error(getApiMessage(err)) }
  }

  // ── Reject / Deactivate ───────────────────────────────────────────────────
  const openReasonDialog = (userId: number, type: ActionType) => {
    setSelectedUserId(userId); setActionType(type); setReason(""); setOpenDialog(true)
  }

  const confirmAction = async () => {
    if (!reason.trim() || !selectedUserId) return toast.error("Reason is required")
    setActionLoading(true)
    try {
      await api.post(
        actionType === "REJECT"
          ? "/AdminUserApprove/RejectUser"
          : "/AdminUserApprove/DeactivateUser",
        { userId: selectedUserId, reason }
      )
      toast.success(actionType === "REJECT" ? "User rejected" : "User deactivated")
      setOpenDialog(false)
      loadUsers()
    } catch (err: unknown) { toast.error(getApiMessage(err)) }
    finally { setActionLoading(false) }
  }

  const from = filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to   = Math.min(currentPage * pageSize, filteredUsers.length)

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">

      {/* ══ TOOLBAR ══════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 pt-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-[16px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
              User Management
            </h1>
            <p className="text-[11.5px] text-slate-400 mt-0.5">
              Manage pending, approved, rejected &amp; deactivated users · assign roles
            </p>
          </div>
          <button onClick={loadUsers}
            className="flex items-center gap-1.5 h-8 px-3 rounded-xl border text-[12px] font-medium
              border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400
              hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-end gap-0">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = status === tab.value
            return (
              <button key={tab.value} onClick={() => setStatus(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-[12.5px] font-medium transition-all",
                  "border-t border-l border-r rounded-t-xl",
                  isActive
                    ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-semibold -mb-px z-10 relative border-b-white dark:border-b-slate-900"
                    : "bg-transparent border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}>
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-violet-500" : "text-slate-400")} />
                {tab.label}
                {isActive && filteredUsers.length > 0 && (
                  <span className="ml-1 rounded-full bg-violet-100 dark:bg-violet-500/20
                    text-violet-700 dark:text-violet-400 text-[10px] font-bold px-1.5">
                    {filteredUsers.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══ TABLE CARD ══════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-hidden flex flex-col m-4
        bg-white dark:bg-slate-900
        rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">

        {/* Controls */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
          <span className="text-[12px] text-slate-400">Show</span>
          <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
            <SelectTrigger className="h-7 w-14 text-[11.5px] rounded-lg border-slate-200 dark:border-slate-700 px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map(n => (
                <SelectItem key={n} value={String(n)} className="text-[12px]">{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[12px] text-slate-400">entries</span>

          <span className="text-[12px] text-slate-400 hidden sm:block">
            Showing <b className="text-slate-600 dark:text-slate-300">{from}</b>–<b className="text-slate-600 dark:text-slate-300">{to}</b>{" "}
            of <b className="text-slate-600 dark:text-slate-300">{filteredUsers.length}</b>
          </span>

          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input placeholder="Search name, email, mobile…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 h-7 w-48 sm:w-56 text-[12px] rounded-lg
                border-slate-200 dark:border-slate-700
                bg-slate-50 dark:bg-slate-800" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-[12.5px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                {["User", "Contact", "Flat / Floor", "Role", "Status", "Reason", "Actions"].map(h => (
                  <th key={h} className={cn(
                    "px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap",
                    h === "Actions" ? "text-right" : "text-left"
                  )}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Skeleton */}
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Empty */}
              {!loading && pagedUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2.5">
                      <Users className="h-8 w-8 text-slate-200 dark:text-slate-700" />
                      <p className="text-[13px] font-semibold text-slate-400">
                        No {status.toLowerCase()} users found
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Rows */}
              {!loading && pagedUsers.map((user, idx) => (
                <tr key={user.id}
                  className="border-b border-slate-50 dark:border-slate-800
                    hover:bg-violet-50/30 dark:hover:bg-violet-500/[0.04] transition-colors">

                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className={cn("text-[9px] font-bold", AVATAR_COLORS[idx % AVATAR_COLORS.length])}>
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate">
                          {user.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{user.emailId}</p>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {user.mobile}
                  </td>

                  {/* Flat/Floor */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1
                      bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1
                      text-[11.5px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {user.flatName || "—"}
                      {user.floor && <><span className="text-slate-300 dark:text-slate-600 mx-0.5">/</span>{user.floor}</>}
                    </span>
                  </td>

                  {/* Role — clickable to change */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setRoleModalUser(user)}
                      title="Click to change role"
                      className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                        bg-violet-50 dark:bg-violet-500/10
                        border border-violet-200 dark:border-violet-500/20
                        text-[11.5px] font-semibold text-violet-700 dark:text-violet-400
                        hover:bg-violet-100 dark:hover:bg-violet-500/20
                        transition-all whitespace-nowrap">
                      <ShieldCheck className="h-3 w-3 shrink-0" />
                      {user.roleName ?? "—"}
                      <ChevronDown className="h-3 w-3 text-violet-400 group-hover:text-violet-600 transition-colors" />
                    </button>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold",
                      STATUS_BADGE[status]
                    )}>
                      {status}
                    </span>
                  </td>

                  {/* Reason */}
                  <td className="px-4 py-3 max-w-[140px]">
                    {user.rejectReason
                      ? <span className="text-[11px] text-rose-500 truncate block max-w-[120px]" title={user.rejectReason}>
                          {user.rejectReason}
                        </span>
                      : <span className="text-slate-200 dark:text-slate-700">—</span>}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 justify-end flex-wrap">
                      {(status === "PENDING" || status === "REJECTED") && (
                        <button onClick={() => handleApprove(user.id)}
                          className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-bold
                            bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">
                          <CheckCircle2 className="h-3 w-3" />Approve
                        </button>
                      )}
                      {status === "PENDING" && (
                        <button onClick={() => openReasonDialog(user.id, "REJECT")}
                          className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-bold
                            border border-rose-200 dark:border-rose-500/30
                            text-rose-600 dark:text-rose-400
                            hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                          <XCircle className="h-3 w-3" />Reject
                        </button>
                      )}
                      {status === "APPROVED" && (
                        <button onClick={() => openReasonDialog(user.id, "DEACTIVATE")}
                          className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-bold
                            border border-slate-200 dark:border-slate-600
                            text-slate-600 dark:text-slate-400
                            hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <ShieldOff className="h-3 w-3" />Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2.5
          border-t border-slate-100 dark:border-slate-800
          bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <span className="text-[11.5px] text-slate-400">
            Page <b className="text-slate-600 dark:text-slate-300">{currentPage}</b>{" "}
            of <b className="text-slate-600 dark:text-slate-300">{totalPages}</b>
          </span>
          <div className="flex items-center gap-1">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
              className="h-7 w-7 flex items-center justify-center rounded-lg border
                border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400
                disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
              <button key={page} onClick={() => setCurrentPage(page)}
                className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-lg text-[11.5px] font-bold transition-all",
                  page === currentPage
                    ? "bg-violet-600 text-white shadow-sm"
                    : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}>
                {page}
              </button>
            ))}

            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
              className="h-7 w-7 flex items-center justify-center rounded-lg border
                border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400
                disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ══ CHANGE ROLE MODAL ═══════════════════════════════════════════════ */}
      <ChangeRoleModal
        open={roleModalUser !== null}
        onClose={() => setRoleModalUser(null)}
        user={roleModalUser}
        roles={roles}
        onChanged={loadUsers}
      />

      {/* ══ REJECT / DEACTIVATE DIALOG ══════════════════════════════════════ */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-0 overflow-hidden gap-0
          border border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader className={cn("px-5 py-4 border-b",
            actionType === "REJECT"
              ? "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20"
              : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700")}>
            <div className="flex items-center gap-3">
              <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center",
                actionType === "REJECT"
                  ? "bg-rose-100 dark:bg-rose-500/20"
                  : "bg-slate-200 dark:bg-slate-700")}>
                {actionType === "REJECT"
                  ? <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  : <ShieldOff className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
              </div>
              <div>
                <DialogTitle className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
                  {actionType === "REJECT" ? "Reject User" : "Deactivate User"}
                </DialogTitle>
                <p className="text-[11.5px] text-slate-400">
                  {actionType === "REJECT"
                    ? "User will be rejected and notified."
                    : "User will lose access immediately."}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 py-4">
            <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Reason <span className="text-rose-500">*</span>
            </p>
            <Textarea placeholder="Enter reason…" value={reason}
              onChange={e => setReason(e.target.value)} rows={3}
              className="text-[13px] resize-none rounded-xl
                border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-800" />
          </div>

          <DialogFooter className="px-5 pb-5 gap-2 flex-row">
            <Button variant="outline" onClick={() => setOpenDialog(false)}
              className="flex-1 h-9 rounded-xl text-[12.5px] border-slate-200 dark:border-slate-700">
              Cancel
            </Button>
            <Button onClick={confirmAction} disabled={actionLoading || !reason.trim()}
              className={cn("flex-1 h-9 rounded-xl text-[12.5px] font-bold",
                actionType === "REJECT"
                  ? "bg-rose-600 hover:bg-rose-500 text-white"
                  : "bg-slate-700 hover:bg-slate-600 text-white")}>
              {actionLoading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Processing…</>
                : actionType === "REJECT" ? "Confirm Reject" : "Confirm Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}