"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Role, ModuleWithMenus } from "@/types/role-menu"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Shield, Save, Eye, Plus, Pencil, Trash2,
  ChevronDown, ChevronRight, RefreshCw, ShieldCheck,
  LayoutGrid, Lock, Unlock, Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Permission Switch ────────────────────────────────────────────────────────

const permMeta = {
  canView:   { label: "View",   icon: Eye,    active: "text-sky-600 dark:text-sky-400",    bg: "bg-sky-50 dark:bg-sky-500/10",    border: "border-sky-200 dark:border-sky-500/25"    },
  canAdd:    { label: "Add",    icon: Plus,   active: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/25" },
  canEdit:   { label: "Edit",   icon: Pencil, active: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10",  border: "border-amber-200 dark:border-amber-500/25"  },
  canDelete: { label: "Delete", icon: Trash2, active: "text-rose-600 dark:text-rose-400",  bg: "bg-rose-50 dark:bg-rose-500/10",   border: "border-rose-200 dark:border-rose-500/25"   },
} as const

type PermKey = keyof typeof permMeta

function PermToggle({ field, value, onChange }: { field: PermKey; value: boolean; onChange: (v: boolean) => void }) {
  const meta = permMeta[field]
  const Icon = meta.icon
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border text-[11px] sm:text-[12px] font-semibold transition-all duration-150 select-none",
        value
          ? [meta.bg, meta.border, meta.active, "shadow-sm"]
          : "bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.07] text-gray-400 dark:text-gray-600 hover:border-gray-300 dark:hover:border-white/[0.12]"
      )}
    >
      <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
      <span className="hidden sm:inline">{meta.label}</span>
    </button>
  )
}

// ─── Module Row ───────────────────────────────────────────────────────────────

function ModuleBlock({
  module, onToggle
}: {
  module: ModuleWithMenus
  onToggle: (moduleId: number, menuId: number, field: PermKey, value: boolean) => void
}) {
  const [open, setOpen] = useState(true)

  const allGranted = module.menus.every(m => m.canView && m.canAdd && m.canEdit && m.canDelete)
  const someGranted = module.menus.some(m => m.canView || m.canAdd || m.canEdit || m.canDelete)

  const grantAll = () => {
    module.menus.forEach(menu => {
      ;(["canView", "canAdd", "canEdit", "canDelete"] as PermKey[]).forEach(f => {
        if (!menu[f]) onToggle(module.id, menu.menuId, f, true)
      })
    })
  }
  const revokeAll = () => {
    module.menus.forEach(menu => {
      ;(["canView", "canAdd", "canEdit", "canDelete"] as PermKey[]).forEach(f => {
        if (menu[f]) onToggle(module.id, menu.menuId, f, false)
      })
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] overflow-hidden shadow-sm
      bg-white dark:bg-[#0f1117]">

      {/* Module header */}
      <div
        className="flex items-center justify-between px-3 sm:px-4 py-3 cursor-pointer select-none
          bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/[0.07]
          hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/15 shrink-0">
            <LayoutGrid className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-[13px] sm:text-[14px] font-bold text-gray-800 dark:text-white truncate">
            {module.name}
          </span>
          <span className="text-[10.5px] font-semibold text-gray-400 dark:text-gray-500 shrink-0">
            {module.menus.length} menu{module.menus.length !== 1 ? "s" : ""}
          </span>

          {/* Status pill */}
          {someGranted && (
            <span className={cn(
              "hidden sm:inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full border shrink-0",
              allGranted
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
            )}>
              {allGranted ? <><ShieldCheck className="h-3 w-3" />Full Access</> : <><Shield className="h-3 w-3" />Partial</>}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* Grant/Revoke all */}
          <button type="button"
            onClick={e => { e.stopPropagation(); allGranted ? revokeAll() : grantAll() }}
            className={cn(
              "flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-bold border transition-all",
              allGranted
                ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20"
                : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
            )}>
            {allGranted ? <><Lock className="h-2.5 w-2.5" /><span className="hidden sm:inline">Revoke All</span></> : <><Unlock className="h-2.5 w-2.5" /><span className="hidden sm:inline">Grant All</span></>}
          </button>
          {open
            ? <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            : <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          }
        </div>
      </div>

      {/* Menu rows */}
      {open && (
        <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
          {module.menus.map((menu, idx) => {
            const anyOn = menu.canView || menu.canAdd || menu.canEdit || menu.canDelete

            return (
              <div key={menu.menuId}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-3 transition-colors",
                  "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]",
                  "animate-[fadeIn_0.2s_ease_both]"
                )}
                style={{ animationDelay: `${idx * 30}ms` }}>

                {/* Menu name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full shrink-0 border text-[9px] font-black",
                    anyOn
                      ? "bg-indigo-100 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/25 text-indigo-600 dark:text-indigo-400"
                      : "bg-gray-100 dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.08] text-gray-400 dark:text-gray-600"
                  )}>
                    {idx + 1}
                  </div>
                  <span className={cn(
                    "text-[12.5px] sm:text-[13px] font-semibold truncate",
                    anyOn ? "text-gray-800 dark:text-white" : "text-gray-500 dark:text-gray-400"
                  )}>
                    {menu.menuName}
                  </span>
                </div>

                {/* Permission toggles */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {(["canView", "canAdd", "canEdit", "canDelete"] as PermKey[]).map(f => (
                    <PermToggle
                      key={f} field={f}
                      value={!!menu[f]}
                      onChange={v => onToggle(module.id, menu.menuId, f, v)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoleMenuMappingPage() {
  const [roles,        setRoles]        = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<number | null>(null)
  const [modules,      setModules]      = useState<ModuleWithMenus[]>([])
  const [loading,      setLoading]      = useState(false)
  const [loadingMod,   setLoadingMod]   = useState(false)

  useEffect(() => {
    api.get("/RoleMaster/GetAll")
      .then(res => setRoles(res.data.result ?? []))
      .catch(() => toast.error("Failed to load roles"))
  }, [])

  useEffect(() => {
    if (!selectedRole) { setModules([]); return }
    setLoadingMod(true)
    api.get(`/RoleMenuMapping/GetModulesWithMenusByRole/${selectedRole}`)
      .then(res => setModules(res.data.result ?? []))
      .catch(() => toast.error("Failed to load modules & menus"))
      .finally(() => setLoadingMod(false))
  }, [selectedRole])

  const togglePermission = (moduleId: number, menuId: number, field: PermKey, value: boolean) => {
    setModules(prev => prev.map(mod =>
      mod.id === moduleId
        ? { ...mod, menus: mod.menus.map(m => m.menuId === menuId ? { ...m, [field]: value } : m) }
        : mod
    ))
  }

  const savePermissions = async () => {
    if (!selectedRole) return toast.error("Please select a role")
    const payload = {
      roleId: selectedRole,
      menus: modules.flatMap(m => m.menus.map(menu => ({
        moduleId: m.id,
        menuId:   menu.menuId,
        menuKey:  menu.menuKey,
        canView:  menu.canView,
        canAdd:   menu.canAdd,
        canEdit:  menu.canEdit,
        canDelete:menu.canDelete,
      }))),
    }
    setLoading(true)
    try {
      await api.post("/RoleMenuMapping/SaveRoleMenus", payload)
      toast.success("Permissions saved successfully")
    } catch { toast.error("Save failed") }
    finally { setLoading(false) }
  }

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalMenus  = modules.reduce((s, m) => s + m.menus.length, 0)
  const totalPerms  = modules.reduce((s, m) => s + m.menus.filter(mn => mn.canView || mn.canAdd || mn.canEdit || mn.canDelete).length, 0)
  const selRoleName = roles.find(r => r.roleId === selectedRole)?.roleName ?? ""

  return (
    <div className="flex flex-col h-full bg-[#f5f6fa] dark:bg-[#0a0c11]">

      {/* ══ Header ══ */}
      <div className="bg-white dark:bg-[#0f1117] border-b border-gray-200 dark:border-white/[0.06] px-3 sm:px-5 py-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/20 shrink-0">
              <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[14px] sm:text-[16px] font-bold text-gray-900 dark:text-white leading-tight">
                Role Menu Mapping
              </h1>
              <p className="text-[10.5px] sm:text-[11.5px] text-gray-400 dark:text-gray-500 hidden sm:block">
                Assign module &amp; menu access permissions per role
              </p>
            </div>
          </div>

          {modules.length > 0 && (
            <Button onClick={savePermissions} disabled={loading}
              className="h-8 sm:h-9 px-3 sm:px-4 text-[12px] sm:text-[13px] font-bold gap-1.5 shrink-0
                bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl
                shadow-[0_2px_8px_rgba(99,102,241,0.3)] disabled:opacity-50">
              {loading
                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /><span className="hidden sm:inline">Saving…</span></>
                : <><Save className="h-3.5 w-3.5" /><span className="hidden sm:inline">Save Permissions</span><span className="sm:hidden">Save</span></>
              }
            </Button>
          )}
        </div>
      </div>

      {/* ══ Body ══ */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-4">

        {/* Role selector + stats */}
        <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-gray-200 dark:border-white/[0.06] shadow-sm p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">

            {/* Role picker */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 shrink-0">
                <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0 max-w-xs">
                <Select
                  value={selectedRole ? String(selectedRole) : ""}
                  onValueChange={v => setSelectedRole(Number(v))}
                >
                  <SelectTrigger className="h-9 text-[12.5px] sm:text-[13px] font-medium rounded-xl
                    bg-gray-50 dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.08]
                    text-gray-800 dark:text-gray-100 focus:ring-indigo-300 dark:focus:ring-indigo-500/40">
                    <SelectValue placeholder="Choose a role to configure…" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {roles.map(r => (
                      <SelectItem key={r.roleId} value={String(r.roleId)}
                        className="text-[12.5px] rounded-lg">
                        <div className="flex items-center gap-2">
                          <Shield className="h-3.5 w-3.5 text-indigo-500" />
                          {r.roleName}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stats chips */}
            {selectedRole && modules.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full
                  bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400
                  border border-indigo-200 dark:border-indigo-500/20">
                  <LayoutGrid className="h-3 w-3" />{modules.length} Modules
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full
                  bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-400
                  border border-gray-200 dark:border-white/[0.08]">
                  {totalMenus} Menus
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full
                  bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400
                  border border-emerald-200 dark:border-emerald-500/20">
                  <ShieldCheck className="h-3 w-3" />{totalPerms} Granted
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Legend row */}
        {modules.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-0.5">
            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">Permissions:</span>
            {(Object.entries(permMeta) as [PermKey, typeof permMeta[PermKey]][]).map(([key, meta]) => {
              const Icon = meta.icon
              return (
                <span key={key} className={cn(
                  "flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border",
                  meta.bg, meta.border, meta.active
                )}>
                  <Icon className="h-3 w-3" />{meta.label}
                </span>
              )
            })}
          </div>
        )}

        {/* Loading skeleton */}
        {loadingMod && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden bg-white dark:bg-[#0f1117]">
                <div className="h-11 bg-gray-50 dark:bg-white/[0.03] animate-pulse" />
                {[1,2,3].map(j => (
                  <div key={j} className="h-12 border-t border-gray-100 dark:border-white/[0.04] flex items-center px-4 gap-4 animate-pulse"
                    style={{ animationDelay: `${j * 60}ms` }}>
                    <div className="h-4 w-32 bg-gray-100 dark:bg-white/[0.05] rounded" />
                    <div className="ml-auto flex gap-2">
                      {[1,2,3,4].map(k => <div key={k} className="h-7 w-16 bg-gray-100 dark:bg-white/[0.05] rounded-lg" />)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Module blocks */}
        {!loadingMod && modules.length > 0 && (
          <div className="space-y-3">
            {modules.map((mod, idx) => (
              <div key={mod.id}
                className="animate-[fadeInUp_0.3s_ease_both]"
                style={{ animationDelay: `${idx * 50}ms` }}>
                <ModuleBlock module={mod} onToggle={togglePermission} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state — no role selected */}
        {!loadingMod && !selectedRole && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/[0.09]">
              <Shield className="h-7 w-7 text-gray-300 dark:text-gray-600" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-gray-500 dark:text-gray-400">No role selected</p>
              <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-1">
                Select a role from the dropdown to manage its access permissions
              </p>
            </div>
          </div>
        )}

        {/* Empty state — role has no modules */}
        {!loadingMod && selectedRole && modules.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20">
              <Shield className="h-7 w-7 text-amber-400" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-gray-600 dark:text-gray-300">
                No modules found for {selRoleName}
              </p>
              <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-1">
                This role has no menu mappings configured yet
              </p>
            </div>
          </div>
        )}

        {/* Save button — bottom float on mobile */}
        {modules.length > 0 && (
          <div className="sm:hidden sticky bottom-3 z-10">
            <Button onClick={savePermissions} disabled={loading}
              className="w-full h-11 text-[13.5px] font-bold gap-2 rounded-xl
                bg-indigo-600 hover:bg-indigo-500 text-white
                shadow-[0_4px_16px_rgba(99,102,241,0.4)] disabled:opacity-50">
              {loading
                ? <><RefreshCw className="h-4 w-4 animate-spin" />Saving Permissions…</>
                : <><Save className="h-4 w-4" />Save All Permissions</>
              }
            </Button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
        @keyframes fadeInUp  { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  )
}