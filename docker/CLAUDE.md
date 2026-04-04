# Docker / DB

## 컨테이너 (docker-compose.yml)
| 서비스 | 이미지 | 포트 |
|--------|--------|------|
| lotto-db | postgres:16-alpine | 3003→5432 |
| lotto-redis | redis:7-alpine | 3004→6379 |
| lotto-api | backend/ | 3005→8000 |
| lotto-algorithm | algorithm/ | 3006→8001 |
| lotto-frontend | frontend/ | 3007→80 |

## DB
- `init.sql` — 테이블 생성 (draws, number_stats, combination_stats, range_stats, predictions, backtest_results) + 인덱스 + 1~45 초기데이터
- `seed_data.sql` — 1~1205회차 당첨번호 INSERT (seed_data.py로 생성)
- `lotto_raw.csv` — 원본 CSV 데이터

## 환경변수 (.env)
DB_PORT, REDIS_PORT, API_PORT, ALGO_PORT, FRONTEND_PORT
POSTGRES_DB/USER/PASSWORD, DATABASE_URL, REDIS_URL, ALGORITHM_URL

## 명령
```
docker compose up -d                    # 전체 시작
docker compose down -v                  # 전체 삭제 (볼륨 포함)
docker compose build lotto-api          # BE 재빌드
docker compose build lotto-frontend     # FE 재빌드
docker exec lotto-db psql -U lotto_user -d lotto  # DB 접속
```
