import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Plus, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { manualInput, uploadCsv, getDbStatus } from '../api/client'
import { BallGroup } from '../components/LottoBall'
import InfoTip from '../components/InfoTip'

export default function DataInput() {
  const qc = useQueryClient()
  const { data: dbStatus } = useQuery({ queryKey: ['dbStatus'], queryFn: getDbStatus })

  // 수동 입력
  const [round, setRound] = useState('')
  const [date, setDate] = useState('')
  const [nums, setNums] = useState(['', '', '', '', '', ''])
  const [bonus, setBonus] = useState('')
  const [manualResult, setManualResult] = useState(null)

  // CSV
  const [csvResult, setCsvResult] = useState(null)

  // 최근 입력 히스토리
  const [history, setHistory] = useState([])

  const manualMut = useMutation({
    mutationFn: (p) => manualInput(p),
    onSuccess: (d) => {
      setManualResult(d)
      if (!d.error) {
        setHistory(h => [{ round: round, nums: d.numbers, bonus: d.bonus }, ...h].slice(0, 10))
        setNums(['', '', '', '', '', ''])
        setBonus('')
        setRound(r => String(Number(r) + 1))
        qc.invalidateQueries()
      }
    },
  })

  const csvMut = useMutation({
    mutationFn: (file) => uploadCsv(file),
    onSuccess: (d) => { setCsvResult(d); qc.invalidateQueries() },
  })

  const handleNumChange = (i, v) => {
    const val = v.replace(/\D/g, '')
    if (val && (Number(val) < 1 || Number(val) > 45)) return
    const next = [...nums]
    next[i] = val
    setNums(next)
    if (val.length === 2 && i < 5) document.getElementById(`mi-${i + 1}`)?.focus()
  }

  const handleSubmit = () => {
    const n = nums.map(Number)
    if (n.some(x => x < 1 || x > 45) || !round || !date || !bonus) return
    manualMut.mutate({
      round_no: Number(round), draw_date: date,
      num1: n[0], num2: n[1], num3: n[2], num4: n[3], num5: n[4], num6: n[5],
      bonus: Number(bonus),
    })
  }

  const handleCsv = (e) => {
    const file = e.target.files[0]
    if (file) csvMut.mutate(file)
  }

  const isValid = nums.every(v => v && Number(v) >= 1 && Number(v) <= 45)
    && bonus && Number(bonus) >= 1 && Number(bonus) <= 45
    && round && date

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">데이터 입력</h1>
        <p className="page-desc">당첨번호를 직접 입력하거나 CSV로 업로드</p>
      </div>

      {/* DB 현황 */}
      {dbStatus && (
        <div className="card section" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 24, fontSize: 13, flexWrap: 'wrap' }}>
            <span>DB: <strong>{dbStatus.db_count}회차</strong> ({dbStatus.db_min}~{dbStatus.db_max})</span>
            {dbStatus.missing_count > 0 && <span style={{ color: 'var(--gold)' }}>누락: {dbStatus.missing_count}개</span>}
            <span style={{ color: 'var(--t3)' }}>다음 입력: <strong style={{ color: 'var(--accent)' }}>{dbStatus.db_max + 1}회차</strong></span>
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* 수동 입력 */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>
            <Plus size={14} color="var(--accent)" /> 수동 입력
            <InfoTip text="회차, 추첨일, 번호 6개, 보너스를 직접 입력합니다. 이미 있는 회차는 덮어씁니다." />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input className="input" type="number" placeholder="회차" value={round}
              onChange={e => setRound(e.target.value)} style={{ width: 80 }}
              onFocus={() => { if (!round && dbStatus) setRound(String(dbStatus.db_max + 1)) }} />
            <input className="input" type="date" value={date}
              onChange={e => setDate(e.target.value)} style={{ width: 150 }} />
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {nums.map((v, i) => (
              <input key={i} id={`mi-${i}`} className="input" type="text" maxLength={2}
                value={v} onChange={e => handleNumChange(i, e.target.value)}
                onKeyDown={e => e.key === 'Enter' && i === 5 && document.getElementById('mi-bonus')?.focus()}
                placeholder={`${i + 1}`}
                style={{ width: 48, height: 48, textAlign: 'center', fontSize: 16, fontWeight: 700, borderRadius: '50%' }} />
            ))}
            <span style={{ color: 'var(--t4)', fontSize: 12 }}>+</span>
            <input id="mi-bonus" className="input" type="text" maxLength={2}
              value={bonus} onChange={e => { const v = e.target.value.replace(/\D/g, ''); if (!v || (Number(v) >= 1 && Number(v) <= 45)) setBonus(v) }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="보너스"
              style={{ width: 48, height: 48, textAlign: 'center', fontSize: 16, fontWeight: 700, borderRadius: '50%', borderColor: 'var(--t4)' }} />
          </div>

          <button className="btn btn-primary" onClick={handleSubmit} disabled={!isValid || manualMut.isPending} style={{ width: '100%' }}>
            <Plus size={14} /> {manualMut.isPending ? '저장 중...' : '저장'}
          </button>

          {manualResult && (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 8, fontSize: 12,
              background: manualResult.error ? 'var(--hot-soft)' : 'var(--green-soft)',
              color: manualResult.error ? 'var(--hot)' : 'var(--green)',
              display: 'flex', alignItems: 'center', gap: 6 }}>
              {manualResult.error ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
              {manualResult.error || manualResult.message}
            </div>
          )}

          {/* 최근 입력 히스토리 */}
          {history.length > 0 && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border-s)', paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>최근 입력</div>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: 'var(--t2)', minWidth: 40 }}>{h.round}회</span>
                  <BallGroup numbers={h.nums} size={22} />
                  <span style={{ color: 'var(--t4)' }}>+{h.bonus}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CSV 업로드 */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>
            <Upload size={14} color="var(--gold)" /> CSV 업로드
            <InfoTip text="CSV 파일로 여러 회차를 한 번에 업로드합니다. 헤더: round_no,draw_date,num1,num2,num3,num4,num5,num6,bonus" />
          </div>

          <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 32, textAlign: 'center', marginBottom: 16 }}>
            <FileText size={32} color="var(--t4)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 12 }}>CSV 파일을 선택하세요</div>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              <Upload size={14} /> 파일 선택
              <input type="file" accept=".csv" onChange={handleCsv} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.8 }}>
            <div style={{ fontWeight: 600, color: 'var(--t2)', marginBottom: 4 }}>CSV 형식</div>
            <code style={{ display: 'block', padding: 10, background: 'var(--bg-2)', borderRadius: 6, fontSize: 11, color: 'var(--t2)' }}>
              round_no,draw_date,num1,num2,num3,num4,num5,num6,bonus{'\n'}
              1206,2026-01-10,3,7,15,22,38,44,12{'\n'}
              1207,2026-01-17,5,11,18,27,33,41,9
            </code>
          </div>

          {csvMut.isPending && <div className="loading"><div className="spinner" /> 업로드 중...</div>}

          {csvResult && (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 8, fontSize: 12,
              background: 'var(--green-soft)', color: 'var(--green)',
              display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={14} />
              {csvResult.message}
            </div>
          )}
          {csvResult?.errors?.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--hot)' }}>
              {csvResult.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
