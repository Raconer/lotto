import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Sparkles, Flame, Snowflake, Scale, Gem, Brain, ChevronDown, ChevronUp, Trophy, TrendingUp, BarChart3, Percent, Database, Download } from 'lucide-react'
import { getLatestDraw, getDraws, getLatestPredictions, getNumberStats, getRangeStats, getCombinationStats, crawlRange, getCrawlStatus, getDbStatus, generateTypedPredictions } from '../api/client'
import { BallGroup } from '../components/LottoBall'
import Loading from '../components/Loading'
import InfoTip from '../components/InfoTip'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, PieChart, Pie } from 'recharts'

const TYPES = {
  hot:      { icon: Flame,    label: '핫넘버' },
  cold:     { icon: Snowflake, label: '콜드넘버' },
  balanced: { icon: Scale,    label: '균형 조합' },
  rare:     { icon: Gem,      label: '희소 조합' },
  ensemble: { icon: Brain,    label: 'AI 앙상블' },
}
const TYPE_COLORS = { hot: 'var(--hot)', cold: 'var(--cold)', balanced: 'var(--green)', rare: 'var(--gold)', ensemble: 'var(--accent)' }
const TYPE_SOFTS = { hot: 'var(--hot-soft)', cold: 'var(--cold-soft)', balanced: 'var(--green-soft)', rare: 'var(--gold-soft)', ensemble: 'var(--accent-soft)' }
const PIE_COLORS = ['#ca8a04', '#2563eb', '#dc2626', '#7c3aed', '#059669']

function useChartStyles() {
  const s = getComputedStyle(document.documentElement)
  return {
    tt: { background: s.getPropertyValue('--tooltip-bg').trim(), border: `1px solid ${s.getPropertyValue('--tooltip-border').trim()}`, borderRadius: 8, fontSize: 12 },
    grid: s.getPropertyValue('--chart-grid').trim(),
    bar: s.getPropertyValue('--chart-bar').trim(),
    tick: s.getPropertyValue('--t3').trim(),
    hot: s.getPropertyValue('--hot').trim(),
    cold: s.getPropertyValue('--cold').trim(),
    accent: s.getPropertyValue('--accent').trim(),
  }
}

function RecCard({ p, stats, open, onToggle, cs }) {
  const c = TYPES[p.type] || TYPES.ensemble
  const Icon = c.icon
  const color = TYPE_COLORS[p.type] || 'var(--accent)'
  const soft = TYPE_SOFTS[p.type] || 'var(--accent-soft)'
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
    <div className="type-card" style={{ borderColor: open ? color : undefined }} onClick={onToggle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div className="type-icon" style={{ background: soft }}><Icon size={16} style={{ color }} /></div>
        <span style={{ fontSize: 13, fontWeight: 700, color, flex: 1 }}>{c.label}</span>
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
                <XAxis dataKey="n" tick={{ fill: 'var(--t3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={cs?.tt} />
                <Bar dataKey="f" name="출현" fill={cs?.accent || '#6366f1'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const cs = useChartStyles()
  const qc = useQueryClient()
  const { data: latest, isLoading: loadingDraw } = useQuery({ queryKey: ['latestDraw'], queryFn: getLatestDraw })
  const { data: drawList } = useQuery({ queryKey: ['draws', 1], queryFn: () => getDraws(1, 10) })
  const { data: stats } = useQuery({ queryKey: ['numberStats'], queryFn: getNumberStats })
  const { data: rangeStats } = useQuery({ queryKey: ['rangeStats'], queryFn: () => getRangeStats(30) })
  const { data: topPairs } = useQuery({ queryKey: ['combos', 2, 'desc'], queryFn: () => getCombinationStats(2, 10, 'desc') })
  const { data: topTriples } = useQuery({ queryKey: ['combos', 3, 'desc'], queryFn: () => getCombinationStats(3, 5, 'desc') })
  const { data: savedPredictions } = useQuery({ queryKey: ['predictions'], queryFn: getLatestPredictions, retry: false })
  const { data: dbStatus } = useQuery({ queryKey: ['dbStatus'], queryFn: getDbStatus })
  const [freshTyped, setFreshTyped] = useState(null)
  const [openIdx, setOpenIdx] = useState(null)
  const [showRecent, setShowRecent] = useState(false)

  // 크롤링
  const [crawlStart, setCrawlStart] = useState('')
  const [crawlEnd, setCrawlEnd] = useState('')
  const [crawlStatus, setCrawlStatus] = useState(null)
  const pollRef = useRef(null)

  // 크롤링 진행 폴링
  const startPolling = () => {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      try {
        const st = await getCrawlStatus()
        setCrawlStatus(st)
        if (st.state === 'done' || st.state === 'idle') {
          clearInterval(pollRef.current)
          pollRef.current = null
          qc.invalidateQueries()
        }
      } catch { /* ignore */ }
    }, 1000)
  }

  // 페이지 로드 시 진행 중인 크롤링 상태 복원
  useEffect(() => {
    getCrawlStatus().then(st => {
      if (st && st.state !== 'idle') {
        setCrawlStatus(st)
        if (st.state === 'running') startPolling()
      }
    }).catch(() => {})
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // dbStatus 로드 시 기본 범위 설정
  useEffect(() => {
    if (dbStatus && !crawlStart && !crawlEnd) {
      setCrawlStart(String(dbStatus.db_max + 1))
      setCrawlEnd(String(dbStatus.db_max + 20))
    }
  }, [dbStatus])

  const crawlMut = useMutation({
    mutationFn: ({ start, end }) => crawlRange(start, end),
    onMutate: () => startPolling(),
    onSuccess: () => qc.invalidateQueries(),
  })
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
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">대시보드</h1>
        <p className="page-desc">로또 AI 분석</p>
      </div>

      {/* 크롤링 패널 */}
      <div className="card" style={{ marginBottom: 20, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Database size={14} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>데이터 수집</span>
          <InfoTip text="동행복권에서 지정한 범위의 회차를 수집합니다. 시작/끝 회차를 입력하고 수집 버튼을 누르세요. 진행 상황은 실시간으로 표시되며, 다른 페이지에 갔다 와도 유지됩니다." />
          {dbStatus && (
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t3)' }}>
              DB: {dbStatus.db_count}회차 저장 ({dbStatus.db_min}~{dbStatus.db_max})
              {dbStatus.missing_count > 0 && <span style={{ color: 'var(--gold)', marginLeft: 6 }}>누락 {dbStatus.missing_count}개</span>}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="input" type="number" placeholder="시작 회차" value={crawlStart}
            onChange={e => setCrawlStart(e.target.value)} style={{ width: 100 }} />
          <span style={{ color: 'var(--t4)', fontSize: 13 }}>~</span>
          <input className="input" type="number" placeholder="끝 회차" value={crawlEnd}
            onChange={e => setCrawlEnd(e.target.value)} style={{ width: 100 }} />
          <button className="btn btn-primary"
            onClick={() => crawlMut.mutate({ start: Number(crawlStart), end: Number(crawlEnd) })}
            disabled={crawlMut.isPending || !crawlStart || !crawlEnd || (crawlStatus?.state === 'running')}
          >
            <Download size={14} /> {crawlMut.isPending ? '수집 중' : '수집'}
          </button>
          <div style={{ display: 'flex', gap: 4 }}>
            {[20, 50, 100].map(n => (
              <button key={n} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 11 }}
                onClick={() => {
                  const s = dbStatus ? dbStatus.db_max + 1 : 1
                  setCrawlStart(String(s))
                  setCrawlEnd(String(s + n - 1))
                }}>
                {n}회차
              </button>
            ))}
          </div>
        </div>

        {/* 진행 바 */}
        {crawlStatus && crawlStatus.state !== 'idle' && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: crawlStatus.state === 'done' ? 'var(--green)' : 'var(--t2)', marginBottom: 6 }}>
              <span>{crawlStatus.message}</span>
              <span>{crawlStatus.progress}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-4)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3, transition: 'width 0.3s',
                width: `${crawlStatus.progress}%`,
                background: crawlStatus.state === 'done' ? 'var(--green)' : 'linear-gradient(90deg, var(--accent), var(--accent2))',
              }} />
            </div>
            {crawlStatus.state === 'done' && (
              <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>
                수집 {crawlStatus.crawled}개 · 신규 {crawlStatus.new}개 · 실패 {crawlStatus.failed}개
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ 1열 레이아웃 ═══ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ① 최근 당첨번호 (아코디언) */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div onClick={() => setShowRecent(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', cursor: 'pointer' }}>
            <Trophy size={15} color="var(--gold)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', flex: 1 }}>
              최근 당첨번호
              {latest && <span style={{ fontWeight: 400, color: 'var(--t3)', fontSize: 12, marginLeft: 8 }}>{latest.round_no}회</span>}
            </span>
            {latest && !showRecent && (
              <div style={{ display: 'flex', gap: 4 }}>
                {latest.numbers.map((n, i) => (
                  <span key={i} className={`lotto-ball r${Math.ceil(n / 10)}`} style={{ width: 26, height: 26, fontSize: 10, boxShadow: 'none' }}>{n}</span>
                ))}
              </div>
            )}
            {showRecent ? <ChevronUp size={16} color="var(--t4)" /> : <ChevronDown size={16} color="var(--t4)" />}
          </div>
          {showRecent && (
            <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border-s)' }}>
              {loadingDraw ? <Loading /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 14 }}>
                  {latest && (
                    <div style={{ padding: 14, background: 'var(--accent-soft)', borderRadius: 10, border: '1px solid var(--border-s)' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                        <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--t0)' }}>{latest.round_no}</span>
                        <span style={{ fontSize: 11, color: 'var(--t3)' }}>회</span>
                        <span style={{ fontSize: 10, color: 'var(--t4)', marginLeft: 'auto' }}>{latest.draw_date}</span>
                      </div>
                      <BallGroup numbers={latest.numbers} size={36} />
                      <div style={{ marginTop: 6, fontSize: 10, color: 'var(--t4)' }}>
                        보너스 <span className="lotto-ball" style={{ width: 22, height: 22, fontSize: 9, background: 'var(--bg-4)', boxShadow: 'none', display: 'inline-flex', verticalAlign: 'middle' }}>{latest.bonus}</span>
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
                    <div key={d.round_no} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border-s)' }}>
                      <div style={{ minWidth: 44 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{d.round_no}</div>
                        <div style={{ fontSize: 9, color: 'var(--t4)' }}>{d.draw_date?.slice(5)}</div>
                      </div>
                      <BallGroup numbers={d.numbers} size={24} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

          {/* ② 통계 요약 4칸 */}
          <div className="grid-4">
            <div className="mini-stat">
              <div className="label">총 회차 <InfoTip text="동행복권에서 수집된 로또 6/45 전체 추첨 회차 수입니다. 2002년 1회차부터 현재까지의 누적 데이터입니다." /></div>
              <div className="value">{totalDraws.toLocaleString()}</div>
            </div>
            <div className="mini-stat">
              <div className="label">평균 홀짝 <InfoTip text="최근 30회차 당첨번호의 홀수:짝수 평균 비율입니다. 통계적으로 3:3이 가장 많이 나오며, 2:4 또는 4:2도 흔합니다." /></div>
              <div className="value" style={{ fontSize: 20 }}>{oddEvenAvg ? `${oddEvenAvg.odd}:${oddEvenAvg.even}` : '—'}</div>
              <div className="sub">최근 30회</div>
            </div>
            <div className="mini-stat">
              <div className="label">평균 연번 <InfoTip text="최근 30회차에서 연속된 번호 쌍(예: 7,8)이 평균 몇 쌍 나왔는지를 나타냅니다. 보통 0~1쌍이 가장 흔합니다." /></div>
              <div className="value" style={{ fontSize: 20 }}>{consecAvg}쌍</div>
              <div className="sub">최근 30회</div>
            </div>
            <div className="mini-stat">
              <div className="label">평균 합계 <InfoTip text="당첨번호 6개의 합계 평균입니다. 전체 이력 기준 100~175 범위가 약 80%를 차지합니다. 극단적인 합계(60이하, 200이상)는 드뭅니다." /></div>
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
                  <InfoTip text="1~45 각 번호가 전체 추첨에서 몇 번 당첨번호에 포함되었는지 보여줍니다. 빨간색은 최근 자주 나온 핫넘버, 파란색은 오래 안 나온 콜드넘버입니다." />
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} barCategoryGap="12%">
                    <XAxis dataKey="n" tick={{ fill: cs.tick, fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: cs.tick, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={cs.tt} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                    <Bar dataKey="f" name="횟수" radius={[3, 3, 0, 0]}>
                      {chartData.map((e, i) => <Cell key={i} fill={e.h ? cs.hot : e.c ? cs.cold : cs.bar} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {sumTrend.length > 0 && (
              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}>
                  <TrendingUp size={13} style={{ marginRight: 4, verticalAlign: 'middle', color: 'var(--accent)' }} />
                  합계 트렌드
                  <InfoTip text="최근 20회차 당첨번호 6개의 합계 변화입니다. 100~175 범위가 이상적이며, 급격한 상승/하락 패턴이 반복되는 경향이 있습니다." />
                  <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 400, marginLeft: 4 }}>최근 20회</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={sumTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="r" tick={{ fill: cs.tick, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[60, 210]} tick={{ fill: cs.tick, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={cs.tt} />
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
                <div className="card-title" style={{ marginBottom: 10 }}>구간 분포 <InfoTip text="1~10, 11~20, 21~30, 31~40, 41~45 각 구간에서 평균 몇 개의 번호가 나왔는지를 보여줍니다. 고르게 분포할수록 균형 잡힌 조합입니다." /></div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={rangeAvg} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3}
                      label={({ name }) => name} labelLine={false}>
                      {rangeAvg.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={cs.tt} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="card">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                <Flame size={13} color="var(--hot)" /> 핫 번호 <InfoTip text="최근 20회차에서 평균보다 1.5배 이상 자주 출현한 번호입니다. 트렌드를 따르는 공격적 전략에 활용됩니다." />
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
                <Snowflake size={13} color="var(--cold)" /> 콜드 번호 <InfoTip text="최근 20회차에서 평균의 절반 이하로 출현한 번호입니다. 오래 안 나온 만큼 '평균 회귀'를 기대하는 역발상 전략에 활용됩니다." />
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="section-title" style={{ margin: 0 }}>
                <Sparkles size={14} color="var(--accent)" />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>
                  {typed ? `${typed.target_round}회차 추천` : 'AI 추천 번호'}
                </span>
                <InfoTip text="5가지 서로 다른 AI 전략으로 생성된 추천 번호입니다. 핫넘버(최근 고빈도), 콜드넘버(장기 미출현), 균형 조합(홀짝/구간 최적), 희소 조합(남들이 안 고르는 번호), AI 앙상블(5개 엔진 종합). 카드를 클릭하면 각 번호의 상세 통계를 비교할 수 있습니다." />
              </div>
              <button className="btn btn-primary" onClick={() => typedMut.mutate()} disabled={typedMut.isPending}>
                <Sparkles size={14} /> {typedMut.isPending ? '분석 중' : typedList.length > 0 ? '다시 생성' : '5종류 추천 생성'}
              </button>
            </div>

            {typedList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {typedList.map((p, i) => (
                  <RecCard key={i} p={p} stats={stats} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? null : i)} />
                ))}
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
                <Sparkles size={24} color="var(--accent)" style={{ marginBottom: 8, opacity: 0.4 }} />
                <div style={{ fontSize: 13, color: 'var(--t3)' }}>우측 상단 버튼으로 AI 추천을 생성하세요</div>
              </div>
            )}
          </div>

          {/* ⑤ 조합 확률 */}
          <div className="grid-2">
            <div className="card">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Percent size={13} color="var(--accent)" /> 2개 조합 TOP 10 <InfoTip text="역대 전체 추첨에서 두 번호가 동시에 당첨번호에 포함된 횟수와 확률입니다. 자주 같이 나오는 번호 쌍을 참고하여 조합을 구성할 수 있습니다." />
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
                <Percent size={13} color="var(--gold)" /> 3개 조합 TOP 5 <InfoTip text="세 번호가 동시에 당첨번호에 포함된 횟수와 확률입니다. 2개 조합보다 희귀하며, 높은 빈도의 3개 조합은 강한 상관관계를 나타냅니다." />
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
    </div>
  )
}
