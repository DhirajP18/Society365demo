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
  ChevronLeft, ChevronRight, Loader2, Pencil, Trash2,
  Plus, List, ShieldCheck, RefreshCw, X,
} from "lucide-react"
import { toast } from "sonner"
import { getApiMessage } from "@/lib/getApiMessage"
import { cn } from "@/lib/utils"

type Role = {
  roleId: number
  roleName: string
  description?: string
  isActive?: boolean
}

type SortConfig = { key: keyof Role; direction: "asc" | "desc" } | null

export default function RoleMasterPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isListView, setIsListView] = useState(true)

  const [roleId, setRoleId] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<SortConfig>(null)

  const loadRoles = async () => {
    setLoading(true)
    try {
      const res = await api.get("RoleMaster/GetAll")
      const data: Role[] = res.data?.result ?? []
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

  const handleSort = (key: keyof Role) => {
    setSortConfig(cur => {
      if (cur?.key === key) return cur.direction === "asc" ? { key, direction: "desc" } : null
      return { key, direction: "asc" }
    })
    setCurrentPage(1)
  }

  const sortIcon = (key: keyof Role) => {
    if (sortConfig?.key !== key) return <span className="text-gray-300 dark:text-gray-600 ml-1">↕</span>
    return <span className="text-teal-600 dark:text-teal-400 ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
  }

  const filtered = useMemo(() => {
    let r = [...roles]
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(x => `${x.roleName} ${x.description ?? ""}`.toLowerCase().includes(q))
    }
    if (sortConfig) {
      r.sort((a, b) => {
        const av = a[sortConfig.key]
        const bv = b[sortConfig.key]
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
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  )
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, filtered.length)

  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [totalPages, currentPage])
  useEffect(() => { setCurrentPage(1) }, [search, pageSize])

  const saveRole = async () => {
    if (!name.trim()) return toast.error("Role Name is required")
    setSaving(true)
    try {
      const res = roleId === null
        ? await api.post("RoleMaster/Insert", { roleName: name.trim(), description: description.trim() || null, isActive: true })
        : await api.put("RoleMaster/Update", { roleId, roleName: name.trim(), description: description.trim() || null, isActive: true })
      if (res.data?.isSuccess) {
        toast.success(res.data.resMsg ?? "Saved")
        resetForm()
        loadRoles()
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
      const res = await api.delete(`RoleMaster/Delete/${deleteId}`)
      if (res.data?.isSuccess) {
        toast.success(res.data.resMsg ?? "Deleted")
        loadRoles()
      } else toast.error(res.data?.resMsg ?? "Delete failed")
    } catch (e) {
      toast.error(getApiMessage(e))
    } finally {
      setDeleteId(null)
    }
  }

  const editRole = (role: Role) => {
    setRoleId(role.roleId)
    setName(role.roleName)
    setDescription(role.description ?? "")
    setIsListView(false)
  }

  const resetForm = () => {
    setRoleId(null)
    setName("")
    setDescription("")
    setIsListView(true)
  }

  return (
    <div className="flex flex-col h-full bg-[#f3f6fa] dark:bg-[#070b10]">
      <div className="bg-white dark:bg-[#0d1017] border-b border-gray-200 dark:border-white/[0.06] px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl border border-teal-200 dark:border-teal-500/25 bg-teal-100 dark:bg-teal-500/10 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-[15px] sm:text-[17px] font-bold text-gray-900 dark:text-white">Role Master</h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block">Manage roles with full light and dark mode support</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadRoles}
              className="h-8 px-3 text-[11.5px] gap-1.5 border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-300 bg-white dark:bg-transparent rounded-xl"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => { setRoleId(null); setName(""); setDescription(""); setIsListView(false) }}
              className="h-8 px-3 text-[11.5px] gap-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Role
            </Button>
          </div>
        </div>

        <div className="flex items-end gap-0 mt-3 -mb-px">
          {[
            { label: "List View", icon: List, value: true },
            { label: roleId ? "Edit Role" : "Add Role", icon: roleId ? Pencil : Plus, value: false },
          ].map(tab => {
            const Icon = tab.icon
            const active = isListView === tab.value
            return (
              <button
                key={String(tab.value)}
                onClick={() => {
                  if (tab.value) resetForm()
                  else { setRoleId(null); setName(""); setDescription(""); setIsListView(false) }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 border-b-2 text-[12px] font-semibold transition-all",
                  active
                    ? "border-teal-500 text-teal-600 dark:text-teal-400"
                    : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
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
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/80 dark:bg-white/[0.02]">
                <span className="text-[12px] text-gray-500 dark:text-gray-400">Show</span>
                <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-16 text-[12px] rounded-lg border-gray-200 dark:border-white/[0.08]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5,10,20,50,100].map(n => <SelectItem key={n} value={String(n)} className="text-[12px]">{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-[12px] text-gray-500 dark:text-gray-400">entries</span>
                <span className="text-[12px] text-gray-400 dark:text-gray-500">
                  Showing <b className="text-gray-700 dark:text-gray-200">{from}</b>-<b className="text-gray-700 dark:text-gray-200">{to}</b> of <b className="text-gray-700 dark:text-gray-200">{filtered.length}</b>
                </span>
                <Input
                  placeholder="Search role..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="ml-auto h-8 w-56 text-[12px] rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121722]"
                />
              </div>

              <div className="overflow-auto h-[calc(100%-108px)]">
                <table className="w-full text-[12.5px] border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50 dark:bg-white/[0.04] border-b border-gray-200 dark:border-white/[0.08]">
                      <th onClick={() => handleSort("roleId")} className="text-left px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 cursor-pointer w-16">ID {sortIcon("roleId")}</th>
                      <th onClick={() => handleSort("roleName")} className="text-left px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 cursor-pointer">Role Name {sortIcon("roleName")}</th>
                      <th onClick={() => handleSort("description")} className="text-left px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 cursor-pointer">Description {sortIcon("description")}</th>
                      <th className="text-right px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-white/[0.04]">
                        {[1,2,3,4].map(j => <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 dark:bg-white/[0.06] rounded animate-pulse w-3/4" /></td>)}
                      </tr>
                    ))}

                    {!loading && paged.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-16 text-center text-gray-400 dark:text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <ShieldCheck className="h-7 w-7 opacity-30" />
                            <p className="text-[13px] font-medium">No roles found</p>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!loading && paged.map((role, idx) => (
                      <tr key={role.roleId} className="border-b border-gray-100 dark:border-white/[0.04] hover:bg-teal-50/40 dark:hover:bg-teal-500/5 transition-colors">
                        <td className="px-4 py-3 text-gray-400 dark:text-gray-500 font-mono text-[11.5px]">#{role.roleId}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-7 w-7 rounded-md text-[9px] font-bold flex items-center justify-center",
                              ["bg-teal-100 text-teal-700","bg-cyan-100 text-cyan-700","bg-indigo-100 text-indigo-700","bg-amber-100 text-amber-700","bg-rose-100 text-rose-700","bg-emerald-100 text-emerald-700"][idx % 6]
                            )}>
                              {role.roleName.slice(0,2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">{role.roleName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[360px]">
                          <span className="block truncate">{role.description || <span className="text-gray-300 dark:text-gray-600">-</span>}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => editRole(role)} className="h-7 w-7 p-0 rounded-lg border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setDeleteId(role.roleId)} className="h-7 w-7 p-0 rounded-lg border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400">
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
                <div className="h-12 px-4 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/80 dark:bg-white/[0.02] flex items-center justify-between">
                  <span className="text-[11.5px] text-gray-500 dark:text-gray-400">
                    Page <b className="text-gray-700 dark:text-gray-200">{currentPage}</b> of <b className="text-gray-700 dark:text-gray-200">{totalPages}</b>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-7 w-7 p-0 rounded-lg border-gray-200 dark:border-white/[0.08]">
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={cn("h-7 w-7 p-0 rounded-lg text-[11px]",
                          page === currentPage
                            ? "bg-teal-600 hover:bg-teal-500 text-white"
                            : "bg-white dark:bg-transparent border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-gray-300"
                        )}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-7 w-7 p-0 rounded-lg border-gray-200 dark:border-white/[0.08]">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full overflow-auto p-6 flex items-start justify-center">
              <div className="w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-teal-100 dark:bg-teal-500/10 flex items-center justify-center border border-teal-200 dark:border-teal-500/25">
                      {roleId ? <Pencil className="h-4 w-4 text-teal-600 dark:text-teal-400" /> : <Plus className="h-4 w-4 text-teal-600 dark:text-teal-400" />}
                    </div>
                    <div>
                      <h2 className="text-[14px] font-bold text-gray-900 dark:text-white">{roleId ? "Edit Role" : "Add New Role"}</h2>
                      <p className="text-[11.5px] text-gray-400 dark:text-gray-500">{roleId ? "Update role details" : "Create a new role"}</p>
                    </div>
                  </div>
                  <button onClick={resetForm} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/70 dark:bg-white/[0.02] p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="role-name" className="text-[12.5px] font-semibold text-gray-700 dark:text-gray-200">
                      Role Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="role-name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Admin, Manager, Viewer"
                      className="h-9 text-[13px] rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121722] focus-visible:ring-teal-500/30 focus-visible:border-teal-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-[12.5px] font-semibold text-gray-700 dark:text-gray-200">
                      Description <span className="text-[11px] text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Describe role permissions..."
                      className="text-[13px] resize-none rounded-lg border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121722] focus-visible:ring-teal-500/30 focus-visible:border-teal-400"
                    />
                  </div>

                  <div className="h-px bg-gray-200 dark:bg-white/[0.08]" />

                  <div className="flex gap-2.5">
                    <Button onClick={saveRole} disabled={saving} className="flex-1 h-9 text-[13px] font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white">
                      {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      {roleId ? "Update Role" : "Create Role"}
                    </Button>
                    <Button variant="outline" onClick={resetForm} disabled={saving} className="flex-1 h-9 text-[13px] rounded-lg border-gray-200 dark:border-white/[0.08]">
                      Cancel
                    </Button>
                  </div>
                </div>

                {!roleId && (
                  <p className="text-center text-[11.5px] text-gray-400 dark:text-gray-500 mt-3">
                    New role is created as active by default.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-4 sm:mx-auto p-0 gap-0 overflow-hidden bg-white dark:bg-[#141820] border border-gray-200 dark:border-white/[0.08]">
          <AlertDialogHeader className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] bg-rose-50 dark:bg-rose-500/10">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-[14px] font-bold text-gray-900 dark:text-white">Delete Role?</AlertDialogTitle>
                <AlertDialogDescription className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-0">This action cannot be undone.</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 py-4 gap-2 flex-row">
            <AlertDialogCancel className="flex-1 h-9 text-[12.5px] rounded-lg border-gray-200 dark:border-white/[0.08]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="flex-1 h-9 text-[12.5px] font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
