import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Sparkles, Flame, Snowflake, Scale, Gem, Brain, ChevronDown, ChevronUp, Trophy, TrendingUp, BarChart3, Percent } from 'lucide-react'
import { getLatestDraw, getDraws, getLatestPredictions, getNumberStats, getRangeStats, getCombinationStats, crawlAll, generateTypedPredictions } from '../api/client'
import { BallGroup } from '../components/LottoBall'
import Loading from '../components/Loading'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, PieChart, Pie } from 'recharts'

const TYPES = {
  hot:      { icon: Flame,    color: '#ff6b81', bg: 'rgba(255,107,129,0.1)',  label: '핫넘버' },
  cold:     { icon: Snowflake, color: '#45b7d1', bg: 'rgba(69,183,209,0.1)',  label: '콜드넘버' },
  balanced: { icon: Scale,    color: '#3dd68c', bg: 'rgba(61,214,140,0.1)',  label: '균형 조합' },
  rare:     { icon: Gem,      color: '#ffb347', bg: 'rgba(255,179,71,0.1)',  label: '희소 조합' },
  ensemble: { icon: Brain,    color: '#7c5cfc', bg: 'rgba(124,92,252,0.1)',  label: 'AI 앙상블' },
}
const TT = { background: '#19191f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12 }
const PIE_COLORS = ['#e6a817', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981']

function RecCard({ p, stats, open, onToggle }) {
  const c = TYPES[p.type] || TYPES.ensemble
  const Icon = c.icon
  const numStats = useMemo(() => {
    if (!stats?.length || !p.numbers?.length) return null
    const map = Object.fromEntries(stats.map(s => [s.number, s]))
    return p.numbers.map(n => map[n]).filter(Boolean)
  }, [stats, p.numbers])

  const avgFreq = numStats ? (numStats.reduce((s, n) => s + n.frequency, 0) / numStats.length).toFixed(1) : '—'
  const avgOverdue = numStats ? (numStats.reduce((s, n) => s + n.overdue, 0) / numStats.length).toFixed(1) : '—'
  const hotCount = numStats ? numStats.filter(n => n.is_hot).length : 0
  const coldCount = numStats ? numStats.filter(n => n.is_cold).length : 0

  return (
    <div className="type-card" style={{ borderColor: open ? `${c.color}40` : undefined }} onClick={onToggle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div className="type-icon" style={{ background: c.bg }}><Icon size={16} color={c.color} /></div>
        <span style={{ fontSize: 13, fontWeight: 700, color: c.color, flex: 1 }}>{c.label}</span>
        {p.confidence && <span className="type-chip" style={{ background: 'rgba(61,214,140,0.1)', color: 'var(--green)' }}>{p.confidence}%</span>}
        {open ? <ChevronUp size={13} color="var(--t4)" /> : <ChevronDown size={13} color="var(--t4)" />}
      </div>
      <BallGroup numbers={p.numbers} size={40} />
      <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 10 }}>
        <span style={{ color: 'var(--t4)' }}>빈도 <b style={{ color: 'var(--t2)' }}>{avgFreq}</b></span>
        <span style={{ color: 'var(--t4)' }}>미출현 <b style={{ color: 'var(--t2)' }}>{avgOverdue}</b></span>
        {p.analysis && <>
          <span style={{ color: 'var(--t4)' }}>홀짝 <b style={{ color: 'var(--t2)' }}>{p.analysis.odd_even}</b></span>
          <span style={{ color: 'var(--t4)' }}>합 <b style={{ color: 'var(--t2)' }}>{p.analysis.sum}</b></span>
        </>}
        {hotCount > 0 && <span className="badge badge-hot" style={{ padding: '1px 6px', fontSize: 9 }}>HOT {hotCount}</span>}
        {coldCount > 0 && <span className="badge badge-cold" style={{ padding: '1px 6px', fontSize: 9 }}>COLD {coldCount}</span>}
      </div>
      {open && numStats && (
        <div style={{ marginTop: 14 }} onClick={e => e.stopPropagation()}>
          <table className="data-table" style={{ fontSize: 12 }}>
            <thead><tr><th>번호</th><th>출현</th><th>확률</th><th>미출현</th><th>간격</th><th></th></tr></thead>
            <tbody>
              {numStats.map(s => (
                <tr key={s.number}>
                  <td><span className={`lotto-ball r${Math.ceil(s.number / 10)}`} style={{ width: 26, height: 26, fontSize: 10 }}>{s.number}</span></td>
                  <td style={{ fontWeight: 600 }}>{s.frequency}</td>
                  <td>{s.probability}%</td>
                  <td style={{ color: s.overdue > 10 ? 'var(--gold)' : 'var(--t2)' }}>{s.overdue}</td>
                  <td style={{ color: 'var(--t3)' }}>{s.avg_interval || '—'}</td>
                  <td>{s.is_hot && <span className="badge badge-hot">H</span>}{s.is_cold && <span className="badge badge-cold">C</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10 }}>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={numStats.map(s => ({ n: s.number, f: s.frequency }))}>
                <XAxis dataKey="n" tick={{ fill: '#6e6e80', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="f" name="출현" fill={c.color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const qc = useQueryClient()
  const { data: latest, isLoading: loadingDraw } = useQuery({ queryKey: ['latestDraw'], queryFn: getLatestDraw })
  const { data: drawList } = useQuery({ queryKey: ['draws', 1], queryFn: () => getDraws(1, 10) })
  const { data: stats } = useQuery({ queryKey: ['numberStats'], queryFn: getNumberStats })
  const { data: rangeStats } = useQuery({ queryKey: ['rangeStats'], queryFn: () => getRangeStats(30) })
  const { data: topPairs } = useQuery({ queryKey: ['combos', 2, 'desc'], queryFn: () => getCombinationStats(2, 10, 'desc') })
  const { data: topTriples } = useQuery({ queryKey: ['combos', 3, 'desc'], queryFn: () => getCombinationStats(3, 5, 'desc') })
  const { data: savedPredictions } = useQuery({ queryKey: ['predictions'], queryFn: getLatestPredictions, retry: false })
  const [freshTyped, setFreshTyped] = useState(null)
  const [openIdx, setOpenIdx] = useState(null)

  const crawlMut = useMutation({ mutationFn: crawlAll, onSuccess: () => qc.invalidateQueries() })
  const typedMut = useMutation({ mutationFn: generateTypedPredictions, onSuccess: d => { setFreshTyped(d); qc.invalidateQueries(['predictions']) } })

  const chartData = stats?.map(s => ({ n: s.number, f: s.frequency, h: s.is_hot, c: s.is_cold })) || []

  // 새로 생성한 추천이 있으면 그것, 없으면 DB에서 불러온 것
  const typed = freshTyped || (savedPredictions ? {
    target_round: savedPredictions.target_round,
    predictions: savedPredictions.predictions.map(p => {
      const d = p.algorithm_detail || {}
      return {
        type: d.type || 'ensemble',
        type_name: d.type_name || `SET ${p.set_number}`,
        type_desc: d.type_desc || '',
        numbers: p.numbers,
        confidence: p.confidence,
        analysis: d.analysis || null,
        detail: d.detail || null,
      }
    }),
  } : null)
  const typedList = typed?.predictions || []
  const totalDraws = drawList?.total || 0
  const recent10 = drawList?.draws || []

  const hot = stats?.filter(s => s.is_hot).sort((a, b) => b.frequency - a.frequency).slice(0, 6) || []
  const cold = stats?.filter(s => s.is_cold).sort((a, b) => b.overdue - a.overdue).slice(0, 6) || []

  const oddEvenAvg = rangeStats?.length ? {
    odd: (rangeStats.reduce((s, r) => s + r.odd_count, 0) / rangeStats.length).toFixed(1),
    even: (rangeStats.reduce((s, r) => s + r.even_count, 0) / rangeStats.length).toFixed(1),
  } : null

  const rangeAvg = rangeStats?.length ? [
    { name: '1-10', value: +(rangeStats.reduce((s, r) => s + r.range_1_10, 0) / rangeStats.length).toFixed(2) },
    { name: '11-20', value: +(rangeStats.reduce((s, r) => s + r.range_11_20, 0) / rangeStats.length).toFixed(2) },
    { name: '21-30', value: +(rangeStats.reduce((s, r) => s + r.range_21_30, 0) / rangeStats.length).toFixed(2) },
    { name: '31-40', value: +(rangeStats.reduce((s, r) => s + r.range_31_40, 0) / rangeStats.length).toFixed(2) },
    { name: '41-45', value: +(rangeStats.reduce((s, r) => s + r.range_41_45, 0) / rangeStats.length).toFixed(2) },
  ] : []

  const sumTrend = rangeStats?.slice(0, 20).reverse().map(r => ({ r: r.round_no, s: r.sum_total })) || []
  const consecAvg = rangeStats?.length ? (rangeStats.reduce((s, r) => s + r.consecutive_pairs, 0) / rangeStats.length).toFixed(1) : '—'

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">대시보드</h1>
          <p className="page-desc">로또 AI 분석</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => crawlMut.mutate()} disabled={crawlMut.isPending}>
            <RefreshCw size={14} /> {crawlMut.isPending ? '수집 중' : '데이터 수집'}
          </button>
          <button className="btn btn-primary" onClick={() => typedMut.mutate()} disabled={typedMut.isPending}>
            <Sparkles size={14} /> {typedMut.isPending ? '분석 중' : '5종류 추천'}
          </button>
        </div>
      </div>

      {crawlMut.isSuccess && (
        <div style={{ padding: '10px 16px', background: 'rgba(61,214,140,0.08)', border: '1px solid rgba(61,214,140,0.15)', borderRadius: 12, marginBottom: 16, fontSize: 13, color: 'var(--green)' }}>
          {crawlMut.data.message}
        </div>
      )}

      {/* ═══ 2열 레이아웃 ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* ─── 좌측 ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ① 통계 요약 4칸 */}
          <div className="grid-4">
            <div className="mini-stat">
              <div className="label">총 회차</div>
              <div className="value">{totalDraws.toLocaleString()}</div>
            </div>
            <div className="mini-stat">
              <div className="label">평균 홀짝</div>
              <div className="value" style={{ fontSize: 20 }}>{oddEvenAvg ? `${oddEvenAvg.odd}:${oddEvenAvg.even}` : '—'}</div>
              <div className="sub">최근 30회</div>
            </div>
            <div className="mini-stat">
              <div className="label">평균 연번</div>
              <div className="value" style={{ fontSize: 20 }}>{consecAvg}쌍</div>
              <div className="sub">최근 30회</div>
            </div>
            <div className="mini-stat">
              <div className="label">평균 합계</div>
              <div className="value" style={{ fontSize: 20 }}>{sumTrend.length ? Math.round(sumTrend.reduce((s, d) => s + d.s, 0) / sumTrend.length) : '—'}</div>
              <div className="sub">이상적 100~175</div>
            </div>
          </div>

          {/* ② 그래프: 빈도 + 합계 트렌드 */}
          <div className="grid-2">
            {chartData.length > 0 && (
              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}>
                  <BarChart3 size={13} style={{ marginRight: 4, verticalAlign: 'middle', color: 'var(--accent)' }} />
                  번호별 빈도
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} barCategoryGap="12%">
                    <XAxis dataKey="n" tick={{ fill: '#444454', fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#444454', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TT} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                    <Bar dataKey="f" name="횟수" radius={[3, 3, 0, 0]}>
                      {chartData.map((e, i) => <Cell key={i} fill={e.h ? '#ff6b81' : e.c ? '#45b7d1' : '#222229'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {sumTrend.length > 0 && (
              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}>
                  <TrendingUp size={13} style={{ marginRight: 4, verticalAlign: 'middle', color: 'var(--accent)' }} />
                  합계 트렌드 <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 400 }}>최근 20회</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={sumTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="r" tick={{ fill: '#444454', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[60, 210]} tick={{ fill: '#444454', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TT} />
                    <Line type="monotone" dataKey="s" name="합계" stroke="var(--accent)" strokeWidth={2} dot={{ r: 2, fill: 'var(--accent)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ③ 구간 파이 + 핫/콜드 */}
          <div className="grid-3">
            {rangeAvg.length > 0 && (
              <div className="card">
                <div className="card-title" style={{ marginBottom: 10 }}>구간 분포</div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={rangeAvg} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3}
                      label={({ name }) => name} labelLine={false}>
                      {rangeAvg.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={TT} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="card">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                <Flame size={13} color="var(--hot)" /> 핫 번호
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {hot.map(s => (
                  <div key={s.number} style={{ textAlign: 'center' }}>
                    <span className={`lotto-ball r${Math.ceil(s.number / 10)}`} style={{ width: 34, height: 34, fontSize: 12 }}>{s.number}</span>
                    <div style={{ fontSize: 9, color: 'var(--hot)', marginTop: 3, fontWeight: 600 }}>{s.frequency}</div>
                  </div>
                ))}
                {hot.length === 0 && <span style={{ fontSize: 11, color: 'var(--t4)' }}>수집 필요</span>}
              </div>
            </div>
            <div className="card">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                <Snowflake size={13} color="var(--cold)" /> 콜드 번호
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {cold.map(s => (
                  <div key={s.number} style={{ textAlign: 'center' }}>
                    <span className={`lotto-ball r${Math.ceil(s.number / 10)}`} style={{ width: 34, height: 34, fontSize: 12, opacity: 0.7 }}>{s.number}</span>
                    <div style={{ fontSize: 9, color: 'var(--cold)', marginTop: 3, fontWeight: 600 }}>{s.overdue}회</div>
                  </div>
                ))}
                {cold.length === 0 && <span style={{ fontSize: 11, color: 'var(--t4)' }}>수집 필요</span>}
              </div>
            </div>
          </div>

          {/* ④ 5종류 추천 */}
          {typedList.length > 0 ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="section-title" style={{ margin: 0 }}>
                  <Sparkles size={14} color="var(--accent)" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>{typed.target_round}회차 추천</span>
                </div>
                <span style={{ fontSize: 10, color: 'var(--t4)' }}>카드 클릭 → 통계 비교</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {typedList.map((p, i) => (
                  <RecCard key={i} p={p} stats={stats} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? null : i)} />
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <Sparkles size={28} color="var(--accent)" style={{ marginBottom: 10, opacity: 0.4 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>추천 번호 없음</div>
              <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 14 }}>상단 "5종류 추천" 버튼으로 AI 분석 시작</div>
              <button className="btn btn-primary" onClick={() => typedMut.mutate()} disabled={typedMut.isPending}>
                <Sparkles size={14} /> 추천 생성
              </button>
            </div>
          )}

          {/* ⑤ 조합 확률 */}
          <div className="grid-2">
            <div className="card">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Percent size={13} color="var(--accent)" /> 2개 조합 TOP 10
              </div>
              {topPairs?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {topPairs.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border-1)' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', minWidth: 16 }}>{i + 1}</span>
                      <BallGroup numbers={c.combination} size={24} />
                      <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>{c.frequency}회</span>
                      <span style={{ fontSize: 11, color: 'var(--green)', minWidth: 42, textAlign: 'right' }}>{c.probability.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              ) : <p style={{ color: 'var(--t4)', fontSize: 12 }}>데이터 없음</p>}
            </div>
            <div className="card">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Percent size={13} color="var(--gold)" /> 3개 조합 TOP 5
              </div>
              {topTriples?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {topTriples.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border-1)' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', minWidth: 16 }}>{i + 1}</span>
                      <BallGroup numbers={c.combination} size={24} />
                      <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>{c.frequency}회</span>
                      <span style={{ fontSize: 11, color: 'var(--green)', minWidth: 48, textAlign: 'right' }}>{c.probability.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              ) : <p style={{ color: 'var(--t4)', fontSize: 12 }}>데이터 없음</p>}
            </div>
          </div>
        </div>

        {/* ─── 우측: 최근 당첨번호 ─── */}
        <div style={{ position: 'sticky', top: 32 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <Trophy size={14} color="var(--gold)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>최근 당첨번호</span>
            </div>
            {loadingDraw ? <Loading /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {latest && (
                  <div style={{ padding: 14, background: 'linear-gradient(135deg, rgba(124,92,252,0.06), rgba(91,141,239,0.04))', borderRadius: 12, border: '1px solid rgba(124,92,252,0.12)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--t0)', letterSpacing: '-1px' }}>{latest.round_no}</span>
                      <span style={{ fontSize: 11, color: 'var(--t3)' }}>회</span>
                      <span style={{ fontSize: 10, color: 'var(--t4)', marginLeft: 'auto' }}>{latest.draw_date}</span>
                    </div>
                    <BallGroup numbers={latest.numbers} size={32} />
                    <div style={{ marginTop: 6, fontSize: 10, color: 'var(--t4)' }}>
                      보너스 <span className="lotto-ball" style={{ width: 20, height: 20, fontSize: 8, background: 'var(--bg-4)', boxShadow: 'none', display: 'inline-flex', verticalAlign: 'middle' }}>{latest.bonus}</span>
                    </div>
                    {latest.first_prize && (
                      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--t3)' }}>
                        1등 <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{(latest.first_prize / 100000000).toFixed(0)}억</span>
                        <span style={{ color: 'var(--t4)', marginLeft: 4 }}>{latest.first_winners}명</span>
                      </div>
                    )}
                  </div>
                )}
                {recent10.slice(1).map(d => (
                  <div key={d.round_no} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-1)' }}>
                    <div style={{ minWidth: 38 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>{d.round_no}</div>
                      <div style={{ fontSize: 9, color: 'var(--t4)' }}>{d.draw_date?.slice(5)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {d.numbers.map((n, i) => (
                        <span key={i} className={`lotto-ball r${Math.ceil(n / 10)}`} style={{ width: 22, height: 22, fontSize: 9, boxShadow: 'none' }}>{n}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
