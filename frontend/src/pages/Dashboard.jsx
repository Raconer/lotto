import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Sparkles, TrendingUp, Database, Zap, Flame, Snowflake, Scale, Gem, Brain } from 'lucide-react'
import { getLatestDraw, getLatestPredictions, getNumberStats, crawlAll, generateTypedPredictions } from '../api/client'
import { BallGroup } from '../components/LottoBall'
import Loading from '../components/Loading'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const TYPE_CONFIG = {
  hot: { icon: Flame, color: '#ff5c8a', gradient: 'linear-gradient(135deg, #ff5c8a, #ff8c42)', label: '핫넘버' },
  cold: { icon: Snowflake, color: '#00c9db', gradient: 'linear-gradient(135deg, #4f7cff, #00c9db)', label: '콜드넘버' },
  balanced: { icon: Scale, color: '#00d68f', gradient: 'linear-gradient(135deg, #00d68f, #00b876)', label: '균형 조합' },
  rare: { icon: Gem, color: '#ffc84f', gradient: 'linear-gradient(135deg, #ffc84f, #ff8c42)', label: '희소 조합' },
  ensemble: { icon: Brain, color: '#7c5cff', gradient: 'linear-gradient(135deg, #7c5cff, #4f7cff)', label: 'AI 앙상블' },
}

function TypedPredictionCard({ prediction }) {
  const config = TYPE_CONFIG[prediction.type] || TYPE_CONFIG.ensemble
  const Icon = config.icon
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="card"
      style={{ cursor: 'pointer', borderColor: expanded ? config.color : undefined }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: config.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: config.color }}>{prediction.type_name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{prediction.type_desc}</div>
        </div>
        {prediction.confidence && (
          <span style={{ fontSize: 13, color: 'var(--accent-green)', fontWeight: 600 }}>{prediction.confidence}%</span>
        )}
      </div>

      <BallGroup numbers={prediction.numbers} size={44} />

      {prediction.analysis && (
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>홀짝 {prediction.analysis.odd_even}</span>
          <span>합계 {prediction.analysis.sum}</span>
          <span>구간 {prediction.analysis.range_coverage}</span>
          {prediction.analysis.consecutive_pairs > 0 && <span>연번 {prediction.analysis.consecutive_pairs}쌍</span>}
        </div>
      )}

      {expanded && prediction.detail && (
        <div style={{
          marginTop: 16, padding: 12, background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>전략 상세</div>
          {prediction.detail.strategy && <div><strong>전략:</strong> {prediction.detail.strategy}</div>}
          {prediction.detail.hot_numbers && (
            <div style={{ marginTop: 4 }}>
              <strong>핫 번호:</strong> {prediction.detail.hot_numbers.join(', ')}
            </div>
          )}
          {prediction.detail.top_overdue && (
            <div style={{ marginTop: 4 }}>
              <strong>오버듀 TOP:</strong> {prediction.detail.top_overdue.join(', ')}
            </div>
          )}
          {prediction.detail.rare_numbers && (
            <div style={{ marginTop: 4 }}>
              <strong>희소 번호:</strong> {prediction.detail.rare_numbers.join(', ')}
            </div>
          )}
          {prediction.detail.target_sum_range && (
            <div style={{ marginTop: 4 }}><strong>목표 합계:</strong> {prediction.detail.target_sum_range}</div>
          )}
          {prediction.detail.engine_weights && (
            <div style={{ marginTop: 4 }}>
              <strong>엔진 가중치:</strong>{' '}
              {Object.entries(prediction.detail.engine_weights).map(([k, v]) => `${k}(${v})`).join(' ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const queryClient = useQueryClient()
  const { data: latest, isLoading: loadingDraw } = useQuery({ queryKey: ['latestDraw'], queryFn: getLatestDraw })
  const { data: predictions } = useQuery({ queryKey: ['predictions'], queryFn: getLatestPredictions, retry: false })
  const { data: stats } = useQuery({ queryKey: ['numberStats'], queryFn: getNumberStats })
  const [typedPredictions, setTypedPredictions] = useState(null)

  const crawlMutation = useMutation({
    mutationFn: crawlAll,
    onSuccess: () => queryClient.invalidateQueries(),
  })

  const typedMutation = useMutation({
    mutationFn: generateTypedPredictions,
    onSuccess: (data) => {
      setTypedPredictions(data)
      queryClient.invalidateQueries(['predictions'])
    },
  })

  const hotNumbers = stats?.filter(s => s.is_hot).slice(0, 6) || []
  const coldNumbers = stats?.filter(s => s.is_cold).slice(0, 6) || []

  const chartData = stats?.map(s => ({
    number: s.number,
    frequency: s.frequency,
    isHot: s.is_hot,
    isCold: s.is_cold,
  })) || []

  const typedData = typedPredictions?.predictions || []

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">대시보드</h1>
          <p className="page-desc">로또 AI 분석 현황</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => crawlMutation.mutate()} disabled={crawlMutation.isPending}>
            <RefreshCw size={16} />
            {crawlMutation.isPending ? '수집 중...' : '데이터 수집'}
          </button>
          <button className="btn btn-primary" onClick={() => typedMutation.mutate()} disabled={typedMutation.isPending}>
            <Sparkles size={16} />
            {typedMutation.isPending ? '분석 중...' : '5종류 추천'}
          </button>
        </div>
      </div>

      {crawlMutation.isSuccess && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'var(--accent-green)', background: 'rgba(0,214,143,0.05)' }}>
          <p style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{crawlMutation.data.message}</p>
        </div>
      )}

      {/* 최신 당첨번호 */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">최신 당첨번호</div>
            {latest && <div className="card-subtitle">{latest.round_no}회 ({latest.draw_date})</div>}
          </div>
          <Database size={20} style={{ color: 'var(--accent-blue)' }} />
        </div>
        {loadingDraw ? <Loading /> : latest ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <BallGroup numbers={latest.numbers} size={50} />
            {latest.first_prize && (
              <div>
                <div className="stat-label">1등 당첨금</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-yellow)' }}>
                  {(latest.first_prize / 100000000).toFixed(1)}억원
                </div>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>데이터 수집 버튼을 눌러주세요.</p>
        )}
      </div>

      {/* 5종류 추천 번호 */}
      {typedData.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
            <Sparkles size={20} style={{ color: 'var(--accent-purple)', marginRight: 8 }} />
            {typedPredictions.target_round}회차 추천 번호 (5종류)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {typedData.map((p, i) => (
              <TypedPredictionCard key={i} prediction={p} />
            ))}
          </div>
        </div>
      )}

      {/* 기존 predictions (5종류 없을 때 폴백) */}
      {typedData.length === 0 && predictions?.predictions && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div>
              <div className="card-title">이번 주 추천 번호</div>
              {predictions && <div className="card-subtitle">{predictions.target_round}회차 대상</div>}
            </div>
            <Sparkles size={20} style={{ color: 'var(--accent-purple)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {predictions.predictions.map((p, i) => (
              <div key={i} className="prediction-set">
                <span className="set-label">SET {p.set_number}</span>
                <BallGroup numbers={p.numbers} size={36} />
                {p.confidence && <span className="confidence">{p.confidence}%</span>}
              </div>
            ))}
          </div>
        </div>
      )}

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
                <span className={`lotto-ball r${Math.ceil(s.number / 10)}`} style={{ width: 44, height: 44 }}>{s.number}</span>
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
                <span className={`lotto-ball r${Math.ceil(s.number / 10)}`} style={{ width: 44, height: 44, opacity: 0.7 }}>{s.number}</span>
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
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8 }} />
              <Bar dataKey="frequency" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.isHot ? '#ff5c8a' : entry.isCold ? '#4f7cff' : '#7c5cff'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
