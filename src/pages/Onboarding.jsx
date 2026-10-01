import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { Field, Segmented } from '../components/ui.jsx'
import { ALLOWED_START_TIMES, studyDates, PHASES } from '../lib/plan.js'
import { fmtDate, fmtTime, todayISO, addDays, isSunday } from '../lib/dates.js'
import { EXAM } from '../lib/syllabus.js'

export default function Onboarding() {
  const { actions, state } = useStore()
  const t = todayISO()
  const [f, setF] = useState({
    name: state.profile?.name || '',
    start_date: isSunday(t) ? addDays(t, 1) : t,
    target_exam: EXAM.name + ' — Prelims',
    study_start_min: 600, level: 'beginner', reasoning_confidence: 'average', numerical_confidence: 'average', language: 'en',
  })
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v?.target ? v.target.value : v }))
  const dates = f.start_date ? studyDates(f.start_date) : []
  const valid = f.name.trim() && f.start_date

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50 px-4 py-8 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <img src="icon.svg" alt="" className="mx-auto mb-3 h-14 w-14" />
          <h1 className="h1">Welcome to Your 60-Day RRB Office Assistant Prelims Preparation</h1>
          <p className="muted mt-2">Tell us a little about yourself — we’ll build one integrated day-by-day plan covering all five subjects (Mon–Sat, Sundays for weekly review).</p>
        </div>
        <form className="card space-y-5" onSubmit={(e) => { e.preventDefault(); if (valid) actions.completeOnboarding({ ...f, name: f.name.trim(), study_start_min: +f.study_start_min }) }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name"><input className="input" required value={f.name} onChange={set('name')} placeholder="e.g. Priya" /></Field>
            <Field label="Start date" hint={isSunday(f.start_date) ? 'Sunday is a rest day — Day 1 will be Monday.' : undefined}>
              <input className="input" type="date" required value={f.start_date} onChange={set('start_date')} />
            </Field>
            <Field label="Target exam"><input className="input" value={f.target_exam} readOnly /></Field>
            <Field label="Preferred study time" hint="8 hours, Daily Test is always the final 30 minutes.">
              <select className="input" value={f.study_start_min} onChange={set('study_start_min')}>
                {ALLOWED_START_TIMES.map((m) => <option key={m} value={m}>{fmtTime(m)} – {fmtTime(m + 480)}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Preparation level">
            <Segmented value={f.level} onChange={set('level')} options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }]} />
          </Field>
          <Field label="Reasoning confidence">
            <Segmented value={f.reasoning_confidence} onChange={set('reasoning_confidence')} options={[{ value: 'weak', label: 'Weak' }, { value: 'average', label: 'Average' }, { value: 'strong', label: 'Strong' }]} />
          </Field>
          <Field label="Numerical Ability confidence">
            <Segmented value={f.numerical_confidence} onChange={set('numerical_confidence')} options={[{ value: 'weak', label: 'Weak' }, { value: 'average', label: 'Average' }, { value: 'strong', label: 'Strong' }]} />
          </Field>
          <Field label="Language test (Mains)" hint="IBPS lets you choose English Language or Hindi Language in Mains. You can change this later in Settings.">
            <Segmented value={f.language} onChange={set('language')} options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिन्दी Hindi' }]} />
          </Field>
          {dates.length > 0 && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
              <div className="font-semibold">Your plan: Day 1 on {fmtDate(dates[0], { weekday: 'long', day: 'numeric', month: 'long' })} → Day 60 on {fmtDate(dates[59], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">{PHASES.map((p) => <span key={p.id} className="chip bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300">P{p.id} · {p.name} · Days {p.from}–{p.to}</span>)}</div>
              <p className="muted mt-2">Prelims window: {EXAM.window}.</p>
            </div>
          )}
          <button className="btn-primary w-full !py-3 text-base" disabled={!valid}><Sparkles size={18} />Generate My 60-Day Plan</button>
        </form>
      </div>
    </div>
  )
}
