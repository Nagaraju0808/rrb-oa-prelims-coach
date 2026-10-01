import { useEffect, lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { StoreProvider, useStore } from './lib/store.jsx'
import { applyTheme, getTheme } from './lib/theme.js'
import Layout from './components/Layout.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Dashboard from './pages/Dashboard.jsx'
import PlanPage from './pages/Plan.jsx'
import Today from './pages/Today.jsx'
import SubjectPage from './pages/Subject.jsx'
import TopicPage from './pages/Topic.jsx'
import DailyTest from './pages/DailyTest.jsx'
import Practice from './pages/Practice.jsx'
import TestPage from './pages/TestPage.jsx'
import Mistakes from './pages/Mistakes.jsx'
import Revision from './pages/Revision.jsx'
import CalendarPage from './pages/Calendar.jsx'
import Achievements from './pages/Achievements.jsx'
import SettingsPage from './pages/Settings.jsx'

const Analytics = lazy(() => import('./pages/Analytics.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))
const Mock = lazy(() => import('./pages/Mock.jsx'))

function Routed() {
  const { state } = useStore()
  if (!state.profile?.start_date) return <Onboarding />
  return (
    <Suspense fallback={<div className="muted p-10 text-center">Loading…</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="today" element={<Today />} />
          <Route path="reasoning" element={<SubjectPage subject="reasoning" />} />
          <Route path="numerical" element={<SubjectPage subject="numerical" />} />
          <Route path="language" element={<SubjectPage subject="language" />} />
          <Route path="ga" element={<SubjectPage subject="ga" />} />
          <Route path="computer" element={<SubjectPage subject="computer" />} />
          <Route path="topic/:id" element={<TopicPage />} />
          <Route path="daily-test" element={<DailyTest />} />
          <Route path="practice" element={<Practice />} />
          <Route path="mock-tests" element={<Mock />} />
          <Route path="test/:id" element={<TestPage />} />
          <Route path="mistakes" element={<Mistakes />} />
          <Route path="revision" element={<Revision />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  useEffect(() => { applyTheme(getTheme()) }, [])
  return (
    <StoreProvider>
      <HashRouter>
        <Routed />
      </HashRouter>
    </StoreProvider>
  )
}
