import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Sparkles, Flame, Snowflake, Scale, Gem, Brain, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { getLatestDraw, getLatestPredictions, getNumberStats, crawlAll, generateTypedPredictions } from '../api/client'
import { BallGroup } from '../components/LottoBall'
import Loading from '../components/Loading'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const TYPES = {
  hot:      { icon: Flame,    color: '#f43f5e', bg: 'rgba(244,63,94,0.08)',  label: '핫넘버' },
  cold:     { icon: Snowflake, color: '#06b6d4', bg: 'rgba(6,182,212,0.08)',  label: '콜드넘버' },
  balanced: { icon: Scale,    color: '#10b981', bg: 'rgba(16,185,129,0.08)', label: '균형 조합' },
  rare:     { icon: Gem,      color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: '희소 조합' },
  ensemble: { icon: Brain,    color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', label: 'AI 앙상블' },
}

function TypedCard({ prediction, index }) {
  const [open, setOpen] = useState(false)
  const cfg = TYPES[prediction.type] || TYPES.ensemble
  const Icon = cfg.icon

  return (
    <div
      className="type-card"
      style={{ animationDelay: `${index * 0.06}s`, borderColor: open ? `${cfg.color}40` : undefined }}
      onClick={() => setOpen(o => !o)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div className="type-icon" style={{ background: cfg.bg }}>
          <Icon size={18} color={cfg.color} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-0)', letterSpacing: '-0.3px' }}>{cfg.label}</span>
            {prediction.confidence && (
              <span className="type-chip" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
                {prediction.confidence}%
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{prediction.type_desc}</div>
        </div>
        {open ? <ChevronUp size={16} color="var(--text-4)" /> : <ChevronDown size={16} color="var(--text-4)" />}
      </div>

      <BallGroup numbers={prediction.numbers} size={42} />

      {prediction.analysis && (
        <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
          {[
            { label: '홀짝', value: prediction.analysis.odd_even },
            { label: '합계', value: prediction.analysis.sum },
            { label: '구간', value: prediction.analysis.range_coverage },
          ].map(d => (
            <div key={d.label} style={{ fontSize: 11 }}>
              <span style={{ color: 'var(--text-4)' }}>{d.label} </span>
              <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{d.value}</span>
            </div>
          ))}
        </div>
      )}

      {open && prediction.detail && (
        <div style={{
          marginTop: 16, padding: 16, background: 'var(--bg-1)', borderRadius: 'var(--radius-s)',
          fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7,
        }}>
          {prediction.detail.strategy && <div><span style={{ color: 'var(--text-3)' }}>전략</span> {prediction.detail.strategy}</div>}
          {prediction.detail.hot_numbers && <div><span style={{ color: 'var(--text-3)' }}>핫 TOP10</span> {prediction.detail.hot_numbers.join(' · ')}</div>}
          {prediction.detail.top_overdue && <div><span style={{ color: 'var(--text-3)' }}>오버듀 TOP10</span> {prediction.detail.top_overdue.join(' · ')}</div>}
          {prediction.detail.rare_numbers && <div><span style={{ color: 'var(--text-3)' }}>희소 번호</span> {prediction.detail.rare_numbers.join(' · ')}</div>}
          {prediction.detail.target_sum_range && <div><span style={{ color: 'var(--text-3)' }}>목표 합계</span> {prediction.detail.target_sum_range}</div>}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const qc = useQueryClient()
  const { data: latest, isLoading: loadingDraw } = useQuery({ queryKey: ['latestDraw'], queryFn: getLatestDraw })
  const { data: predictions } = useQuery({ queryKey: ['predictions'], queryFn: getLatestPredictions, retry: false })
  const { data: stats } = useQuery({ queryKey: ['numberStats'], queryFn: getNumberStats })
  const [typed, setTyped] = useState(null)

  const crawlMut = useMutation({ mutationFn: crawlAll, onSuccess: () => qc.invalidateQueries() })
  const typedMut = useMutation({
    mutationFn: generateTypedPredictions,
    onSuccess: d => { setTyped(d); qc.invalidateQueries(['predictions']) },
  })

  const hot = stats?.filter(s => s.is_hot).sort((a, b) => b.frequency - a.frequency).slice(0, 6) || []
  const cold = stats?.filter(s => s.is_cold).sort((a, b) => b.overdue - a.overdue).slice(0, 6) || []

  const chartData = stats?.map(s => ({ n: s.number, f: s.frequency, h: s.is_hot, c: s.is_cold })) || []
  const typedList = typed?.predictions || []

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">대시보드</h1>
          <p className="page-desc">로또 AI 분석 현황</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => crawlMut.mutate()} disabled={crawlMut.isPending}>
            <RefreshCw size={14} className={crawlMut.isPending ? '' : ''} />
            {crawlMut.isPending ? '수집 중' : '데이터 수집'}
          </button>
          <button className="btn btn-primary" onClick={() => typedMut.mutate()} disabled={typedMut.isPending}>
            <Sparkles size={14} />
            {typedMut.isPending ? '분석 중' : '5종류 추천'}
          </button>
        </div>
      </div>

      {crawlMut.isSuccess && (
        <div style={{ padding: '12px 16px', background: 'var(--green-soft)', borderRadius: 'var(--radius-s)', marginBottom: 24, fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
          {crawlMut.data.message}
        </div>
      )}

      {/* Latest draw */}
      <div className="section">
        <div className="card">
          {loadingDraw ? <Loading /> : latest ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-0)', letterSpacing: '-1px' }}>{latest.round_no}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>회차</span>
                  <span style={{ fontSize: 12, color: 'var(--text-4)', marginLeft: 4 }}>{latest.draw_date}</span>
                </div>
                <BallGroup numbers={latest.numbers} size={48} />
              </div>
              {latest.first_prize && (
                <div style={{ textAlign: 'right' }}>
                  <div className="stat-label">1등 당첨금</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--gold)', letterSpacing: '-0.5px' }}>
                    {(latest.first_prize / 100000000).toFixed(0)}억
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{latest.first_winners}명</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <p style={{ color: 'var(--text-3)', fontSize: 13 }}>데이터가 없습니다</p>
              <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => crawlMut.mutate()}>데이터 수집하기</button>
            </div>
          )}
        </div>
      </div>

      {/* 5종류 추천 */}
      {typedList.length > 0 && (
        <div className="section">
          <div className="section-title">
            <Sparkles size={14} color="var(--violet)" />
            {typed.target_round}회차 추천 번호
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {typedList.map((p, i) => <TypedCard key={i} prediction={p} index={i} />)}
          </div>
        </div>
      )}

      {/* 핫 / 콜드 */}
      {(hot.length > 0 || cold.length > 0) && (
        <div className="grid-2 section">
          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
              <Flame size={14} color="var(--rose)" /> 핫 번호
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {hot.map(s => (
                <div key={s.number} style={{ textAlign: 'center' }}>
                  <span className={`lotto-ball r${Math.ceil(s.number / 10)}`} style={{ width: 40, height: 40 }}>{s.number}</span>
                  <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4 }}>{s.frequency}회</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
              <Snowflake size={14} color="var(--cyan)" /> 콜드 번호
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {cold.map(s => (
                <div key={s.number} style={{ textAlign: 'center' }}>
                  <span className={`lotto-ball r${Math.ceil(s.number / 10)}`} style={{ width: 40, height: 40, opacity: 0.6 }}>{s.number}</span>
                  <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4 }}>{s.overdue}회 미출현</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 빈도 차트 */}
      {chartData.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 20 }}>번호별 출현 빈도</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barCategoryGap="15%">
              <XAxis dataKey="n" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#fafafa' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="f" name="출현횟수" radius={[3, 3, 0, 0]}>
                {chartData.map((e, i) => (
                  <Cell key={i} fill={e.h ? '#f43f5e' : e.c ? '#06b6d4' : '#3f3f46'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
