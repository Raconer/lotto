import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { BarChart3, Home, TrendingUp, Search, History, Sparkles } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Statistics from './pages/Statistics'
import Analysis from './pages/Analysis'
import HistoryPage from './pages/HistoryPage'
import Validate from './pages/Validate'
import './App.css'

const navItems = [
  { path: '/', icon: Home, label: '대시보드' },
  { path: '/statistics', icon: BarChart3, label: '통계' },
  { path: '/analysis', icon: TrendingUp, label: '분석' },
  { path: '/history', icon: History, label: '히스토리' },
  { path: '/validate', icon: Search, label: '번호검증' },
]

function App() {
  const location = useLocation()

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <Sparkles size={28} className="logo-icon" />
          <h1 className="logo-text">Lotto AI</h1>
        </div>
        <ul className="nav-list">
          {navItems.map(({ path, icon: Icon, label }) => (
            <li key={path}>
              <NavLink to={path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <p>Lotto AI v1.0</p>
        </div>
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

export default App
