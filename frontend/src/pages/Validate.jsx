import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { validateNumbers } from '../api/client'
import { BallGroup } from '../components/LottoBall'
import { Search, AlertCircle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

function ScoreRing({ score, label, color }) {
  const radius = 40
  const circ = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--bg-3)" strokeWidth="6" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ marginTop: -68, fontSize: 20, fontWeight: 800, color: 'var(--text-0)', letterSpacing: '-0.5px' }}>{score}</div>
      <div style={{ marginTop: 30, fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  )
}

export default function Validate() {
  const [inputs, setInputs] = useState(['', '', '', '', '', ''])
  const mutation = useMutation({ mutationFn: (numbers) => validateNumbers(numbers) })

  const handleChange = (i, v) => {
    const num = v.replace(/\D/g, '')
    if (num && (Number(num) < 1 || Number(num) > 45)) return
    const next = [...inputs]
    next[i] = num
    setInputs(next)
    if (num.length === 2 && i < 5) document.getElementById(`n-${i + 1}`)?.focus()
  }

  const handleSubmit = () => {
    const numbers = inputs.map(Number).filter(n => n >= 1 && n <= 45)
    if (numbers.length !== 6 || new Set(numbers).size !== 6) return
    mutation.mutate(numbers)
  }

  const r = mutation.data
  const isValid = inputs.every(v => v && Number(v) >= 1 && Number(v) <= 45) && new Set(inputs.map(Number)).size === 6
  const scoreColor = r?.score >= 70 ? 'var(--green)' : r?.score >= 40 ? 'var(--gold)' : 'var(--rose)'

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">번호 검증</h1>
        <p className="page-desc">내 번호 6개를 과거 데이터 기반으로 분석</p>
      </div>

      <div className="card section">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {inputs.map((val, i) => (
            <input
              key={i} id={`n-${i}`} className="input" type="text" maxLength={2}
              value={val} onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={`${i + 1}`}
              style={{ width: 56, height: 56, textAlign: 'center', fontSize: 18, fontWeight: 700, borderRadius: '50%' }}
            />
          ))}
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!isValid || mutation.isPending} style={{ height: 44 }}>
            <Search size={16} />
            {mutation.isPending ? '분석 중' : '분석'}
          </button>
        </div>
        {mutation.isError && (
          <p style={{ color: 'var(--rose)', marginTop: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={13} /> 데이터를 먼저 수집하세요.
          </p>
        )}
      </div>

      {r && (
        <>
          {/* Scores */}
          <div className="card section">
            <div style={{ display: 'flex', justifyContent: 'center', gap: 48, padding: '16px 0' }}>
              <ScoreRing score={r.score} label="종합" color={scoreColor} />
              <ScoreRing score={r.frequency_score} label="빈도" color="var(--blue)" />
              <ScoreRing score={r.combination_score} label="조합" color="var(--violet)" />
              <ScoreRing score={r.balance_score} label="균형" color="var(--green)" />
            </div>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span className="type-chip" style={{ background: r.score >= 70 ? 'var(--green-soft)' : r.score >= 40 ? 'var(--gold-soft)' : 'var(--rose-soft)', color: scoreColor, fontSize: 11 }}>
                {r.score >= 70 ? '추천' : r.score >= 40 ? '보통' : '비추천'}
              </span>
            </div>
          </div>

          {/* Detail */}
          <div className="grid-2 section">
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>상세 분석</div>
              <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div className="stat-label">구간 분포</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {r.details.range_distribution && Object.entries(r.details.range_distribution).map(([k, v]) => (
                      <div key={k} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-0)' }}>{v}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{k}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="stat-label">홀짝</div>
                  <span style={{ fontWeight: 600 }}>홀 {r.details.odd_even.odd} : 짝 {r.details.odd_even.even}</span>
                </div>
                <div>
                  <div className="stat-label">합계</div>
                  <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-0)' }}>{r.details.sum}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 6 }}>이상적 100~175</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>점수 구성</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: '빈도', value: r.frequency_score, color: '#6366f1' },
                      { name: '조합', value: r.combination_score, color: '#8b5cf6' },
                      { name: '균형', value: r.balance_score, color: '#10b981' },
                    ]}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}
                    label={({ name, value }) => `${name} ${value}`} labelLine={false}
                  >
                    {[{ color: '#6366f1' }, { color: '#8b5cf6' }, { color: '#10b981' }].map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Past Matches */}
          {r.past_matches.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>과거 매칭 (3개 이상)</div>
              <table className="data-table">
                <thead>
                  <tr><th>회차</th><th>날짜</th><th>적중</th><th>번호</th></tr>
                </thead>
                <tbody>
                  {r.past_matches.map(m => (
                    <tr key={m.round_no}>
                      <td style={{ fontWeight: 600 }}>{m.round_no}</td>
                      <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{m.draw_date}</td>
                      <td style={{ color: 'var(--green)', fontWeight: 700 }}>{m.matched_count}개</td>
                      <td><BallGroup numbers={m.matched_numbers} size={24} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
