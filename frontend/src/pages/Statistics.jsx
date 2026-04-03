import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getNumberStats, getCombinationStats, getRangeStats } from '../api/client'
import Loading from '../components/Loading'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'

const TOOLTIP_STYLE = { background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }

function Heatmap({ stats }) {
  if (!stats?.length) return null
  const maxF = Math.max(...stats.map(s => s.frequency))
  const minF = Math.min(...stats.map(s => s.frequency))

  return (
    <div className="heatmap-grid">
      {stats.map(s => {
        const t = (s.frequency - minF) / (maxF - minF || 1)
        return (
          <div key={s.number} className="heatmap-cell" title={`${s.number}번: ${s.frequency}회`}
            style={{
              background: `rgba(139,92,246,${0.08 + t * 0.55})`,
              color: t > 0.5 ? '#fafafa' : 'var(--text-3)',
              border: `1px solid rgba(139,92,246,${0.1 + t * 0.2})`,
            }}>
            {s.number}
          </div>
        )
      })}
    </div>
  )
}

function ComboTable({ size }) {
  const [order, setOrder] = useState('desc')
  const { data, isLoading } = useQuery({
    queryKey: ['combos', size, order],
    queryFn: () => getCombinationStats(size, 30, order),
  })
  if (isLoading) return <Loading />

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-subtle)', marginBottom: 16 }}>
        {['desc', 'asc'].map(o => (
          <button key={o} className={`tab ${order === o ? 'active' : ''}`} onClick={() => setOrder(o)}>
            {o === 'desc' ? '높은순' : '낮은순'}
          </button>
        ))}
      </div>
      <table className="data-table">
        <thead><tr><th>#</th><th>조합</th><th>횟수</th><th>확률</th></tr></thead>
        <tbody>
          {data?.map((c, i) => (
            <tr key={i}>
              <td style={{ color: 'var(--text-4)', fontSize: 12 }}>{i + 1}</td>
              <td>
                <div className="ball-group">
                  {c.combination.map((n, j) => (
                    <span key={j} className={`lotto-ball r${Math.ceil(n / 10)}`} style={{ width: 28, height: 28, fontSize: 11 }}>{n}</span>
                  ))}
                </div>
              </td>
              <td style={{ fontWeight: 600, fontSize: 13 }}>{c.frequency}</td>
              <td style={{ color: 'var(--green)', fontSize: 12 }}>{c.probability.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Statistics() {
  const [tab, setTab] = useState('numbers')
  const [comboSize, setComboSize] = useState(2)
  const { data: stats, isLoading } = useQuery({ queryKey: ['numberStats'], queryFn: getNumberStats })
  const { data: rangeStats } = useQuery({ queryKey: ['rangeStats'], queryFn: () => getRangeStats(50) })

  const overdueData = stats?.map(s => ({ number: s.number, overdue: s.overdue }))
    .sort((a, b) => b.overdue - a.overdue).slice(0, 15) || []

  const rangeChart = rangeStats?.slice(0, 20).reverse().map(r => ({
    r: r.round_no, '1-10': r.range_1_10, '11-20': r.range_11_20,
    '21-30': r.range_21_30, '31-40': r.range_31_40, '41-45': r.range_41_45,
  })) || []

  const oddEven = rangeStats?.slice(0, 30).reverse().map(r => ({ r: r.round_no, odd: r.odd_count, even: r.even_count })) || []
  const sumLine = rangeStats?.slice(0, 50).reverse().map(r => ({ r: r.round_no, sum: r.sum_total })) || []

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">통계</h1>
        <p className="page-desc">전 회차 데이터 기반 상세 분석</p>
      </div>

      <div className="tabs">
        {['numbers', 'heatmap', 'combinations', 'ranges', 'trend'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {{ numbers: '번호별', heatmap: '히트맵', combinations: '조합', ranges: '구간/홀짝', trend: '합계' }[t]}
          </button>
        ))}
      </div>

      {isLoading && <Loading />}

      {tab === 'numbers' && stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 20 }}>출현 빈도</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats} barCategoryGap="15%">
                <XAxis dataKey="number" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="frequency" name="출현횟수" radius={[3, 3, 0, 0]}>
                  {stats.map((s, i) => <Cell key={i} fill={s.is_hot ? '#f43f5e' : s.is_cold ? '#06b6d4' : '#3f3f46'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 20 }}>미출현 간격 TOP 15</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={overdueData} layout="vertical" barCategoryGap="20%">
                <XAxis type="number" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="number" type="category" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={30} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="overdue" name="미출현" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>상세 테이블</div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>번호</th><th>횟수</th><th>확률</th><th>미출현</th><th>평균간격</th><th>상태</th></tr></thead>
                <tbody>
                  {stats.map(s => (
                    <tr key={s.number}>
                      <td><span className={`lotto-ball r${Math.ceil(s.number / 10)}`} style={{ width: 28, height: 28, fontSize: 11 }}>{s.number}</span></td>
                      <td style={{ fontWeight: 600 }}>{s.frequency}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.probability}%</td>
                      <td>{s.overdue}</td>
                      <td style={{ color: 'var(--text-3)' }}>{s.avg_interval || '—'}</td>
                      <td>
                        {s.is_hot && <span className="badge badge-hot">HOT</span>}
                        {s.is_cold && <span className="badge badge-cold">COLD</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'heatmap' && stats && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 6 }}>번호 히트맵</div>
          <p style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 20 }}>진할수록 자주 출현</p>
          <Heatmap stats={stats} />
        </div>
      )}

      {tab === 'combinations' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">조합 동시출현</div>
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-subtle)' }}>
              {[2, 3, 4, 5, 6].map(n => (
                <button key={n} className={`tab ${comboSize === n ? 'active' : ''}`} onClick={() => setComboSize(n)}>{n}개</button>
              ))}
            </div>
          </div>
          <ComboTable size={comboSize} />
        </div>
      )}

      {tab === 'ranges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 20 }}>구간별 분포 (최근 20회)</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rangeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="r" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="1-10" stackId="a" fill="#d97706" />
                <Bar dataKey="11-20" stackId="a" fill="#2563eb" />
                <Bar dataKey="21-30" stackId="a" fill="#dc2626" />
                <Bar dataKey="31-40" stackId="a" fill="#7c3aed" />
                <Bar dataKey="41-45" stackId="a" fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 20 }}>홀짝 비율 (최근 30회)</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={oddEven}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="r" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 6]} tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="odd" name="홀수" stroke="#f43f5e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="even" name="짝수" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'trend' && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 6 }}>합계 트렌드 (최근 50회)</div>
          <p style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 20 }}>이상적 범위 100~175</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sumLine}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="r" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 220]} tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="sum" name="합계" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2, fill: '#8b5cf6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
