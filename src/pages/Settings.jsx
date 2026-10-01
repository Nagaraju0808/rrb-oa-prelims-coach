import { useRef, useState } from 'react'
import { Download, Upload, CalendarClock, Bell, RotateCcw, Trash2, Save } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { ALLOWED_START_TIMES, SLOTS, slotTimes } from '../lib/plan.js'
import { fmtTime, todayISO } from '../lib/dates.js'
import { applyTheme, getTheme } from '../lib/theme.js'
import { PageHeader, Field, Segmented, Toggle, Modal } from '../components/ui.jsx'

export default function SettingsPage() {
  const { state, actions } = useStore()
  const p = state.profile
  const [f, setF] = useState({ name: p.name, start_date: p.start_date, study_start_min: p.study_start_min ?? 600, language: p.language || 'en',
    count: p.daily_test?.count || 30, mix: p.daily_test?.mix || { easy: 30, medium: 50, hard: 20 }, level: p.level, reasoning_confidence: p.reasoning_confidence, numerical_confidence: p.numerical_confidence })
  const [theme, setTheme] = useState(getTheme())
  const [saved, setSaved] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const fileRef = useRef()
  const [importMsg, setImportMsg] = useState('')
  const mixTotal = f.mix.easy + f.mix.medium + f.mix.hard

  const save = () => {
    actions.updateProfile({ name: f.name.trim() || p.name, start_date: f.start_date, study_start_min: +f.study_start_min, language: f.language, level: f.level,
      reasoning_confidence: f.reasoning_confidence, numerical_confidence: f.numerical_confidence, daily_test: { count: +f.count, mix: f.mix } })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `rrb-coach-backup-${todayISO()}.json`; a.click(); URL.revokeObjectURL(a.href)
  }
  const importData = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    try {
      const json = JSON.parse(await file.text())
      if (!json.profile || !json.sessions) throw new Error('This is not a backup from this app.')
      actions.importState(json); setImportMsg('Backup restored.')
    } catch (err) { setImportMsg(`Import failed: ${err.message}`) }
    e.target.value = ''
  }

  return (
    <div className="fade-in space-y-5">
      <PageHeader title="Settings" />
      <div className="card space-y-4">
        <h2 className="h2">Profile & plan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Start date" hint={f.start_date !== p.start_date ? '⚠️ Changing the start date moves all 60 study dates. Completed records stay attached to their day numbers.' : 'Sundays are skipped automatically.'}>
            <input className="input" type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
          <Field label="Study hours" hint="The whole 8-hour block shifts together; the Daily Test always stays the final 30 minutes.">
            <select className="input" value={f.study_start_min} onChange={(e) => setF({ ...f, study_start_min: +e.target.value })}>
              {ALLOWED_START_TIMES.map((m) => <option key={m} value={m}>{fmtTime(m)} – {fmtTime(m + 480)} (Daily Test suggested from {fmtTime(m + 450)})</option>)}</select></Field>
          <Field label="Language test (Mains)" hint={f.language !== (p.language || 'en') ? 'Saving switches the English/Hindi topics in your plan. Finished days keep their history.' : 'IBPS lets you choose English Language (4a) or Hindi Language (4b) in Mains.'}>
            <select className="input" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}><option value="en">English Language</option><option value="hi">Hindi Language (हिन्दी)</option></select></Field>
        </div>
        <Field label="Preparation level"><Segmented value={f.level} onChange={(v) => setF({ ...f, level: v })} options={['beginner', 'intermediate', 'advanced'].map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }))} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reasoning confidence"><Segmented value={f.reasoning_confidence} onChange={(v) => setF({ ...f, reasoning_confidence: v })} options={['weak', 'average', 'strong'].map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }))} /></Field>
          <Field label="Numerical confidence"><Segmented value={f.numerical_confidence} onChange={(v) => setF({ ...f, numerical_confidence: v })} options={['weak', 'average', 'strong'].map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }))} /></Field>
        </div>
        <h3 className="pt-2 font-bold">Daily Test</h3>
        <Field label="Question count"><Segmented value={+f.count} onChange={(v) => setF({ ...f, count: v })} options={[20, 30, 40].map((n) => ({ value: n, label: `${n} Q · ${n} min` }))} /></Field>
        <div className="grid grid-cols-3 gap-3">
          {['easy', 'medium', 'hard'].map((k) => (
            <Field key={k} label={`${k} %`}><input className="input" type="number" min="0" max="100" step="5" value={f.mix[k]} onChange={(e) => setF({ ...f, mix: { ...f.mix, [k]: Math.max(0, Math.min(100, +e.target.value || 0)) } })} /></Field>))}
        </div>
        {mixTotal !== 100 && <p className="text-sm text-rose-600">Difficulty percentages must add up to 100 (now {mixTotal}).</p>}
        <button className="btn-primary" onClick={save} disabled={mixTotal !== 100}><Save size={16} />{saved ? 'Saved ✓' : 'Save settings'}</button>
      </div>

      <div className="card">
        <div className="mb-2 flex items-center gap-2"><CalendarClock size={16} className="text-slate-500" /><h2 className="h2">Daily timetable</h2></div>
        <p className="muted mb-3">Integrated Prelims + Mains timetable. Times are a guide: the Daily Test is the last item of the day and becomes available as soon as today’s preparation is complete — it is never locked to a clock time.</p>
        <div className="grid gap-1 text-sm sm:grid-cols-2">
          {SLOTS.map((s) => { const t = slotTimes(s, +f.study_start_min); return (
            <div key={s.key} className={`flex gap-3 rounded-lg px-2 py-1 ${s.kind === 'test' ? 'bg-brand-50 font-bold text-brand-700 dark:bg-blue-950 dark:text-blue-300' : ''}`}>
              <span className="w-36 text-slate-500">{fmtTime(t.start)} – {fmtTime(t.end)}</span><span>{s.label}{s.kind === 'test' && ' (suggested — opens when ready)'}{s.optional && ' (optional)'}</span></div>) })}
        </div>
      </div>

      <div className="card space-y-1">
        <h2 className="h2 mb-2">Appearance & reminders</h2>
        <Field label="Theme"><Segmented value={theme} onChange={(t) => { setTheme(t); applyTheme(t) }} options={[{ value: 'light', label: '☀️ Light' }, { value: 'dark', label: '🌙 Dark' }, { value: 'system', label: '💻 System' }]} /></Field>
        <Toggle label="Study & Daily Test reminders" checked={p.notifications?.enabled !== false} onChange={(v) => actions.updateProfile({ notifications: { ...p.notifications, enabled: v } })} />
        <p className="muted">Reminders: 10 min before study starts, at revision time, at the suggested Daily Test time, when your Daily Test becomes ready, and at day end. They appear in the 🔔 bell while the app is open{perm === 'granted' ? ' and as device notifications' : ''}.</p>
        {perm !== 'granted' && perm !== 'unsupported' && <button className="btn-secondary mt-2" onClick={async () => setPerm(await Notification.requestPermission())}><Bell size={16} />Allow device notifications</button>}
        {perm === 'denied' && <p className="text-sm text-amber-600">Notifications are blocked in your browser settings for this site.</p>}
      </div>

      <div className="card">
        <h2 className="h2 mb-1">Your data</h2>
        <p className="muted mb-3">Everything is saved privately on this device (no account needed). The app also keeps an automatic daily safety copy. Export a backup file regularly (clearing browser data deletes everything), and import it to move to another device or browser.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={exportData}><Download size={16} />Export backup</button>
          <button className="btn-secondary" onClick={() => fileRef.current.click()}><Upload size={16} />Import backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importData} />
          <button className="btn-secondary" onClick={() => setImportMsg(actions.restoreBackup() ? 'Restored the automatic daily safety backup.' : 'No automatic backup found yet.')}><RotateCcw size={16} />Restore daily safety backup</button>
          <button className="btn-secondary text-amber-700" onClick={() => setConfirm('reset')}><RotateCcw size={16} />Reset progress</button>
          <button className="btn-danger" onClick={() => setConfirm('over')}><Trash2 size={16} />Start over</button>
        </div>
        {importMsg && <p className="mt-2 text-sm" role="status">{importMsg}</p>}
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm === 'reset' ? 'Reset all progress?' : 'Start over?'}
        footer={<><button className="btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
          <button className="btn-danger" onClick={() => { confirm === 'reset' ? actions.resetProgress() : actions.startOver(); setConfirm(null) }}>Yes, {confirm === 'reset' ? 'reset progress' : 'start over'}</button></>}>
        <p className="text-sm">{confirm === 'reset' ? 'This deletes all sessions, tests, mistakes, revisions and achievements. Your profile, plan settings and admin content are kept.' : 'This deletes your progress AND your profile, and shows the first-time setup again. Admin content is kept.'} Consider exporting a backup first. This cannot be undone.</p>
      </Modal>
    </div>
  )
}
