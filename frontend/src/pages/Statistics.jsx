import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getNumberStats, getCombinationStats, getRangeStats } from '../api/client'
import Loading from '../components/Loading'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'

function tt() {
  const s = getComputedStyle(document.documentElement)
  return { background: s.getPropertyValue('--tooltip-bg').trim(), border: `1px solid ${s.getPropertyValue('--tooltip-border').trim()}`, borderRadius: 8, fontSize: 12 }
}
function tv(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() }

function Heatmap({ stats }) {
  if (!stats?.length) return null
  const maxF = Math.max(...stats.map(s => s.frequency))
  const minF = Math.min(...stats.map(s => s.frequency))
  return (
    <div className="heatmap-grid">
      {stats.map(s => {
        const t = (s.frequency - minF) / (maxF - minF || 1)
        const accent = tv('--accent')
        return (
          <div key={s.number} className="heatmap-cell" title={`${s.number}번: ${s.frequency}회`}
            style={{ background: `color-mix(in srgb, ${accent} ${Math.round(10 + t * 60)}%, transparent)`, color: t > 0.5 ? '#fff' : 'var(--t3)', border: `1px solid color-mix(in srgb, ${accent} ${Math.round(10 + t * 25)}%, transparent)` }}>
            {s.number}
          </div>
        )
      })}
    </div>
  )
}

function ComboTable({ size }) {
  const [order, setOrder] = useState('desc')
  const { data, isLoading } = useQuery({ queryKey: ['combos', size, order], queryFn: () => getCombinationStats(size, 30, order) })
  if (isLoading) return <Loading />
  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-s)', marginBottom: 16 }}>
        {['desc', 'asc'].map(o => (
          <button key={o} className={`tab ${order === o ? 'active' : ''}`} onClick={() => setOrder(o)}>{o === 'desc' ? '높은순' : '낮은순'}</button>
        ))}
      </div>
      <table className="data-table">
        <thead><tr><th>#</th><th>조합</th><th>횟수</th><th>확률</th></tr></thead>
        <tbody>
          {data?.map((c, i) => (
            <tr key={i}>
              <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
              <td><div className="ball-group">{c.combination.map((n, j) => <span key={j} className={`lotto-ball r${Math.ceil(n / 10)}`} style={{ width: 28, height: 28, fontSize: 11 }}>{n}</span>)}</div></td>
              <td style={{ fontWeight: 600 }}>{c.frequency}</td>
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

  const overdueData = stats?.map(s => ({ number: s.number, overdue: s.overdue })).sort((a, b) => b.overdue - a.overdue).slice(0, 15) || []
  const rangeChart = rangeStats?.slice(0, 20).reverse().map(r => ({ r: r.round_no, '1-10': r.range_1_10, '11-20': r.range_11_20, '21-30': r.range_21_30, '31-40': r.range_31_40, '41-45': r.range_41_45 })) || []
  const oddEven = rangeStats?.slice(0, 30).reverse().map(r => ({ r: r.round_no, odd: r.odd_count, even: r.even_count })) || []
  const sumLine = rangeStats?.slice(0, 50).reverse().map(r => ({ r: r.round_no, sum: r.sum_total })) || []

  const tick = { fill: 'var(--t3)', fontSize: 10 }

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
            <div className="card-title" style={{ marginBottom: 16 }}>출현 빈도</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats} barCategoryGap="15%">
                <XAxis dataKey="number" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={tick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tt()} cursor={{ fill: 'var(--bg-2)' }} />
                <Bar dataKey="frequency" name="출현횟수" radius={[3, 3, 0, 0]}>
                  {stats.map((s, i) => <Cell key={i} fill={s.is_hot ? tv('--hot') : s.is_cold ? tv('--cold') : tv('--chart-bar')} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>미출현 간격 TOP 15</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={overdueData} layout="vertical" barCategoryGap="20%">
                <XAxis type="number" tick={tick} axisLine={false} tickLine={false} />
                <YAxis dataKey="number" type="category" tick={{ fill: 'var(--t2)', fontSize: 11 }} width={30} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tt()} />
                <Bar dataKey="overdue" name="미출현" fill={tv('--gold')} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>상세 테이블</div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>번호</th><th>횟수</th><th>확률</th><th>미출현</th><th>평균간격</th><th>상태</th></tr></thead>
                <tbody>
                  {stats.map(s => (
                    <tr key={s.number}>
                      <td><span className={`lotto-ball r${Math.ceil(s.number / 10)}`} style={{ width: 28, height: 28, fontSize: 11 }}>{s.number}</span></td>
                      <td style={{ fontWeight: 600 }}>{s.frequency}</td>
                      <td style={{ fontSize: 12, color: 'var(--t2)' }}>{s.probability}%</td>
                      <td>{s.overdue}</td>
                      <td style={{ color: 'var(--t3)' }}>{s.avg_interval || '—'}</td>
                      <td>{s.is_hot && <span className="badge badge-hot">HOT</span>}{s.is_cold && <span className="badge badge-cold">COLD</span>}</td>
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
          <div className="card-title" style={{ marginBottom: 4 }}>번호 히트맵</div>
          <p style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 16 }}>진할수록 자주 출현</p>
          <Heatmap stats={stats} />
        </div>
      )}

      {tab === 'combinations' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">조합 동시출현</div>
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-s)' }}>
              {[2, 3, 4, 5, 6].map(n => <button key={n} className={`tab ${comboSize === n ? 'active' : ''}`} onClick={() => setComboSize(n)}>{n}개</button>)}
            </div>
          </div>
          <ComboTable size={comboSize} />
        </div>
      )}

      {tab === 'ranges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>구간별 분포 (최근 20회)</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rangeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="r" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={tick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tt()} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="1-10" stackId="a" fill="#ca8a04" />
                <Bar dataKey="11-20" stackId="a" fill="#2563eb" />
                <Bar dataKey="21-30" stackId="a" fill="#dc2626" />
                <Bar dataKey="31-40" stackId="a" fill="#7c3aed" />
                <Bar dataKey="41-45" stackId="a" fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>홀짝 비율 (최근 30회)</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={oddEven}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="r" tick={tick} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 6]} tick={tick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tt()} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="odd" name="홀수" stroke={tv('--hot')} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="even" name="짝수" stroke={tv('--accent')} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'trend' && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 4 }}>합계 트렌드 (최근 50회)</div>
          <p style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 16 }}>이상적 범위 100~175</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sumLine}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="r" tick={tick} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 220]} tick={tick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tt()} />
              <Line type="monotone" dataKey="sum" name="합계" stroke={tv('--accent')} strokeWidth={2} dot={{ r: 2, fill: tv('--accent') }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
