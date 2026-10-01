import { useMemo } from 'react'
import { useStore } from './store.jsx'
import { resolveDay, daySessions, dailyTestId, dueRevisions } from './engine.js'
import { DEFAULT_START_MIN, testUnlockMin, phaseOf, slotTimes } from './plan.js'
import { topicName } from './syllabus.js'

export function goalFor(slot, topicId, rday, extra = {}) {
  const t = topicName(topicId)
  const phase = phaseOf(rday.day_no)?.id
  if (rday.is_mock_day && slot.key === 'r-concept') return 'Full Prelims Mock — 80 questions, 45 minutes (25 + 20, sectional timing)'
  if (rday.is_mock_day && slot.key === 'n-concept') return 'Mock analysis — review every wrong and skipped question; add them to the Mistake Book'
  if (slot.key === 'revision') return `Revise ${extra.due ?? 0} due topic(s) and re-attempt Mistake Book questions`
  if (slot.key === 'weak') return `${t}: 20 focused questions${rday.weak_reason ? ` — ${rday.weak_reason}` : ''}`
  if (slot.mode === 'concept') {
    if (phase === 3) return `Speed drill on ${t}: 25 timed questions at target pace`
    if (phase === 4) return `Revise ${t}: formula/notes recap + 20 mixed-level questions`
    return `Learn ${t}: study the key concepts, then solve 15 basic questions`
  }
  if (phase === 3) return `Timed practice: 30 questions on ${t}, aim ≥ 80% accuracy`
  return `Practice ${t}: solve 25–30 questions, aim ≥ 80% accuracy`
}

export function useTodayInfo() {
  const { state, plan, stats, today, nowMin } = useStore()
  return useMemo(() => {
    const startMin = state.profile?.study_start_min ?? DEFAULT_START_MIN
    const unlockMin = testUnlockMin(startMin)
    const day = plan.find((d) => d.date === today) || null
    if (!day) return { day: null, startMin, unlockMin, testUnlocked: false }
    const rday = resolveDay(state, day, stats, plan)
    const due = dueRevisions(state, today)
    const sessions = daySessions(state, rday).map((s) => ({ ...s, times: slotTimes(s.slot, startMin), goal: s.goal || goalFor(s.slot, s.topic_id, rday, { due: due.length }) }))
    const testAttempt = state.attempts[dailyTestId(day.day_no)] || null
    const next = sessions.find((s) => s.status === 'in_progress' || s.status === 'paused') || sessions.find((s) => s.status !== 'completed')
    const lastDone = [...sessions].reverse().find((s) => s.status === 'completed')
    return { day, rday, sessions, testAttempt, startMin, unlockMin, testUnlocked: nowMin >= unlockMin, next, lastDone, due }
  }, [state, plan, stats, today, nowMin])
}
