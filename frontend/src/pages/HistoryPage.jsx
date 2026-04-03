import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDraws, getDrawByRound } from '../api/client'
import { BallGroup } from '../components/LottoBall'
import Loading from '../components/Loading'
import { Search } from 'lucide-react'

export default function HistoryPage() {
  const [page, setPage] = useState(1)
  const [searchRound, setSearchRound] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searchError, setSearchError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['draws', page],
    queryFn: () => getDraws(page, 20),
  })

  const handleSearch = async () => {
    if (!searchRound) return
    setSearchError('')
    try {
      const result = await getDrawByRound(Number(searchRound))
      setSearchResult(result)
    } catch (e) {
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

      {/* 검색 */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            type="number"
            placeholder="회차 번호 검색"
            value={searchRound}
            onChange={e => setSearchRound(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            style={{ width: 200 }}
          />
          <button className="btn btn-primary" onClick={handleSearch}>
            <Search size={16} /> 검색
          </button>
        </div>

        {searchError && <p style={{ color: 'var(--accent-pink)', marginTop: 12, fontSize: 13 }}>{searchError}</p>}

        {searchResult && (
          <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: 'var(--accent-purple)' }}>{searchResult.round_no}회</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{searchResult.draw_date}</span>
            </div>
            <BallGroup numbers={searchResult.numbers} size={42} />
            <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-muted)' }}>+ 보너스 </span>
            <span className="lotto-ball" style={{
              width: 42, height: 42, fontSize: 15,
              background: 'linear-gradient(135deg, #555, #888)', display: 'inline-flex'
            }}>
              {searchResult.bonus}
            </span>
            {searchResult.first_prize && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                1등 당첨금: <strong style={{ color: 'var(--accent-yellow)' }}>{(searchResult.first_prize / 100000000).toFixed(1)}억원</strong>
                {' '}({searchResult.first_winners}명)
              </div>
            )}
          </div>
        )}
      </div>

      {/* 목록 */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">당첨번호 목록</div>
          {data && <div className="card-subtitle">총 {data.total}회차</div>}
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
                  <th>1등 당첨금</th>
                </tr>
              </thead>
              <tbody>
                {data?.draws.map(d => (
                  <tr key={d.round_no}>
                    <td style={{ fontWeight: 600 }}>{d.round_no}회</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{d.draw_date}</td>
                    <td><BallGroup numbers={d.numbers} size={32} /></td>
                    <td>
                      <span className="lotto-ball" style={{
                        width: 32, height: 32, fontSize: 12,
                        background: 'linear-gradient(135deg, #555, #888)',
                      }}>
                        {d.bonus}
                      </span>
                    </td>
                    <td style={{ color: 'var(--accent-yellow)', fontSize: 13 }}>
                      {d.first_prize ? `${(d.first_prize / 100000000).toFixed(1)}억` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 페이지네이션 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</button>
              <span style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: 14 }}>
                {page} / {totalPages}
              </span>
              <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
