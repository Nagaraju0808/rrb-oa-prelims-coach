import { useMemo } from 'react'
import { useStore } from './store.jsx'
import { resolveDay, daySessions, dailyTestId, dueRevisions, readiness } from './engine.js'
import { DEFAULT_START_MIN, testSuggestedMin, phaseOf, slotTimes } from './plan.js'
import { topicName } from './syllabus.js'

export function goalFor(slot, topicId, rday, extra = {}) {
  const t = topicName(topicId)
  const phase = phaseOf(rday.day_no)?.id
  const mock = rday.mock_type === 'mains' ? 'Mains-pattern mock (200 Q, 120 min)' : 'Prelims-pattern mock (80 Q, 45 min)'
  if (rday.is_mock_day && slot.key === 'reasoning') return `Full ${mock}`
  if (rday.is_mock_day && slot.key === 'numerical') return 'Mock analysis — review every wrong and skipped question; add them to the Mistake Book'
  if (slot.key === 'revision') return `Revise ${extra.due ?? 0} due topic(s), then take the revision quiz`
  if (slot.key === 'weak') return `${t}: 20 focused questions${rday.weak_reason ? ` — ${rday.weak_reason}` : ''}`
  if (phase === 3 && (slot.subject === 'reasoning' || slot.subject === 'numerical')) return `Speed drill on ${t}: shortcuts first, then timed questions at exam pace`
  if (phase === 4) return `Revise ${t}: concept + shortcuts recap, practice, revision quiz`
  return `${t}: learn the concept and shortcuts, practise, then take the revision quiz`
}

export function useTodayInfo() {
  const { state, plan, stats, today, nowMin } = useStore()
  return useMemo(() => {
    const startMin = state.profile?.study_start_min ?? DEFAULT_START_MIN
    const suggestedMin = testSuggestedMin(startMin)
    const day = plan.find((d) => d.date === today) || null
    if (!day) return { day: null, startMin, suggestedMin }
    const rday = resolveDay(state, day, stats, plan)
    const due = dueRevisions(state, today)
    const sessions = daySessions(state, rday).map((s) => ({ ...s, times: slotTimes(s.slot, startMin), goal: s.goal || goalFor(s.slot, s.topic_id, rday, { due: due.length }) }))
    const testAttempt = state.attempts[dailyTestId(day.day_no)] || null
    const next = sessions.find((s) => s.status === 'in_progress' || s.status === 'paused') || sessions.find((s) => s.status !== 'completed' && !s.slot.optional)
      || sessions.find((s) => s.status !== 'completed')
    const lastDone = [...sessions].reverse().find((s) => s.status === 'completed')
    return { day, rday, sessions, testAttempt, startMin, suggestedMin, pastSuggested: nowMin >= suggestedMin, next, lastDone, due, ready: readiness(state, rday) }
  }, [state, plan, stats, today, nowMin])
}
