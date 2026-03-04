"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Bell, Shield, Globe, Palette, Smartphone,
  Mail, MessageSquare, Lock, Eye, Database,
  HelpCircle, FileText, ChevronRight, Check,
  Moon, Sun, Monitor, Languages, Clock,
  AlertCircle, Download, Trash2,
} from "lucide-react"

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        "relative h-5 w-9 rounded-full transition-all duration-200 shrink-0",
        value ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
      )}>
      <span className={cn(
        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200",
        value ? "left-[18px]" : "left-0.5"
      )} />
    </button>
  )
}

// ── Setting row ───────────────────────────────────────────────────────────────
function SettingRow({
  label, description, right,
}: {
  label: string; description?: string; right: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">{label}</p>
        {description && <p className="text-[11.5px] text-gray-400 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
function Section({
  icon, title, color = "indigo", children,
}: {
  icon: React.ReactNode; title: string; color?: string; children: React.ReactNode
}) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    violet: "bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20 text-violet-600 dark:text-violet-400",
    emerald:"bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    amber:  "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400",
    blue:   "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400",
    rose:   "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400",
  }
  return (
    <div className="bg-white dark:bg-[#0f1117] rounded-2xl border border-gray-200 dark:border-white/[0.07] shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
        <div className={cn("h-8 w-8 rounded-xl border flex items-center justify-center shrink-0", colors[color])}>
          {icon}
        </div>
        <p className="text-[14px] font-bold text-gray-900 dark:text-white">{title}</p>
      </div>
      <div className="px-5 divide-y divide-gray-100 dark:divide-white/[0.05]">
        {children}
      </div>
    </div>
  )
}

// ── Coming soon badge ─────────────────────────────────────────────────────────
function Soon() {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
      bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400
      border border-amber-200 dark:border-amber-500/20">
      Coming soon
    </span>
  )
}

// ── Theme selector ────────────────────────────────────────────────────────────
function ThemeSelector({ value, onChange }: {
  value: "light" | "dark" | "system"; onChange: (v: "light" | "dark" | "system") => void
}) {
  const options = [
    { val: "light",  icon: <Sun     className="h-3.5 w-3.5" />, label: "Light"  },
    { val: "dark",   icon: <Moon    className="h-3.5 w-3.5" />, label: "Dark"   },
    { val: "system", icon: <Monitor className="h-3.5 w-3.5" />, label: "System" },
  ] as const
  return (
    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/[0.05] rounded-xl">
      {options.map(o => (
        <button key={o.val} onClick={() => onChange(o.val)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all",
            value === o.val
              ? "bg-white dark:bg-[#1a1d27] text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
          )}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function SettingsPage() {
  // Notification settings
  const [emailNotif,    setEmailNotif]    = useState(true)
  const [smsNotif,      setSmsNotif]      = useState(false)
  const [pushNotif,     setPushNotif]     = useState(true)
  const [maintenanceNotif, setMaintenanceNotif] = useState(true)
  const [eventNotif,    setEventNotif]    = useState(true)
  const [visitorNotif,  setVisitorNotif]  = useState(true)
  const [pollNotif,     setPollNotif]     = useState(false)

  // Privacy settings
  const [showContact,   setShowContact]   = useState(true)
  const [showFlat,      setShowFlat]      = useState(true)
  const [activityLog,   setActivityLog]   = useState(true)

  // Appearance
  const [theme,         setTheme]         = useState<"light" | "dark" | "system">("system")
  const [compactMode,   setCompactMode]   = useState(false)
  const [animations,    setAnimations]    = useState(true)

  // Regional
  const [language,      setLanguage]      = useState("English")
  const [timezone,      setTimezone]      = useState("Asia/Kolkata (IST)")
  const [dateFormat,    setDateFormat]    = useState("DD MMM YYYY")

  return (
    <div className="min-h-full bg-[#f0f4ff] dark:bg-[#07080f] p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-[20px] font-black text-gray-900 dark:text-white">Settings</h1>
          <p className="text-[12.5px] text-gray-400 mt-0.5">Manage your preferences and application settings</p>
        </div>

        {/* ── Static info banner ── */}
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl
          bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
          <AlertCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
            Some settings are previews and will be connected to the backend in a future update.
            Changes marked <span className="font-bold">Coming soon</span> are saved locally for now.
          </p>
        </div>

        {/* ════════════════════════════
            NOTIFICATIONS
        ════════════════════════════ */}
        <Section icon={<Bell className="h-4 w-4" />} title="Notifications" color="indigo">
          <SettingRow
            label="Email Notifications"
            description="Receive important updates via email"
            right={<Toggle value={emailNotif} onChange={setEmailNotif} />}
          />
          <SettingRow
            label="SMS Notifications"
            description="Get alerts on your registered mobile number"
            right={<Toggle value={smsNotif} onChange={setSmsNotif} />}
          />
          <SettingRow
            label="Push Notifications"
            description="Browser or app push notifications"
            right={<div className="flex items-center gap-2"><Soon /><Toggle value={pushNotif} onChange={setPushNotif} /></div>}
          />
          <SettingRow
            label="Maintenance Alerts"
            description="Due dates, payment confirmations and receipts"
            right={<Toggle value={maintenanceNotif} onChange={setMaintenanceNotif} />}
          />
          <SettingRow
            label="Event Announcements"
            description="New events and updates in your society"
            right={<Toggle value={eventNotif} onChange={setEventNotif} />}
          />
          <SettingRow
            label="Visitor Alerts"
            description="Get notified when a visitor checks in for you"
            right={<Toggle value={visitorNotif} onChange={setVisitorNotif} />}
          />
          <SettingRow
            label="Poll &amp; Voting"
            description="New polls and voting reminders"
            right={<Toggle value={pollNotif} onChange={setPollNotif} />}
          />
        </Section>

        {/* ════════════════════════════
            APPEARANCE
        ════════════════════════════ */}
        <Section icon={<Palette className="h-4 w-4" />} title="Appearance" color="violet">
          <SettingRow
            label="Theme"
            description="Choose your preferred color scheme"
            right={<ThemeSelector value={theme} onChange={setTheme} />}
          />
          <SettingRow
            label="Compact Mode"
            description="Reduce spacing for a denser layout"
            right={<div className="flex items-center gap-2"><Soon /><Toggle value={compactMode} onChange={setCompactMode} /></div>}
          />
          <SettingRow
            label="Animations"
            description="Enable smooth transitions and animations"
            right={<Toggle value={animations} onChange={setAnimations} />}
          />
        </Section>

        {/* ════════════════════════════
            PRIVACY
        ════════════════════════════ */}
        <Section icon={<Eye className="h-4 w-4" />} title="Privacy" color="emerald">
          <SettingRow
            label="Show Contact to Residents"
            description="Other residents can see your phone number in the directory"
            right={<Toggle value={showContact} onChange={setShowContact} />}
          />
          <SettingRow
            label="Show Flat Number"
            description="Display your flat number in the resident directory"
            right={<Toggle value={showFlat} onChange={setShowFlat} />}
          />
          <SettingRow
            label="Activity Log"
            description="Allow the system to keep a log of your actions"
            right={<Toggle value={activityLog} onChange={setActivityLog} />}
          />
        </Section>

        {/* ════════════════════════════
            REGIONAL
        ════════════════════════════ */}
        <Section icon={<Globe className="h-4 w-4" />} title="Regional" color="blue">
          <SettingRow
            label="Language"
            description="App display language"
            right={
              <div className="flex items-center gap-2">
                <Soon />
                <span className="text-[12px] font-semibold text-gray-600 dark:text-gray-300">{language}</span>
              </div>
            }
          />
          <SettingRow
            label="Timezone"
            description="Used for all date/time display"
            right={<span className="text-[12px] font-semibold text-gray-600 dark:text-gray-300">{timezone}</span>}
          />
          <SettingRow
            label="Date Format"
            description="How dates are displayed throughout the app"
            right={
              <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
                {["DD MMM YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map(f => (
                  <button key={f} onClick={() => setDateFormat(f)}
                    className={cn("px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all",
                      dateFormat === f
                        ? "bg-white dark:bg-[#1a1d27] text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-gray-400 hover:text-gray-600"
                    )}>
                    {f}
                  </button>
                ))}
              </div>
            }
          />
        </Section>

        {/* ════════════════════════════
            SECURITY
        ════════════════════════════ */}
        <Section icon={<Shield className="h-4 w-4" />} title="Security" color="amber">
          {[
            { label: "Two-Factor Authentication", desc: "Add an extra layer of security with OTP on login" },
            { label: "Active Sessions",            desc: "View and manage devices signed into your account" },
            { label: "Login History",              desc: "See recent login activity and locations" },
          ].map(item => (
            <button key={item.label}
              className="flex items-center justify-between gap-4 w-full py-3.5 text-left group">
              <div>
                <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">{item.label}</p>
                <p className="text-[11.5px] text-gray-400 mt-0.5">{item.desc}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Soon />
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </button>
          ))}
        </Section>

        {/* ════════════════════════════
            DATA & STORAGE
        ════════════════════════════ */}
        <Section icon={<Database className="h-4 w-4" />} title="Data &amp; Storage" color="rose">
          <SettingRow
            label="Export My Data"
            description="Download all your data as a ZIP file"
            right={
              <button className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-bold
                bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300
                hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-all border border-gray-200 dark:border-white/[0.08]">
                <Download className="h-3.5 w-3.5" />Export
              </button>
            }
          />
          <SettingRow
            label="Clear Cache"
            description="Remove locally stored data to free up space"
            right={
              <button
                onClick={() => { try { localStorage.clear(); alert("Cache cleared!") } catch { /* ignore */ } }}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-bold
                  bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400
                  border border-rose-200 dark:border-rose-500/20
                  hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all">
                <Trash2 className="h-3.5 w-3.5" />Clear
              </button>
            }
          />
          <SettingRow
            label="Delete Account"
            description="Permanently remove your account and all associated data"
            right={
              <div className="flex items-center gap-2">
                <Soon />
                <span className="text-[11px] text-gray-400 font-medium">Contact admin</span>
              </div>
            }
          />
        </Section>

        {/* ════════════════════════════
            ABOUT / HELP
        ════════════════════════════ */}
        <Section icon={<HelpCircle className="h-4 w-4" />} title="About &amp; Help" color="blue">
          {[
            { label: "Help &amp; Documentation",   desc: "User guides and FAQs",        icon: <HelpCircle className="h-3.5 w-3.5" /> },
            { label: "Terms of Service",        desc: "Read our terms",                icon: <FileText   className="h-3.5 w-3.5" /> },
            { label: "Privacy Policy",          desc: "How we handle your data",       icon: <Lock       className="h-3.5 w-3.5" /> },
            { label: "Contact Support",         desc: "Get help from the team",        icon: <Mail       className="h-3.5 w-3.5" /> },
          ].map(item => (
            <button key={item.label}
              className="flex items-center justify-between gap-4 w-full py-3.5 text-left group">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100" dangerouslySetInnerHTML={{ __html: item.label }} />
                  <p className="text-[11.5px] text-gray-400">{item.desc}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
            </button>
          ))}
        </Section>

        {/* ── App version ── */}
        <div className="text-center py-4">
          <p className="text-[11.5px] text-gray-400">Society 365 · Version 1.0.0</p>
          <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-0.5">© Powered By Nexspire Technologies. All rights reserved.</p>
        </div>

      </div>
    </div>
  )
}