import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Sparkles, TrendingUp, Database, Zap } from 'lucide-react'
import { getLatestDraw, getLatestPredictions, getNumberStats, crawlAll, generatePredictions } from '../api/client'
import { BallGroup } from '../components/LottoBall'
import Loading from '../components/Loading'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function Dashboard() {
  const queryClient = useQueryClient()
  const { data: latest, isLoading: loadingDraw } = useQuery({ queryKey: ['latestDraw'], queryFn: getLatestDraw })
  const { data: predictions } = useQuery({ queryKey: ['predictions'], queryFn: getLatestPredictions, retry: false })
  const { data: stats } = useQuery({ queryKey: ['numberStats'], queryFn: getNumberStats })

  const crawlMutation = useMutation({
    mutationFn: crawlAll,
    onSuccess: () => queryClient.invalidateQueries(),
  })

  const predictMutation = useMutation({
    mutationFn: generatePredictions,
    onSuccess: () => queryClient.invalidateQueries(['predictions']),
  })

  const hotNumbers = stats?.filter(s => s.is_hot).slice(0, 6) || []
  const coldNumbers = stats?.filter(s => s.is_cold).slice(0, 6) || []

  const chartData = stats?.map(s => ({
    number: s.number,
    frequency: s.frequency,
    isHot: s.is_hot,
    isCold: s.is_cold,
  })) || []

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">대시보드</h1>
          <p className="page-desc">로또 AI 분석 현황</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => crawlMutation.mutate()} disabled={crawlMutation.isPending}>
            <RefreshCw size={16} className={crawlMutation.isPending ? 'spinning' : ''} />
            {crawlMutation.isPending ? '수집 중...' : '데이터 수집'}
          </button>
          <button className="btn btn-primary" onClick={() => predictMutation.mutate()} disabled={predictMutation.isPending}>
            <Sparkles size={16} />
            {predictMutation.isPending ? '분석 중...' : '번호 추천'}
          </button>
        </div>
      </div>

      {crawlMutation.isSuccess && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'var(--accent-green)', background: 'rgba(0,214,143,0.05)' }}>
          <p style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
            {crawlMutation.data.message}
          </p>
        </div>
      )}

      {/* 최신 당첨번호 */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">최신 당첨번호</div>
              {latest && <div className="card-subtitle">{latest.round_no}회 ({latest.draw_date})</div>}
            </div>
            <Database size={20} style={{ color: 'var(--accent-blue)' }} />
          </div>
          {loadingDraw ? <Loading /> : latest ? (
            <div>
              <BallGroup numbers={latest.numbers} size={50} />
              <div style={{ marginTop: 16, display: 'flex', gap: 24 }}>
                <div>
                  <div className="stat-label">1등 당첨금</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-yellow)' }}>
                    {latest.first_prize ? `${(latest.first_prize / 100000000).toFixed(1)}억원` : '-'}
                  </div>
                </div>
                <div>
                  <div className="stat-label">1등 당첨자</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{latest.first_winners || 0}명</div>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>데이터가 없습니다. "데이터 수집" 버튼을 눌러주세요.</p>
          )}
        </div>

        {/* 추천 번호 */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">이번 주 추천 번호</div>
              {predictions && <div className="card-subtitle">{predictions.target_round}회차 대상</div>}
            </div>
            <Sparkles size={20} style={{ color: 'var(--accent-purple)' }} />
          </div>
          {predictions?.predictions ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {predictions.predictions.map((p, i) => (
                <div key={i} className="prediction-set">
                  <span className="set-label">SET {p.set_number}</span>
                  <BallGroup numbers={p.numbers} size={36} />
                  {p.confidence && <span className="confidence">{p.confidence}%</span>}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>"번호 추천" 버튼을 눌러 분석을 시작하세요.</p>
          )}
        </div>
      </div>

      {/* 핫/콜드 번호 */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Zap size={18} style={{ color: 'var(--accent-pink)', marginRight: 8 }} />
              핫 번호 (최근 자주 출현)
            </div>
          </div>
          <div className="ball-group" style={{ flexWrap: 'wrap' }}>
            {hotNumbers.map(s => (
              <div key={s.number} style={{ textAlign: 'center' }}>
                <span className={`lotto-ball r${Math.ceil(s.number / 10)}`} style={{ width: 44, height: 44 }}>
                  {s.number}
                </span>
                <div style={{ fontSize: 11, color: 'var(--accent-pink)', marginTop: 4 }}>{s.frequency}회</div>
              </div>
            ))}
            {hotNumbers.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>데이터 수집 후 표시됩니다</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <TrendingUp size={18} style={{ color: 'var(--accent-cyan)', marginRight: 8 }} />
              콜드 번호 (오래 미출현)
            </div>
          </div>
          <div className="ball-group" style={{ flexWrap: 'wrap' }}>
            {coldNumbers.map(s => (
              <div key={s.number} style={{ textAlign: 'center' }}>
                <span className={`lotto-ball r${Math.ceil(s.number / 10)}`} style={{ width: 44, height: 44, opacity: 0.7 }}>
                  {s.number}
                </span>
                <div style={{ fontSize: 11, color: 'var(--accent-cyan)', marginTop: 4 }}>{s.overdue}회 미출현</div>
              </div>
            ))}
            {coldNumbers.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>데이터 수집 후 표시됩니다</p>}
          </div>
        </div>
      </div>

      {/* 번호별 빈도 차트 */}
      {chartData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">번호별 출현 빈도</div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="number" tick={{ fill: '#8888a0', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8888a0', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8 }}
                labelStyle={{ color: '#e8e8f0' }}
              />
              <Bar dataKey="frequency" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isHot ? '#ff5c8a' : entry.isCold ? '#4f7cff' : '#7c5cff'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
