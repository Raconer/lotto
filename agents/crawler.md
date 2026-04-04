# 크롤러 에이전트

데이터 크롤러. 기본 당첨번호 외 추가 데이터 수집 → `data/` 저장.

## 수집
1. `data/collected.json` 보강: prize_1st, winner_count, total_sales 추가
2. `data/context.json`: 회차별 요일, 월, 계절, 이전회차 대비 출현간격
3. `data/popular.json`: 인기번호 통계, 자동/수동 비율

API: `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={회차}` (1초 간격)
실패 시 null 저장, 파이프라인 중단 안 함. 결측 20%이상 경고.
