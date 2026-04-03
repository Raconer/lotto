import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { validateNumbers } from '../api/client'
import { BallGroup } from '../components/LottoBall'
import { Search, CheckCircle, AlertCircle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function Validate() {
  const [inputs, setInputs] = useState(['', '', '', '', '', ''])

  const mutation = useMutation({
    mutationFn: (numbers) => validateNumbers(numbers),
  })

  const handleChange = (index, value) => {
    const num = value.replace(/\D/g, '')
    if (num && (Number(num) < 1 || Number(num) > 45)) return
    const next = [...inputs]
    next[index] = num
    setInputs(next)

    // 자동 포커스 이동
    if (num.length === 2 && index < 5) {
      document.getElementById(`num-${index + 1}`)?.focus()
    }
  }

  const handleSubmit = () => {
    const numbers = inputs.map(Number).filter(n => n >= 1 && n <= 45)
    if (numbers.length !== 6 || new Set(numbers).size !== 6) return
    mutation.mutate(numbers)
  }

  const result = mutation.data
  const scoreColor = result?.score >= 70 ? 'var(--accent-green)' : result?.score >= 40 ? 'var(--accent-yellow)' : 'var(--accent-pink)'

  const pieData = result ? [
    { name: '빈도', value: result.frequency_score, color: '#4f7cff' },
    { name: '조합', value: result.combination_score, color: '#7c5cff' },
    { name: '균형', value: result.balance_score, color: '#00d68f' },
  ] : []

  const isValid = inputs.every(v => v && Number(v) >= 1 && Number(v) <= 45) && new Set(inputs.map(Number)).size === 6

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">내 번호 검증</h1>
        <p className="page-desc">번호 6개를 입력하면 과거 데이터 기반 점수를 분석합니다</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>번호 입력</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {inputs.map((val, i) => (
            <input
              key={i}
              id={`num-${i}`}
              className="input"
              type="text"
              maxLength={2}
              value={val}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={`${i + 1}번`}
              style={{
                width: 64,
                height: 64,
                textAlign: 'center',
                fontSize: 22,
                fontWeight: 700,
                borderRadius: '50%',
              }}
            />
          ))}
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!isValid || mutation.isPending}
            style={{ height: 48 }}
          >
            <Search size={18} />
            {mutation.isPending ? '분석 중...' : '분석하기'}
          </button>
        </div>
        {mutation.isError && (
          <p style={{ color: 'var(--accent-pink)', marginTop: 12, fontSize: 13 }}>
            <AlertCircle size={14} style={{ marginRight: 4 }} />
            분석 실패. 데이터를 먼저 수집하세요.
          </p>
        )}
      </div>

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 종합 점수 */}
          <div className="grid-4">
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="stat-label">종합 점수</div>
              <div className="stat-value" style={{ fontSize: 48, background: `linear-gradient(135deg, ${scoreColor}, var(--accent-purple))`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {result.score}
              </div>
              <div style={{ fontSize: 12, color: scoreColor, marginTop: 4 }}>
                {result.score >= 70 ? '추천' : result.score >= 40 ? '보통' : '비추천'}
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="stat-label">빈도 점수</div>
              <div className="stat-value">{result.frequency_score}</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="stat-label">조합 점수</div>
              <div className="stat-value">{result.combination_score}</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="stat-label">균형 점수</div>
              <div className="stat-value">{result.balance_score}</div>
            </div>
          </div>

          {/* 차트 + 상세 */}
          <div className="grid-2">
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>점수 구성</div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>상세 분석</div>
              <div style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4 }}>구간 분포</div>
                  {result.details.range_distribution && Object.entries(result.details.range_distribution).map(([range, count]) => (
                    <span key={range} style={{ marginRight: 12 }}>
                      <strong>{range}</strong>: {count}개
                    </span>
                  ))}
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4 }}>홀짝</div>
                  홀수 {result.details.odd_even.odd}개 / 짝수 {result.details.odd_even.even}개
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4 }}>합계</div>
                  <span style={{ fontWeight: 700 }}>{result.details.sum}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>(이상적: 100~175)</span>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4 }}>미출현 간격</div>
                  {result.details.overdue && Object.entries(result.details.overdue).map(([num, gap]) => (
                    <span key={num} style={{ marginRight: 12, fontSize: 13 }}>
                      {num}번: {gap != null ? `${gap}회` : '-'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 과거 매칭 */}
          {result.past_matches.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>
                <CheckCircle size={18} style={{ color: 'var(--accent-green)', marginRight: 8 }} />
                과거 매칭 이력 (최근 20회차, 3개 이상)
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>회차</th>
                    <th>추첨일</th>
                    <th>적중 수</th>
                    <th>적중 번호</th>
                    <th>당첨 번호</th>
                  </tr>
                </thead>
                <tbody>
                  {result.past_matches.map(m => (
                    <tr key={m.round_no}>
                      <td style={{ fontWeight: 600 }}>{m.round_no}회</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{m.draw_date}</td>
                      <td style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{m.matched_count}개</td>
                      <td><BallGroup numbers={m.matched_numbers} size={28} /></td>
                      <td><BallGroup numbers={m.draw_numbers} size={28} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
