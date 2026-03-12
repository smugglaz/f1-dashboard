import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const History = lazy(() => import('./pages/History'))
const RaceMap = lazy(() => import('./pages/RaceMap'))
const LiveTiming = lazy(() => import('./pages/LiveTiming'))
const Predictions = lazy(() => import('./pages/Predictions'))
const News = lazy(() => import('./pages/News'))

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/race-map" element={<RaceMap />} />
            <Route path="/live" element={<LiveTiming />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/news" element={<News />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}

export default App
