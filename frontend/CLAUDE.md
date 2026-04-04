# Frontend (React + Vite)

## 스택
React 19 + Vite + React Router + TanStack Query + Recharts + Lucide Icons

## 구조
```
src/
├── main.jsx          # BrowserRouter + QueryClientProvider
├── App.jsx           # 사이드바 + Routes (5페이지)
├── App.css           # 전역 스타일 (다크테마, 카드, 볼, 버튼, 테이블)
├── index.css         # CSS변수, Plus Jakarta Sans 폰트
├── api/client.js     # axios 인스턴스 + API 함수 전부
├── components/
│   ├── LottoBall.jsx # 로또볼(구간별 색상) + BallGroup
│   ├── Loading.jsx   # 스피너
│   └── InfoTip.jsx   # ⓘ 호버 툴팁
└── pages/
    ├── Dashboard.jsx # 2열(좌:통계+추천 / 우:최근당첨), 크롤링패널, 5종류추천
    ├── Statistics.jsx # 번호빈도, 히트맵, 조합(2~6개), 구간/홀짝, 합계트렌드
    ├── Analysis.jsx  # 5종류추천상세, 추천이력, 백테스트(레이더/분포차트)
    ├── HistoryPage.jsx # 전체회차 목록, 검색, 페이지네이션
    └── Validate.jsx  # 번호6개 입력→점수(빈도/조합/균형)+ScoreRing+과거매칭
```

## 디자인
- 다크테마 (bg:#07070a~#222229)
- Plus Jakarta Sans 폰트
- 로또볼: r1=금, r2=파, r3=빨, r4=보, r5=녹 (Math.ceil(n/10))
- hero-card: 그라디언트+glow, type-card: 아코디언 펼침
- 차트: 축선/그리드 최소화, 투명 커서

## API
nginx 프록시: `/api/*` → `http://lotto-api:8000/api/*`
개발시 VITE_API_URL 환경변수 사용 가능

## 빌드
`npm run build` → dist/ → nginx:alpine 서빙
Dockerfile: node:20-slim(빌드) → nginx:alpine(서빙)
