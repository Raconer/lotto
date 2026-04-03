import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDraws, getDrawByRound } from '../api/client'
import { BallGroup } from '../components/LottoBall'
import Loading from '../components/Loading'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

export default function HistoryPage() {
  const [page, setPage] = useState(1)
  const [searchRound, setSearchRound] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searchError, setSearchError] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['draws', page], queryFn: () => getDraws(page, 20) })

  const handleSearch = async () => {
    if (!searchRound) return
    setSearchError('')
    try {
      const result = await getDrawByRound(Number(searchRound))
      setSearchResult(result)
    } catch {
      setSearchError(`${searchRound}회차 데이터가 없습니다.`)
      setSearchResult(null)
    }
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 0

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">히스토리</h1>
        <p className="page-desc">전체 로또 당첨번호 이력</p>
      </div>

      {/* Search */}
      <div className="card section">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            type="number"
            placeholder="회차 번호"
            value={searchRound}
            onChange={e => setSearchRound(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            style={{ width: 160 }}
          />
          <button className="btn btn-primary" onClick={handleSearch}>
            <Search size={14} /> 검색
          </button>
        </div>

        {searchError && <p style={{ color: 'var(--rose)', marginTop: 10, fontSize: 12 }}>{searchError}</p>}

        {searchResult && (
          <div style={{ marginTop: 16, padding: 20, background: 'var(--bg-1)', borderRadius: 'var(--radius-m)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-0)' }}>{searchResult.round_no}</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>회차 · {searchResult.draw_date}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BallGroup numbers={searchResult.numbers} size={40} />
              <span style={{ fontSize: 11, color: 'var(--text-4)' }}>+</span>
              <span className="lotto-ball" style={{ width: 40, height: 40, fontSize: 13, background: '#3f3f46', display: 'inline-flex' }}>
                {searchResult.bonus}
              </span>
            </div>
            {searchResult.first_prize && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)' }}>
                1등 <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{(searchResult.first_prize / 100000000).toFixed(0)}억원</span>
                <span style={{ color: 'var(--text-4)', marginLeft: 6 }}>{searchResult.first_winners}명</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">당첨번호 목록</div>
          {data && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>총 {data.total}회차</span>}
        </div>

        {isLoading ? <Loading /> : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>회차</th>
                  <th>추첨일</th>
                  <th>당첨번호</th>
                  <th>보너스</th>
                  <th style={{ textAlign: 'right' }}>1등</th>
                </tr>
              </thead>
              <tbody>
                {data?.draws.map(d => (
                  <tr key={d.round_no}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{d.round_no}</td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{d.draw_date}</td>
                    <td><BallGroup numbers={d.numbers} size={28} /></td>
                    <td>
                      <span className="lotto-ball" style={{ width: 28, height: 28, fontSize: 11, background: '#3f3f46' }}>
                        {d.bonus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--gold)', fontSize: 12, fontWeight: 500 }}>
                      {d.first_prize ? `${(d.first_prize / 100000000).toFixed(0)}억` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
              <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 10px' }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 60, textAlign: 'center' }}>
                {page} / {totalPages}
              </span>
              <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 10px' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
