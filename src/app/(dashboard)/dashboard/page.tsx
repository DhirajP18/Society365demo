"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  type TooltipProps,
} from "recharts"
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent"
import {
  Users, Home, IndianRupee, AlertTriangle, TrendingUp,
  TrendingDown, Car, Wrench, Bell, ChevronRight, Calendar,
  ShieldCheck, Zap, Droplets, ArrowUpRight, Clock, CheckCircle2,
  XCircle, Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const monthlyCollection = [
  { month: "Aug", collected: 142000, pending: 28000 },
  { month: "Sep", collected: 158000, pending: 22000 },
  { month: "Oct", collected: 135000, pending: 45000 },
  { month: "Nov", collected: 172000, pending: 18000 },
  { month: "Dec", collected: 168000, pending: 12000 },
  { month: "Jan", collected: 185000, pending: 15000 },
]

const visitorData = [
  { day: "Mon", visitors: 24 },
  { day: "Tue", visitors: 38 },
  { day: "Wed", visitors: 29 },
  { day: "Thu", visitors: 47 },
  { day: "Fri", visitors: 56 },
  { day: "Sat", visitors: 72 },
  { day: "Sun", visitors: 43 },
]

const flatStatusData = [
  { name: "Owned", value: 68, color: "#6366f1" },
  { name: "Rented", value: 22, color: "#f59e0b" },
  { name: "Vacant", value: 10, color: "#10b981" },
]

const recentActivities = [
  { id: 1, icon: IndianRupee, color: "text-emerald-600 bg-emerald-50", title: "Maintenance Paid",    desc: "Flat 304 – Rahul Mehta",      time: "2 min ago"  },
  { id: 2, icon: Wrench,      color: "text-orange-600 bg-orange-50",  title: "Complaint Raised",     desc: "Flat 102 – Water leakage",    time: "18 min ago" },
  { id: 3, icon: Car,         color: "text-blue-600 bg-blue-50",      title: "Visitor Entry",        desc: "Gate 1 – Swiggy Delivery",   time: "34 min ago" },
  { id: 4, icon: Bell,        color: "text-violet-600 bg-violet-50",  title: "Notice Published",     desc: "Annual AGM – Feb 25, 2026",  time: "1 hr ago"   },
  { id: 5, icon: IndianRupee, color: "text-emerald-600 bg-emerald-50", title: "Maintenance Paid",   desc: "Flat 201 – Priya Shah",       time: "2 hr ago"   },
  { id: 6, icon: Wrench,      color: "text-orange-600 bg-orange-50",  title: "Complaint Resolved",   desc: "Flat 412 – Lift issue fixed", time: "3 hr ago"   },
]

const defaulters = [
  { flat: "Flat 105", name: "Amit Verma",  months: 3, amount: 15000 },
  { flat: "Flat 208", name: "Sonal Gupta", months: 2, amount: 10000 },
  { flat: "Flat 310", name: "Rajan Patel", months: 4, amount: 20000 },
  { flat: "Flat 402", name: "Neha Joshi",  months: 1, amount:  5000 },
]

const upcomingEvents = [
  { date: "25 Feb", day: "Wed", title: "Annual AGM Meeting",  tag: "Meeting", color: "bg-violet-100 text-violet-700 border-violet-200" },
  { date: "01 Mar", day: "Sun", title: "Holi Celebration",    tag: "Event",   color: "bg-pink-100 text-pink-700 border-pink-200"     },
  { date: "05 Mar", day: "Thu", title: "Maintenance Due",     tag: "Finance", color: "bg-amber-100 text-amber-700 border-amber-200"  },
  { date: "10 Mar", day: "Tue", title: "Lift Servicing",      tag: "Service", color: "bg-blue-100 text-blue-700 border-blue-200"    },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string
  sub: string
  icon: React.FC<{ className?: string }>
  trend: number
  gradient: string
  iconBg: string
}

interface TooltipPayloadItem {
  name: string
  value: number
  color: string
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ title, value, sub, icon: Icon, trend, gradient, iconBg }: StatCardProps) {
  const isUp = trend >= 0
  return (
    <Card className={cn("relative overflow-hidden border-0 shadow-sm", gradient)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-[12.5px] font-semibold uppercase tracking-widest text-white/75">{title}</p>
            <p className="text-[28px] font-bold text-white leading-tight">{value}</p>
            <p className="text-[12px] text-white/70">{sub}</p>
          </div>
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", iconBg)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5">
          {isUp ? (
            <TrendingUp className="h-3.5 w-3.5 text-white/80" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-white/80" />
          )}
          <span className="text-[12px] font-semibold text-white/90">
            {isUp ? "+" : ""}{trend}% vs last month
          </span>
        </div>
      </CardContent>
      <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-10 h-16 w-16 rounded-full bg-white/5" />
    </Card>
  )
}

// ─── Custom Recharts Tooltip  ─────────────────────────────────────────────────
// Uses the generic TooltipProps<ValueType, NameType> from recharts — no `any`

function CustomTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg text-[12px]">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {(payload as TooltipPayloadItem[]).map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">
            {typeof p.value === "number" && p.value > 999
              ? `₹${(p.value / 1000).toFixed(0)}k`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Avatar Initials ──────────────────────────────────────────────────────────

function AvatarInitials({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold select-none",
        className
      )}
    >
      {initials}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"week" | "month">("week")

  return (
    <div className="min-h-screen bg-[#f8f9fc] p-4 sm:p-6 space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-0.5">
            Green Park Society — Overview for February 2026
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-[13px] gap-2 h-9">
            <Calendar className="h-4 w-4" />
            Feb 2026
          </Button>
          <Button size="sm" className="text-[13px] gap-2 h-9 bg-indigo-600 hover:bg-indigo-700">
            <ArrowUpRight className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Members"
          value="248"
          sub="Across 4 Wings"
          icon={Users}
          trend={4.2}
          gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
          iconBg="bg-white/20"
        />
        <StatCard
          title="Total Flats"
          value="120"
          sub="108 Occupied"
          icon={Home}
          trend={0}
          gradient="bg-gradient-to-br from-violet-500 to-violet-700"
          iconBg="bg-white/20"
        />
        <StatCard
          title="Collected"
          value="₹1.85L"
          sub="This month"
          icon={IndianRupee}
          trend={9.8}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
          iconBg="bg-white/20"
        />
        <StatCard
          title="Pending"
          value="₹15K"
          sub="12 flats pending"
          icon={AlertTriangle}
          trend={-18.4}
          gradient="bg-gradient-to-br from-rose-500 to-rose-600"
          iconBg="bg-white/20"
        />
      </div>

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Complaints",     value: "7 Open",    icon: Wrench,      color: "text-orange-500", bg: "bg-orange-50 border-orange-100" },
          { label: "Visitors Today", value: "43 Entries", icon: Car,        color: "text-blue-500",   bg: "bg-blue-50 border-blue-100"    },
          { label: "Active Notices", value: "3 Live",    icon: Bell,        color: "text-violet-500", bg: "bg-violet-50 border-violet-100" },
          { label: "Security Guards",value: "8 On Duty", icon: ShieldCheck, color: "text-emerald-500",bg: "bg-emerald-50 border-emerald-100"},
        ].map((item) => (
          <Card key={item.label} className={cn("border shadow-none", item.bg)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-white border", item.bg)}>
                <item.icon className={cn("h-4 w-4", item.color)} />
              </div>
              <div>
                <p className="text-[11.5px] text-muted-foreground font-medium">{item.label}</p>
                <p className="text-[14px] font-bold text-gray-900">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Monthly Collection Bar Chart */}
        <Card className="lg:col-span-2 border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[15px] font-semibold text-gray-900">Monthly Collection</CardTitle>
                <CardDescription className="text-[12.5px]">Collected vs Pending — last 6 months</CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] text-emerald-600 border-emerald-200 bg-emerald-50">
                ₹11.6L Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyCollection} barSize={20} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${v / 1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="collected" name="Collected" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending"   name="Pending"   fill="#fca5a5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Flat Status Pie */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold text-gray-900">Flat Status</CardTitle>
            <CardDescription className="text-[12.5px]">Owned · Rented · Vacant</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={flatStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                  {flatStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: ValueType) => [`${value}%`, ""]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2 mt-1">
              {flatStatusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                    <span className="text-[12.5px] text-muted-foreground">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={item.value} className="w-16 h-1.5" />
                    <span className="text-[12.5px] font-semibold text-gray-800 w-8 text-right">{item.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Visitors + Activity + Events ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Visitor Area Chart */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[15px] font-semibold text-gray-900">Visitor Traffic</CardTitle>
                <CardDescription className="text-[12.5px]">This weeks entries</CardDescription>
              </div>
              <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                {(["week", "month"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors capitalize",
                      activeTab === t ? "bg-white shadow-sm text-gray-900" : "text-muted-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={visitorData}>
                <defs>
                  <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="day"      tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis                    tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  name="Visitors"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#visitorGrad)"
                  dot={{ fill: "#6366f1", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="text-[12px] text-indigo-600 h-7 px-2">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-1 overflow-y-auto max-h-[230px]">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", act.color)}>
                  <act.icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-gray-900 leading-tight">{act.title}</p>
                  <p className="text-[11.5px] text-muted-foreground truncate">{act.desc}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  <Clock className="h-3 w-3 text-muted-foreground/50" />
                  <span className="text-[10.5px] text-muted-foreground/60">{act.time}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Upcoming Events</CardTitle>
              <Button variant="ghost" size="sm" className="text-[12px] text-indigo-600 h-7 px-2">
                Add <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2.5">
            {upcomingEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex flex-col items-center w-10 shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{ev.day}</span>
                  <span className="text-[16px] font-bold text-gray-900 leading-tight">{ev.date.split(" ")[0]}</span>
                  <span className="text-[10px] text-muted-foreground">{ev.date.split(" ")[1]}</span>
                </div>
                <div className="h-10 w-px bg-border shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 leading-tight">{ev.title}</p>
                  <Badge variant="outline" className={cn("mt-1 text-[10px] px-1.5 py-0 h-4 border", ev.color)}>
                    {ev.tag}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Defaulters + Amenities ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Defaulters Table */}
        <Card className="lg:col-span-2 border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[15px] font-semibold text-gray-900">Maintenance Defaulters</CardTitle>
                <CardDescription className="text-[12.5px]">Flats with overdue payments</CardDescription>
              </div>
              <Badge className="text-[11px] bg-rose-100 text-rose-700 border-rose-200 border hover:bg-rose-100">
                {defaulters.length} Pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border/60">
                    {["Flat", "Owner", "Months", "Amount", "Action"].map((h) => (
                      <th key={h} className="text-left py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {defaulters.map((d, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-50">
                            <Building2 className="h-3.5 w-3.5 text-rose-500" />
                          </div>
                          <span className="font-semibold text-gray-900">{d.flat}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                              {d.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-gray-700">{d.name}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] border",
                            d.months >= 3
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}
                        >
                          {d.months} mo
                        </Badge>
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-rose-600">
                          ₹{d.amount.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11.5px] border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                        >
                          Send Reminder
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Amenities Status */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold text-gray-900">Amenities Status</CardTitle>
            <CardDescription className="text-[12.5px]">Live operational status</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {[
              { name: "Water Supply",  icon: Droplets,   ok: true,  detail: "6 AM – 10 AM",  status: "Operational"       },
              { name: "Power Backup",  icon: Zap,        ok: true,  detail: "All floors",     status: "Active"            },
              { name: "Lift – Wing A", icon: Building2,  ok: false, detail: "Est. 4 hrs",     status: "Under Maintenance" },
              { name: "Gym",           icon: Users,      ok: true,  detail: "6 AM – 10 PM",   status: "Open"              },
              { name: "Swimming Pool", icon: Droplets,   ok: false, detail: "Cleaning day",   status: "Closed"            },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", item.ok ? "bg-emerald-50" : "bg-rose-50")}>
                    <item.icon className={cn("h-4 w-4", item.ok ? "text-emerald-600" : "text-rose-500")} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900 leading-tight">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {item.ok
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    : <XCircle    className="h-4 w-4 text-rose-500"    />
                  }
                  <span className={cn("text-[11.5px] font-medium", item.ok ? "text-emerald-600" : "text-rose-500")}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
