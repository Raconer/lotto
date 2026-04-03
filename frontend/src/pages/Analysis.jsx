import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getLatestPredictions, getBacktestResults, runBacktest, generateTypedPredictions } from '../api/client'
import { BallGroup } from '../components/LottoBall'
import Loading from '../components/Loading'
import { Play, Trophy, BarChart3, Flame, Snowflake, Scale, Gem, Brain, Sparkles } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'

const TYPE_ICONS = {
  hot: Flame, cold: Snowflake, balanced: Scale, rare: Gem, ensemble: Brain,
}
const TYPE_COLORS = {
  hot: '#ff5c8a', cold: '#00c9db', balanced: '#00d68f', rare: '#ffc84f', ensemble: '#7c5cff',
}

export default function Analysis() {
  const [tab, setTab] = useState('typed')
  const [btRounds, setBtRounds] = useState(10)
  const [typedData, setTypedData] = useState(null)

  const { data: predictions } = useQuery({ queryKey: ['predictions'], queryFn: getLatestPredictions, retry: false })
  const { data: backtestData } = useQuery({ queryKey: ['backtest'], queryFn: getBacktestResults, retry: false })

  const btMutation = useMutation({ mutationFn: () => runBacktest(btRounds) })
  const typedMutation = useMutation({
    mutationFn: generateTypedPredictions,
    onSuccess: (data) => setTypedData(data),
  })

  const radarData = backtestData?.map(b => ({
    algorithm: b.algorithm_name,
    avgMatched: b.avg_matched,
    maxMatched: b.max_matched,
  })) || []

  const distributionData = backtestData?.map(b => {
    const dist = b.match_distribution || {}
    return {
      algorithm: b.algorithm_name,
      '0개': dist['0'] || 0, '1개': dist['1'] || 0, '2개': dist['2'] || 0,
      '3개': dist['3'] || 0, '4개': dist['4'] || 0, '5개': dist['5'] || 0, '6개': dist['6'] || 0,
    }
  }) || []

  const typed = typedData?.predictions || []

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">분석 & 백테스트</h1>
        <p className="page-desc">5종류 추천 전략 상세 분석 및 과거 적중률 검증</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'typed' ? 'active' : ''}`} onClick={() => setTab('typed')}>5종류 추천</button>
        <button className={`tab ${tab === 'predictions' ? 'active' : ''}`} onClick={() => setTab('predictions')}>추천 이력</button>
        <button className={`tab ${tab === 'backtest' ? 'active' : ''}`} onClick={() => setTab('backtest')}>백테스트</button>
      </div>

      {tab === 'typed' && (
        <div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <div>
                <div className="card-title">5종류 타입별 추천</div>
                <div className="card-subtitle">각기 다른 전략으로 번호를 추천합니다</div>
              </div>
              <button className="btn btn-primary" onClick={() => typedMutation.mutate()} disabled={typedMutation.isPending}>
                <Sparkles size={16} />
                {typedMutation.isPending ? '생성 중...' : '새로 생성'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { type: 'hot', name: '핫넘버', desc: '최근 자주 나온 번호', icon: Flame },
                { type: 'cold', name: '콜드넘버', desc: '오래 안 나온 번호', icon: Snowflake },
                { type: 'balanced', name: '균형 조합', desc: '홀짝/구간 최적', icon: Scale },
                { type: 'rare', name: '희소 조합', desc: '남들이 안 고르는', icon: Gem },
                { type: 'ensemble', name: 'AI 앙상블', desc: '5엔진 종합', icon: Brain },
              ].map(t => (
                <div key={t.type} style={{
                  padding: 16, borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)',
                  textAlign: 'center', border: `1px solid ${TYPE_COLORS[t.type]}30`,
                }}>
                  <t.icon size={24} color={TYPE_COLORS[t.type]} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: TYPE_COLORS[t.type], marginTop: 8 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {typed.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {typed.map((p, i) => {
                const Icon = TYPE_ICONS[p.type] || Brain
                const color = TYPE_COLORS[p.type] || '#7c5cff'
                return (
                  <div key={i} className="card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: `linear-gradient(135deg, ${color}, ${color}88)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Icon size={24} color="white" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color }}>{p.type_name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                            SET {p.set_number}
                          </span>
                          {p.confidence && <span style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>{p.confidence}%</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{p.type_desc}</div>

                        <BallGroup numbers={p.numbers} size={46} />

                        {p.analysis && (
                          <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                            <div>홀짝 <strong>{p.analysis.odd_even}</strong></div>
                            <div>합계 <strong>{p.analysis.sum}</strong></div>
                            <div>구간 <strong>{p.analysis.range_coverage}</strong></div>
                            {p.analysis.consecutive_pairs > 0 && <div>연번 <strong>{p.analysis.consecutive_pairs}쌍</strong></div>}
                          </div>
                        )}

                        {p.detail && (
                          <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 12 }}>
                            {p.detail.strategy && <div style={{ color: 'var(--text-secondary)' }}><strong>전략:</strong> {p.detail.strategy}</div>}
                            {p.detail.hot_numbers && <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}><strong>핫 TOP10:</strong> {p.detail.hot_numbers.join(', ')}</div>}
                            {p.detail.top_overdue && <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}><strong>오버듀 TOP10:</strong> {p.detail.top_overdue.join(', ')}</div>}
                            {p.detail.rare_numbers && <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}><strong>희소 TOP10:</strong> {p.detail.rare_numbers.join(', ')}</div>}
                            {p.detail.target_sum_range && <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}><strong>목표 합계:</strong> {p.detail.target_sum_range}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'predictions' && (
        <div>
          {!predictions ? (
            <div className="card"><p style={{ color: 'var(--text-muted)' }}>대시보드에서 추천을 먼저 실행하세요.</p></div>
          ) : (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">{predictions.target_round}회차 추천 이력</div>
                  <div className="card-subtitle">저장된 최신 추천 번호</div>
                </div>
                <Trophy size={24} style={{ color: 'var(--accent-yellow)' }} />
              </div>
              {predictions.predictions.map((p, i) => {
                const detail = p.algorithm_detail || {}
                const typeName = detail.type_name || `SET ${p.set_number}`
                const typeKey = detail.type || 'ensemble'
                const color = TYPE_COLORS[typeKey] || '#7c5cff'
                return (
                  <div key={i} style={{ marginBottom: 16, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color }}>{typeName}</span>
                      {p.confidence && <span className="confidence">{p.confidence}%</span>}
                    </div>
                    <BallGroup numbers={p.numbers} size={40} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'backtest' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">백테스트 실행</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select className="input" value={btRounds} onChange={e => setBtRounds(Number(e.target.value))} style={{ padding: '8px 12px' }}>
                  <option value={10}>최근 10회차</option>
                  <option value={20}>최근 20회차</option>
                  <option value={50}>최근 50회차</option>
                </select>
                <button className="btn btn-primary" onClick={() => btMutation.mutate()} disabled={btMutation.isPending}>
                  <Play size={16} />
                  {btMutation.isPending ? '실행 중...' : '실행'}
                </button>
              </div>
            </div>
          </div>

          {(btMutation.data || backtestData) && (
            <>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 16 }}>알고리즘별 적중률</div>
                <table className="data-table">
                  <thead><tr><th>순위</th><th>알고리즘</th><th>테스트</th><th>평균 적중</th><th>최대</th></tr></thead>
                  <tbody>
                    {(btMutation.data || backtestData)?.map((b, i) => (
                      <tr key={b.algorithm_name}>
                        <td style={{ fontWeight: 700, color: i < 3 ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>
                          {['1', '2', '3'][i] || i + 1}
                        </td>
                        <td style={{ fontWeight: 600 }}>{b.algorithm_name}</td>
                        <td>{b.total_tests}회</td>
                        <td style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{b.avg_matched}개</td>
                        <td style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>{b.max_matched}개</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {radarData.length > 0 && (
                <div className="grid-2">
                  <div className="card">
                    <div className="card-title" style={{ marginBottom: 16 }}>레이더 차트</div>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#2a2a3e" />
                        <PolarAngleAxis dataKey="algorithm" tick={{ fill: '#8888a0', fontSize: 11 }} />
                        <PolarRadiusAxis tick={{ fill: '#8888a0', fontSize: 10 }} />
                        <Radar name="평균" dataKey="avgMatched" stroke="#7c5cff" fill="#7c5cff" fillOpacity={0.3} />
                        <Radar name="최대" dataKey="maxMatched" stroke="#ff5c8a" fill="#ff5c8a" fillOpacity={0.2} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="card">
                    <div className="card-title" style={{ marginBottom: 16 }}>적중 분포</div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={distributionData}>
                        <XAxis dataKey="algorithm" tick={{ fill: '#8888a0', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#8888a0', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8 }} />
                        <Legend />
                        <Bar dataKey="0개" fill="#555570" />
                        <Bar dataKey="1개" fill="#4f7cff" />
                        <Bar dataKey="2개" fill="#7c5cff" />
                        <Bar dataKey="3개" fill="#00d68f" />
                        <Bar dataKey="4개" fill="#ffc84f" />
                        <Bar dataKey="5개" fill="#ff8c42" />
                        <Bar dataKey="6개" fill="#ff5c8a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
