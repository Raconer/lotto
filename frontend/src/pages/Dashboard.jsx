import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Sparkles, Flame, Snowflake, Scale, Gem, Brain, ChevronDown, ChevronUp, Trophy, Hash, Calendar, TrendingUp } from 'lucide-react'
import { getLatestDraw, getDraws, getLatestPredictions, getNumberStats, getRangeStats, crawlAll, generateTypedPredictions } from '../api/client'
import LottoBall, { BallGroup } from '../components/LottoBall'
import Loading from '../components/Loading'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts'

const TYPES = {
  hot:      { icon: Flame,    color: '#ff6b81', bg: 'rgba(255,107,129,0.1)',  label: '핫넘버',    short: '최근 고빈도 번호 공격 전략' },
  cold:     { icon: Snowflake, color: '#45b7d1', bg: 'rgba(69,183,209,0.1)',  label: '콜드넘버',  short: '장기 미출현 역발상 전략' },
  balanced: { icon: Scale,    color: '#3dd68c', bg: 'rgba(61,214,140,0.1)',  label: '균형 조합',  short: '홀짝/구간/합계 최적 균형' },
  rare:     { icon: Gem,      color: '#ffb347', bg: 'rgba(255,179,71,0.1)',  label: '희소 조합',  short: '남들이 안 고르는 1등 독식' },
  ensemble: { icon: Brain,    color: '#7c5cfc', bg: 'rgba(124,92,252,0.1)',  label: 'AI 앙상블',  short: '5엔진 종합 가중 투표' },
}
const TT = { background: '#19191f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12 }

/* ─── 추천 카드: 번호 + 통계 비교 인라인 ─── */
function RecommendCard({ p, stats, selectedIdx, onSelect, idx }) {
  const c = TYPES[p.type] || TYPES.ensemble
  const Icon = c.icon
  const isOpen = selectedIdx === idx

  // 이 추천 번호들의 통계
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
    <div className="type-card" style={{ animationDelay: `${idx * 0.05}s`, borderColor: isOpen ? `${c.color}40` : undefined }}
      onClick={() => onSelect(isOpen ? null : idx)}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div className="type-icon" style={{ background: c.bg }}><Icon size={18} color={c.color} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.color }}>{c.label}</div>
          <div style={{ fontSize: 10, color: 'var(--t4)' }}>{c.short}</div>
        </div>
        {p.confidence && <span className="type-chip" style={{ background: 'rgba(61,214,140,0.1)', color: 'var(--green)' }}>{p.confidence}%</span>}
        {isOpen ? <ChevronUp size={14} color="var(--t4)" /> : <ChevronDown size={14} color="var(--t4)" />}
      </div>

      {/* 번호 + 미니 통계 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <BallGroup numbers={p.numbers} size={44} />
        <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--t4)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>평균빈도</div>
            <div style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 14 }}>{avgFreq}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--t4)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>평균미출현</div>
            <div style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 14 }}>{avgOverdue}</div>
          </div>
          {p.analysis && (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--t4)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>홀짝</div>
                <div style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 14 }}>{p.analysis.odd_even}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--t4)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>합계</div>
                <div style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 14 }}>{p.analysis.sum}</div>
              </div>
            </>
          )}
          {hotCount > 0 && <span className="badge badge-hot" style={{ alignSelf: 'center' }}>HOT {hotCount}</span>}
          {coldCount > 0 && <span className="badge badge-cold" style={{ alignSelf: 'center' }}>COLD {coldCount}</span>}
        </div>
      </div>

      {/* 펼침: 번호별 상세 통계 비교 */}
      {isOpen && numStats && (
        <div style={{ marginTop: 16 }}>
          <table className="data-table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>번호</th>
                <th>출현횟수</th>
                <th>확률</th>
                <th>미출현</th>
                <th>평균간격</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {numStats.map(s => (
                <tr key={s.number}>
                  <td><span className={`lotto-ball r${Math.ceil(s.number / 10)}`} style={{ width: 28, height: 28, fontSize: 11 }}>{s.number}</span></td>
                  <td style={{ fontWeight: 600 }}>{s.frequency}회</td>
                  <td>{s.probability}%</td>
                  <td style={{ color: s.overdue > 10 ? 'var(--gold)' : 'var(--t2)' }}>{s.overdue}회</td>
                  <td style={{ color: 'var(--t3)' }}>{s.avg_interval || '—'}</td>
                  <td>
                    {s.is_hot && <span className="badge badge-hot">HOT</span>}
                    {s.is_cold && <span className="badge badge-cold">COLD</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 번호 빈도 시각 비교 */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8, fontWeight: 600 }}>빈도 비교</div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={numStats.map(s => ({ n: s.number, f: s.frequency, o: s.overdue }))}>
                <XAxis dataKey="n" tick={{ fill: '#6e6e80', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#444454', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="f" name="출현" fill={c.color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 전략 상세 */}
          {p.detail && (
            <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-1)', borderRadius: 10, fontSize: 11, color: 'var(--t2)', lineHeight: 1.8 }}>
              {p.detail.strategy && <div><span style={{ color: 'var(--t4)' }}>전략 </span>{p.detail.strategy}</div>}
              {p.detail.hot_numbers && <div><span style={{ color: 'var(--t4)' }}>핫 TOP </span>{p.detail.hot_numbers.join(' · ')}</div>}
              {p.detail.top_overdue && <div><span style={{ color: 'var(--t4)' }}>오버듀 TOP </span>{p.detail.top_overdue.join(' · ')}</div>}
              {p.detail.rare_numbers && <div><span style={{ color: 'var(--t4)' }}>희소 </span>{p.detail.rare_numbers.join(' · ')}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


export default function Dashboard() {
  const qc = useQueryClient()
  const { data: latest, isLoading: loadingDraw } = useQuery({ queryKey: ['latestDraw'], queryFn: getLatestDraw })
  const { data: drawList } = useQuery({ queryKey: ['draws', 1], queryFn: () => getDraws(1, 5) })
  const { data: stats } = useQuery({ queryKey: ['numberStats'], queryFn: getNumberStats })
  const { data: rangeStats } = useQuery({ queryKey: ['rangeStats'], queryFn: () => getRangeStats(20) })
  const [typed, setTyped] = useState(null)
  const [selectedIdx, setSelectedIdx] = useState(null)

  const crawlMut = useMutation({ mutationFn: crawlAll, onSuccess: () => qc.invalidateQueries() })
  const typedMut = useMutation({ mutationFn: generateTypedPredictions, onSuccess: d => { setTyped(d); qc.invalidateQueries(['predictions']) } })

  const chartData = stats?.map(s => ({ n: s.number, f: s.frequency, h: s.is_hot, c: s.is_cold })) || []
  const typedList = typed?.predictions || []
  const totalDraws = drawList?.total || 0
  const recent5 = drawList?.draws?.slice(0, 5) || []

  // 합계 트렌드
  const sumTrend = rangeStats?.slice(0, 20).reverse().map(r => ({ r: r.round_no, s: r.sum_total })) || []

  return (
    <div>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
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
        <div style={{ padding: '10px 16px', background: 'rgba(61,214,140,0.08)', border: '1px solid rgba(61,214,140,0.15)', borderRadius: 12, marginBottom: 20, fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
          {crawlMut.data.message}
        </div>
      )}

      {/* ─── 1행: Hero 최신당첨 + 미니 통계 ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 24 }}>
        <div className="hero-card">
          {loadingDraw ? <Loading /> : latest ? (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Trophy size={14} color="var(--gold)" />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase' }}>Latest</span>
                <span style={{ fontSize: 11, color: 'var(--t4)', marginLeft: 4 }}>{latest.draw_date}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
                <span style={{ fontSize: 38, fontWeight: 900, color: 'var(--t0)', letterSpacing: '-2px', lineHeight: 1 }}>{latest.round_no}</span>
                <span style={{ fontSize: 14, color: 'var(--t3)' }}>회차</span>
              </div>
              <BallGroup numbers={latest.numbers} size={48} />
              {latest.first_prize && (
                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--t3)' }}>
                  1등 <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--gold)' }}>{(latest.first_prize / 100000000).toFixed(0)}억</span>
                  <span style={{ color: 'var(--t4)', marginLeft: 6 }}>{latest.first_winners}명</span>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--t3)', textAlign: 'center', padding: 20 }}>데이터를 수집해주세요</p>
          )}
        </div>

        {/* 우측 미니 통계 + 최근 회차 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="mini-stat">
            <div className="label"><Hash size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />총 회차</div>
            <div className="value">{totalDraws.toLocaleString()}</div>
          </div>
          <div className="mini-stat">
            <div className="label"><Calendar size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />다음 추천</div>
            <div className="value" style={{ color: 'var(--accent)' }}>{(latest?.round_no || 0) + 1}회</div>
          </div>
          <div className="card" style={{ padding: 14, flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>최근 당첨</div>
            {recent5.slice(0, 3).map(d => (
              <div key={d.round_no} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', minWidth: 34 }}>{d.round_no}</span>
                <BallGroup numbers={d.numbers} size={20} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 2행: 5종류 추천 (메인!) ─── */}
      {typedList.length > 0 && (
        <div className="section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="section-title" style={{ margin: 0 }}>
              <Sparkles size={15} color="var(--accent)" />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>{typed.target_round}회차 추천 번호</span>
            </div>
            <span style={{ fontSize: 10, color: 'var(--t4)' }}>번호 클릭 → 통계 비교</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {typedList.map((p, i) => (
              <RecommendCard key={i} p={p} stats={stats} selectedIdx={selectedIdx} onSelect={setSelectedIdx} idx={i} />
            ))}
          </div>
        </div>
      )}

      {/* 추천 없을 때 안내 */}
      {typedList.length === 0 && (
        <div className="card section" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <Sparkles size={32} color="var(--accent)" style={{ marginBottom: 12, opacity: 0.5 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>아직 추천 번호가 없습니다</div>
          <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 16 }}>상단의 "5종류 추천" 버튼을 눌러 AI 분석을 시작하세요</div>
          <button className="btn btn-primary" onClick={() => typedMut.mutate()} disabled={typedMut.isPending}>
            <Sparkles size={14} /> 추천 생성하기
          </button>
        </div>
      )}

      {/* ─── 3행: 빈도 차트 + 합계 트렌드 ─── */}
      <div className="grid-2">
        {chartData.length > 0 && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>
              번호별 빈도 <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 400 }}>전체 {totalDraws}회 기준</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barCategoryGap="12%">
                <XAxis dataKey="n" tick={{ fill: '#444454', fontSize: 9 }} axisLine={false} tickLine={false} />
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
            <div className="card-title" style={{ marginBottom: 14 }}>
              합계 트렌드 <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 400 }}>최근 20회</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
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
    </div>
  )
}
