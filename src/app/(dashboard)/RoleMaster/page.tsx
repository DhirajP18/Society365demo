"use client"

import { useEffect, useMemo, useState } from "react"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Pencil, Trash2, Plus, List, ShieldCheck, RefreshCw, X
} from "lucide-react"
import { toast } from "sonner"
import { getApiMessage } from "@/lib/getApiMessage"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = {
  roleId: number
  roleName: string
  description?: string
  isActive?: boolean
}

type SortConfig = { key: keyof Role; direction: "asc" | "desc" } | null

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RoleMasterPage() {
  const [roles,       setRoles]       = useState<Role[]>([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [isListView,  setIsListView]  = useState(true)

  // form state
  const [roleId,      setRoleId]      = useState<number | null>(null)
  const [name,        setName]        = useState("")
  const [description, setDescription] = useState("")

  // list state
  const [deleteId,    setDeleteId]    = useState<number | null>(null)
  const [search,      setSearch]      = useState("")
  const [pageSize,    setPageSize]    = useState(5)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig,  setSortConfig]  = useState<SortConfig>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadRoles = async () => {
    setLoading(true)
    try {
      const res = await api.get("RoleMaster/GetAll")
      const data: Role[] = res.data.result ?? []
      data.sort((a, b) => a.roleId - b.roleId)
      setRoles(data)
      setCurrentPage(1)
    } catch {
      toast.error("Failed to load roles")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRoles() }, [])

  // ── Sort ──────────────────────────────────────────────────────────────────

  const handleSort = (key: keyof Role) => {
    setSortConfig(cur => {
      if (cur?.key === key) return cur.direction === "asc" ? { key, direction: "desc" } : null
      return { key, direction: "asc" }
    })
    setCurrentPage(1)
  }

  const sortIcon = (key: keyof Role) => {
    if (sortConfig?.key !== key) return <span className="text-gray-200 ml-1">↕</span>
    return <span className="text-indigo-500 ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
  }

  // ── Filter + Sort + Paginate ──────────────────────────────────────────────

  const filtered = useMemo(() => {
    let r = [...roles]
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(x => `${x.roleName} ${x.description ?? ""}`.toLowerCase().includes(q))
    }
    if (sortConfig) {
      r.sort((a, b) => {
        const av = a[sortConfig.key], bv = b[sortConfig.key]
        if (av === undefined) return 1
        if (bv === undefined) return -1
        if (typeof av === "string" && typeof bv === "string")
          return sortConfig.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
        if (typeof av === "number" && typeof bv === "number")
          return sortConfig.direction === "asc" ? av - bv : bv - av
        return 0
      })
    }
    return r
  }, [roles, search, sortConfig])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged      = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage, pageSize])
  const from       = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to         = Math.min(currentPage * pageSize, filtered.length)

  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [totalPages])
  useEffect(() => { setCurrentPage(1) }, [search, pageSize])

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const saveRole = async () => {
    if (!name.trim()) return toast.error("Role Name is required")
    setSaving(true)
    try {
      const res = roleId === null
        ? await api.post("RoleMaster/Insert", { roleName: name.trim(), description: description.trim() || null, isActive: true })
        : await api.put("RoleMaster/Update",  { roleId, roleName: name.trim(), description: description.trim() || null, isActive: true })
      if (res.data?.isSuccess) { toast.success(res.data.resMsg); resetForm(); loadRoles() }
      else toast.error(res.data?.resMsg ?? "Operation failed")
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      const res = await api.delete(`RoleMaster/Delete/${deleteId}`)
      if (res.data?.isSuccess) { toast.success(res.data.resMsg); loadRoles() }
      else toast.error(res.data?.resMsg ?? "Delete failed")
    } catch (e) { toast.error(getApiMessage(e)) }
    finally { setDeleteId(null) }
  }

  const editRole = (role: Role) => {
    setRoleId(role.roleId); setName(role.roleName)
    setDescription(role.description ?? ""); setIsListView(false)
  }

  const resetForm = () => {
    setRoleId(null); setName(""); setDescription(""); setIsListView(true)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#f5f6fa]">

      {/* ── Toolbar ── */}
      <div className="bg-white border-b border-gray-200 px-5 pt-3 pb-0">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h1 className="text-[16px] font-bold text-gray-900 leading-tight flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              Role Master
            </h1>
            <p className="text-[11.5px] text-gray-400">Manage system roles and their permissions</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadRoles}
              className="h-7 px-2.5 text-[11.5px] gap-1.5 border-gray-200 text-gray-500">
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setIsListView(false) }}
              className="h-7 px-3 text-[11.5px] gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-3 w-3" />
              Add Role
            </Button>
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex items-end gap-0">
          {[
            { label: "List View",  icon: List,        value: true  },
            { label: roleId ? "Edit Role" : "Add Role", icon: roleId ? Pencil : Plus, value: false },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = isListView === tab.value
            return (
              <button key={String(tab.value)} onClick={() => { if (tab.value) resetForm(); else { setRoleId(null); setName(""); setDescription(""); setIsListView(false) } }}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-medium border-t border-l border-r transition-all rounded-t-lg",
                  isActive
                    ? "bg-white border-gray-200 text-gray-900 font-semibold border-b-white -mb-px z-10 relative"
                    : "bg-transparent border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}>
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-indigo-500" : "text-gray-400")} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden flex flex-col mx-4 my-3 bg-white rounded-xl border border-gray-200 shadow-sm">

        {/* ════════════════ LIST VIEW ════════════════ */}
        {isListView && (
          <>
            {/* Controls */}
            <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 shrink-0">
              <span className="text-[12px] text-gray-500 shrink-0">Show</span>
              <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                <SelectTrigger className="h-6 w-14 text-[11.5px] rounded border-gray-200 px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50, 100].map(n => (
                    <SelectItem key={n} value={String(n)} className="text-[12px]">{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[12px] text-gray-500 shrink-0">entries</span>

              <span className="text-[12px] text-gray-400 shrink-0">
                Showing <b className="text-gray-600">{from}</b>–<b className="text-gray-600">{to}</b> of <b className="text-gray-600">{filtered.length}</b>
              </span>

              <div className="relative ml-auto">
                <Input
                  placeholder="Search role..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                  className="pl-3 h-6 w-52 text-[12px] rounded border-gray-200 bg-gray-50"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1">
              <table className="w-full text-[12.5px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th onClick={() => handleSort("roleId")}
                      className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 cursor-pointer whitespace-nowrap w-16 select-none">
                      ID {sortIcon("roleId")}
                    </th>
                    <th onClick={() => handleSort("roleName")}
                      className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 cursor-pointer whitespace-nowrap select-none">
                      Role Name {sortIcon("roleName")}
                    </th>
                    <th onClick={() => handleSort("description")}
                      className="text-left px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 cursor-pointer whitespace-nowrap select-none">
                      Description {sortIcon("description")}
                    </th>
                    <th className="text-right px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap w-24">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading && Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {[1, 2, 3, 4].map(j => (
                        <td key={j} className="px-3 py-2.5">
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))}

                  {!loading && paged.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-14 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <ShieldCheck className="h-7 w-7 opacity-20" />
                          <p className="text-[13px] font-medium text-gray-500">No roles found</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loading && paged.map((role, idx) => (
                    <tr key={role.roleId}
                      className="border-b border-gray-50 hover:bg-indigo-50/20 transition-colors">

                      {/* ID */}
                      <td className="px-3 py-2 text-gray-400 font-mono text-[11.5px]">
                        #{role.roleId}
                      </td>

                      {/* Role Name */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-bold shrink-0",
                            ["bg-indigo-100 text-indigo-700","bg-violet-100 text-violet-700",
                             "bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700",
                             "bg-rose-100 text-rose-700","bg-sky-100 text-sky-700"][idx % 6]
                          )}>
                            {role.roleName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-800">{role.roleName}</span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-3 py-2 text-gray-500 max-w-[300px]">
                        <span className="block truncate">
                          {role.description || <span className="text-gray-300">—</span>}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <Button size="sm" variant="outline" onClick={() => editRole(role)}
                            className="h-6 w-6 p-0 rounded border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDeleteId(role.roleId)}
                            className="h-6 w-6 p-0 rounded border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-300">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && (
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
                    <Button key={page} size="sm" onClick={() => setCurrentPage(page)}
                      className={cn("h-6 w-6 p-0 text-[11px] rounded",
                        page === currentPage
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                          : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}>
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
            )}
          </>
        )}

        {/* ════════════════ FORM VIEW ════════════════ */}
        {!isListView && (
          <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-md">

              {/* Form Card Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                    {roleId ? <Pencil className="h-4 w-4 text-indigo-600" /> : <Plus className="h-4 w-4 text-indigo-600" />}
                  </div>
                  <div>
                    <h2 className="text-[14px] font-bold text-gray-900 leading-tight">
                      {roleId ? "Edit Role" : "Add New Role"}
                    </h2>
                    <p className="text-[11.5px] text-gray-400">
                      {roleId ? "Update role information below" : "Fill in the details to create a new role"}
                    </p>
                  </div>
                </div>
                <button onClick={resetForm}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Fields */}
              <div className="bg-gray-50/60 rounded-xl border border-gray-200 p-5 space-y-4">

                {/* Role Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="role-name" className="text-[12.5px] font-semibold text-gray-700">
                    Role Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="role-name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Admin, Editor, Viewer"
                    className="h-9 text-[13px] border-gray-200 bg-white focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 rounded-lg"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-[12.5px] font-semibold text-gray-700">
                    Description
                    <span className="ml-1 text-[11px] text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe this role's responsibilities or access level..."
                    rows={3}
                    className="text-[13px] resize-none border-gray-200 bg-white focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 rounded-lg"
                  />
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200" />

                {/* Buttons */}
                <div className="flex gap-2.5">
                  <Button onClick={saveRole} disabled={saving}
                    className="flex-1 h-9 text-[13px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm shadow-indigo-600/20">
                    {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    {roleId ? "Update Role" : "Create Role"}
                  </Button>
                  <Button variant="outline" onClick={resetForm} disabled={saving}
                    className="flex-1 h-9 text-[13px] font-medium border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg">
                    Cancel
                  </Button>
                </div>
              </div>

              {/* Helper note */}
              {!roleId && (
                <p className="text-center text-[11.5px] text-gray-400 mt-3">
                  Role will be active by default after creation.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl max-w-sm p-0 overflow-hidden gap-0">
          <AlertDialogHeader className="px-5 py-4 border-b bg-rose-50 border-rose-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
                <Trash2 className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-[14px] font-bold text-gray-900 leading-tight">
                  Delete Role?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[11.5px] text-gray-500 mt-0">
                  This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 py-4 gap-2 flex-row">
            <AlertDialogCancel className="flex-1 h-8 text-[12.5px] rounded-lg border-gray-200">
              Cancel
            </AlertDialogCancel>
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
