"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

import * as LucideIcons from "lucide-react"
import { ChevronRight, LayoutDashboard } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { AxiosError } from "axios"

// ─── Types ────────────────────────────────────────────────────────────────────

type Menu = {
  menuId: number
  menuName: string
  menuUrl: string
  menuIcon: string
}

type Module = {
  moduleId: number
  moduleName: string
  moduleIcon: string
  menus: Menu[]
}

// ─── Dynamic Icon ─────────────────────────────────────────────────────────────
//
//  Supports any of these DB formats:
//    "FileText"      → FileText      ✅ (already PascalCase)
//    "file-text"     → FileText      ✅ (kebab-case)
//    "file_text"     → FileText      ✅ (snake_case)
//    "BarChart3"     → BarChart3     ✅ (PascalCase with digit)
//    "HelpCircle"    → HelpCircle    ✅
//    "MessageSquare" → MessageSquare ✅
//
//  FIX: removed `.toLowerCase()` — it was destroying camelCase icon names.

function DynamicIcon({
  name,
  className,
}: {
  name?: string | null
  className?: string
}) {
  if (!name) return <LayoutDashboard className={cn("shrink-0", className)} />

  // Strategy 1: try the name exactly as stored (handles already-PascalCase names)
  const exactIcon = (LucideIcons as Record<string, unknown>)[name] as
    | React.FC<{ className?: string }>
    | undefined

  if (exactIcon) {
    const Icon = exactIcon
    return <Icon className={cn("shrink-0", className)} />
  }

  // Strategy 2: convert kebab-case / snake_case → PascalCase
  // e.g. "file-text" → "FileText"   "bar_chart_3" → "BarChart3"
  // NOTE: do NOT call .toLowerCase() on w.slice(1) — it breaks multi-capital names
  const pascal = name
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")

  const convertedIcon = (LucideIcons as Record<string, unknown>)[pascal] as
    | React.FC<{ className?: string }>
    | undefined

  if (convertedIcon) {
    const Icon = convertedIcon
    return <Icon className={cn("shrink-0", className)} />
  }

  // Fallback
  return <LayoutDashboard className={cn("shrink-0", className)} />
}

// ─── Collapsed Hover Popup (Desktop only) ─────────────────────────────────────

function CollapsedModulePopup({ module }: { module: Module }) {
  const [visible, setVisible] = useState(false)
  const [top, setTop] = useState(0)
  const triggerRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pathname = usePathname()

  const show = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setTop(rect.top)
    setVisible(true)
  }

  const hide = () => {
    hideTimer.current = setTimeout(() => setVisible(false), 150)
  }

  return (
    <div
      ref={triggerRef}
      className="relative w-full"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg cursor-pointer transition-all mx-auto",
          visible
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
        title={module.moduleName}
      >
        <DynamicIcon name={module.moduleIcon} className="h-5 w-5" />
      </div>

      {/* Portal renders popup at document.body — escapes sidebar's transform stacking context */}
      {visible && typeof document !== "undefined" && createPortal(
        <div
          className="fixed left-[62px] w-60 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden animate-in slide-in-from-left-2 duration-150"
          style={{ top: top - 4, zIndex: 99999 }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className="flex items-center gap-2.5 border-b bg-muted/50 px-4 py-3">
            <DynamicIcon name={module.moduleIcon} className="h-[15px] w-[15px] text-foreground" />
            <span className="text-sm font-semibold text-foreground">{module.moduleName}</span>
          </div>
          <div className="p-1.5">
            {module.menus.map((menu) => {
              const isActive = pathname === `/${menu.menuUrl}`
              return (
                <Link
                  key={menu.menuId}
                  href={`/${menu.menuUrl}`}
                  onClick={hide}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <DynamicIcon name={menu.menuIcon} className="h-4 w-4 shrink-0" />
                  {menu.menuName}
                </Link>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ─── Tree Module (Expanded) ───────────────────────────────────────────────────

function TreeModule({
  module,
  onNavigate,
}: {
  module: Module
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const hasActive = module.menus.some((m) => pathname === `/${m.menuUrl}`)

  useEffect(() => {
    if (hasActive) setOpen(true)
  }, [hasActive])

  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150",
          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          hasActive && !open && "text-sidebar-primary font-semibold"
        )}
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-hover:text-sidebar-accent-foreground",
            open && "rotate-90"
          )}
        />
        <DynamicIcon name={module.moduleIcon} className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 text-left text-[14px] font-semibold tracking-tight leading-none">
          {module.moduleName}
        </span>
        <span className="text-[11px] text-muted-foreground/50 font-normal tabular-nums">
          {module.menus.length}
        </span>
      </button>

      {open && (
        <div className="relative mt-0.5 mb-1 ml-6">
          <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border" />
          <div className="space-y-0.5">
            {module.menus.map((menu) => {
              const isActive = pathname === `/${menu.menuUrl}`
              return (
                <Link
                  key={menu.menuId}
                  href={`/${menu.menuUrl}`}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg py-2.5 pr-3 pl-5 transition-all duration-150",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-[5px] h-px w-4 shrink-0",
                      isActive ? "bg-sidebar-primary" : "bg-border"
                    )}
                  />
                  <DynamicIcon
                    name={menu.menuIcon}
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-sidebar-primary-foreground"
                        : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                    )}
                  />
                  <span className="text-[13.5px] leading-none">{menu.menuName}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sidebar Inner Content ─────────────────────────────────────────────────────

function SidebarInner({
  modules,
  isCollapsed,
  onNavigate,
}: {
  modules: Module[]
  isCollapsed: boolean
  onNavigate?: () => void
}) {
  const filtered = modules.filter((m) => m.menus?.length > 0)

  return (
    <>
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {filtered.map((module) => (
            <TreeModule key={module.moduleId} module={module} onNavigate={onNavigate} />
          ))}
        </div>
      )}

      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center gap-1 px-1 py-3 overflow-y-auto overflow-x-visible">
          {filtered.map((module) => (
            <CollapsedModulePopup key={module.moduleId} module={module} />
          ))}
        </div>
      )}
    </>
  )
}

// ─── App Sidebar ──────────────────────────────────────────────────────────────

export default function AppSidebar() {
  const [modules, setModules] = useState<Module[]>([])
  const { state, isMobile, setOpenMobile } = useSidebar()
  const isCollapsed = state === "collapsed"

  useEffect(() => {
    loadSidebar()
  }, [])

  const loadSidebar = async () => {
    try {
      const res = await api.get("/Sidebar/GetSidebar")
      setModules(res.data.result)
    } catch (err) {
      const error = err as AxiosError
      if (error.response?.status === 401) {
        window.location.href = "/login"
      } else {
        console.error("Failed to load sidebar:", error)
      }
    }
  }

  const handleNavigate = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">

      {/* ── Header ── */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-border px-3 gap-2",
          isCollapsed && !isMobile ? "justify-center" : "justify-between"
        )}
      >
        {(!isCollapsed || isMobile) && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary shrink-0">
              <span className="text-[13px] font-bold text-sidebar-primary-foreground">A</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-bold leading-tight text-sidebar-foreground">
                Society-365
              </span>
              <span className="text-[10.5px] text-muted-foreground leading-tight">
                Management System
              </span>
            </div>
          </div>
        )}
        <SidebarTrigger
          className={cn(
            "h-8 w-8 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            isCollapsed && !isMobile && "mx-auto",
            isMobile && "hidden"
          )}
        />
      </div>

      {/* ── Content ── */}
      <SidebarContent className="flex flex-col h-full overflow-hidden p-0">
        <SidebarInner
          modules={modules}
          isCollapsed={isCollapsed && !isMobile}
          onNavigate={handleNavigate}
        />
      </SidebarContent>

      {/* ── Footer ── */}
      {(!isCollapsed || isMobile) && (
        <div className="shrink-0 border-t border-border px-4 py-3">
          <p className="text-[11px] text-muted-foreground/50 text-center">
            © {new Date().getFullYear()} AMS System
          </p>
        </div>
      )}
    </Sidebar>
  )
}
