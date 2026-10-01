import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarRange, ListChecks, Brain, Calculator, FileClock, ClipboardList, Trophy, BookX, RotateCcw, BarChart3,
  CalendarDays, Award, Settings, Shield, Menu, X, Bell, Moon, Sun, HardDrive, Play,
} from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { cx } from './ui.jsx'
import { fmtTime } from '../lib/dates.js'
import { DEFAULT_START_MIN, testUnlockMin } from '../lib/plan.js'
import { applyTheme, getTheme } from '../lib/theme.js'

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/plan', label: '60-Day Plan', icon: CalendarRange },
  { to: '/today', label: "Today's Plan", icon: ListChecks },
  { to: '/reasoning', label: 'Reasoning', icon: Brain },
  { to: '/numerical', label: 'Numerical Ability', icon: Calculator },
  { to: '/daily-test', label: 'Daily Test', icon: FileClock },
  { to: '/practice', label: 'Practice Tests', icon: ClipboardList },
  { to: '/mock-tests', label: 'Mock Tests', icon: Trophy },
  { to: '/mistakes', label: 'Mistake Book', icon: BookX },
  { to: '/revision', label: 'Revision', icon: RotateCcw },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/achievements', label: 'Achievements', icon: Award },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function useReminders() {
  const { state, today, nowMin, plan, actions } = useStore()
  useEffect(() => {
    const p = state.profile
    if (!p || p.notifications?.enabled === false) return
    const day = plan.find((d) => d.date === today)
    if (!day) return
    const s = p.study_start_min ?? DEFAULT_START_MIN, t = testUnlockMin(s), end = s + 480
    const list = [
      { at: s - 10, key: 'start', title: '⏰ Study starts soon', body: 'Your study session starts in 10 minutes.' },
      { at: t - 30, key: 'revise', title: '📘 30 minutes left', body: "Complete today's revision before the Daily Test." },
      { at: t - 5, key: 'test-soon', title: '📝 Daily Test in 5 minutes', body: `Daily Test starts at ${fmtTime(t)}.` },
      { at: t, key: 'test-ready', title: '🟢 Your Daily Test is ready', body: 'It is based on today’s topics — 30 questions, 30 minutes.' },
      { at: end, key: 'done', title: '🎉 Day complete', body: "Today's preparation is complete!" },
    ]
    for (const r of list) {
      const key = `${today}:${r.key}`
      if (nowMin >= r.at && nowMin < r.at + 20 && !state.firedReminders?.[key]) {
        actions.notify(r.title, r.body, key)
        try {
          if ('Notification' in window && Notification.permission === 'granted') new Notification(r.title, { body: r.body, icon: 'icon-192.png', tag: key })
        } catch { /* some browsers only allow notifications from a service worker */ }
      }
    }
  }, [nowMin, today, plan, state.profile, state.firedReminders, actions])
}

export default function Layout() {
  const { state, ov, nowMin, actions } = useStore()
  const [open, setOpen] = useState(false)
  const [bell, setBell] = useState(false)
  const [theme, setTheme] = useState(getTheme())
  const loc = useLocation()
  const nav = useNavigate()
  useReminders()
  useEffect(() => setOpen(false), [loc.pathname])
  const notes = Object.values(state.notifications || {}).sort((a, b) => (a.at < b.at ? 1 : -1))
  const unread = notes.filter((n) => !n.read).length
  const isDark = theme === 'dark' || (theme === 'system' && document.documentElement.classList.contains('dark'))
  const toggleTheme = () => { const t = isDark ? 'light' : 'dark'; applyTheme(t); setTheme(t); actions.updateProfile({ theme: t }) }
  const items = [...NAV, { to: '/admin', label: 'Admin Panel', icon: Shield }]
  const testUnlocked = nowMin >= testUnlockMin(state.profile?.study_start_min ?? DEFAULT_START_MIN)

  const NavList = (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end}
          className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
            isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>
          <Icon size={18} /> <span className="flex-1">{label}</span>
          {to === '/daily-test' && <span className={cx('h-2 w-2 rounded-full', testUnlocked ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600')} aria-hidden />}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4 lg:flex dark:border-slate-800 dark:bg-slate-900">
        <Brand />
        <div className="mt-4 flex-1 overflow-y-auto">{NavList}</div>
        <SavedPill />
      </aside>
      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-slate-950/50" />
          <aside className="fade-in absolute top-0 left-0 flex h-full w-72 flex-col bg-white px-3 py-4 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><Brand /><button className="btn-ghost !p-2" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
            <div className="mt-4 flex-1 overflow-y-auto">{NavList}</div>
            <SavedPill />
          </aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-white/85 px-4 py-2.5 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-950/85">
          <button className="btn-ghost !p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{state.profile?.name ? `Hi, ${state.profile.name.split(' ')[0]}` : 'RRB OA Prelims Coach'}</div>
            <div className="truncate text-xs text-slate-500">{ov.currentDay ? `Day ${ov.currentDay} / 60 · 🔥 ${ov.streak.current}-day streak` : 'Plan not started yet'}</div>
          </div>
          <button className="btn-primary hidden !py-1.5 sm:inline-flex" onClick={() => nav('/?studynow=1')}><Play size={15} /> Study Now</button>
          <button className="btn-ghost !p-2" onClick={toggleTheme} aria-label="Toggle dark mode">{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
          <div className="relative">
            <button className="btn-ghost relative !p-2" aria-label={`Notifications (${unread} unread)`} onClick={() => { setBell((b) => !b); if (!bell) actions.markNotificationsRead() }}>
              <Bell size={18} />{unread > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" />}
            </button>
            {bell && (
              <div className="fade-in absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between px-2 py-1"><span className="text-sm font-bold">Notifications</span>
                  {notes.length > 0 && <button className="text-xs text-brand-600 hover:underline" onClick={() => actions.clearNotifications()}>Clear all</button>}</div>
                <div className="max-h-80 overflow-y-auto">
                  {notes.length === 0 && <p className="muted px-2 py-6 text-center">No notifications yet.</p>}
                  {notes.slice(0, 30).map((n) => (
                    <div key={n.id} className="rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <div className="text-sm font-semibold">{n.title}</div>
                      <div className="text-xs text-slate-500">{n.body}</div>
                      <div className="mt-0.5 text-[10px] text-slate-400">{new Date(n.at).toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-24 sm:px-6 lg:pb-10">
          <Outlet />
        </main>
        {/* Mobile bottom bar */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95" aria-label="Quick">
          {[NAV[0], NAV[2], NAV[5], NAV[8], NAV[10]].map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold', isActive ? 'text-brand-600 dark:text-blue-400' : 'text-slate-500')}>
              <Icon size={20} />{label.replace("Today's Plan", 'Today').replace('Mistake Book', 'Mistakes')}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2">
      <img src="icon.svg" alt="" className="h-9 w-9" />
      <div className="leading-tight">
        <div className="text-sm font-bold text-slate-900 dark:text-white">RRB OA Prelims</div>
        <div className="text-[11px] text-slate-500">60-Day Study Coach</div>
      </div>
    </div>
  )
}

function SavedPill() {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      <HardDrive size={14} />Progress saved on this device
    </div>
  )
}
