import { Routes, Route, NavLink } from 'react-router-dom'
import { BarChart3, Home, TrendingUp, Search, History, Sparkles, PlusCircle } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Statistics from './pages/Statistics'
import Analysis from './pages/Analysis'
import HistoryPage from './pages/HistoryPage'
import Validate from './pages/Validate'
import DataInput from './pages/DataInput'
import ThemeToggle from './components/ThemeToggle'
import './App.css'

const nav = [
  { to: '/', icon: Home, label: '대시보드' },
  { to: '/statistics', icon: BarChart3, label: '통계' },
  { to: '/analysis', icon: TrendingUp, label: '분석' },
  { to: '/history', icon: History, label: '히스토리' },
  { to: '/validate', icon: Search, label: '번호검증' },
  { to: '/input', icon: PlusCircle, label: '데이터 입력' },
]

export default function App() {
  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <Sparkles size={20} className="logo-icon" />
          <span className="logo-text">Lotto AI</span>
        </div>
        <ul className="nav-list">
          {nav.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink to={to} end={to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Icon size={17} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <span>v2.0</span>
          <ThemeToggle />
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/validate" element={<Validate />} />
          <Route path="/input" element={<DataInput />} />
        </Routes>
      </main>

      {/* 모바일 하단 네비 */}
      <div className="bottom-nav">
        {nav.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  )
}
