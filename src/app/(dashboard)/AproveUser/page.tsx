"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import api from "@/lib/api"
import { getApiMessage } from "@/lib/getApiMessage"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import {
  Search, UserCheck, UserX, Clock, UserMinus,
  ChevronLeft, ChevronRight, CheckCircle2,
  XCircle, ShieldOff, Users, RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

type StatusType = "PENDING" | "APPROVED" | "REJECTED" | "DEACTIVATED"
type ActionType = "REJECT" | "DEACTIVATE"

interface UserRow {
  id: number
  name: string
  emailId: string
  mobile: string
  floor: string
  flatName: string
  createdDate: string
  rejectReason?: string
}

const TABS: { value: StatusType; label: string; icon: React.FC<{ className?: string }>; active: string; count?: number }[] = [
  { value: "PENDING",     label: "Pending",     icon: Clock,     active: "bg-amber-500  text-white border-amber-500"   },
  { value: "APPROVED",    label: "Approved",    icon: UserCheck, active: "bg-emerald-600 text-white border-emerald-600" },
  { value: "REJECTED",    label: "Rejected",    icon: UserX,     active: "bg-rose-600   text-white border-rose-600"    },
  { value: "DEACTIVATED", label: "Deactivated", icon: UserMinus, active: "bg-slate-600  text-white border-slate-600"   },
]

const STATUS_BADGE: Record<StatusType, string> = {
  PENDING:     "bg-amber-50   text-amber-700  border border-amber-300",
  APPROVED:    "bg-emerald-50 text-emerald-700 border border-emerald-300",
  REJECTED:    "bg-rose-50    text-rose-700   border border-rose-300",
  DEACTIVATED: "bg-slate-100  text-slate-600  border border-slate-300",
}

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
]

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
}

export default function AdminUserApprovalPage() {
  const [users,       setUsers]       = useState<UserRow[]>([])
  const [status,      setStatus]      = useState<StatusType>("PENDING")
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState("")
  const [pageSize,    setPageSize]    = useState(5)
  const [currentPage, setCurrentPage] = useState(1)
  const [openDialog,     setOpenDialog]     = useState(false)
  const [actionType,     setActionType]     = useState<ActionType>("REJECT")
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [reason,         setReason]         = useState("")
  const [actionLoading,  setActionLoading]  = useState(false)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get<{ result: UserRow[] }>("/AdminUserApprove/GetUsersByStatus", { params: { status } })
      setUsers(res.data.result ?? [])
    } catch (err) { toast.error(getApiMessage(err)) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadUsers() }, [status])

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

  const handleApprove = async (userId: number) => {
    try {
      await api.post("/AdminUserApprove/ApproveUser", { userId })
      toast.success("User approved")
      loadUsers()
    } catch (err) { toast.error(getApiMessage(err)) }
  }

  const openReasonDialog = (userId: number, type: ActionType) => {
    setSelectedUserId(userId); setActionType(type); setReason(""); setOpenDialog(true)
  }

  const confirmAction = async () => {
    if (!reason.trim() || !selectedUserId) return toast.error("Reason is required")
    setActionLoading(true)
    try {
      await api.post(
        actionType === "REJECT" ? "/AdminUserApprove/RejectUser" : "/AdminUserApprove/DeactivateUser",
        { userId: selectedUserId, reason }
      )
      toast.success(actionType === "REJECT" ? "User rejected" : "User deactivated")
      setOpenDialog(false); loadUsers()
    } catch (err) { toast.error(getApiMessage(err)) }
    finally { setActionLoading(false) }
  }

  const from = filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to   = Math.min(currentPage * pageSize, filteredUsers.length)

  return (
    // NO top padding — starts flush below header
    <div className="flex flex-col h-full bg-[#f5f6fa]">

      {/* ── Toolbar Bar (Page title + tabs + actions all in ONE bar) ── */}
      <div className="bg-white border-b border-gray-200 px-5 pt-3 pb-0">

        {/* Top row: title + refresh */}
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h1 className="text-[16px] font-bold text-gray-900 leading-tight">User Approval</h1>
            <p className="text-[11.5px] text-gray-400">Manage pending, approved, rejected &amp; deactivated users</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadUsers}
            className="h-7 px-2.5 text-[11.5px] gap-1.5 border-gray-200 text-gray-500">
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Tabs — flush to bottom of toolbar, no bottom border on active */}
        <div className="flex items-end gap-0">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = status === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setStatus(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-medium border-t border-l border-r transition-all duration-100 rounded-t-lg",
                  isActive
                    ? "bg-white border-gray-200 text-gray-900 font-semibold border-b-white -mb-px z-10 relative"
                    : "bg-transparent border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-indigo-500" : "text-gray-400")} />
                {tab.label}
                {isActive && (
                  <span className="ml-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0">
                    {filteredUsers.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="flex-1 overflow-hidden flex flex-col mx-4 my-3 bg-white rounded-xl border border-gray-200 shadow-sm">

        {/* Controls row — tight, inside the card */}
        <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100">
          <span className="text-[12px] text-gray-500 shrink-0">Show</span>
          <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
            <SelectTrigger className="h-6 w-14 text-[11.5px] rounded border-gray-200 px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map(n => (
                <SelectItem key={n} value={String(n)} className="text-[12px]">{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[12px] text-gray-500 shrink-0">entries</span>

          <span className="text-[12px] text-gray-400 shrink-0">
            Showing <b className="text-gray-600">{from}</b>–<b className="text-gray-600">{to}</b> of <b className="text-gray-600">{filteredUsers.length}</b>
          </span>

          <div className="relative ml-auto">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search name, email, mobile…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 h-6 w-52 text-[12px] rounded border-gray-200 bg-gray-50"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-[12.5px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">User</th>
                <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">Contact</th>
                <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">Flat</th>
                <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">Status</th>
                <th className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">Reason</th>
                <th className="text-right px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5">
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}

              {!loading && pagedUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-7 w-7 opacity-25" />
                      <p className="text-[13px] font-medium text-gray-500">No {status.toLowerCase()} users</p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && pagedUsers.map((user, idx) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-50 hover:bg-indigo-50/20 transition-colors"
                >
                  {/* User */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className={cn("text-[9px] font-bold", AVATAR_COLORS[idx % AVATAR_COLORS.length])}>
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 leading-tight truncate">{user.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{user.emailId}</p>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{user.mobile}</td>

                  {/* Flat */}
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-0.5 bg-gray-100 rounded px-2 py-0.5 text-[11.5px] text-gray-600 whitespace-nowrap">
                      {user.floor} <span className="text-gray-300 mx-0.5">/</span> {user.flatName}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold", STATUS_BADGE[status])}>
                      {status}
                    </span>
                  </td>

                  {/* Reason */}
                  <td className="px-3 py-2 max-w-[150px]">
                    {user.rejectReason
                      ? <span className="text-[11px] text-rose-500 truncate block max-w-[130px]">{user.rejectReason}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1 justify-end">
                      {(status === "PENDING" || status === "REJECTED") && (
                        <Button size="sm" onClick={() => handleApprove(user.id)}
                          className="h-6 px-2 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded">
                          <CheckCircle2 className="h-2.5 w-2.5" />Approve
                        </Button>
                      )}
                      {status === "PENDING" && (
                        <Button size="sm" variant="outline" onClick={() => openReasonDialog(user.id, "REJECT")}
                          className="h-6 px-2 text-[11px] gap-1 border-rose-200 text-rose-600 hover:bg-rose-50 rounded">
                          <XCircle className="h-2.5 w-2.5" />Reject
                        </Button>
                      )}
                      {status === "APPROVED" && (
                        <Button size="sm" variant="outline" onClick={() => openReasonDialog(user.id, "DEACTIVATE")}
                          className="h-6 px-2 text-[11px] gap-1 border-slate-200 text-slate-600 hover:bg-slate-50 rounded">
                          <ShieldOff className="h-2.5 w-2.5" />Deactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <span className="text-[11.5px] text-gray-400">
            Page <b className="text-gray-600">{currentPage}</b> of <b className="text-gray-600">{totalPages}</b>
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="h-6 w-6 p-0 rounded border-gray-200">
              <ChevronLeft className="h-3 w-3" />
            </Button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
              <Button key={page} size="sm"
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "h-6 w-6 p-0 text-[11px] rounded",
                  page === currentPage
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                )}>
                {page}
              </Button>
            ))}

            <Button variant="outline" size="sm" disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="h-6 w-6 p-0 rounded border-gray-200">
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Reason Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-sm rounded-xl p-0 overflow-hidden gap-0">
          <DialogHeader className={cn(
            "px-5 py-3.5 border-b",
            actionType === "REJECT" ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100"
          )}>
            <div className="flex items-center gap-2.5">
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg",
                actionType === "REJECT" ? "bg-rose-100" : "bg-slate-100")}>
                {actionType === "REJECT"
                  ? <XCircle className="h-4 w-4 text-rose-600" />
                  : <ShieldOff className="h-4 w-4 text-slate-600" />}
              </div>
              <div>
                <DialogTitle className="text-[14px] font-bold text-gray-900">
                  {actionType === "REJECT" ? "Reject User" : "Deactivate User"}
                </DialogTitle>
                <p className="text-[11.5px] text-gray-400">
                  {actionType === "REJECT" ? "User will be rejected and notified." : "User will lose access immediately."}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 py-4">
            <p className="text-[12px] font-semibold text-gray-700 mb-1.5">Reason <span className="text-rose-500">*</span></p>
            <Textarea
              placeholder="Enter reason…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="text-[13px] resize-none rounded-lg border-gray-200"
            />
          </div>

          <DialogFooter className="px-5 pb-4 gap-2 flex-row">
            <Button variant="outline" onClick={() => setOpenDialog(false)}
              className="flex-1 rounded-lg text-[12.5px] h-8 border-gray-200">Cancel</Button>
            <Button onClick={confirmAction} disabled={actionLoading || !reason.trim()}
              className={cn("flex-1 rounded-lg text-[12.5px] h-8 font-semibold",
                actionType === "REJECT"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-slate-700 hover:bg-slate-800 text-white")}>
              {actionLoading ? "Processing…" : actionType === "REJECT" ? "Confirm Reject" : "Confirm Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
