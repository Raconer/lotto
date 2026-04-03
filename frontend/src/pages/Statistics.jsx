import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getNumberStats, getCombinationStats, getRangeStats } from '../api/client'
import Loading from '../components/Loading'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie,
} from 'recharts'

function NumberHeatmap({ stats }) {
  if (!stats?.length) return null
  const maxFreq = Math.max(...stats.map(s => s.frequency))
  const minFreq = Math.min(...stats.map(s => s.frequency))

  return (
    <div className="heatmap-grid">
      {stats.map(s => {
        const intensity = (s.frequency - minFreq) / (maxFreq - minFreq || 1)
        const r = Math.round(79 + intensity * (255 - 79))
        const g = Math.round(124 + intensity * (92 - 124))
        const b = Math.round(255 + intensity * (138 - 255))
        return (
          <div
            key={s.number}
            className="heatmap-cell"
            style={{
              background: `rgba(${r}, ${g}, ${b}, ${0.2 + intensity * 0.6})`,
              color: intensity > 0.5 ? 'white' : 'var(--text-secondary)',
              border: `1px solid rgba(${r}, ${g}, ${b}, 0.3)`,
            }}
            title={`${s.number}번: ${s.frequency}회 (${s.probability}%)`}
          >
            {s.number}
          </div>
        )
      })}
    </div>
  )
}

function CombinationTable({ comboSize }) {
  const [order, setOrder] = useState('desc')
  const { data, isLoading } = useQuery({
    queryKey: ['combos', comboSize, order],
    queryFn: () => getCombinationStats(comboSize, 30, order),
  })

  if (isLoading) return <Loading />

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`tab ${order === 'desc' ? 'active' : ''}`} onClick={() => setOrder('desc')}>높은순</button>
        <button className={`tab ${order === 'asc' ? 'active' : ''}`} onClick={() => setOrder('asc')}>낮은순</button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>순위</th>
            <th>조합</th>
            <th>동시출현</th>
            <th>확률</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((c, i) => (
            <tr key={i}>
              <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
              <td>
                <div className="ball-group">
                  {c.combination.map((n, j) => (
                    <span key={j} className={`lotto-ball r${Math.ceil(n / 10)}`} style={{ width: 32, height: 32, fontSize: 12 }}>{n}</span>
                  ))}
                </div>
              </td>
              <td style={{ fontWeight: 600 }}>{c.frequency}회</td>
              <td style={{ color: 'var(--accent-green)' }}>{c.probability.toFixed(2)}%</td>
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

  const overdueData = stats?.map(s => ({ number: s.number, overdue: s.overdue, avgInterval: s.avg_interval || 0 }))
    .sort((a, b) => b.overdue - a.overdue).slice(0, 20) || []

  const rangeChartData = rangeStats?.slice(0, 20).reverse().map(r => ({
    round: r.round_no,
    '1-10': r.range_1_10,
    '11-20': r.range_11_20,
    '21-30': r.range_21_30,
    '31-40': r.range_31_40,
    '41-45': r.range_41_45,
  })) || []

  const oddEvenData = rangeStats?.slice(0, 30).reverse().map(r => ({
    round: r.round_no,
    odd: r.odd_count,
    even: r.even_count,
  })) || []

  const sumData = rangeStats?.slice(0, 50).reverse().map(r => ({
    round: r.round_no,
    sum: r.sum_total,
  })) || []

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">통계 분석</h1>
        <p className="page-desc">전 회차 데이터 기반 번호별/조합별 상세 통계</p>
      </div>

      <div className="tabs">
        {[
          { key: 'numbers', label: '번호별 통계' },
          { key: 'heatmap', label: '히트맵' },
          { key: 'combinations', label: '조합 통계' },
          { key: 'ranges', label: '구간/홀짝' },
          { key: 'trend', label: '합계 트렌드' },
        ].map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <Loading />}

      {tab === 'numbers' && stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>출현 빈도 차트</div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={stats}>
                <XAxis dataKey="number" tick={{ fill: '#8888a0', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8888a0', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8 }} />
                <Bar dataKey="frequency" radius={[4, 4, 0, 0]}>
                  {stats.map((s, i) => (
                    <Cell key={i} fill={s.is_hot ? '#ff5c8a' : s.is_cold ? '#4f7cff' : '#7c5cff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>미출현 간격 TOP 20</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={overdueData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#8888a0', fontSize: 11 }} />
                <YAxis dataKey="number" type="category" tick={{ fill: '#8888a0', fontSize: 11 }} width={40} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8 }} />
                <Bar dataKey="overdue" fill="#ff8c42" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>번호별 상세</div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>출현횟수</th>
                    <th>확률</th>
                    <th>미출현</th>
                    <th>평균간격</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map(s => (
                    <tr key={s.number}>
                      <td>
                        <span className={`lotto-ball r${Math.ceil(s.number / 10)}`} style={{ width: 32, height: 32, fontSize: 12 }}>
                          {s.number}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{s.frequency}회</td>
                      <td>{s.probability}%</td>
                      <td>{s.overdue}회</td>
                      <td>{s.avg_interval || '-'}</td>
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
          <div className="card-title" style={{ marginBottom: 16 }}>번호 히트맵 (출현 빈도)</div>
          <p className="card-subtitle" style={{ marginBottom: 20 }}>색이 진할수록 자주 출현한 번호</p>
          <NumberHeatmap stats={stats} />
        </div>
      )}

      {tab === 'combinations' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">조합 동시출현 통계</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  className={`tab ${comboSize === n ? 'active' : ''}`}
                  onClick={() => setComboSize(n)}
                >
                  {n}개
                </button>
              ))}
            </div>
          </div>
          <CombinationTable comboSize={comboSize} />
        </div>
      )}

      {tab === 'ranges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>구간별 분포 (최근 20회차)</div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={rangeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                <XAxis dataKey="round" tick={{ fill: '#8888a0', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8888a0', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="1-10" stackId="a" fill="#ffc84f" />
                <Bar dataKey="11-20" stackId="a" fill="#4f7cff" />
                <Bar dataKey="21-30" stackId="a" fill="#ff5c8a" />
                <Bar dataKey="31-40" stackId="a" fill="#7c5cff" />
                <Bar dataKey="41-45" stackId="a" fill="#00d68f" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>홀짝 비율 (최근 30회차)</div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={oddEvenData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                <XAxis dataKey="round" tick={{ fill: '#8888a0', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8888a0', fontSize: 11 }} domain={[0, 6]} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="odd" stroke="#ff5c8a" name="홀수" strokeWidth={2} />
                <Line type="monotone" dataKey="even" stroke="#4f7cff" name="짝수" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'trend' && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>번호 합계 트렌드 (최근 50회차)</div>
          <p className="card-subtitle" style={{ marginBottom: 20 }}>이상적 합계 범위: 100~175</p>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={sumData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis dataKey="round" tick={{ fill: '#8888a0', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8888a0', fontSize: 11 }} domain={[50, 220]} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8 }} />
              {/* 이상적 범위 표시 */}
              <Line type="monotone" dataKey="sum" stroke="#7c5cff" strokeWidth={2} dot={{ r: 3, fill: '#7c5cff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
