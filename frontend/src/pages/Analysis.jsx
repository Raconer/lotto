import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getLatestPredictions, getBacktestResults, runBacktest } from '../api/client'
import { BallGroup } from '../components/LottoBall'
import Loading from '../components/Loading'
import { Play, Trophy, BarChart3 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'

export default function Analysis() {
  const [tab, setTab] = useState('predictions')
  const [btRounds, setBtRounds] = useState(10)

  const { data: predictions } = useQuery({ queryKey: ['predictions'], queryFn: getLatestPredictions, retry: false })
  const { data: backtestData, isLoading: loadingBT } = useQuery({
    queryKey: ['backtest'],
    queryFn: getBacktestResults,
    retry: false,
  })

  const btMutation = useMutation({ mutationFn: () => runBacktest(btRounds) })

  const radarData = backtestData?.map(b => ({
    algorithm: b.algorithm_name,
    avgMatched: b.avg_matched,
    maxMatched: b.max_matched,
    tests: b.total_tests,
  })) || []

  const distributionData = backtestData?.map(b => {
    const dist = b.match_distribution || {}
    return {
      algorithm: b.algorithm_name,
      '0개': dist['0'] || 0,
      '1개': dist['1'] || 0,
      '2개': dist['2'] || 0,
      '3개': dist['3'] || 0,
      '4개': dist['4'] || 0,
      '5개': dist['5'] || 0,
      '6개': dist['6'] || 0,
    }
  }) || []

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">분석 & 백테스트</h1>
        <p className="page-desc">알고리즘 상세 분석 및 과거 적중률 검증</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'predictions' ? 'active' : ''}`} onClick={() => setTab('predictions')}>추천 상세</button>
        <button className={`tab ${tab === 'backtest' ? 'active' : ''}`} onClick={() => setTab('backtest')}>백테스트</button>
      </div>

      {tab === 'predictions' && (
        <div>
          {!predictions ? (
            <div className="card">
              <p style={{ color: 'var(--text-muted)' }}>대시보드에서 "번호 추천"을 먼저 실행하세요.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{predictions.target_round}회차 추천 번호</div>
                    <div className="card-subtitle">5-엔진 앙상블 (가중 투표 + 패턴 제약)</div>
                  </div>
                  <Trophy size={24} style={{ color: 'var(--accent-yellow)' }} />
                </div>

                {predictions.predictions.map((p, i) => (
                  <div key={i} style={{ marginBottom: 20, padding: 20, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                      <span className="set-label">SET {p.set_number}</span>
                      <BallGroup numbers={p.numbers} size={42} />
                      {p.confidence && <span className="confidence">{p.confidence}%</span>}
                    </div>
                    {p.algorithm_detail && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        <div><strong>방법:</strong> {p.algorithm_detail.method}</div>
                        {p.algorithm_detail.vote_scores && (
                          <div style={{ marginTop: 4 }}>
                            <strong>투표 점수:</strong>{' '}
                            {Object.entries(p.algorithm_detail.vote_scores).map(([num, score]) =>
                              `${num}번(${score})`
                            ).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
                <select
                  className="input"
                  value={btRounds}
                  onChange={e => setBtRounds(Number(e.target.value))}
                  style={{ padding: '8px 12px' }}
                >
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
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              과거 N회차를 테스트 데이터로 사용하여 각 알고리즘이 실제로 몇 개를 맞췄는지 시뮬레이션합니다.
            </p>
          </div>

          {(btMutation.data || backtestData) && (
            <>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 16 }}>알고리즘별 적중률</div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>순위</th>
                      <th>알고리즘</th>
                      <th>테스트 수</th>
                      <th>평균 적중</th>
                      <th>최대 적중</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(btMutation.data || backtestData)?.map((b, i) => (
                      <tr key={b.algorithm_name}>
                        <td style={{ color: i === 0 ? 'var(--accent-yellow)' : 'var(--text-muted)', fontWeight: 700 }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
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
                    <div className="card-title" style={{ marginBottom: 16 }}>알고리즘 레이더 차트</div>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#2a2a3e" />
                        <PolarAngleAxis dataKey="algorithm" tick={{ fill: '#8888a0', fontSize: 11 }} />
                        <PolarRadiusAxis tick={{ fill: '#8888a0', fontSize: 10 }} />
                        <Radar name="평균 적중" dataKey="avgMatched" stroke="#7c5cff" fill="#7c5cff" fillOpacity={0.3} />
                        <Radar name="최대 적중" dataKey="maxMatched" stroke="#ff5c8a" fill="#ff5c8a" fillOpacity={0.2} />
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
