import { Routes, Route, NavLink } from 'react-router-dom'
import { BarChart3, Home, TrendingUp, Search, History, Sparkles } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Statistics from './pages/Statistics'
import Analysis from './pages/Analysis'
import HistoryPage from './pages/HistoryPage'
import Validate from './pages/Validate'
import './App.css'

const nav = [
  { to: '/', icon: Home, label: '대시보드' },
  { to: '/statistics', icon: BarChart3, label: '통계' },
  { to: '/analysis', icon: TrendingUp, label: '분석' },
  { to: '/history', icon: History, label: '히스토리' },
  { to: '/validate', icon: Search, label: '번호검증' },
]

export default function App() {
  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <Sparkles size={22} className="logo-icon" />
          <span className="logo-text">Lotto AI</span>
        </div>
        <ul className="nav-list">
          {nav.map(({ to, icon: Icon, label }) => (
            <li key={to} style={{ position: 'relative' }}>
              <NavLink to={to} end={to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">v1.1</div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/validate" element={<Validate />} />
        </Routes>
      </main>
    </div>
  )
}
