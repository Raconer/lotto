# Backend API (FastAPI)

## 스택
FastAPI + SQLAlchemy(async) + PostgreSQL + Redis + APScheduler

## 구조
```
app/
├── main.py          # FastAPI 앱, CORS, 스케줄러(매주 토 22시)
├── core/            # config.py, database.py, redis.py
├── models/draw.py   # Draw, NumberStat, CombinationStat, RangeStat, Prediction, BacktestResult
├── schemas/draw.py  # Pydantic 스키마
├── routers/         # draws(당첨번호), crawl(크롤링+통계갱신), stats(통계), predictions(추천)
└── services/        # crawler.py(Playwright크롤링+Redis진행상황), stats.py(통계계산), validation.py(번호검증)
```

## 주요 API
- `POST /api/crawl/range?start=N&end=N` — 범위 크롤링 (Playwright)
- `GET /api/crawl/status` — 진행상황 (Redis)
- `GET /api/crawl/db-status` — DB현황
- `GET /api/draws`, `/api/draws/latest`, `/api/draws/{round}` — 당첨번호
- `GET /api/stats/numbers`, `/combinations`, `/ranges` — 통계
- `POST /api/stats/validate` — 번호검증
- `POST /api/predictions/generate/typed` — 5종류 추천 (→ algorithm 서버)

## DB
PostgreSQL. 테이블: draws, number_stats, combination_stats, range_stats, predictions, backtest_results.
초기 스키마: `docker/init.sql`, 시드: `docker/seed_data.sql`

## 환경변수
DATABASE_URL, REDIS_URL, ALGORITHM_URL (docker-compose에서 주입)
