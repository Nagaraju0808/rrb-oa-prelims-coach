import { useStore } from '../lib/store.jsx'
import { ACHIEVEMENTS } from '../lib/engine.js'
import { PageHeader, ProgressBar, cx } from '../components/ui.jsx'

export default function Achievements() {
  const { state, ov, stats } = useStore()
  const learned = Object.values(stats).filter((s) => s.learned).length
  const progress = {
    'streak-7': ov.streak.best / 7, 'streak-15': ov.streak.best / 15, 'streak-30': ov.streak.best / 30, 'q-1000': ov.questions / 1000, 'q-5000': ov.questions / 5000,
    syllabus: learned / Object.keys(stats).length, 'mistake-master': Object.values(state.mistakes).filter((m) => m.mastered).length / 25,
  }
  const got = Object.keys(state.achievements).length
  return (
    <div className="fade-in">
      <PageHeader title="Achievements" subtitle={`${got} of ${ACHIEVEMENTS.length} unlocked · current streak ${ov.streak.current}, best ${ov.streak.best}`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const u = state.achievements[a.key]
          const p = Math.min(1, progress[a.key] ?? (u ? 1 : 0))
          return (
            <div key={a.key} className={cx('card flex items-center gap-4', !u && 'opacity-70')}>
              <div className={cx('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl', u ? 'bg-amber-100 dark:bg-amber-950' : 'bg-slate-100 grayscale dark:bg-slate-800')}>{a.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{a.name}</div>
                <div className="text-xs text-slate-500">{a.desc}</div>
                {u ? <div className="mt-1 text-xs font-semibold text-emerald-600">Unlocked {new Date(u.unlocked_at).toLocaleDateString('en-IN')}</div>
                  : <ProgressBar value={p * 100} className="mt-2" color="bg-amber-500" />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
