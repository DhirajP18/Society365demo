"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Bell, Search, Sun, Moon, LogOut, User,
  Settings, ChevronDown, Clock, CheckCheck,
  Building2, MapPin, X,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Notification = { id: number; title: string; message: string; time: string; read: boolean }
type UserInfo     = { name: string; email: string; role: string }

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: 1, title: "New Member Added",    message: "Rahul Sharma has been added to Block A.",        time: "2 min ago",  read: false },
  { id: 2, title: "Maintenance Request", message: "Flat 304 raised a plumbing issue.",               time: "15 min ago", read: false },
  { id: 3, title: "Payment Received",    message: "₹5,000 maintenance fee received from Flat 201.", time: "1 hr ago",   read: true  },
]

function getUserFromToken(token: string): Partial<UserInfo> | null {
  try {
    const payloadPart = token.split(".")[1]
    if (!payloadPart) return null

    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/")
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    )

    const payload = JSON.parse(json) as Record<string, unknown>

    const name =
      (payload.name as string | undefined) ??
      (payload.fullName as string | undefined) ??
      (payload.userName as string | undefined) ??
      (payload.unique_name as string | undefined) ??
      (payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] as string | undefined) ??
      ""

    const email =
      (payload.email as string | undefined) ??
      (payload.EmailId as string | undefined) ??
      (payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] as string | undefined) ??
      ""

    const role =
      (payload.role as string | undefined) ??
      (payload.roleName as string | undefined) ??
      (payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] as string | undefined) ??
      ""

    if (!name && !email && !role) return null
    return { name, email, role }
  } catch {
    return null
  }
}

// ─── Avatar Initials ──────────────────────────────────────────────────────────

function AvatarInitials({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
  return (
    <div className={cn(
      "flex items-center justify-center rounded-full font-bold select-none shrink-0",
      "bg-gradient-to-br from-indigo-500 to-violet-600 text-white",
      size === "sm" ? "h-[28px] w-[28px] text-[10px] sm:h-[30px] sm:w-[30px] sm:text-[11px]"
                   : "h-9 w-9 text-[13px]"
    )}>
      {initials}
    </div>
  )
}

// ─── App Header ───────────────────────────────────────────────────────────────

export default function AppHeader() {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  const [mounted,        setMounted]        = useState(false)
  const [searchOpen,     setSearchOpen]     = useState(false)
  const [user,           setUser]           = useState<UserInfo>({ name: "Guest User", email: "", role: "" })
  const [clientName,     setClientName]     = useState("Subhal Srushti Apartment")
  const [clientAddress,  setClientAddress]  = useState("Sector 21, Navi Mumbai – 400706")
  const [notifications,  setNotifications]  = useState<Notification[]>(DEMO_NOTIFICATIONS)

  const unreadCount = notifications.filter(n => !n.read).length
  const isDark      = resolvedTheme === "dark"

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem("user")
      if (stored) {
        const p = JSON.parse(stored) as Record<string, string>
        setUser({ name: p.name ?? p.fullName ?? p.userName ?? "User", email: p.email ?? "", role: p.roleName ?? p.role ?? "" })
      } else {
        const token = localStorage.getItem("token")
        if (token) {
          const tokenUser = getUserFromToken(token)
          if (tokenUser) {
            setUser({
              name: tokenUser.name ?? "User",
              email: tokenUser.email ?? "",
              role: tokenUser.role ?? "",
            })
          }
        }
      }
      const name = localStorage.getItem("societyName") ?? localStorage.getItem("clientName")
      const addr = localStorage.getItem("societyAddress") ?? localStorage.getItem("address")
      if (name) setClientName(name)
      if (addr) setClientAddress(addr)
    } catch { /* ignore */ }
  }, [])

  const logout = () => {
    localStorage.removeItem("token"); localStorage.removeItem("user"); localStorage.removeItem("roleId")
    sessionStorage.clear(); router.replace("/login")
  }

  const markAllRead = () => setNotifications(p => p.map(n => ({ ...n, read: true })))
  const markRead    = (id: number) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n))

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════
          MAIN HEADER
      ════════════════════════════════════════════════════════════════ */}
      <header className={cn(
        "sticky top-0 z-40 flex items-center px-2 sm:px-4 md:px-5 gap-2",
        // height: 52px mobile, 64px desktop
        "h-[52px] sm:h-[60px] md:h-[64px]",
        "bg-white/[0.97] dark:bg-[#0d0f14]/[0.97] backdrop-blur-md",
        "border-b border-gray-100 dark:border-white/[0.05]",
        "shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
        "transition-colors duration-200"
      )}>

        {/* ── Hamburger ── */}
        <SidebarTrigger className="md:hidden h-8 w-8 flex items-center justify-center rounded-lg shrink-0
          text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors" />

        {/* ══════════ BRANDING — always visible ══════════ */}
        <div className="flex items-center gap-2 flex-1 min-w-0">

          {/* Icon */}
          <div className="relative shrink-0">
            <div className={cn(
              "rounded-xl flex items-center justify-center",
              // slightly smaller on mobile
              "h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10",
              "bg-gradient-to-br from-indigo-500 to-violet-600",
              "shadow-[0_3px_10px_rgba(99,102,241,0.35)]"
            )}>
              <Building2 className="h-[15px] w-[15px] sm:h-[17px] sm:w-[17px] md:h-[20px] md:w-[20px] text-white" />
            </div>
            {/* Live dot */}
            <span className="absolute -bottom-[2px] -right-[2px] h-[9px] w-[9px] sm:h-[10px] sm:w-[10px] rounded-full
              bg-emerald-500 border-2 border-white dark:border-[#0d0f14]" />
          </div>

          {/* Text — TWO layouts:
              Mobile: just the society name (shortened), single line
              Desktop: name + address below */}
          <div className="flex flex-col justify-center min-w-0">

            {/* ── Society Name ── always visible on ALL screens */}
            <p className={cn(
              "font-black leading-tight tracking-tight truncate",
              "bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent",
              // mobile: small; tablet: medium; desktop: big
              "text-[12px] max-w-[150px]",
              "sm:text-[14px] sm:max-w-[250px]",
              "md:text-[16px] md:max-w-[340px]",
              "lg:text-[17px] lg:max-w-[460px]"
            )}>
              {clientName}
            </p>

            {/* ── Address ── hidden on mobile, shown on sm+ */}
            <div className="hidden sm:flex items-center gap-[3px] mt-[2px]">
              <MapPin className="h-[9px] w-[9px] sm:h-[10px] sm:w-[10px] text-violet-500 shrink-0" />
              <p className={cn(
                "text-[10px] sm:text-[10.5px] font-semibold leading-none truncate",
                "max-w-[180px] md:max-w-[280px] lg:max-w-[400px]",
                "bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 bg-clip-text text-transparent"
              )}>
                {clientAddress}
              </p>
            </div>
          </div>
        </div>

        {/* ── Divider — desktop only ── */}
        <div className="hidden md:block h-6 w-px bg-gray-200 dark:bg-white/[0.07] mx-1 shrink-0" />

        {/* ════════ SEARCH ════════ */}
        <div className="shrink-0 flex items-center">

          {/* Desktop search */}
          <div className="relative hidden sm:block w-[160px] md:w-[185px] lg:w-[210px]">
            <Search className="absolute left-[8px] top-1/2 -translate-y-1/2 h-[12px] w-[12px]
              text-gray-400 dark:text-gray-600 pointer-events-none" />
            <input
              type="text"
              placeholder="Search…"
              className={cn(
                "w-full h-[29px] rounded-lg text-[12px] outline-none",
                "pl-[26px] pr-[32px]",
                "bg-gray-50 dark:bg-white/[0.04]",
                "border border-gray-100 dark:border-white/[0.06]",
                "text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600",
                "transition-all duration-200",
                "focus:bg-white dark:focus:bg-white/[0.07]",
                "focus:border-indigo-200 dark:focus:border-indigo-500/30",
                "focus:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]"
              )}
            />
            <kbd className="absolute right-[7px] top-1/2 -translate-y-1/2
              hidden lg:flex items-center rounded font-mono leading-none
              border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.04]
              px-[4px] py-[2px] text-[9px] text-gray-400 dark:text-gray-600">
              ⌘K
            </kbd>
          </div>

          {/* Mobile search: icon → fullscreen overlay */}
          <div className="sm:hidden">
            <button onClick={() => setSearchOpen(true)}
              className="h-8 w-8 flex items-center justify-center rounded-lg
                text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ════════ RIGHT ACTIONS ════════ */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">

          {/* Theme toggle */}
          {mounted && (
            <>
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-label="Toggle theme"
                className="sm:hidden h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>

              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-label="Toggle theme"
                className={cn(
                  "relative rounded-full border transition-all duration-300 shrink-0 hidden sm:flex items-center",
                  "h-[24px] w-[44px] sm:h-[26px] sm:w-[48px]",
                  isDark
                    ? "bg-indigo-600 border-indigo-500/70 justify-end pr-[3px]"
                    : "bg-gray-100 border-gray-200 justify-start pl-[3px]"
                )}
              >
                <Sun className="absolute left-[5px] h-[9px] w-[9px] sm:h-[10px] sm:w-[10px] text-amber-400 opacity-80 pointer-events-none" />
                <Moon className="absolute right-[5px] h-[9px] w-[9px] sm:h-[10px] sm:w-[10px] text-indigo-200 opacity-80 pointer-events-none" />
                <span className={cn(
                  "relative z-10 rounded-full shadow-md flex items-center justify-center transition-all duration-300",
                  "h-[18px] w-[18px] sm:h-[20px] sm:w-[20px]",
                  isDark ? "bg-white" : "bg-white border border-gray-200"
                )}>
                  {isDark ? <Moon className="h-[9px] w-[9px] text-indigo-600" /> : <Sun className="h-[9px] w-[9px] text-amber-500" />}
                </span>
              </button>
            </>
          )}

          {/* Bell */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative h-8 w-8 flex items-center justify-center rounded-lg
                text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06]
                hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                <Bell className="h-[16px] w-[16px] sm:h-[17px] sm:w-[17px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-[7px] right-[7px] flex h-[7px] w-[7px]">
                    <span className="animate-ping absolute inset-0 rounded-full bg-rose-400 opacity-70" />
                    <span className="relative rounded-full h-[7px] w-[7px] bg-rose-500" />
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8}
              className="w-[280px] sm:w-[340px] p-0 rounded-2xl overflow-hidden
                border border-gray-100 dark:border-white/[0.07] bg-white dark:bg-[#13161f] shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-3 sm:px-4 py-3
                border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.015]">
                <div className="flex items-center gap-2">
                  <Bell className="h-[14px] w-[14px] text-gray-600 dark:text-gray-300" />
                  <span className="text-[13px] font-bold text-gray-900 dark:text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold px-1.5">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                    <CheckCheck className="h-3 w-3" />Mark all read
                  </button>
                )}
              </div>
              {/* List */}
              <div className="max-h-[260px] overflow-y-auto divide-y divide-gray-50 dark:divide-white/[0.04]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Bell className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                    <p className="text-[12px] font-medium text-gray-400">All caught up!</p>
                  </div>
                ) : notifications.map(n => (
                  <div key={n.id} onClick={() => markRead(n.id)}
                    className={cn("flex gap-3 px-3 sm:px-4 py-3 cursor-pointer transition-colors",
                      !n.read ? "bg-indigo-50/60 dark:bg-indigo-500/[0.05] hover:bg-indigo-50"
                               : "hover:bg-gray-50 dark:hover:bg-white/[0.02]")}>
                    <div className="pt-[6px] shrink-0">
                      <span className={cn("block h-[7px] w-[7px] rounded-full",
                        n.read ? "bg-gray-200 dark:bg-white/[0.08]" : "bg-indigo-500")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-100 leading-snug">{n.title}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{n.message}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="h-2.5 w-2.5 text-gray-400" />
                        <span className="text-[10px] text-gray-400">{n.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.015]">
                <button className="w-full text-center text-[11.5px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  onClick={() => router.push("/notifications")}>
                  View all notifications →
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Divider — md+ */}
          <div className="hidden md:block h-5 w-px bg-gray-200 dark:bg-white/[0.07] mx-0.5 shrink-0" />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-xl px-1 sm:px-1.5 py-1 outline-none
                hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors group">
                <AvatarInitials name={user.name} size="sm" />
                {/* Name — only on md+ */}
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-[12.5px] font-bold text-gray-800 dark:text-gray-100 leading-tight max-w-[90px] truncate">
                    {user.name}
                  </span>
                  {user.role && (
                    <span className="text-[10.5px] text-indigo-500 dark:text-indigo-400 font-medium leading-tight">{user.role}</span>
                  )}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden md:block group-hover:text-gray-600 transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}
              className="w-[210px] sm:w-[220px] rounded-2xl p-1.5
                border border-gray-100 dark:border-white/[0.07] bg-white dark:bg-[#13161f] shadow-2xl">
              <DropdownMenuLabel className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <AvatarInitials name={user.name} size="md" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{user.name}</span>
                    {user.email && <span className="text-[10.5px] text-gray-400 dark:text-gray-500 truncate">{user.email}</span>}
                    {user.role  && <span className="text-[10.5px] text-indigo-600 dark:text-indigo-400 font-semibold">{user.role}</span>}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100 dark:bg-white/[0.06] mx-1" />
              <DropdownMenuItem onClick={() => router.push("/profile")}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] cursor-pointer text-gray-700 dark:text-gray-300 focus:bg-gray-50 dark:focus:bg-white/[0.04]">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 shrink-0">
                  <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] cursor-pointer text-gray-700 dark:text-gray-300 focus:bg-gray-50 dark:focus:bg-white/[0.04]">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.06] shrink-0">
                  <Settings className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                </div>Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100 dark:bg-white/[0.06] mx-1" />
              <DropdownMenuItem onClick={logout}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-500/[0.08]">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/10 shrink-0">
                  <LogOut className="h-3.5 w-3.5 text-rose-500" />
                </div>Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════
          MOBILE SEARCH OVERLAY (fullscreen when searchOpen)
      ════════════════════════════════════════════════════════════════ */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 sm:hidden flex items-start pt-[10px] px-3
          bg-black/40 backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}>
          <div className="relative w-full" onClick={e => e.stopPropagation()}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-gray-400 pointer-events-none" />
            <input
              autoFocus
              type="text"
              placeholder="Search events, members, services…"
              className="w-full h-11 pl-10 pr-12 rounded-xl text-[13.5px] outline-none
                bg-white dark:bg-[#1a1d27]
                border border-indigo-200 dark:border-indigo-500/30
                shadow-2xl shadow-black/20
                text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
            />
            <button onClick={() => setSearchOpen(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center
                rounded-lg bg-gray-100 dark:bg-white/[0.08] text-gray-500">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
