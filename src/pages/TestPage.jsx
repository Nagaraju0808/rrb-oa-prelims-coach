import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { resolveQuestions } from '../lib/engine.js'
import TestRunner from '../components/TestRunner.jsx'
import TestResult from '../components/TestResult.jsx'
import { Empty } from '../components/ui.jsx'

const BACK = { daily: ['/daily-test', 'Daily Test'], weekly: ['/daily-test', 'Daily & Weekly Tests'], mock: ['/mock-tests', 'Mock Tests'], mistakes: ['/mistakes', 'Mistake Book'], practice: ['/today', "Today's Plan"], 'revision-quiz': ['/today', "Today's Plan"] }
const LABELS = { '/today': "Today's Plan", '/revision': 'Revision', '/daily-test': 'Daily Test' }

export default function TestPage() {
  const { id } = useParams()
  const { state, actions } = useStore()
  const nav = useNavigate()
  const attempt = state.attempts[id]
  const qKey = attempt?.question_ids.join(',')
  const questions = useMemo(() => (attempt ? resolveQuestions(attempt.question_ids, state.content) : []), [qKey, state.content]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!attempt) return <Empty icon="🔎" title="Test not found">It may have been discarded. <Link className="text-brand-600 underline" to="/practice">Start a new practice test</Link>.</Empty>
  if (!questions.length) return <Empty icon="⚠️" title="No questions available">The topics for this test have no questions. Add some in the Admin panel.</Empty>
  const [defBack, defLabel] = BACK[attempt.kind] || ['/practice', 'Practice Tests']
  const back = attempt.return_to || defBack
  const backLabel = LABELS[back] || (back.startsWith('/topic/') ? 'Topic' : defLabel)

  if (!attempt.submitted_at) {
    return <TestRunner key={attempt.id} attempt={attempt} questions={questions} sections={attempt.sections} />
  }
  return (
    <TestResult attempt={attempt} questions={questions} actionsSlot={<>
      <Link to={back} className={back === '/today' ? 'btn-primary' : 'btn-secondary'}>← Back to {backLabel}</Link>
      {attempt.session_id && back !== '/today' && <Link to="/today" className="btn-primary">Continue today’s plan</Link>}
      {attempt.wrong + attempt.skipped > 0 && <Link to="/mistakes" className="btn-ghost">Open Mistake Book</Link>}
      {['practice', 'topic', 'subject', 'mixed'].includes(attempt.kind) && (
        <button className="btn-ghost" onClick={() => {
          const nid = actions.createAttempt({ kind: attempt.kind, title: `${attempt.title} (retake)`, questions, duration_sec: attempt.duration_sec, topics: attempt.topics })
          nav(`/test/${nid}`)
        }}><RotateCcw size={16} />Retake same questions</button>
      )}
    </>} />
  )
}
