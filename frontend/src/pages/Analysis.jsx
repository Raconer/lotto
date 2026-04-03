import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getLatestPredictions, getBacktestResults, runBacktest, generateTypedPredictions } from '../api/client'
import { BallGroup } from '../components/LottoBall'
import Loading from '../components/Loading'
import { Play, Flame, Snowflake, Scale, Gem, Brain, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'

const TOOLTIP_STYLE = { background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }
const TYPE_META = {
  hot: { icon: Flame, color: '#f43f5e' }, cold: { icon: Snowflake, color: '#06b6d4' },
  balanced: { icon: Scale, color: '#10b981' }, rare: { icon: Gem, color: '#f59e0b' },
  ensemble: { icon: Brain, color: '#8b5cf6' },
}

export default function Analysis() {
  const [tab, setTab] = useState('typed')
  const [btRounds, setBtRounds] = useState(10)
  const [typed, setTyped] = useState(null)
  const [expandedIdx, setExpandedIdx] = useState(null)

  const { data: predictions } = useQuery({ queryKey: ['predictions'], queryFn: getLatestPredictions, retry: false })
  const { data: bt } = useQuery({ queryKey: ['backtest'], queryFn: getBacktestResults, retry: false })

  const btMut = useMutation({ mutationFn: () => runBacktest(btRounds) })
  const typedMut = useMutation({ mutationFn: generateTypedPredictions, onSuccess: d => setTyped(d) })

  const radar = bt?.map(b => ({ algo: b.algorithm_name, avg: b.avg_matched, max: b.max_matched })) || []
  const dist = bt?.map(b => ({
    algo: b.algorithm_name,
    ...Object.fromEntries([0,1,2,3,4,5,6].map(n => [`${n}개`, (b.match_distribution || {})[String(n)] || 0])),
  })) || []

  const typedList = typed?.predictions || []

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">분석</h1>
        <p className="page-desc">추천 전략 상세 및 백테스트 검증</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'typed' ? 'active' : ''}`} onClick={() => setTab('typed')}>5종류 추천</button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>추천 이력</button>
        <button className={`tab ${tab === 'backtest' ? 'active' : ''}`} onClick={() => setTab('backtest')}>백테스트</button>
      </div>

      {tab === 'typed' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button className="btn btn-primary" onClick={() => typedMut.mutate()} disabled={typedMut.isPending}>
              <Sparkles size={14} /> {typedMut.isPending ? '생성 중' : '새로 생성'}
            </button>
          </div>

          {typedList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {typedList.map((p, i) => {
                const m = TYPE_META[p.type] || TYPE_META.ensemble
                const Icon = m.icon
                const isOpen = expandedIdx === i

                return (
                  <div key={i} className={`type-card ${isOpen ? 'type-card-active' : ''}`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                    onClick={() => setExpandedIdx(isOpen ? null : i)}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                      <div className="type-icon" style={{ background: `${m.color}14` }}>
                        <Icon size={18} color={m.color} strokeWidth={2} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-0)', letterSpacing: '-0.3px' }}>{p.type_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.type_desc}</div>
                      </div>
                      {p.confidence && <span className="type-chip" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>{p.confidence}%</span>}
                      {isOpen ? <ChevronUp size={14} color="var(--text-4)" /> : <ChevronDown size={14} color="var(--text-4)" />}
                    </div>

                    <BallGroup numbers={p.numbers} size={44} />

                    {p.analysis && (
                      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11 }}>
                        <span><span style={{ color: 'var(--text-4)' }}>홀짝</span> <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{p.analysis.odd_even}</span></span>
                        <span><span style={{ color: 'var(--text-4)' }}>합계</span> <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{p.analysis.sum}</span></span>
                        <span><span style={{ color: 'var(--text-4)' }}>구간</span> <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{p.analysis.range_coverage}</span></span>
                      </div>
                    )}

                    {isOpen && p.detail && (
                      <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-1)', borderRadius: 'var(--radius-s)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.8 }}>
                        {p.detail.strategy && <div><span style={{ color: 'var(--text-4)', marginRight: 8 }}>전략</span>{p.detail.strategy}</div>}
                        {p.detail.hot_numbers && <div><span style={{ color: 'var(--text-4)', marginRight: 8 }}>핫 TOP10</span>{p.detail.hot_numbers.join(' · ')}</div>}
                        {p.detail.top_overdue && <div><span style={{ color: 'var(--text-4)', marginRight: 8 }}>오버듀</span>{p.detail.top_overdue.join(' · ')}</div>}
                        {p.detail.rare_numbers && <div><span style={{ color: 'var(--text-4)', marginRight: 8 }}>희소</span>{p.detail.rare_numbers.join(' · ')}</div>}
                        {p.detail.target_sum_range && <div><span style={{ color: 'var(--text-4)', marginRight: 8 }}>목표합계</span>{p.detail.target_sum_range}</div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ color: 'var(--text-3)', fontSize: 13 }}>"새로 생성" 버튼을 눌러 5종류 추천을 확인하세요</p>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          {!predictions ? (
            <p style={{ color: 'var(--text-3)', fontSize: 13, padding: 32, textAlign: 'center' }}>대시보드에서 추천을 먼저 실행하세요.</p>
          ) : (
            <>
              <div className="card-title" style={{ marginBottom: 20 }}>{predictions.target_round}회차 저장된 추천</div>
              {predictions.predictions.map((p, i) => {
                const d = p.algorithm_detail || {}
                const tKey = d.type || 'ensemble'
                const color = (TYPE_META[tKey] || TYPE_META.ensemble).color
                return (
                  <div key={i} className="prediction-set" style={{ marginBottom: 8 }}>
                    <span className="set-label" style={{ color }}>{d.type_name || `SET ${p.set_number}`}</span>
                    <BallGroup numbers={p.numbers} size={34} />
                    {p.confidence && <span className="confidence">{p.confidence}%</span>}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {tab === 'backtest' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">백테스트</div>
                <div className="card-subtitle">과거 N회차 시뮬레이션</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select className="input" value={btRounds} onChange={e => setBtRounds(Number(e.target.value))} style={{ padding: '6px 10px' }}>
                  <option value={10}>10회차</option>
                  <option value={20}>20회차</option>
                  <option value={50}>50회차</option>
                </select>
                <button className="btn btn-primary" onClick={() => btMut.mutate()} disabled={btMut.isPending}>
                  <Play size={14} /> {btMut.isPending ? '실행 중' : '실행'}
                </button>
              </div>
            </div>
          </div>

          {(btMut.data || bt) && (
            <>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 16 }}>알고리즘 순위</div>
                <table className="data-table">
                  <thead><tr><th>#</th><th>알고리즘</th><th>테스트</th><th>평균</th><th>최대</th></tr></thead>
                  <tbody>
                    {(btMut.data || bt)?.map((b, i) => (
                      <tr key={b.algorithm_name}>
                        <td style={{ fontWeight: 700, color: i < 3 ? 'var(--gold)' : 'var(--text-4)' }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{b.algorithm_name}</td>
                        <td style={{ color: 'var(--text-3)' }}>{b.total_tests}</td>
                        <td style={{ color: 'var(--green)', fontWeight: 700 }}>{b.avg_matched}</td>
                        <td style={{ color: 'var(--violet)', fontWeight: 700 }}>{b.max_matched}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid-2">
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 16 }}>레이더</div>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radar}>
                      <PolarGrid stroke="rgba(255,255,255,0.06)" />
                      <PolarAngleAxis dataKey="algo" tick={{ fill: '#71717a', fontSize: 10 }} />
                      <PolarRadiusAxis tick={{ fill: '#52525b', fontSize: 9 }} />
                      <Radar name="평균" dataKey="avg" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                      <Radar name="최대" dataKey="max" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 16 }}>적중 분포</div>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dist}>
                      <XAxis dataKey="algo" tick={{ fill: '#52525b', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="0개" fill="#27272a" />
                      <Bar dataKey="1개" fill="#6366f1" />
                      <Bar dataKey="2개" fill="#8b5cf6" />
                      <Bar dataKey="3개" fill="#10b981" />
                      <Bar dataKey="4개" fill="#f59e0b" />
                      <Bar dataKey="5개" fill="#f97316" />
                      <Bar dataKey="6개" fill="#f43f5e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
