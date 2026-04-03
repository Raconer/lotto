import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Sparkles, Flame, Snowflake, Scale, Gem, Brain, ChevronDown, ChevronUp, Trophy, TrendingUp, Hash, Calendar, Zap } from 'lucide-react'
import { getLatestDraw, getDraws, getLatestPredictions, getNumberStats, getRangeStats, crawlAll, generateTypedPredictions } from '../api/client'
import { BallGroup } from '../components/LottoBall'
import Loading from '../components/Loading'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, PieChart, Pie } from 'recharts'

const TYPES = {
  hot:      { icon: Flame, color: '#ff6b81', bg: 'rgba(255,107,129,0.1)' },
  cold:     { icon: Snowflake, color: '#45b7d1', bg: 'rgba(69,183,209,0.1)' },
  balanced: { icon: Scale, color: '#3dd68c', bg: 'rgba(61,214,140,0.1)' },
  rare:     { icon: Gem, color: '#ffb347', bg: 'rgba(255,179,71,0.1)' },
  ensemble: { icon: Brain, color: '#7c5cfc', bg: 'rgba(124,92,252,0.1)' },
}
const TT = { background: '#19191f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12 }

function TypedCard({ p, idx }) {
  const [open, setOpen] = useState(false)
  const c = TYPES[p.type] || TYPES.ensemble
  const Icon = c.icon
  return (
    <div className="type-card" style={{ animationDelay: `${idx * 0.06}s`, borderColor: open ? `${c.color}30` : undefined }}
      onClick={() => setOpen(o => !o)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div className="type-icon" style={{ background: c.bg }}><Icon size={18} color={c.color} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{p.type_name}</div>
          <div style={{ fontSize: 10, color: 'var(--t4)' }}>{p.type_desc?.slice(0, 40)}</div>
        </div>
        {p.confidence && <span className="type-chip" style={{ background: 'rgba(61,214,140,0.1)', color: 'var(--green)' }}>{p.confidence}%</span>}
        {open ? <ChevronUp size={14} color="var(--t4)" /> : <ChevronDown size={14} color="var(--t4)" />}
      </div>
      <BallGroup numbers={p.numbers} size={42} />
      {p.analysis && (
        <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 10, color: 'var(--t4)' }}>
          <span>홀짝 <b style={{ color: 'var(--t2)' }}>{p.analysis.odd_even}</b></span>
          <span>합계 <b style={{ color: 'var(--t2)' }}>{p.analysis.sum}</b></span>
          <span>구간 <b style={{ color: 'var(--t2)' }}>{p.analysis.range_coverage}</b></span>
        </div>
      )}
      {open && p.detail && (
        <div style={{ marginTop: 14, padding: 14, background: 'var(--bg-1)', borderRadius: 10, fontSize: 11, color: 'var(--t2)', lineHeight: 1.9 }}>
          {p.detail.strategy && <div><span style={{ color: 'var(--t4)' }}>전략 </span>{p.detail.strategy}</div>}
          {p.detail.hot_numbers && <div><span style={{ color: 'var(--t4)' }}>핫 TOP </span>{p.detail.hot_numbers.join(' · ')}</div>}
          {p.detail.top_overdue && <div><span style={{ color: 'var(--t4)' }}>오버듀 </span>{p.detail.top_overdue.join(' · ')}</div>}
          {p.detail.rare_numbers && <div><span style={{ color: 'var(--t4)' }}>희소 </span>{p.detail.rare_numbers.join(' · ')}</div>}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const qc = useQueryClient()
  const { data: latest, isLoading: loadingDraw } = useQuery({ queryKey: ['latestDraw'], queryFn: getLatestDraw })
  const { data: drawList } = useQuery({ queryKey: ['draws', 1], queryFn: () => getDraws(1, 5) })
  const { data: predictions } = useQuery({ queryKey: ['predictions'], queryFn: getLatestPredictions, retry: false })
  const { data: stats } = useQuery({ queryKey: ['numberStats'], queryFn: getNumberStats })
  const { data: rangeStats } = useQuery({ queryKey: ['rangeStats'], queryFn: () => getRangeStats(30) })
  const [typed, setTyped] = useState(null)

  const crawlMut = useMutation({ mutationFn: crawlAll, onSuccess: () => qc.invalidateQueries() })
  const typedMut = useMutation({ mutationFn: generateTypedPredictions, onSuccess: d => { setTyped(d); qc.invalidateQueries(['predictions']) } })

  const hot = stats?.filter(s => s.is_hot).sort((a, b) => b.frequency - a.frequency).slice(0, 8) || []
  const cold = stats?.filter(s => s.is_cold).sort((a, b) => b.overdue - a.overdue).slice(0, 8) || []
  const chartData = stats?.map(s => ({ n: s.number, f: s.frequency, h: s.is_hot, c: s.is_cold })) || []
  const typedList = typed?.predictions || []

  const totalDraws = drawList?.total || 0
  const latestRound = latest?.round_no || 0

  // 구간 분포 pie
  const rangeAvg = rangeStats?.length > 0 ? {
    '1-10': rangeStats.reduce((s, r) => s + r.range_1_10, 0) / rangeStats.length,
    '11-20': rangeStats.reduce((s, r) => s + r.range_11_20, 0) / rangeStats.length,
    '21-30': rangeStats.reduce((s, r) => s + r.range_21_30, 0) / rangeStats.length,
    '31-40': rangeStats.reduce((s, r) => s + r.range_31_40, 0) / rangeStats.length,
    '41-45': rangeStats.reduce((s, r) => s + r.range_41_45, 0) / rangeStats.length,
  } : null

  const pieData = rangeAvg ? Object.entries(rangeAvg).map(([k, v]) => ({ name: k, value: +v.toFixed(2) })) : []
  const PIE_COLORS = ['#e6a817', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981']

  // 합계 트렌드
  const sumTrend = rangeStats?.slice(0, 20).reverse().map(r => ({ r: r.round_no, sum: r.sum_total })) || []

  // 최근 5회차
  const recent5 = drawList?.draws?.slice(0, 5) || []

  return (
    <div>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 className="page-title">대시보드</h1>
          <p className="page-desc">실시간 로또 AI 분석</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => crawlMut.mutate()} disabled={crawlMut.isPending}>
            <RefreshCw size={14} /> {crawlMut.isPending ? '수집 중' : '데이터 수집'}
          </button>
          <button className="btn btn-primary" onClick={() => typedMut.mutate()} disabled={typedMut.isPending}>
            <Sparkles size={14} /> {typedMut.isPending ? '분석 중' : '5종류 추천 생성'}
          </button>
        </div>
      </div>

      {crawlMut.isSuccess && (
        <div style={{ padding: '10px 16px', background: 'rgba(61,214,140,0.08)', border: '1px solid rgba(61,214,140,0.15)', borderRadius: 12, marginBottom: 20, fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
          {crawlMut.data.message}
        </div>
      )}

      {/* ─── Hero: 최신 당첨 ─── */}
      <div className="hero-card section" style={{ animation: 'fadeIn 0.4s ease' }}>
        {loadingDraw ? <Loading /> : latest ? (
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Trophy size={16} color="var(--gold)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Latest Draw</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 42, fontWeight: 900, color: 'var(--t0)', letterSpacing: '-2px', lineHeight: 1 }}>{latest.round_no}</span>
                  <span style={{ fontSize: 14, color: 'var(--t3)', fontWeight: 500 }}>회차</span>
                  <span style={{ fontSize: 12, color: 'var(--t4)', marginLeft: 4 }}>{latest.draw_date}</span>
                </div>
                <BallGroup numbers={latest.numbers} size={52} />
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--t4)' }}>
                  보너스 <span className="lotto-ball" style={{ width: 28, height: 28, fontSize: 11, background: 'var(--bg-4)', display: 'inline-flex', verticalAlign: 'middle', boxShadow: 'none' }}>{latest.bonus}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {latest.first_prize && (
                  <>
                    <div style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>1등 당첨금</div>
                    <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--gold)', letterSpacing: '-1.5px', lineHeight: 1, textShadow: '0 0 30px rgba(255,179,71,0.2)' }}>
                      {(latest.first_prize / 100000000).toFixed(0)}<span style={{ fontSize: 18, fontWeight: 600 }}>억</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>{latest.first_winners}명 당첨</div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <p style={{ color: 'var(--t3)' }}>데이터를 수집해주세요</p>
          </div>
        )}
      </div>

      {/* ─── 통계 카드 4개 ─── */}
      <div className="grid-4 section">
        <div className="mini-stat">
          <div className="label"><Hash size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />총 회차</div>
          <div className="value">{totalDraws.toLocaleString()}</div>
          <div className="sub">2002년~현재</div>
        </div>
        <div className="mini-stat">
          <div className="label"><Flame size={12} style={{ marginRight: 4, verticalAlign: 'middle', color: 'var(--hot)' }} />핫넘버</div>
          <div className="value" style={{ color: 'var(--hot)' }}>{hot.length > 0 ? hot.map(h => h.number).join(', ') : '—'}</div>
          <div className="sub">최근 20회 고빈도</div>
        </div>
        <div className="mini-stat">
          <div className="label"><Snowflake size={12} style={{ marginRight: 4, verticalAlign: 'middle', color: 'var(--cold)' }} />콜드넘버</div>
          <div className="value" style={{ color: 'var(--cold)' }}>{cold.length > 0 ? cold.slice(0, 4).map(c => c.number).join(', ') : '—'}</div>
          <div className="sub">장기 미출현</div>
        </div>
        <div className="mini-stat">
          <div className="label"><Calendar size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />다음 회차</div>
          <div className="value" style={{ color: 'var(--accent)' }}>{latestRound + 1}</div>
          <div className="sub">추천 대상</div>
        </div>
      </div>

      {/* ─── 5종류 추천 ─── */}
      {typedList.length > 0 && (
        <div className="section">
          <div className="section-title">
            <Sparkles size={14} color="var(--accent)" />
            <span>{typed.target_round}회차 AI 추천 번호</span>
            <span style={{ fontSize: 10, color: 'var(--t4)', marginLeft: 'auto' }}>5종류 전략</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {typedList.map((p, i) => <TypedCard key={i} p={p} idx={i} />)}
          </div>
        </div>
      )}

      {/* ─── 차트 2열 ─── */}
      <div className="grid-2 section">
        {/* 빈도 차트 */}
        {chartData.length > 0 && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>번호별 출현 빈도</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="12%">
                <XAxis dataKey="n" tick={{ fill: '#444454', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#444454', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="f" name="횟수" radius={[3, 3, 0, 0]}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.h ? '#ff6b81' : e.c ? '#45b7d1' : '#2a2a33'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 합계 트렌드 */}
        {sumTrend.length > 0 && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 4 }}>합계 트렌드 <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 400 }}>최근 20회</span></div>
            <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 14 }}>이상적 범위 100~175</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={sumTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="r" tick={{ fill: '#444454', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 210]} tick={{ fill: '#444454', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} />
                <Line type="monotone" dataKey="sum" name="합계" stroke="var(--accent)" strokeWidth={2} dot={{ r: 2.5, fill: 'var(--accent)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ─── 구간 분포 + 최근 5회차 ─── */}
      <div className="grid-2 section">
        {/* 구간 분포 파이 */}
        {pieData.length > 0 && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>평균 구간 분포</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={TT} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 최근 5회차 */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>최근 당첨번호</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recent5.map(d => (
              <div key={d.round_no} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-1)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', minWidth: 44 }}>{d.round_no}</span>
                <span style={{ fontSize: 10, color: 'var(--t4)', minWidth: 70 }}>{d.draw_date}</span>
                <BallGroup numbers={d.numbers} size={26} />
              </div>
            ))}
            {recent5.length === 0 && <p style={{ color: 'var(--t4)', fontSize: 12 }}>데이터 없음</p>}
          </div>
        </div>
      </div>

      {/* ─── 핫/콜드 상세 ─── */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <Flame size={14} color="var(--hot)" /> 핫 번호
            <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 400, marginLeft: 'auto' }}>최근 20회 기준</span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {hot.map(s => (
              <div key={s.number} style={{ textAlign: 'center' }}>
                <span className={`lotto-ball r${Math.ceil(s.number / 10)}`} style={{ width: 40, height: 40, fontSize: 13 }}>{s.number}</span>
                <div style={{ fontSize: 10, color: 'var(--hot)', marginTop: 4, fontWeight: 600 }}>{s.frequency}회</div>
              </div>
            ))}
            {hot.length === 0 && <p style={{ color: 'var(--t4)', fontSize: 12 }}>데이터 수집 후 표시</p>}
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <Snowflake size={14} color="var(--cold)" /> 콜드 번호
            <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 400, marginLeft: 'auto' }}>장기 미출현</span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {cold.map(s => (
              <div key={s.number} style={{ textAlign: 'center' }}>
                <span className={`lotto-ball r${Math.ceil(s.number / 10)}`} style={{ width: 40, height: 40, fontSize: 13, opacity: 0.7 }}>{s.number}</span>
                <div style={{ fontSize: 10, color: 'var(--cold)', marginTop: 4, fontWeight: 600 }}>{s.overdue}회</div>
              </div>
            ))}
            {cold.length === 0 && <p style={{ color: 'var(--t4)', fontSize: 12 }}>데이터 수집 후 표시</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
